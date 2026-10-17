// 假宿主的资料表（D-）和结果表（R-）。D-002 序时账按行号生成，和工作簿里的序时账一致。
import type { TableColumn, TableView } from "../../protocol/types";
import { JOURNAL_HEADERS, JOURNAL_ROWS, journalRow } from "./workbooks";

interface TableDef {
  title: string;
  columns: TableColumn[];
  total: number;
  row: (i: number) => { values: (string | null)[]; source?: { file: string; sheet: string; row: number }; invalid?: number[] };
}

const JOURNAL_MEANINGS = [
  "凭证日期",
  "凭证号",
  "分录号",
  "摘要",
  "科目编码",
  "科目名称",
  "辅助核算",
  "借方金额",
  "贷方金额",
  "往来单位",
  null,
  null,
  "会计年度",
  "会计期间",
];

const TB_ROWS: (string | null)[][] = [
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

const TOP5: (string | null)[][] = [
  ["C1001", "苏州恒信电子有限公司", "420000.00", "86"],
  ["C1007", "无锡宏达机械股份有限公司", "310000.00", "64"],
  ["C1012", "上海启明贸易有限公司", "265000.00", "52"],
  ["C1003", "南京瑞丰材料有限公司", "180000.00", "41"],
  ["C1020", "杭州远景科技有限公司", "125000.00", "23"],
  ["C1031", "常州博远包装有限公司", "98000.00", "19"],
  ["C1044", "宁波海川物流有限公司", "76000.00", "12"],
];

function aging(rows: string[][]): TableDef {
  return {
    title: "账龄分段",
    columns: [
      { key: "seg", name: "账龄段", type: "text" },
      { key: "n", name: "户数", type: "integer" },
      { key: "amt", name: "金额", type: "decimal" },
      { key: "cnt", name: "笔数", type: "integer" },
    ],
    total: rows.length,
    row: (i) => ({ values: rows[i] }),
  };
}

const TABLES: Record<string, TableDef> = {
  "D-001": {
    title: "科目余额表2025 · 余额表",
    columns: [
      { key: "code", name: "科目编码", type: "text", meaning: "科目编码" },
      { key: "name", name: "科目名称", type: "text", meaning: "科目名称" },
      { key: "open", name: "期初余额", type: "decimal", meaning: "期初余额（借正贷负）" },
      { key: "dr", name: "本期借方", type: "decimal", meaning: "本期借方发生额" },
      { key: "cr", name: "本期贷方", type: "decimal", meaning: "本期贷方发生额" },
      { key: "close", name: "期末余额", type: "decimal", meaning: "期末余额（借正贷负）" },
    ],
    total: TB_ROWS.length,
    row: (i) => ({ values: TB_ROWS[i], source: { file: "科目余额表2025.xlsx", sheet: "余额表", row: i + 4 } }),
  },
  "D-002": {
    title: "序时账2025 · 序时账",
    columns: JOURNAL_HEADERS.map((h, i) => ({
      key: `c${i}`,
      name: h,
      type: i === 7 || i === 8 ? "decimal" : i === 0 ? "date" : "text",
      meaning: JOURNAL_MEANINGS[i] ?? undefined,
    })),
    total: JOURNAL_ROWS,
    row: (i) => {
      const values = journalRow(i + 1);
      const invalid = values[7] != null && !/^[\d.]+$/.test(values[7]!) ? [7] : undefined;
      return { values, source: { file: "序时账2025.xlsx", sheet: "序时账", row: i + 2 }, invalid };
    },
  },
  "R-011": {
    title: "按客户汇总期末余额",
    columns: [
      { key: "code", name: "客户编码", type: "text" },
      { key: "name", name: "客户名称", type: "text" },
      { key: "amt", name: "期末余额", type: "decimal" },
      { key: "cnt", name: "笔数", type: "integer" },
    ],
    total: TOP5.length,
    row: (i) => ({ values: TOP5[i] }),
  },
  "R-012": {
    title: "按客户汇总（复算）",
    columns: [
      { key: "code", name: "客户编码", type: "text" },
      { key: "name", name: "客户名称", type: "text" },
      { key: "amt", name: "期末余额", type: "decimal" },
      { key: "cnt", name: "笔数", type: "integer" },
    ],
    total: TOP5.length,
    row: (i) => ({ values: TOP5[i] }),
  },
  "R-013": aging([
    ["1年以内", "38", "1199500.00", "1288"],
    ["1-2年", "12", "435000.00", "214"],
    ["2-3年", "5", "150000.00", "61"],
    ["3年以上", "2", "50000.00", "9"],
  ]),
  "R-014": aging([
    ["1年以内", "38", "1200000.00", "1289"],
    ["1-2年", "12", "435000.00", "214"],
    ["2-3年", "5", "150000.00", "61"],
    ["3年以上", "2", "50000.00", "9"],
  ]),
  "R-015": aging([
    ["1年以内", "38", "1200000.00", "1289"],
    ["1-2年", "12", "435000.00", "214"],
    ["2-3年", "5", "150000.00", "61"],
    ["3年以上", "2", "50000.00", "9"],
  ]),
};

export function hasTable(id: string) {
  return id.split("#")[0] in TABLES;
}

export function tableView(id: string, offset = 0, limit = 200, locate: number | null = null): TableView {
  const def = TABLES[id];
  if (!def) throw new Error(`没有表 ${id}`);
  const pageSize = Math.min(limit, 1000);
  let start = offset;
  let highlight: number | null = null;
  if (locate != null) {
    // D- 表 locate 是源文件行号，R- 表是结果行号（都从 1 开始）
    const idx = id.startsWith("D-002") ? locate - 2 : id.startsWith("D-001") ? locate - 4 : locate - 1;
    start = Math.max(0, Math.floor(idx / pageSize) * pageSize);
    highlight = idx;
  }
  const end = Math.min(def.total, start + pageSize);
  const rows = [];
  for (let i = start; i < end; i++) rows.push(def.row(i));
  return { table: id, title: def.title, columns: def.columns, rows, total: def.total, offset: start, highlight };
}

export function tableTitle(id: string) {
  return TABLES[id]?.title ?? id;
}
