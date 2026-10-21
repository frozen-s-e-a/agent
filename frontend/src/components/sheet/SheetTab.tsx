// 工作区里的一张表：工具栏（视图、显示公式、编辑栏）+ 表格 + 底部工作表标签 + 点格查来源 + 在表上改区域。
import { ExportOutlined, FunctionOutlined } from "@ant-design/icons";
import { Button, Dropdown, Modal, Select, Switch, Tooltip, type MenuProps } from "antd";
import { useEffect, useMemo, useRef, useState } from "react";
import { cellAddr, inBox, rangeAddr, type RangeBox } from "../../lib/address";
import { regionShort } from "../../lib/format";
import { alpha, REGION_STATE_LABEL } from "../../lib/tokens";
import type { RegionState } from "../../protocol/types";
import { draftChanges, type WorkspaceTab } from "../../store/appStore";
import { useApp, useAppStore, useSession, useTokens } from "../../store/context";
import { COMPOSER_RESERVE } from "../chat/Composer";
import type { SheetMode } from "./paint";
import { SheetGrid } from "./SheetGrid";
import type { RegionBox } from "./sheetModel";
import { TracePopover } from "./TracePopover";
import { useSheet } from "./useSheet";

type SheetTabState = Extract<WorkspaceTab, { kind: "sheet" }>;

const MODE_LABEL: Record<SheetMode, string> = { raw: "原样", regions: "区域", plan: "拟写值", filled: "已填" };

