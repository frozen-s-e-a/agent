// Glide Data Grid 小验证：多级表头合并、冻结表头、叠加层、大表分块。打开 /?spike=grid
import { Segmented, Select, Switch } from "antd";
import { useMemo, useState } from "react";
import { FakeHost } from "../host/fake/FakeHost";
import { SheetGrid } from "../components/sheet/SheetGrid";
import { useSheet } from "../components/sheet/useSheet";
import type { SheetMode } from "../components/sheet/paint";
import { DARK, LIGHT, REGION_STATE_LABEL } from "../lib/tokens";

const params = new URLSearchParams(location.search);

export function GridSpike() {
  const host = useMemo(() => {
    const h = new FakeHost();
    h.jumpTo(Number(params.get("seq") ?? 66));
    return h;
  }, []);
  const [file, setFile] = useState(params.get("file") ?? "F-9a1be04c77d2");
  const [sheet, setSheet] = useState<string | undefined>(params.get("sheet") ?? undefined);
  const [mode, setMode] = useState<SheetMode>((params.get("mode") as SheetMode) ?? "regions");
  const [formulas, setFormulas] = useState(params.get("formulas") === "1");
  const [sel, setSel] = useState<{ row: number; col: number } | null>(null);
  const dark = params.get("dark") === "1";
  const t = dark ? DARK : LIGHT;
  const overlay = mode === "plan" ? { workpaper: "W-003", plan: "FP-001" } : mode === "regions" ? { workpaper: "W-003" } : undefined;
  const realFile = mode === "filled" && file === "F-9a1be04c77d2" ? "输出/T-0c21/应收账款底稿-填写成果.xlsx" : file;
  const { model, version, loadChunks, error } = useSheet(host, { file: realFile, sheet, overlay });
  const cell = sel && model?.cell(sel.row, sel.col);
  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: t.bg, color: t.text, fontFamily: t.font }}>
      <div style={{ display: "flex", gap: 12, padding: 8, alignItems: "center" }}>
        <Select value={file} onChange={(f) => { setFile(f); setSheet(undefined); }} style={{ width: 200 }}
          options={[{ value: "F-9a1be04c77d2", label: "应收账款底稿" }, { value: "F-1c44d0e2a7b9", label: "科目余额表" }, { value: "F-6e02f5a1c3d8", label: "序时账（48,209 行）" }]} />
        <Segmented value={mode} onChange={(v) => setMode(v as SheetMode)} options={[{ value: "raw", label: "原样" }, { value: "regions", label: "区域" }, { value: "plan", label: "拟写值" }, { value: "filled", label: "已填" }]} />
        <span>显示公式 <Switch size="small" checked={formulas} onChange={setFormulas} /></span>
        <span style={{ fontFamily: t.monoFont, color: t.textMuted }}>
          {sel ? `${String.fromCharCode(65 + sel.col)}${sel.row + 1}` : ""} {cell?.formula ?? cell?.text ?? ""}
        </span>
        {error && <span style={{ color: t.danger }}>{error}</span>}
      </div>
      <div style={{ flex: 1, minHeight: 0, borderTop: `1px solid ${t.border}` }}>
        {model && (
          <SheetGrid model={model} version={version} tokens={t} mode={mode} showFormulas={formulas} selected={sel}
            onSelect={(row, col) => setSel({ row, col })} onNeedChunks={loadChunks} focusRegion={params.get("focus")}
            renderRegionOverlay={mode === "regions" ? (r, rect) => (
              <div style={{ position: "absolute", right: `calc(100% - ${rect.x + rect.width - 2}px)`, top: rect.y - 10, background: t.regionState[r.state], color: "#fff", fontSize: 11, padding: "1px 6px", borderRadius: 4, whiteSpace: "nowrap" }}>
                {r.region.split("#")[1]} {r.purpose} · {REGION_STATE_LABEL[r.state]}
              </div>
            ) : undefined} />
        )}
      </div>
      <div style={{ display: "flex", gap: 4, padding: 4, borderTop: `1px solid ${t.border}` }}>
        {model?.sheets.map((s) => (
          <button key={s.name} onClick={() => setSheet(s.name)} style={{ fontWeight: s.name === model.sheet ? 600 : 400 }}>{s.name}</button>
        ))}
      </div>
    </div>
  );
}
