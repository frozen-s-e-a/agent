// 画一个单元格：背景、网格线、合并格的切片、叠加层（区域、拟写值、已写入、人工格、待重算）、文字。
// Glide Data Grid 不支持纵向合并，这里对合并块里的每个格只画自己那一片：
// 背景和文字都按整块的位置算，再裁到本格，拼起来就是一整块；块内部的网格线不画。
import { formatDecimal } from "../../lib/numfmt";
import { alpha, type Tokens } from "../../lib/tokens";
import type { ModelCell, SheetModel } from "./sheetModel";

export type SheetMode = "raw" | "regions" | "plan" | "filled";

export interface PaintOptions {
  t: Tokens;
  mode: SheetMode;
  showFormulas: boolean;
  focusRegion?: string | null;
  /** 理解卡确认前暂存的人工格修改 */
  manualOverride?: (row: number, col: number) => boolean | undefined;
  /** 校验没通过时标出的格 */
  errorCells?: Set<string>;
}

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Display {
  text: string;
  color: string;
  fill: string | null;
  italic?: boolean;
  bold?: boolean;
  align: "left" | "center" | "right";
  wrap: boolean;
  mono?: boolean;
  hatch?: boolean;
  corner?: string | null; // 右上角小三角
}

const isNumeric = (c?: ModelCell) => c?.valueType === "number";