export function SheetTab({ tab }: { tab: SheetTabState }) {
  const store = useAppStore();
  const t = useTokens();
  const s = useSession();
  const tabTask = tab.task ? s?.tasks[tab.task] : undefined;
  // 只有底稿本身或它的填写成果才叠加任务的区域、计划；同一任务的报告类产出按普通文件显示
  const task =
    tabTask && (tab.file === tabTask.workpaperFile || tabTask.outputs.some((o) => o.kind === "workpaper" && o.output === tab.file)) ? tabTask : undefined;
  const output = task?.outputs.find((o) => o.kind === "workpaper")?.output ?? (tab.file.startsWith("O-") ? tab.file : null);
  const baseFile = task?.workpaperFile ?? tab.file;
  const mode = tab.mode;
  const file = mode === "filled" && output ? output : baseFile;
  const draftCard = useApp((x) => (x.ui.session ? Object.values(x.ev.sessions[x.ui.session]?.cards ?? {}).find((c) => c.card.kind === "workpaper_understanding" && !c.answer && c.task === tab.task)?.card.card : undefined));
  const draft = useApp((x) => (draftCard ? x.ui.drafts[draftCard] : undefined));
  const editing = !!draftCard && mode === "regions";

  const overlay = useMemo(() => {
    if (!task) return undefined;
    if (mode === "regions" && task.workpaper) return { workpaper: task.workpaper };
    if (mode === "plan" && task.plan) return { workpaper: task.workpaper, plan: task.plan };
    if (mode === "filled" && output) return { output };
    return undefined;
  }, [task, mode, output]);

  // 区域刚识别出来、写入计划刚编好时重新取一次
  const refreshKey = `${task?.workpaper ?? ""}|${task?.plan ?? ""}|${Object.keys(task?.regions ?? {}).length > 0}`;
  const { model, version, loadChunks, error } = useSheet(store.host, { file, sheet: tab.sheet, overlay }, refreshKey);
  const [, bump] = useState(0);

  // 事件里的区域状态实时盖到模型上，不用每次重取表
  const regionKey = task ? Object.values(task.regions).map((r) => `${r.region}:${r.state}`).join(",") : "";
  useEffect(() => {
    if (!model || !task) return;
    let changed = false;
    for (const r of model.regions) {
      const st = task.regions[r.region]?.state;
      if (st && st !== r.state) {
        r.state = st;
        changed = true;
      }
    }
    if (changed) bump((n) => n + 1);
  }, [model, regionKey, task]);

  // 草稿里的区域范围和新增区域
  const shownRegions: RegionBox[] = useMemo(() => {
    if (!model) return [];
    const base = model.regions.map((r) => {
      const d = draft?.regions[r.region];
      if (!editing || !d) return r;
      const box = d.range ? parseBox(d.range) : r.box;
      return { ...r, box, range: d.range ?? r.range, state: (d.type === "none" ? "skipped" : r.state) as RegionState };
    });
    if (editing) for (const a of draft?.added ?? []) base.push({ region: `新增 ${a.range}`, range: a.range, box: parseBox(a.range), state: "pending", type: a.type, purpose: "新增区域" });
    return base;
  }, [model, draft, editing]);

  const manualOverride = useMemo(() => {
    if (!editing || !draft) return undefined;
    const add = draft.manualAdd.map(parseBox);
    const rem = draft.manualRemove.map(parseBox);
    return (row: number, col: number) => {
      if (rem.some((b) => inBox(b, col, row))) return false;
      if (add.some((b) => inBox(b, col, row))) return true;
      return undefined;
    };
  }, [editing, draft]);

  // 有草稿时把区域换成草稿里的（画布读 model.regions）
  const savedRegions = useRef<RegionBox[] | null>(null);
  if (model) {
    if (editing) {
      if (!savedRegions.current) savedRegions.current = model.regions;
      model.regions = shownRegions;
    } else if (savedRegions.current) {
      model.regions = savedRegions.current;
      savedRegions.current = null;
    }
  }

  // 定位到区域
  useEffect(() => {
    if (!model || !tab.focusRegion) return;
    const r = model.regions.find((x) => x.region === tab.focusRegion);
    if (r) store.updateTab(tab.id, { scrollTo: { row: r.box.r0, col: r.box.c0, nonce: Date.now() } });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [model, tab.focusNonce]);

  const [trace, setTrace] = useState<{ cell: string; x: number; y: number } | null>(null);
  const [menu, setMenu] = useState<{ x: number; y: number; items: MenuProps["items"]; onClick: (k: string) => void } | null>(null);
  const showMenu = (x: number, y: number, items: MenuProps["items"], onClick: (k: string) => void) => setMenu({ x, y, items, onClick });
  const [drag, setDrag] = useState<{ region: string; edge: "r" | "b" | "rb" | "l" | "t"; box: RangeBox } | null>(null);

  const sel = tab.selected;
  const selCell = sel && model ? model.cell(sel.row, sel.col) : undefined;
  const modes: SheetMode[] = ["raw"];
  if (task?.workpaper) modes.push("regions");
  if (task?.plan) modes.push("plan");
  if (output) modes.push("filled");

  const onSelect = (row: number, col: number, bounds?: { x: number; y: number; width: number; height: number }) => {
    store.updateTab(tab.id, { selected: { row, col } });
    setTrace(null);
    const c = model?.cell(row, col);
    if (bounds && ((mode === "filled" && c?.written) || (mode === "plan" && c?.plan?.from))) {
      setTrace({ cell: `${model!.sheet}!${cellAddr(col, row)}`, x: bounds.x + bounds.width, y: bounds.y });
    }
  };

  const regionOf = (box: RangeBox) => shownRegions.find((r) => inBox(r.box, box.c0, box.r0));

  const contextMenu = (box: RangeBox, x: number, y: number) => {
    const items: MenuProps["items"] = [];
    const region = regionOf(box);
    const addr = rangeAddr(box);
    if (editing && draftCard) {
      items.push(
        { key: "manual", label: `标为人工填写（${addr}）` },
        { key: "unmanual", label: "取消人工" },
        { type: "divider" },
        { key: "add", label: `把 ${addr} 新增为区域…`, disabled: !!region || box.r0 === box.r1 },
      );
      if (region && !region.region.startsWith("新增")) items.push({ key: "none", label: `${regionShort(region.region)} 不需要填写` });
    } else if (region && task) {
      items.push({ key: "rerun", label: `重做 ${regionShort(region.region)}…` });
      if (mode === "filled") items.push({ key: "trace", label: "查看来源" });
    }
    if (!items.length) return;
    showMenu(x, y, items, (key) => {
      if (!draftCard) {
        if (key === "rerun" && region && task) {
          let note = "";
          Modal.confirm({
            title: `重做 ${regionShort(region.region)}`,
            content: <textarea style={{ width: "100%" }} placeholder="改了什么口径" onChange={(e) => (note = e.target.value)} />,
            okText: "重做",
            cancelText: "取消",
            onOk: () => store.host.request("task.rerun", { task: task.task, scope: { regions: [region.region], fromStage: "basis" }, note }),
          });
        }
        if (key === "trace" && sel) setTrace({ cell: `${model!.sheet}!${cellAddr(sel.col, sel.row)}`, x, y: y - 40 });
        return;
      }
      store.updateDraft(draftCard, (d) => {
        if (key === "manual") {
          d.manualRemove = d.manualRemove.filter((m) => m !== addr);
          d.manualAdd.push(addr);
        }
        if (key === "unmanual") {
          d.manualAdd = d.manualAdd.filter((m) => m !== addr);
          d.manualRemove.push(addr);
        }
        if (key === "none" && region) d.regions[region.region] = { ...d.regions[region.region], type: "none" };
      });
      if (key === "add") {
        let type = "fixed_table";
        Modal.confirm({
          title: `新增区域 ${addr}`,
          content: (
            <Select
              defaultValue={type}
              style={{ width: "100%" }}
              onChange={(v) => (type = v)}
              options={[
                { value: "fixed_table", label: "固定项目表" },
                { value: "detail_table", label: "明细表" },
                { value: "form", label: "表单" },
                { value: "checklist", label: "检查表" },
                { value: "text", label: "文字区" },
              ]}
            />
          ),
          okText: "新增",
          cancelText: "取消",
          onOk: () => store.updateDraft(draftCard, (d) => void d.added.push({ range: addr, type })),
        });
      }
    });
  };

  // 拖动区域边框：鼠标所在格决定新的边界
  const onHover = (row: number, col: number) => {
    if (!drag) return;
    const b = { ...drag.box };
    if (drag.edge.includes("r")) b.c1 = Math.max(b.c0, col);
    if (drag.edge.includes("b")) b.r1 = Math.max(b.r0, row);
    if (drag.edge === "l") b.c0 = Math.min(b.c1, col);
    if (drag.edge === "t") b.r0 = Math.min(b.r1, row);
    setDrag({ ...drag, box: b });
    if (draftCard) {
      const reg = model?.regions.find((r) => r.region === drag.region);
      if (reg) reg.box = b;
      bump((n) => n + 1);
    }
  };
  useEffect(() => {
    if (!drag) return;
    const up = () => {
      if (draftCard) {
        const orig = savedRegions.current?.find((r) => r.region === drag.region);
        const range = rangeAddr(drag.box);
        if (!orig || rangeAddr(orig.box) !== range) store.updateDraft(draftCard, (d) => void (d.regions[drag.region] = { ...d.regions[drag.region], range }));
      }
      setDrag(null);
    };
    window.addEventListener("mouseup", up);
    return () => window.removeEventListener("mouseup", up);
  }, [drag, draftCard, store]);

  // 点表上的区域：对话滚到对应卡片（等处理的在输入框上方，其余看进度卡）
  const regionCard = (region: string) => {
    const r = task?.regions[region];
    if (r?.card && document.querySelector(`.pending-stack [data-card="${r.card}"]`)) {
      document.querySelector(`.pending-stack [data-card="${r.card}"]`)?.scrollIntoView({ behavior: "smooth" });
      return;
    }
    if (store.get().ui.chatMode === "float") store.setUi({ historyOpen: true });
    setTimeout(() => document.querySelector(`[data-progress="${task?.task}"]`)?.scrollIntoView({ behavior: "smooth", block: "center" }), 80);
  };

  return (
    <div className="ws-main">
      <div className="sheet-toolbar">
        <Select
          size="small"
          value={mode}
          style={{ width: 104 }}
          onChange={(m) => store.updateTab(tab.id, { mode: m })}
          options={(["raw", "regions", "plan", "filled"] as SheetMode[]).map((m) => ({ value: m, label: MODE_LABEL[m], disabled: !modes.includes(m) }))}
        />
        <Tooltip title="整张表显示公式本身">
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12.5, color: "var(--text-muted)" }}>
            <FunctionOutlined /> 显示公式
            <Switch size="small" checked={tab.showFormulas} onChange={(v) => store.updateTab(tab.id, { showFormulas: v })} />
          </span>
        </Tooltip>
        <div className="formula-bar">
          <span className="addr">{sel ? cellAddr(sel.col, sel.row) : ""}</span>
          <span className="fx">fx</span>
          <span className={`content ${selCell?.formula ? "formula" : ""}`}>
            {selCell?.formula ?? (selCell?.stale ? "待重算" : (selCell?.text ?? selCell?.value ?? ""))}
          </span>
        </div>
        {mode === "filled" && output && (
          <Button size="small" icon={<ExportOutlined />} onClick={() => store.host.request("output.open", { file: output }).catch((e: Error) => Modal.error({ title: "打不开文件", content: e.message }))}>
            用 Excel 打开
          </Button>
        )}
      </div>
      <Legend mode={mode} editing={editing} changes={draftChanges(draft)} />
      <div style={{ flex: 1, minHeight: 0, position: "relative" }}>
        {error && <div style={{ padding: 20, color: "var(--danger)" }}>{error}</div>}
        {model && (
          <SheetGrid
            model={model}
            version={version}
            tokens={t}
            mode={mode}
            showFormulas={tab.showFormulas}
            selected={sel}
            onSelect={onSelect}
            focusRegion={tab.focusRegion}
            onNeedChunks={loadChunks}
            bottomPadding={COMPOSER_RESERVE}
            manualOverride={manualOverride}
            scrollTo={tab.scrollTo}
            onContextMenu={contextMenu}
            onRangeSelect={editing ? () => undefined : undefined}
            onHover={drag ? onHover : undefined}
            renderRegionOverlay={
              mode === "regions" || mode === "plan"
                ? (r, rect) => (
                    <RegionDecor
                      r={r}
                      rect={rect}
                      color={mode === "plan" ? t.planText : t.regionState[r.state]}
                      activity={task?.regions[r.region]?.activity ?? null}
                      attempt={task?.regions[r.region]?.attempt ?? 1}
                      editing={editing && !r.region.startsWith("新增")}
                      dragging={drag?.region === r.region}
                      onTag={() => regionCard(r.region)}
                      onDragStart={(edge) => setDrag({ region: r.region, edge, box: { ...r.box } })}
                      plan={mode === "plan"}
                    />
                  )
                : undefined
            }
          />
        )}
        {menu && (
          <Dropdown open menu={{ items: menu.items, onClick: ({ key }) => (setMenu(null), menu.onClick(key)) }} onOpenChange={(o) => !o && setMenu(null)}>
            <span style={{ position: "fixed", left: menu.x, top: menu.y, width: 1, height: 1 }} />
          </Dropdown>
        )}
        {trace && <TracePopover cell={trace.cell} output={output ?? file} x={trace.x} y={trace.y} onClose={() => setTrace(null)} />}
      </div>
      {model && model.sheets.length > 0 && (
        <div className="sheet-tabs">
          {model.sheets.map((x) => (
            <button key={x.name} className={`sheet-tab ${x.name === model.sheet ? "active" : ""}`} onClick={() => store.updateTab(tab.id, { sheet: x.name, selected: null })}>
              {x.name}
            </button>
          ))}
          <span style={{ flex: 1 }} />
          <span className="faint" style={{ fontSize: 11.5 }}>
            只读 · 改内容请用 Excel 打开成果
          </span>
        </div>
      )}
    </div>
  );
}

