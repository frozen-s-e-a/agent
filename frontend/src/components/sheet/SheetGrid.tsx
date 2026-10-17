// 只读底稿表格：Glide Data Grid 做滚动和命中，格子全部自己画（见 paint.ts）。
// 第 0 列是行号（冻结）；文件里的冻结行画在列头区域里，滚动时不动。
import "@glideapps/glide-data-grid/dist/index.css";
import {
  CompactSelection,
  DataEditor,
  GridCellKind,
  type DataEditorRef,
  type GridCell,
  type GridColumn,
  type GridSelection,
  type Item,
  type Rectangle,
  type Theme,
} from "@glideapps/glide-data-grid";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { indexToCol, type RangeBox } from "../../lib/address";
import type { Tokens } from "../../lib/tokens";
import { paintCell, type PaintOptions, type SheetMode } from "./paint";
import type { RegionBox, SheetModel } from "./sheetModel";

const LETTER_H = 24;
const ROW_HEADER_W = 46;

export interface SheetGridProps {
  model: SheetModel;
  /** 模型里的数据变了（加载了新块、叠加层更新）就加一，触发重画 */
  version: number;
  tokens: Tokens;
  mode: SheetMode;
  showFormulas: boolean;
  selected: { row: number; col: number } | null;
  onSelect: (row: number, col: number, bounds: Rectangle | undefined) => void;
  focusRegion?: string | null;
  onNeedChunks?: (boxes: RangeBox[]) => void;
  /** 底部留白，避免悬浮输入框挡住最后几行 */
  bottomPadding?: number;
  manualOverride?: PaintOptions["manualOverride"];
  errorCells?: Set<string>;
  /** 在区域上叠加的 DOM（标签、拖拽柄），按区域的屏幕位置给出 */
  renderRegionOverlay?: (region: RegionBox, rect: { x: number; y: number; width: number; height: number }) => ReactNode;
  onContextMenu?: (row: number, col: number, x: number, y: number) => void;
  /** 让某个格滚到可见 */
  scrollTo?: { row: number; col: number; nonce: number } | null;
  onRangeSelect?: (box: RangeBox) => void;
}

