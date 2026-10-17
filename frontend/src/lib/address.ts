// 单元格地址：列字母 ↔ 序号，区域解析。行列都按 Excel 习惯从 1 开始的地址，内部用 0 起的下标。

export function colToIndex(col: string): number {
  let n = 0;
  for (const ch of col.toUpperCase()) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}

export function indexToCol(index: number): string {
  let s = "";
  let n = index + 1;
  while (n > 0) {
    const m = (n - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

export interface CellPos {
  col: number; // 0 起
  row: number; // 0 起
}

export interface RangeBox {
  c0: number;
  r0: number;
  c1: number; // 含
  r1: number; // 含
}

/** 拆出工作表名：`'2025 明细'!B3` → ["2025 明细", "B3"] */
export function splitSheet(ref: string): [string | null, string] {
  const i = ref.lastIndexOf("!");
  if (i < 0) return [null, ref];
  let sheet = ref.slice(0, i);
  if (sheet.startsWith("'") && sheet.endsWith("'")) sheet = sheet.slice(1, -1).replace(/''/g, "'");
  return [sheet, ref.slice(i + 1)];
}

export function parseCell(addr: string): CellPos {
  const m = /^\$?([A-Za-z]+)\$?(\d+)$/.exec(addr.trim());
  if (!m) throw new Error(`无效单元格地址：${addr}`);
  return { col: colToIndex(m[1]), row: Number(m[2]) - 1 };
}

export function parseRange(range: string): RangeBox {
  const [, body] = splitSheet(range);
  const [a, b] = body.split(":");
  const p = parseCell(a);
  const q = b ? parseCell(b) : p;
  return {
    c0: Math.min(p.col, q.col),
    r0: Math.min(p.row, q.row),
    c1: Math.max(p.col, q.col),
    r1: Math.max(p.row, q.row),
  };
}

export function cellAddr(col: number, row: number): string {
  return `${indexToCol(col)}${row + 1}`;
}

export function rangeAddr(b: RangeBox): string {
  const a = cellAddr(b.c0, b.r0);
  const z = cellAddr(b.c1, b.r1);
  return a === z ? a : `${a}:${z}`;
}

export function inBox(b: RangeBox, col: number, row: number): boolean {
  return col >= b.c0 && col <= b.c1 && row >= b.r0 && row <= b.r1;
}

export function boxCells(b: RangeBox): number {
  return (b.c1 - b.c0 + 1) * (b.r1 - b.r0 + 1);
}

export function quoteSheet(sheet: string): string {
  return /^[\p{L}\p{N}_]+$/u.test(sheet) ? sheet : `'${sheet.replace(/'/g, "''")}'`;
}

export function withSheet(sheet: string, addr: string): string {
  return `${quoteSheet(sheet)}!${addr}`;
}
