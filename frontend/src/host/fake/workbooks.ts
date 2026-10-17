// 假宿主用的工作簿数据：和回放文件里的底稿、资料一一对应。
// 应收账款底稿的"审定表"按注册会计师协会公开底稿的审定表格式排了两级表头，用来验证合并单元格和冻结表头。

import { formatDecimal } from "../../lib/numfmt";
import type { SheetCell } from "../../protocol/types";

export interface FixtureCell {
  v?: string | null;
  f?: string;
  fmt?: string;
  t?: SheetCell["valueType"];
  stale?: boolean;
  style?: SheetCell["style"];
}

export interface FixtureSheet {
  name: string;
  usedRange: string;
  cells: Record<string, FixtureCell>;
  merges: string[];
  rowHeights: Record<string, number>;
  colWidths: Record<string, number>;
  freeze?: { rows: number; cols: number };
  /** 大表按行生成，不预先放进 cells */
  rowGen?: { fromRow: number; toRow: number; gen: (row: number) => (FixtureCell | null)[] };
}

export interface FixtureWorkbook {
  file: string;
  name: string;
  sheets: FixtureSheet[];
}

const AMT = "#,##0.00";
const PCT = "0.00%";
const bold = { bold: true } as const;
const center = { align: "center" } as const;
const head = { bold: true, align: "center", fill: "header" } as const;

function sheet(name: string, init: Partial<FixtureSheet>): FixtureSheet {
  return { name, usedRange: "A1:A1", cells: {}, merges: [], rowHeights: {}, colWidths: {}, ...init };
}

// ---------- 应收账款底稿.xlsx ----------

function arSheet(): FixtureSheet {
  const s = sheet("应收账款", {
    usedRange: "A1:F22",
    colWidths: { A: 16, B: 22, C: 18, D: 14, E: 26, F: 12 },
    rowHeights: { "1": 30 },
  });
  const c = s.cells;
  c.A1 = { v: "应收账款审计工作底稿", style: { bold: true, align: "center" } };
  s.merges.push("A1:F1");
  c.A2 = { v: "被审计单位：华东示例制造有限公司" };
  s.merges.push("A2:C2");
  c.E2 = { v: "索引号：ZD-3" };
  c.F2 = { v: "单位：元", style: { align: "right" } };
  c.A3 = { v: "会计期间：2025年度" };
  s.merges.push("A3:C3");
  c.E3 = { v: "编制人：" };

  c.A4 = { v: "一、账龄分析", style: bold };
  s.merges.push("A4:F4");
  // 两级表头：A5:A6、B5:B6、E5:E6 纵向合并，C5:D5 横向合并
  c.A5 = { v: "账龄", style: head };
  c.B5 = { v: "户数", style: head };
  c.C5 = { v: "期末余额", style: head };
  c.C6 = { v: "金额", style: head };
  c.D6 = { v: "占比", style: head };
  c.E5 = { v: "坏账准备计提说明", style: head };
  s.merges.push("A5:A6", "B5:B6", "C5:D5", "E5:E6");
  const ages = ["1年以内", "1-2年", "2-3年", "3年以上"];
  ages.forEach((a, i) => {
    const r = 7 + i;
    c[`A${r}`] = { v: a };
    c[`B${r}`] = { v: null, fmt: "0" };
    c[`C${r}`] = { v: null, fmt: AMT };
    c[`D${r}`] = { f: `=IF($C$11=0,"",C${r}/$C$11)`, v: "", t: "string", fmt: PCT };
    c[`E${r}`] = { v: null, style: { wrap: true } };
  });
  c.A11 = { v: "合计", style: { bold: true, align: "center" } };
  c.B11 = { f: "=SUM(B7:B10)", v: "0", fmt: "0" };
  c.C11 = { f: "=SUM(C7:C10)", v: "0", fmt: AMT };
  c.D11 = { f: "=SUM(D7:D10)", v: "0", fmt: PCT };

  c.A13 = { v: "二、期末余额前五名", style: bold };
  s.merges.push("A13:F13");
  c.A15 = { v: "客户编码", style: head };
  c.B15 = { v: "客户名称", style: head };
  c.C15 = { v: "期末余额", style: head };
  c.D15 = { v: "占应收账款期末余额比例", style: { ...head, wrap: true } };
  s.rowHeights["15"] = 36;
  for (let r = 16; r <= 20; r++) {
    c[`A${r}`] = { v: null };
    c[`B${r}`] = { v: null };
    c[`C${r}`] = { v: null, fmt: AMT };
    c[`D${r}`] = { f: `=IF($C$11=0,"",C${r}/$C$11)`, v: "", t: "string", fmt: PCT };
  }
  c.A22 = { v: "审计说明：", style: bold };
  c.B22 = { v: null, style: { wrap: true } };
  s.merges.push("B22:F22");
  s.rowHeights["22"] = 48;
  return s;
}