export function SheetGrid(props: SheetGridProps) {
  const { model, tokens: t, mode, showFormulas, selected, focusRegion } = props;
  const ref = useRef<DataEditorRef>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [, setTick] = useState(0);
  const [size, setSize] = useState({ w: 800, h: 600 });
  const fr = model.freezeRows;
  const paintOpts: PaintOptions = useMemo(
    () => ({ t, mode, showFormulas, focusRegion, manualOverride: props.manualOverride, errorCells: props.errorCells }),
    [t, mode, showFormulas, focusRegion, props.manualOverride, props.errorCells],
  );
  const optsRef = useRef(paintOpts);
  optsRef.current = paintOpts;

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setSize({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    setSize({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, []);

  const columns: GridColumn[] = useMemo(() => {
    const cols: GridColumn[] = [{ id: "#", title: "", width: ROW_HEADER_W }];
    for (let c = 0; c < model.colCount; c++) cols.push({ id: String(c), title: indexToCol(c), width: model.colWidth(c) });
    return cols;
  }, [model]);

  const frozenHeight = useMemo(() => {
    let h = 0;
    for (let r = 0; r < fr; r++) h += model.rowHeight(r);
    return h;
  }, [model, fr]);

  const theme: Partial<Theme> = useMemo(
    () => ({
      accentColor: t.selection,
      accentLight: "rgba(59,111,245,0.10)",
      bgCell: t.gridBg,
      bgHeader: t.gridHeaderBg,
      bgHeaderHasFocus: t.gridHeaderBg,
      bgHeaderHovered: t.gridHeaderBg,
      textHeader: t.gridHeaderText,
      textDark: t.text,
      borderColor: "rgba(0,0,0,0)",
      horizontalBorderColor: "rgba(0,0,0,0)",
      headerBottomBorderColor: t.borderStrong,
      fontFamily: t.font.replace(/^\d+px\s*/, ""),
      baseFontStyle: "13px",
      headerFontStyle: "12px",
      bgSearchResult: "rgba(255,200,0,0.3)",
    }),
    [t],
  );

  const getCellContent = useCallback(
    ([c, r]: Item): GridCell => ({
      kind: GridCellKind.Text,
      data: "",
      displayData: "",
      allowOverlay: false,
      readonly: true,
      // 让画布按格重画时带上版本号
      themeOverride: undefined,
      ...(c === 0 ? {} : { copyData: model.cell(r + fr, c - 1)?.text ?? "" }),
    }),
    [model, fr],
  );

  const drawCell = useCallback(
    (args: { ctx: CanvasRenderingContext2D; col: number; row: number; rect: Rectangle }) => {
      const { ctx, col, row, rect } = args;
      const sheetRow = row + fr;
      if (col === 0) {
        drawRowHeader(ctx, rect, sheetRow, t, selected?.row === sheetRow);
        return;
      }
      paintCell(ctx, model, sheetRow, col - 1, rect, optsRef.current);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [model, fr, t, selected, paintOpts, props.version],
  );

  const drawHeader = useCallback(
    (args: { ctx: CanvasRenderingContext2D; columnIndex: number; rect: Rectangle }) => {
      const { ctx, columnIndex, rect } = args;
      ctx.save();
      ctx.beginPath();
      ctx.rect(rect.x, rect.y, rect.width, rect.height);
      ctx.clip();
      ctx.fillStyle = t.gridHeaderBg;
      ctx.fillRect(rect.x, rect.y, rect.width, LETTER_H);
      ctx.strokeStyle = t.gridLine;
      ctx.beginPath();
      ctx.moveTo(rect.x + rect.width - 0.5, rect.y);
      ctx.lineTo(rect.x + rect.width - 0.5, rect.y + LETTER_H);
      ctx.moveTo(rect.x, rect.y + LETTER_H - 0.5);
      ctx.lineTo(rect.x + rect.width, rect.y + LETTER_H - 0.5);
      ctx.stroke();
      const sheetCol = columnIndex - 1;
      if (columnIndex > 0) {
        const sel = selected?.col === sheetCol;
        ctx.font = `${sel ? "600 " : ""}12px ${t.font.replace(/^\d+px\s*/, "")}`;
        ctx.fillStyle = sel ? t.accent : t.gridHeaderText;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(indexToCol(sheetCol), rect.x + rect.width / 2, rect.y + LETTER_H / 2 + 0.5);
      }
      // 冻结行
      let y = rect.y + LETTER_H;
      for (let r = 0; r < fr; r++) {
        const h = model.rowHeight(r);
        const cellRect = { x: rect.x, y, width: rect.width, height: h };
        if (columnIndex === 0) drawRowHeader(ctx, cellRect, r, t, selected?.row === r);
        else paintCell(ctx, model, r, sheetCol, cellRect, optsRef.current);
        y += h;
      }
      if (fr > 0) {
        // 冻结线
        ctx.fillStyle = t.borderStrong;
        ctx.fillRect(rect.x, rect.y + rect.height - 2, rect.width, 2);
      }
      ctx.restore();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [model, fr, t, selected, paintOpts, props.version],
  );

  const gridSelection: GridSelection = useMemo(() => {
    const empty = { columns: CompactSelection.empty(), rows: CompactSelection.empty() };
    if (!selected || selected.row < fr) return empty;
    const m = model.merge(selected.row, selected.col);
    const box = m ?? { r0: selected.row, r1: selected.row, c0: selected.col, c1: selected.col };
    return {
      ...empty,
      current: {
        cell: [box.c0 + 1, box.r0 - fr],
        range: { x: box.c0 + 1, y: box.r0 - fr, width: box.c1 - box.c0 + 1, height: box.r1 - box.r0 + 1 },
        rangeStack: [],
      },
    };
  }, [selected, model, fr]);

  const onSelectionChange = useCallback(
    (sel: GridSelection) => {
      const cur = sel.current;
      if (!cur) return;
      const [c, r] = cur.cell;
      if (c === 0) return;
      const sheetRow = r + fr;
      const m = model.merge(sheetRow, c - 1);
      const row = m ? m.r0 : sheetRow;
      const col = m ? m.c0 : c - 1;
      const range = cur.range;
      if (range.width > 1 || range.height > 1) {
        props.onRangeSelect?.({ c0: range.x - 1, r0: range.y + fr, c1: range.x + range.width - 2, r1: range.y + range.height - 1 + fr });
      }
      props.onSelect(row, col, ref.current?.getBounds(col + 1, row - fr));
    },
    [model, fr, props],
  );

  const onHeaderClicked = useCallback(
    (colIndex: number, e: { localEventY: number; bounds: Rectangle }) => {
      if (colIndex === 0 || fr === 0) return;
      let y = e.localEventY - LETTER_H;
      if (y < 0) return;
      for (let r = 0; r < fr; r++) {
        y -= model.rowHeight(r);
        if (y < 0) {
          const m = model.merge(r, colIndex - 1);
          props.onSelect(m ? m.r0 : r, m ? m.c0 : colIndex - 1, e.bounds);
          return;
        }
      }
    },
    [model, fr, props],
  );

  const onVisibleRegionChanged = useCallback(
    (range: Rectangle) => {
      const boxes = model.missingChunks(range.y + fr, range.y + range.height + fr + 40);
      if (boxes.length) props.onNeedChunks?.(boxes);
      setTick((x) => x + 1);
    },
    [model, fr, props],
  );

  const visibleRef = useRef<Rectangle>({ x: 0, y: 0, width: 30, height: 60 });

  useEffect(() => {
    if (!props.scrollTo) return;
    const { row, col } = props.scrollTo;
    ref.current?.scrollTo(col + 1, Math.max(0, row - fr), "both", 0, 0, { vAlign: "center", hAlign: "center" });
  }, [props.scrollTo, fr]);

  const overlay = props.renderRegionOverlay;
  const wrapRect = wrapRef.current?.getBoundingClientRect();

  return (
    <div
      ref={wrapRef}
      className="sheet-grid"
      style={{ position: "relative", width: "100%", height: "100%", overflow: "hidden" }}
      onContextMenu={(e) => {
        if (!props.onContextMenu || !selected) return;
        e.preventDefault();
        props.onContextMenu(selected.row, selected.col, e.clientX, e.clientY);
      }}
    >
      <DataEditor
        ref={ref}
        width={size.w}
        height={size.h}
        columns={columns}
        rows={Math.max(0, model.rowCount - fr)}
        getCellContent={getCellContent}
        drawCell={drawCell}
        drawHeader={drawHeader}
        headerHeight={LETTER_H + frozenHeight}
        rowHeight={(r) => model.rowHeight(r + fr)}
        freezeColumns={1 + model.freezeCols}
        theme={theme}
        gridSelection={gridSelection}
        onGridSelectionChange={onSelectionChange}
        onHeaderClicked={(c, e) => onHeaderClicked(c, e)}
        onVisibleRegionChanged={(r) => {
          visibleRef.current = r;
          onVisibleRegionChanged(r);
        }}
        rowSelect="none"
        columnSelect="none"
        rangeSelect={props.onRangeSelect ? "rect" : "cell"}
        smoothScrollX
        smoothScrollY
        getCellsForSelection
        rightElement={<div style={{ width: 24 }} />}
        trailingRowOptions={undefined}
        experimental={{ paddingBottom: props.bottomPadding ?? 0 }}
      />
      {overlay && wrapRect && (
        <div className="sheet-overlay" style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
          {model.regions.map((r) => {
            const a = ref.current?.getBounds(r.box.c0 + 1, r.box.r0 - fr);
            const b = ref.current?.getBounds(r.box.c1 + 1, r.box.r1 - fr);
            if (!a || !b) return null;
            const rect = { x: a.x - wrapRect.left, y: a.y - wrapRect.top, width: b.x + b.width - a.x, height: b.y + b.height - a.y };
            // 区域滚出可视范围（或被冻结区挡住）时不画标签
            if (![rect.x, rect.y, rect.width, rect.height].every(Number.isFinite)) return null;
            if (rect.y + rect.height < LETTER_H + frozenHeight || rect.y > size.h) return null;
            return <div key={r.region}>{overlay(r, rect)}</div>;
          })}
        </div>
      )}
    </div>
  );
}

function drawRowHeader(ctx: CanvasRenderingContext2D, rect: Rectangle, sheetRow: number, t: Tokens, sel: boolean) {
  ctx.fillStyle = t.gridHeaderBg;
  ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
  ctx.strokeStyle = t.gridLine;
  ctx.beginPath();
  ctx.moveTo(rect.x + rect.width - 0.5, rect.y);
  ctx.lineTo(rect.x + rect.width - 0.5, rect.y + rect.height);
  ctx.moveTo(rect.x, rect.y + rect.height - 0.5);
  ctx.lineTo(rect.x + rect.width, rect.y + rect.height - 0.5);
  ctx.stroke();
  ctx.font = `${sel ? "600 " : ""}12px ${t.font.replace(/^\d+px\s*/, "")}`;
  ctx.fillStyle = sel ? t.accent : t.gridHeaderText;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(String(sheetRow + 1), rect.x + rect.width / 2, rect.y + rect.height / 2 + 0.5);
}