/** 文件里的底色（#RRGGBB）。浅色主题照用；深色主题改成淡淡一层，免得亮底配浅字看不清；白色当作没有底色 */
function fileFill(fill: string | undefined, t: PaintOptions["t"]): string | null {
  if (!fill || !/^#[0-9a-f]{6}$/i.test(fill) || /^#ffffff$/i.test(fill)) return null;
  return t.mode === "dark" ? alpha(fill, 0.14) : fill;
}

export function cellDisplay(model: SheetModel, row: number, col: number, o: PaintOptions): Display {
  const { t, mode } = o;
  const c = model.cell(row, col);
  const style = c?.style;
  let fill: string | null = fileFill(style?.fill, t);
  let color = t.text;
  let text = c?.text ?? (c?.value != null ? c.value : "");
  let italic = !!style?.italic;
  let mono = false;
  let hatch = false;
  let corner: string | null = null;
  const numericPlan = mode === "plan" && c?.plan?.value != null && /^-?\d+(\.\d+)?$/.test(c.plan.value) && !!c.numFmt;
  const align = style?.align ?? (isNumeric(c) || numericPlan ? "right" : "left");

  if (c?.formula) {
    if (mode === "raw" || mode === "regions") fill = fill ?? t.formulaTint;
    if (c.stale && c.value == null) {
      text = "待重算";
      color = t.staleText;
      italic = true;
    }
  }

  const regions = model.regionAt(row, col);
  const manual = o.manualOverride?.(row, col) ?? regions.some((r) => r.manual?.some((m) => inRef(m, row, col)));

  if (mode === "regions") {
    for (const r of regions) {
      const base = t.regionState[r.state];
      const focus = o.focusRegion === r.region;
      const isHeader = r.headerRows?.includes(row + 1);
      const isTotal = r.totals?.includes(row + 1);
      if (!fill || fill === t.formulaTint) fill = alpha(base, focus ? 0.12 : 0.06);
      if (isHeader) fill = alpha(base, focus ? 0.2 : 0.13);
      if (isTotal && !c?.formula) fill = alpha(base, 0.1);
      const empty = c?.value == null || c.value === "";
      if (!isHeader && !isTotal && !c?.formula && !manual && empty && c !== undefined) {
        corner = base; // 待填格
      }
    }
    if (manual) {
      fill = t.manualFill;
      hatch = true;
      corner = null;
    }
  }

  if (mode === "plan" && c?.plan) {
    const p = c.plan;
    if (p.manual) {
      fill = t.manualFill;
      hatch = true;
    } else if (p.stale) {
      text = "待重算";
      color = t.staleText;
      italic = true;
      fill = alpha(t.staleText, 0.08);
    } else if (p.value != null) {
      text = p.text ?? formatDecimal(p.value, c.numFmt);
      if (p.overwrite) {
        fill = t.overwriteFill;
        color = t.overwriteText;
      } else if (c.formula) {
        color = t.planText;
        italic = true; // 重算值
        fill = alpha(t.planText, 0.05);
      } else {
        color = t.planText;
        fill = t.planFill;
      }
    }
  } else if (mode === "plan" && manual) {
    fill = t.manualFill;
    hatch = true;
  }

  if (mode === "filled") {
    if (c?.written) fill = t.writtenFill;
    if (manual) {
      fill = t.manualFill;
      hatch = true;
    }
  }

  if (o.showFormulas && c?.formula) {
    text = c.formula;
    color = t.textMuted;
    italic = false;
    mono = true;
  }

  if (o.errorCells?.has(`${row},${col}`)) {
    fill = alpha(t.danger, 0.15);
    corner = t.danger;
  }

  return {
    text,
    color,
    fill,
    italic,
    bold: style?.bold,
    align: o.showFormulas && c?.formula ? "left" : align,
    wrap: !!style?.wrap,
    mono,
    hatch,
    corner,
  };
}

function inRef(ref: string, row: number, col: number): boolean {
  // "应收账款!H7:H29" 这种带表名的地址，这里只比坐标
  const body = ref.includes("!") ? ref.slice(ref.lastIndexOf("!") + 1) : ref;
  const [a, b] = body.split(":");
  const p = parseA1(a);
  const q = b ? parseA1(b) : p;
  return row >= Math.min(p[0], q[0]) && row <= Math.max(p[0], q[0]) && col >= Math.min(p[1], q[1]) && col <= Math.max(p[1], q[1]);
}

function parseA1(a: string): [number, number] {
  const m = /^\$?([A-Z]+)\$?(\d+)$/i.exec(a)!;
  let c = 0;
  for (const ch of m[1].toUpperCase()) c = c * 26 + ch.charCodeAt(0) - 64;
  return [Number(m[2]) - 1, c - 1];
}

export function paintCell(
  ctx: CanvasRenderingContext2D,
  model: SheetModel,
  row: number,
  col: number,
  rect: Rect,
  o: PaintOptions,
) {
  const { t } = o;
  const m = model.merge(row, col);
  // 合并块：整块的屏幕位置
  let block: Rect = rect;
  let anchorRow = row;
  let anchorCol = col;
  if (m) {
    let dx = 0;
    for (let c = m.c0; c < col; c++) dx += model.colWidth(c);
    let dy = 0;
    for (let r = m.r0; r < row; r++) dy += model.rowHeight(r);
    let w = 0;
    for (let c = m.c0; c <= m.c1; c++) w += model.colWidth(c);
    let h = 0;
    for (let r = m.r0; r <= m.r1; r++) h += model.rowHeight(r);
    block = { x: rect.x - dx, y: rect.y - dy, width: w, height: h };
    anchorRow = m.r0;
    anchorCol = m.c0;
  }

  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.width, rect.height);
  ctx.clip();

  const d = model.isLoaded(anchorRow)
    ? cellDisplay(model, anchorRow, anchorCol, o)
    : ({ text: "", color: t.text, fill: null, align: "left", wrap: false } as Display);

  ctx.fillStyle = d.fill ?? t.gridBg;
  ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
  if (d.hatch) drawHatch(ctx, block, t.manualHatch);

  // 网格线：只画块的右边和下边
  ctx.strokeStyle = t.gridLine;
  ctx.lineWidth = 1;
  ctx.beginPath();
  const right = block.x + block.width - 0.5;
  const bottom = block.y + block.height - 0.5;
  if (!m || col === m.c1) {
    ctx.moveTo(right, rect.y);
    ctx.lineTo(right, rect.y + rect.height);
  }
  if (!m || row === m.r1) {
    ctx.moveTo(rect.x, bottom);
    ctx.lineTo(rect.x + rect.width, bottom);
  }
  ctx.stroke();

  if (d.corner) {
    ctx.fillStyle = d.corner;
    ctx.beginPath();
    const s = 6;
    ctx.moveTo(block.x + block.width - 1 - s, block.y + 1);
    ctx.lineTo(block.x + block.width - 1, block.y + 1);
    ctx.lineTo(block.x + block.width - 1, block.y + 1 + s);
    ctx.closePath();
    ctx.fill();
  }

  if (d.text) drawText(ctx, d, block, t);

  // 区域边框（区域视图、拟写值视图）
  if (o.mode === "regions" || o.mode === "plan") {
    for (const r of model.regionAt(row, col)) {
      const focus = o.focusRegion === r.region;
      const colr = o.mode === "plan" ? alpha(t.planText, 0.55) : t.regionState[r.state];
      ctx.strokeStyle = colr;
      ctx.lineWidth = focus ? 2.5 : 1.5;
      if (r.state === "understanding" || r.state === "pending") ctx.setLineDash([4, 3]);
      ctx.beginPath();
      const inset = ctx.lineWidth / 2;
      if (row === r.box.r0) {
        ctx.moveTo(rect.x, rect.y + inset);
        ctx.lineTo(rect.x + rect.width, rect.y + inset);
      }
      if (row === r.box.r1 || (m && m.r1 >= r.box.r1 && row >= m.r0)) {
        const y = (m ? block.y + block.height : rect.y + rect.height) - inset;
        ctx.moveTo(rect.x, y);
        ctx.lineTo(rect.x + rect.width, y);
      }
      if (col === r.box.c0) {
        ctx.moveTo(rect.x + inset, rect.y);
        ctx.lineTo(rect.x + inset, rect.y + rect.height);
      }
      if (col === r.box.c1 || (m && m.c1 >= r.box.c1 && col >= m.c0)) {
        const x = (m ? block.x + block.width : rect.x + rect.width) - inset;
        ctx.moveTo(x, rect.y);
        ctx.lineTo(x, rect.y + rect.height);
      }
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }
  ctx.restore();
}

function drawHatch(ctx: CanvasRenderingContext2D, b: Rect, color: string) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = b.x - b.height; x < b.x + b.width; x += 7) {
    ctx.moveTo(x, b.y + b.height);
    ctx.lineTo(x + b.height, b.y);
  }
  ctx.stroke();
  ctx.restore();
}