function leadSheet(): FixtureSheet {
  const s = sheet("审定表", {
    usedRange: "A1:I14",
    colWidths: { A: 22, B: 15, C: 12, D: 12, E: 12, F: 12, G: 15, H: 15, I: 9 },
    rowHeights: { "1": 30, "12": 60 },
    freeze: { rows: 5, cols: 1 },
  });
  const c = s.cells;
  c.A1 = { v: "应收账款审定表", style: { bold: true, align: "center" } };
  s.merges.push("A1:I1");
  c.A2 = { v: "被审计单位：华东示例制造有限公司" };
  s.merges.push("A2:D2");
  c.H2 = { v: "索引号：ZD-1" };
  s.merges.push("H2:I2");
  c.A3 = { v: "截止日：2025-12-31" };
  c.I3 = { v: "单位：元", style: { align: "right" } };
  c.A4 = { v: "项目名称", style: head };
  c.B4 = { v: "期末未审数", style: head };
  c.C4 = { v: "账项调整", style: head };
  c.C5 = { v: "借方", style: head };
  c.D5 = { v: "贷方", style: head };
  c.E4 = { v: "重分类调整", style: head };
  c.E5 = { v: "借方", style: head };
  c.F5 = { v: "贷方", style: head };
  c.G4 = { v: "期末审定数", style: head };
  c.H4 = { v: "上期末审定数", style: head };
  c.I4 = { v: "索引号", style: head };
  s.merges.push("A4:A5", "B4:B5", "C4:D4", "E4:F4", "G4:G5", "H4:H5", "I4:I5");
  const rows: [string, string | null, string][] = [
    ["应收账款账面余额", "1835000.00", "ZD-3"],
    ["减：坏账准备", "91750.00", "ZD-4"],
    ["应收账款账面价值", null, ""],
  ];
  rows.forEach(([label, amt, idx], i) => {
    const r = 6 + i;
    c[`A${r}`] = { v: label };
    if (amt == null) {
      c[`B${r}`] = { f: "=B6-B7", v: "1743250.00", fmt: AMT };
    } else c[`B${r}`] = { v: amt, fmt: AMT };
    for (const col of ["C", "D", "E", "F"]) c[`${col}${r}`] = { v: null, fmt: AMT };
    // 程序生成后没在 Excel 里保存过：公式没有缓存值
    c[`G${r}`] = { f: `=B${r}+C${r}-D${r}+E${r}-F${r}`, v: null, stale: true, fmt: AMT };
    c[`H${r}`] = { v: ["1620000.00", "81000.00", "1539000.00"][i], fmt: AMT };
    c[`I${r}`] = { v: idx, style: center };
  });
  c.A9 = { v: "合计", style: { bold: true, align: "center" } };
  c.B9 = { f: "=B8", v: "1743250.00", fmt: AMT };
  c.G9 = { f: "=G8", v: null, stale: true, fmt: AMT };
  c.H9 = { f: "=H8", v: "1539000.00", fmt: AMT };
  c.A11 = { v: "审计结论：", style: bold };
  c.A12 = {
    v: "经审计，应收账款期末余额可以确认。坏账准备计提比例与以前年度一致，账龄划分依据凭证日期，与公司会计政策相符。",
    style: { wrap: true },
  };
  s.merges.push("A12:I14");
  return s;
}

// ---------- 科目余额表2025.xlsx ----------