function parseBox(a: string): RangeBox {
  const [p, q] = a.split(":");
  const m = (x: string) => {
    const mm = /^([A-Z]+)(\d+)$/.exec(x)!;
    return { col: [...mm[1]].reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 64, 0) - 1, row: Number(mm[2]) - 1 };
  };
  const A = m(p);
  const B = q ? m(q) : A;
  return { c0: Math.min(A.col, B.col), r0: Math.min(A.row, B.row), c1: Math.max(A.col, B.col), r1: Math.max(A.row, B.row) };
}

function Legend({ mode, editing, changes }: { mode: SheetMode; editing: boolean; changes: number }) {
  const t = useTokens();
  if (mode === "raw")
    return (
      <div className="sheet-toolbar" style={{ padding: "4px 10px", borderBottom: "1px solid var(--border)" }}>
        <div className="legend" style={{ marginLeft: 0 }}>
          <span><i style={{ background: t.formulaTint, border: `1px solid ${t.border}` }} />公式格（不用填）</span>
          <span style={{ color: t.staleText, fontStyle: "italic" }}>待重算：文件里没有计算结果</span>
        </div>
      </div>
    );
  const items: [string, string][] =
    mode === "regions"
      ? [
          [t.regionState.awaiting_confirmation, "等你确认"],
          [t.regionState.computing, "计算中"],
          [t.regionState.checked, "核对通过"],
          [t.regionState.written, "已写入"],
        ]
      : mode === "plan"
        ? [
            [t.planFill, "拟写值"],
            [t.overwriteFill, "覆盖原有内容"],
            [alpha(t.planText, 0.05), "公式重算值（斜体）"],
          ]
        : [[t.writtenFill, "已写入，点格查来源"]];
  return (
    <div className="sheet-toolbar" style={{ padding: "4px 10px" }}>
      {editing && (
        <span style={{ fontSize: 12, color: "var(--warning)" }}>
          理解卡等你确认：拖区域边框调整范围，右键标人工格或新增区域{changes ? `，已修改 ${changes} 处` : ""}
        </span>
      )}
      <div className="legend">
        {items.map(([c, l]) => (
          <span key={l}>
            <i style={{ background: c, border: `1px solid ${t.border}` }} />
            {l}
          </span>
        ))}
        <span>
          <i style={{ background: t.manualFill, backgroundImage: `repeating-linear-gradient(135deg, ${t.manualHatch} 0 1px, transparent 1px 5px)` }} />
          人工填写
        </span>
      </div>
    </div>
  );
}

