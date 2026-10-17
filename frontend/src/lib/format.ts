import { formatDecimal } from "./numfmt";

export const amt = (v: string | null | undefined) => (v == null || v === "" ? "—" : formatDecimal(v, "#,##0.00"));

export function since(iso: string, now = Date.now()) {
  const s = Math.max(0, Math.round((now - Date.parse(iso)) / 1000));
  if (s < 60) return `${s} 秒`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} 分钟`;
  return `${Math.floor(m / 60)} 小时 ${m % 60} 分钟`;
}

export function relTime(iso: string, now = Date.now()) {
  const d = new Date(iso);
  const diff = now - d.getTime();
  if (diff < 60_000) return "刚刚";
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)} 分钟前`;
  const today = new Date(now);
  if (d.toDateString() === today.toDateString()) return d.toTimeString().slice(0, 5);
  const y = new Date(now - 86400_000);
  if (d.toDateString() === y.toDateString()) return "昨天";
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}

export function regionShort(region: string) {
  return region.split("#")[1] ?? region;
}

export const STAGES: { stage: string; label: string }[] = [
  { stage: "understand", label: "理解" },
  { stage: "workpaper", label: "底稿" },
  { stage: "data", label: "资料" },
  { stage: "basis", label: "口径" },
  { stage: "compute", label: "计算" },
  { stage: "fill", label: "填写" },
  { stage: "notes", label: "说明" },
  { stage: "review", label: "复核" },
];

export const BASIS_LABEL: Record<string, string> = {
  user: "你说的",
  confirmed: "已确认",
  template: "底稿标示",
  profile: "项目档案",
  data: "资料",
  inferred: "推断",
};

export const CHECK_LABEL: Record<string, string> = {
  semantics: "区域含义校验",
  data_quality: "数据质量",
  basis_complete: "口径要素齐全",
  conservation: "行数金额守恒",
  control: "控制数核对",
  compare: "双路复算",
  readback: "写入回读",
  formulas: "公式完好",
  crossFoot: "横竖加总",
  untouched: "其他格未改动",
  completeness: "待填格全部填写",
  excel: "Excel 重算一致",
  traceable: "每个数可追溯",
};