function tbSheet(): FixtureSheet {
  const s = sheet("余额表", {
    usedRange: "A1:H14",
    colWidths: { A: 12, B: 24, C: 16, D: 16, E: 16, F: 16, G: 16, H: 16 },
    freeze: { rows: 3, cols: 0 },
  });
  const c = s.cells;
  c.A1 = { v: "科目余额表（2025年1-12月）", style: bold };
  s.merges.push("A1:H1");
  c.A2 = { v: "科目编码", style: head };
  c.B2 = { v: "科目名称", style: head };
  c.C2 = { v: "期初余额", style: head };
  c.E2 = { v: "本期发生额", style: head };
  c.G2 = { v: "期末余额", style: head };
  c.C3 = { v: "借方", style: head };
  c.D3 = { v: "贷方", style: head };
  c.E3 = { v: "借方", style: head };
  c.F3 = { v: "贷方", style: head };
  c.G3 = { v: "借方", style: head };
  c.H3 = { v: "贷方", style: head };
  s.merges.push("A2:A3", "B2:B3", "C2:D2", "E2:F2", "G2:H2");
  const rows: [string, string, string, string, string, string][] = [
    ["1001", "库存现金", "35000.00", "1260000.00", "1248000.00", "47000.00"],
    ["1002", "银行存款", "4820000.00", "38600000.00", "37950000.00", "5470000.00"],
    ["1122", "应收账款", "1620000.00", "9860000.00", "9645000.00", "1835000.00"],
    ["1123", "预付账款", "210000.00", "860000.00", "905000.00", "165000.00"],
    ["1221", "其他应收款", "88000.00", "312000.00", "296000.00", "104000.00"],
    ["1231", "坏账准备", "-81000.00", "0.00", "10750.00", "-91750.00"],
    ["1403", "原材料", "2360000.00", "11800000.00", "11560000.00", "2600000.00"],
    ["1405", "库存商品", "3150000.00", "15200000.00", "15380000.00", "2970000.00"],
    ["1601", "固定资产", "12800000.00", "960000.00", "120000.00", "13640000.00"],
    ["2202", "应付账款", "-2680000.00", "8950000.00", "9120000.00", "-2850000.00"],
    ["6001", "主营业务收入", "0.00", "36400000.00", "36400000.00", "0.00"],
  ];
  rows.forEach(([code, name, open, dr, cr, close], i) => {
    const r = 4 + i;
    c[`A${r}`] = { v: code };
    c[`B${r}`] = { v: name };
    const split = (x: string): [string | null, string | null] =>
      x.startsWith("-") ? [null, x.slice(1)] : [x, null];
    const [od, oc] = split(open);
    const [cd, cc] = split(close);
    c[`C${r}`] = { v: od, fmt: AMT };
    c[`D${r}`] = { v: oc, fmt: AMT };
    c[`E${r}`] = { v: dr, fmt: AMT };
    c[`F${r}`] = { v: cr, fmt: AMT };
    c[`G${r}`] = { v: cd, fmt: AMT };
    c[`H${r}`] = { v: cc, fmt: AMT };
  });
  return s;
}

// ---------- 序时账2025.xlsx（48,209 行，按需生成） ----------

const CUSTOMERS = [
  ["C1001", "苏州恒信电子有限公司"],
  ["C1007", "无锡宏达机械股份有限公司"],
  ["C1012", "上海启明贸易有限公司"],
  ["C1003", "南京瑞丰材料有限公司"],
  ["C1020", "杭州远景科技有限公司"],
  ["C1031", "常州博远包装有限公司"],
  ["C1044", "宁波海川物流有限公司"],
];
const ACCOUNTS = [
  ["1122", "应收账款"],
  ["6001", "主营业务收入"],
  ["1002", "银行存款"],
  ["2221", "应交税费"],
  ["2202", "应付账款"],
  ["1403", "原材料"],
];

function hash(n: number): number {
  let x = (n + 0x9e3779b9) | 0;
  x = Math.imul(x ^ (x >>> 16), 0x85ebca6b);
  x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35);
  return (x ^ (x >>> 16)) >>> 0;
}

export const JOURNAL_ROWS = 48209;

export function journalRow(dataRow: number): (string | null)[] {
  // dataRow 从 1 开始，对应工作表第 dataRow+1 行
  const h = hash(dataRow);
  const day = Math.floor(((dataRow - 1) / JOURNAL_ROWS) * 365);
  const date = new Date(Date.UTC(2025, 0, 1 + day)).toISOString().slice(0, 10);
  const voucher = `记-${String(Math.floor(dataRow / 3) + 1).padStart(5, "0")}`;
  const [code, name] = ACCOUNTS[h % ACCOUNTS.length];
  const cust = code === "1122" ? CUSTOMERS[(h >>> 4) % CUSTOMERS.length] : null;
  const amount = `${(h % 900000) + 1000}.${String(h % 100).padStart(2, "0")}`;
  const debit = (h >>> 8) % 2 === 0;
  const summary = cust ? `${debit ? "销售商品" : "收回货款"} 发票号${(h % 90000000) + 10000000}` : "日常业务";
  let debitV: string | null = debit ? amount : null;
  if (dataRow === 102) debitV = "12万"; // 回放里差异卡的候选原因
  return [
    date,
    voucher,
    String((dataRow % 3) + 1),
    summary,
    code,
    name,
    cust ? cust[0] : null,
    debitV,
    debit ? null : amount,
    cust ? cust[1] : null,
    "张会计",
    "李主管",
    "2025",
    String(Number(date.slice(5, 7))),
  ];
}

export const JOURNAL_HEADERS = [
  "日期",
  "凭证号",
  "分录号",
  "摘要",
  "科目编码",
  "科目名称",
  "辅助核算编码",
  "借方金额",
  "贷方金额",
  "往来单位",
  "制单人",
  "审核人",
  "会计年度",
  "期间",
];

