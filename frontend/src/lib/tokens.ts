// 视觉变量：CSS 变量和画布绘制共用一份，浅色 / 深色两套。
import type { RegionState } from "../protocol/types";

export type ThemeMode = "light" | "dark";

export interface Tokens {
  mode: ThemeMode;
  font: string;
  monoFont: string;
  bg: string; // 应用底色
  panel: string; // 面板
  panelAlt: string;
  border: string;
  borderStrong: string;
  text: string;
  textMuted: string;
  textFaint: string;
  accent: string;
  accentHover: string; // 主按钮悬停、按下：比 accent 深，不要变浅（变浅像禁用）
  accentActive: string;
  accentSoft: string;
  // 表格
  gridBg: string;
  gridLine: string;
  gridHeaderBg: string;
  gridHeaderText: string;
  cellHeaderFill: string; // 底稿自身的表头格
  formulaTint: string;
  manualFill: string;
  manualHatch: string;
  planText: string;
  planFill: string;
  overwriteFill: string;
  overwriteText: string;
  staleText: string;
  writtenFill: string;
  selection: string;
  regionState: Record<RegionState, string>;
  danger: string;
  warning: string;
  success: string;
}

const font = `13px "Inter", -apple-system, "PingFang SC", "Microsoft YaHei", "Segoe UI", sans-serif`;
const monoFont = `12px "JetBrains Mono", "SFMono-Regular", Consolas, "Microsoft YaHei", monospace`;

export const LIGHT: Tokens = {
  mode: "light",
  font,
  monoFont,
  bg: "#f5f6f8",
  panel: "#ffffff",
  panelAlt: "#f9fafb",
  border: "#e6e8ec",
  borderStrong: "#d3d7de",
  text: "#1d2129",
  textMuted: "#5c6370",
  textFaint: "#9aa1ad",
  accent: "#3b6ff5",
  accentHover: "#2c5ce0",
  accentActive: "#234cc0",
  accentSoft: "#ebf0ff",
  gridBg: "#ffffff",
  gridLine: "#e8eaee",
  gridHeaderBg: "#f6f7f9",
  gridHeaderText: "#7a818d",
  cellHeaderFill: "#f2f4f7",
  formulaTint: "#f4f7fd",
  manualFill: "#f0f0f2",
  manualHatch: "rgba(120,124,135,0.18)",
  planText: "#2f5fe0",
  planFill: "#eef3ff",
  overwriteFill: "#fdecec",
  overwriteText: "#c62f2f",
  staleText: "#c27a12",
  writtenFill: "#ecf7f0",
  selection: "#3b6ff5",
  // 只有"等你确认"用强调色、失败用红；进行中和已完成都是灰，进行中靠转圈区分
  regionState: {
    pending: "#b4b9c2",
    understanding: "#7a818d",
    awaiting_confirmation: "#e08a0b",
    computing: "#7a818d",
    checking: "#7a818d",
    checked: "#5c6370",
    written: "#5c6370",
    manual: "#9aa1ad",
    failed: "#d64545",
    skipped: "#c9cdd4",
  },
  danger: "#d64545",
  warning: "#e08a0b",
  success: "#2e9e62",
};

export const DARK: Tokens = {
  ...LIGHT,
  mode: "dark",
  bg: "#16181d",
  panel: "#1e2027",
  panelAlt: "#23262e",
  border: "#2d3039",
  borderStrong: "#3a3e49",
  text: "#e6e8ec",
  textMuted: "#a3a9b5",
  textFaint: "#6c7280",
  accent: "#6b8fff",
  accentHover: "#829fff",
  accentActive: "#5a7ef0",
  accentSoft: "#26304d",
  gridBg: "#1b1d23",
  gridLine: "#2a2d35",
  gridHeaderBg: "#20232a",
  gridHeaderText: "#7d8492",
  cellHeaderFill: "#242832",
  formulaTint: "#1f2533",
  manualFill: "#262830",
  manualHatch: "rgba(160,165,178,0.14)",
  planText: "#8fadff",
  planFill: "#222c45",
  overwriteFill: "#3a2224",
  overwriteText: "#ff8a8a",
  staleText: "#e0a24a",
  writtenFill: "#1c3127",
  selection: "#6b8fff",
  regionState: {
    pending: "#555b66",
    understanding: "#8a909c",
    awaiting_confirmation: "#f0a63a",
    computing: "#8a909c",
    checking: "#8a909c",
    checked: "#a3a9b5",
    written: "#a3a9b5",
    manual: "#6c7280",
    failed: "#ff6b6b",
    skipped: "#454a54",
  },
  danger: "#ff6b6b",
  warning: "#f0a63a",
  success: "#4cc386",
};

export const REGION_STATE_LABEL: Record<RegionState, string> = {
  pending: "未开始",
  understanding: "识别中",
  awaiting_confirmation: "等你确认",
  computing: "计算中",
  checking: "核对中",
  checked: "核对通过",
  written: "已写入",
  manual: "人工填写",
  failed: "失败",
  skipped: "不需填写",
};

/** 给 #rrggbb 加透明度 */
export function alpha(hex: string, a: number): string {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

export function cssVars(t: Tokens): Record<string, string> {
  return {
    "--bg": t.bg,
    "--panel": t.panel,
    "--panel-alt": t.panelAlt,
    "--border": t.border,
    "--border-strong": t.borderStrong,
    "--text": t.text,
    "--text-muted": t.textMuted,
    "--text-faint": t.textFaint,
    "--accent": t.accent,
    "--accent-soft": t.accentSoft,
    "--danger": t.danger,
    "--warning": t.warning,
    "--success": t.success,
    "--grid-header-bg": t.gridHeaderBg,
    "--plan-text": t.planText,
    "--stale-text": t.staleText,
  };
}