function drawText(ctx: CanvasRenderingContext2D, d: Display, b: Rect, t: Tokens) {
  const pad = 6;
  let font = d.mono ? t.monoFont : t.font;
  if (d.bold) font = `600 ${font}`;
  if (d.italic) font = `italic ${font}`;
  ctx.font = font;
  ctx.fillStyle = d.color;
  ctx.textBaseline = "middle";
  const maxW = b.width - pad * 2;
  const lines = d.wrap ? wrapLines(ctx, d.text, maxW) : [ellipsize(ctx, d.text, maxW)];
  const lh = 17;
  const total = lines.length * lh;
  let y = b.y + b.height / 2 - total / 2 + lh / 2;
  if (d.wrap && total > b.height) y = b.y + lh / 2 + 2;
  for (const line of lines) {
    let x = b.x + pad;
    ctx.textAlign = "left";
    if (d.align === "right") {
      x = b.x + b.width - pad;
      ctx.textAlign = "right";
    } else if (d.align === "center") {
      x = b.x + b.width / 2;
      ctx.textAlign = "center";
    }
    ctx.fillText(line, x, y + 0.5);
    y += lh;
  }
}

function ellipsize(ctx: CanvasRenderingContext2D, s: string, w: number): string {
  if (ctx.measureText(s).width <= w) return s;
  let lo = 0;
  let hi = s.length;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (ctx.measureText(s.slice(0, mid) + "…").width <= w) lo = mid;
    else hi = mid - 1;
  }
  return s.slice(0, lo) + "…";
}

function wrapLines(ctx: CanvasRenderingContext2D, s: string, w: number): string[] {
  const out: string[] = [];
  let line = "";
  for (const ch of s) {
    if (ch === "\n") {
      out.push(line);
      line = "";
      continue;
    }
    if (ctx.measureText(line + ch).width > w && line) {
      out.push(line);
      line = ch;
    } else line += ch;
  }
  if (line) out.push(line);
  return out;
}