function journalSheet(): FixtureSheet {
  const s = sheet("序时账", {
    usedRange: `A1:N${JOURNAL_ROWS + 1}`,
    colWidths: { A: 12, B: 11, C: 7, D: 30, E: 10, F: 14, G: 12, H: 14, I: 14, J: 24, K: 9, L: 9, M: 9, N: 6 },
    freeze: { rows: 1, cols: 0 },
  });
  JOURNAL_HEADERS.forEach((h, i) => {
    s.cells[`${String.fromCharCode(65 + i)}1`] = { v: h, style: head };
  });
  s.rowGen = {
    fromRow: 2,
    toRow: JOURNAL_ROWS + 1,
    gen: (row) =>
      journalRow(row - 1).map((v, i) => {
        if (v == null) return null;
        if (i === 7 || i === 8) return /^[\d.]+$/.test(v) ? { v, fmt: AMT } : { v, t: "string" };
        return { v };
      }),
  };
  return s;
}

// ---------- 工作簿登记 ----------

export const WORKBOOKS: Record<string, FixtureWorkbook> = {
  "F-9a1be04c77d2": { file: "F-9a1be04c77d2", name: "应收账款底稿.xlsx", sheets: [arSheet(), leadSheet()] },
  "F-1c44d0e2a7b9": { file: "F-1c44d0e2a7b9", name: "科目余额表2025.xlsx", sheets: [tbSheet()] },
  "F-6e02f5a1c3d8": { file: "F-6e02f5a1c3d8", name: "序时账2025.xlsx", sheets: [journalSheet()] },
};

// ---------- 写入计划 FP-001 与成果 ----------

export interface PlanCell {
  value?: string;
  from?: string;
  overwrite?: boolean;
  manual?: boolean;
  stale?: boolean;
}

const AGE_ROWS = [
  ["38", "1200000.00"],
  ["12", "435000.00"],
  ["5", "150000.00"],
  ["2", "50000.00"],
];
const TOP5 = [
  ["C1001", "苏州恒信电子有限公司", "420000.00", "0.228883"],
  ["C1007", "无锡宏达机械股份有限公司", "310000.00", "0.168937"],
  ["C1012", "上海启明贸易有限公司", "265000.00", "0.144414"],
  ["C1003", "南京瑞丰材料有限公司", "180000.00", "0.098093"],
  ["C1020", "杭州远景科技有限公司", "125000.00", "0.068120"],
];
const AGE_PCT = ["0.653951", "0.237057", "0.081744", "0.027248"];

/** 拟写格和受影响的公式格（重算后的值）；D11 模拟重算失败，标待重算 */
export function planCells(): Record<string, PlanCell> {
  const p: Record<string, PlanCell> = {};
  AGE_ROWS.forEach(([n, amt], i) => {
    const r = 7 + i;
    p[`B${r}`] = { value: n, from: `R-014#${i + 1}` };
    p[`C${r}`] = { value: amt, from: `R-014#${i + 1}` };
    p[`D${r}`] = { value: AGE_PCT[i] };
    p[`E${r}`] = { manual: true };
  });
  p.B11 = { value: "57" };
  p.C11 = { value: "1835000.00" };
  p.D11 = { stale: true };
  TOP5.forEach(([code, name, amt, pct], i) => {
    const r = 16 + i;
    p[`A${r}`] = { value: code, from: `R-011#${i + 1}` };
    p[`B${r}`] = { value: name, from: `R-011#${i + 1}` };
    p[`C${r}`] = { value: amt, from: `R-011#${i + 1}` };
    p[`D${r}`] = { value: pct };
  });
  return p;
}

/** 成果文件里已写入的格 */
export function filledCells(): Record<string, { v: string; from?: string }> {
  const out: Record<string, { v: string; from?: string }> = {};
  for (const [addr, pc] of Object.entries(planCells())) {
    if (pc.manual) continue;
    if (pc.stale) {
      out[addr] = { v: "1.0000" };
      continue;
    }
    if (pc.value != null) out[addr] = { v: pc.value, from: pc.from };
  }
  out.D11 = { v: "1.0000" };
  return out;
}

export const OUTPUT_FILES: Record<string, { base: string; name: string }> = {
  "输出/T-0c21/应收账款底稿-填写成果.xlsx": { base: "F-9a1be04c77d2", name: "应收账款底稿-填写成果.xlsx" },
};

export function cellText(c: FixtureCell): string {
  if (c.v == null) return "";
  if (c.t === "string") return c.v;
  if (c.fmt && /^-?[\d.]+$/.test(c.v)) return formatDecimal(c.v, c.fmt);
  return c.v;
}