function RegionDecor(p: {
  r: RegionBox;
  rect: { x: number; y: number; width: number; height: number };
  color: string;
  activity: string | null;
  attempt: number;
  editing: boolean;
  dragging: boolean;
  plan: boolean;
  onTag: () => void;
  onDragStart: (edge: "r" | "b" | "rb" | "l" | "t") => void;
}) {
  const { r, rect, color } = p;
  const busy = r.state === "computing" || r.state === "checking" || r.state === "understanding";
  const H = 14;
  return (
    <>
      <div
        className="region-tag"
        style={{ right: `calc(100% - ${rect.x + rect.width - 6}px)`, top: rect.y, background: color }}
        onClick={p.onTag}
      >
        {busy && <span className="spin" />}
        <b>{regionShort(r.region)}</b>
        {r.purpose}
        {!p.plan && (
          <span className="act">
            · {REGION_STATE_LABEL[r.state]}
            {p.activity ? `：${p.activity}` : ""}
            {p.attempt > 1 ? `（第 ${p.attempt} 次）` : ""}
          </span>
        )}
      </div>
      {p.editing &&
        !p.dragging &&
        (
          [
            ["r", rect.x + rect.width - H / 2, rect.y + rect.height / 2 - H / 2, "ew-resize"],
            ["b", rect.x + rect.width / 2 - H / 2, rect.y + rect.height - H / 2, "ns-resize"],
            ["rb", rect.x + rect.width - H / 2, rect.y + rect.height - H / 2, "nwse-resize"],
            ["l", rect.x - H / 2, rect.y + rect.height / 2 - H / 2, "ew-resize"],
          ] as const
        ).map(([edge, x, y, cursor]) => (
          <div
            key={edge}
            className="region-handle"
            style={{ left: x, top: y, width: H, height: H, cursor, color }}
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              p.onDragStart(edge);
            }}
          />
        ))}
    </>
  );
}
