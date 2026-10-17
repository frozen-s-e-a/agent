// 一张工作表在前端的数据：按块加载的格子、合并、行高列宽、冻结、叠加的区域。
import { colToIndex, parseCell, parseRange, type RangeBox } from "../../lib/address";
import type { SheetCell, SheetRegionOverlay, SheetView } from "../../protocol/types";

export const DEFAULT_ROW_PX = 22;
export const DEFAULT_COL_PX = 72;
const MAX_CELLS_PER_REQUEST = 5000; // 接口约定 4.5：sheet.view 单次最多 5,000 格

export interface ModelCell extends SheetCell {
  col: number;
  row: number;
}

export interface RegionBox extends SheetRegionOverlay {
  box: RangeBox;
}

/** Excel 列宽（字符数）→ 像素；行高（磅）→ 像素 */
export const colPx = (chars: number) => Math.round(chars * 7 + 5);
export const rowPx = (pt: number) => Math.round((pt * 4) / 3);

export class SheetModel {
  readonly sheet: string;
  readonly sheets: { name: string; hidden?: boolean }[];
  readonly used: RangeBox;
  readonly freezeRows: number;
  readonly freezeCols: number;
  readonly merges: RangeBox[];
  regions: RegionBox[];
  private cells = new Map<number, ModelCell>();
  private mergeAt = new Map<number, RangeBox>();
  private colWidths: number[] = [];
  private rowHeights = new Map<number, number>();
  private loadedRows: [number, number][] = [];
  private pending = new Set<string>();
  version = 0;

  constructor(first: SheetView) {
    this.sheet = first.sheet;
    this.sheets = first.sheets ?? [{ name: first.sheet }];
    this.used = parseRange(first.usedRange ?? first.range);
    this.freezeRows = first.freeze?.rows ?? 0;
    this.freezeCols = first.freeze?.cols ?? 0;
    this.merges = first.merges.map((m) => parseRange(m));
    for (const m of this.merges)
      for (let r = m.r0; r <= m.r1; r++) for (let c = m.c0; c <= m.c1; c++) this.mergeAt.set(key(r, c), m);
    for (let c = 0; c <= this.used.c1; c++) this.colWidths[c] = DEFAULT_COL_PX;
    for (const [col, w] of Object.entries(first.colWidths)) this.colWidths[colToIndex(col)] = colPx(w);
    for (const [row, h] of Object.entries(first.rowHeights)) this.rowHeights.set(Number(row) - 1, rowPx(h));
    this.regions = toRegions(first);
    this.ingest(first);
  }

  get rowCount() {
    return this.used.r1 + 1;
  }
  get colCount() {
    return this.used.c1 + 1;
  }

  ingest(view: SheetView) {
    const box = parseRange(view.range);
    for (const c of view.cells) {
      const p = parseCell(c.cell);
      this.cells.set(key(p.row, p.col), { ...c, col: p.col, row: p.row });
    }
    this.loadedRows.push([box.r0, box.r1]);
    if (view.overlay?.regions) this.regions = toRegions(view);
    this.version++;
  }

  cell(row: number, col: number): ModelCell | undefined {
    return this.cells.get(key(row, col));
  }

  merge(row: number, col: number): RangeBox | undefined {
    return this.mergeAt.get(key(row, col));
  }

  colWidth(col: number) {
    return this.colWidths[col] ?? DEFAULT_COL_PX;
  }
  rowHeight(row: number) {
    return this.rowHeights.get(row) ?? DEFAULT_ROW_PX;
  }

  isLoaded(row: number) {
    return this.loadedRows.some(([a, b]) => row >= a && row <= b);
  }

  /** 可见行范围里还没加载的块，按 5,000 格一块切 */
  missingChunks(r0: number, r1: number): RangeBox[] {
    const rowsPerChunk = Math.max(1, Math.floor(MAX_CELLS_PER_REQUEST / this.colCount));
    const out: RangeBox[] = [];
    const first = Math.floor(r0 / rowsPerChunk);
    const last = Math.floor(Math.min(r1, this.used.r1) / rowsPerChunk);
    for (let i = first; i <= last; i++) {
      const a = i * rowsPerChunk;
      const b = Math.min(this.used.r1, a + rowsPerChunk - 1);
      const id = `${a}`;
      if (this.isLoaded(a) || this.pending.has(id)) continue;
      this.pending.add(id);
      out.push({ r0: a, r1: b, c0: 0, c1: this.used.c1 });
    }
    return out;
  }

  regionAt(row: number, col: number): RegionBox[] {
    return this.regions.filter((r) => row >= r.box.r0 && row <= r.box.r1 && col >= r.box.c0 && col <= r.box.c1);
  }
}

function key(r: number, c: number) {
  return r * 16384 + c;
}

function toRegions(view: SheetView): RegionBox[] {
  return (view.overlay?.regions ?? []).map((r) => ({ ...r, box: parseRange(r.range) }));
}
