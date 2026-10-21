// 底部中间的输入区：输入框固定在这里；等处理的卡片、悬浮模式下的最新回复都从它上方弹出。
import {
  CloseOutlined,
  ExpandOutlined,
  HistoryOutlined,
  LayoutOutlined,
  LoadingOutlined,
  PaperClipOutlined,
  PicCenterOutlined,
} from "@ant-design/icons";
import { Sender } from "@ant-design/x";
import { Button, Checkbox, Popover, Segmented, Tooltip } from "antd";
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import type { ProjectFile } from "../../protocol/types";
import { regionShort, since } from "../../lib/format";
import { REGION_STATE_LABEL } from "../../lib/tokens";
import type { ChatMode } from "../../store/appStore";
import { useApp, useAppStore, useSession } from "../../store/context";
import { isOpen, type CardState, type ChatItem, type SessionState } from "../../store/reduce";
import { CardView } from "../cards/Cards";
import { ShellOptions } from "../cards/CardShell";
import { Item } from "./ChatThread";

export const COMPOSER_RESERVE = 150; // 表格底部留白

export function ComposerZone({ sheetOpen }: { sheetOpen: boolean }) {
  const s = useSession();
  const ui = useApp((x) => x.ui);
  const pending = useMemo(() => (s ? Object.values(s.cards).filter((c) => isOpen(c) && c.card.kind !== "result_summary") : []), [s]);
  const floating = sheetOpen && ui.chatMode === "float" && !ui.collapsed;
  const docked = sheetOpen && !ui.collapsed && (ui.chatMode === "left" || ui.chatMode === "right");
  // 停靠时输入区跟着对话栏走，不盖在表上
  const dockStyle: CSSProperties | undefined = docked
    ? { transform: "none", width: ui.dockWidth - 24, [ui.chatMode === "left" ? "left" : "right"]: 12, [ui.chatMode === "left" ? "right" : "left"]: "auto" }
    : undefined;

  return (
    <div className="composer-zone" style={dockStyle}>
      {floating && s && !ui.historyOpen && <FloatPanel s={s} hasPending={pending.length > 0} />}
      {pending.length > 0 && <PendingStack pending={pending} />}
      <Composer sheetOpen={sheetOpen} />
    </div>
  );
}

/** 等处理的卡片：一次只展开一张，其余收成一行标题，点标题换着处理，不把表盖住 */
function PendingStack({ pending }: { pending: CardState[] }) {
  const [active, setActive] = useState<string | null>(null);
  const current = pending.find((c) => c.card.card === active) ?? pending[0];
  return (
    <div className="pending-stack">
      {pending.map((c) => (
        <ShellOptions.Provider
          key={c.card.card}
          value={c === current ? {} : { compact: true, onHeadClick: () => setActive(c.card.card) }}
        >
          <CardView c={c} />
        </ShellOptions.Provider>
      ))}
    </div>
  );
}

/** 悬浮模式：显示最新一轮回复，处理完自动收回 */
function FloatPanel({ s, hasPending }: { s: SessionState; hasPending: boolean }) {
  const store = useAppStore();
  const lastUser = s.items.map((x, i) => [x, i] as const).filter(([x]) => x.kind === "user").at(-1)?.[1] ?? -1;
  const turn = s.items.slice(lastUser + 1).filter((x) => x.kind === "assistant" || (x.kind === "card" && s.cards[x.card]?.card.kind === "result_summary")) as ChatItem[];
  const key = turn.map((x) => x.id).join("|") + (turn.at(-1)?.kind === "assistant" ? (turn.at(-1) as { text: string }).text.length : 0);
  const done = turn.every((x) => x.kind !== "assistant" || x.done);
  const [hidden, setHidden] = useState<string | null>(null);
  const [hover, setHover] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const turnKey = turn.map((x) => x.id).join("|");
  // 用户开始在表上点格子，就把悬浮回复收起，不挡表
  const selected = useApp((x) => {
    const t = x.ui.tabs.find((t) => t.id === x.ui.activeTab);
    return t?.kind === "sheet" && t.selected ? `${t.id}:${t.selected.row},${t.selected.col}` : null;
  });
  const firstSel = useRef(selected);
  useEffect(() => {
    if (selected && selected !== firstSel.current) setHidden(turnKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);

  useEffect(() => {
    clearTimeout(timer.current);
    if (done && !hover && !hasPending && turn.length) timer.current = setTimeout(() => setHidden(turnKey), 12000);
    return () => clearTimeout(timer.current);
  }, [done, hover, hasPending, turnKey, turn.length, key]);

  if (!turn.length || hidden === turnKey) return null;
  return (
    <div className="float-panel" onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
      <div className="float-head">
        <span>最新回复</span>
        <span style={{ flex: 1 }} />
        <Button size="small" type="text" icon={<HistoryOutlined />} onClick={() => store.setUi({ historyOpen: true })}>
          历史
        </Button>
        <Button size="small" type="text" icon={<CloseOutlined />} onClick={() => setHidden(turnKey)} />
      </div>
      {turn.map((it) => (
        <Item key={it.id} it={it} s={s} />
      ))}
    </div>
  );
}

function Composer({ sheetOpen }: { sheetOpen: boolean }) {
  const store = useAppStore();
  const s = useSession();
  const ui = useApp((x) => x.ui);
  const [text, setText] = useState("");
  const [toTask, setToTask] = useState(false);
  const streaming = !!s?.items.some((i) => i.kind === "assistant" && !i.done);
  const runningTask = s ? Object.values(s.tasks).find((t) => t.status === "running") : undefined;
  const disabled = !ui.session || ui.modelReady === false;

  const submit = async (v: string) => {
    if (!v.trim()) return;
    setText("");
    if (toTask && runningTask) await store.host.request("task.message", { task: runningTask.task, text: v });
    else await store.send(v);
  };

  return (
    <div className="composer">
      <Sender
        value={text}
        onChange={(v) => setText(v)}
        onSubmit={(v) => void submit(v)}
        loading={streaming}
        onCancel={() => ui.session && void store.host.request("message.stop", { session: ui.session })}
        disabled={disabled}
        autoSize={{ minRows: 1, maxRows: 6 }}
        placeholder={
          ui.modelReady === false
            ? "模型还没连上，先到设置里连接模型"
            : toTask && runningTask
              ? "补充给正在进行的任务，例如：D 列用本年期初"
              : "说要做什么，或者问问题。Enter 发送，Shift+Enter 换行"
        }
        header={ui.attach.length ? <AttachRow /> : undefined}
        footer={() => (
          <div className="composer-foot">
            <AttachButton />
            {runningTask && (
              <Tooltip title="勾选后这句话直接补充给正在进行的底稿任务">
                <Checkbox checked={toTask} onChange={(e) => setToTask(e.target.checked)} style={{ fontSize: 12, marginLeft: 4 }}>
                  补充给任务
                </Checkbox>
              </Tooltip>
            )}
            {runningTask && <TaskPill taskId={runningTask.task} />}
            <span style={{ flex: 1 }} />
            {sheetOpen && ui.chatMode === "float" && (
              <Tooltip title="查看完整对话">
                <Button size="small" type="text" icon={<HistoryOutlined />} onClick={() => store.setUi({ historyOpen: !ui.historyOpen })} />
              </Tooltip>
            )}
            {sheetOpen && <ModeSwitch mode={ui.chatMode} onChange={(m) => store.setUi({ chatMode: m, collapsed: m === "full", historyOpen: false })} />}
          </div>
        )}
        styles={{ input: { fontSize: 13.5 } }}
      />
    </div>
  );
}

function ModeSwitch({ mode, onChange }: { mode: ChatMode; onChange: (m: ChatMode) => void }) {
  return (
    <Segmented
      size="small"
      value={mode}
      onChange={(v) => onChange(v as ChatMode)}
      options={[
        { value: "float", icon: <Tooltip title="对话悬浮"><PicCenterOutlined /></Tooltip> },
        { value: "left", icon: <Tooltip title="对话停在左侧"><LayoutOutlined /></Tooltip> },
        { value: "right", icon: <Tooltip title="对话停在右侧"><LayoutOutlined style={{ transform: "scaleX(-1)" }} /></Tooltip> },
        { value: "full", icon: <Tooltip title="对话铺满（底稿收起）"><ExpandOutlined /></Tooltip> },
      ]}
    />
  );
}

function TaskPill({ taskId }: { taskId: string }) {
  const store = useAppStore();
  const task = useApp((x) => (x.ui.session ? x.ev.sessions[x.ui.session]?.tasks[taskId] : undefined));
  const [, tick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => tick((n) => n + 1), 10000);
    return () => clearInterval(id);
  }, []);
  if (!task) return null;
  const active = Object.values(task.regions).find((r) => r.activity) ?? Object.values(task.regions).find((r) => r.state === "computing" || r.state === "checking");
  return (
    <span className="chip" style={{ marginLeft: 4 }} onClick={() => store.setUi({ historyOpen: true })}>
      <LoadingOutlined style={{ color: "var(--accent)" }} />
      {active ? `${regionShort(active.region)} ${REGION_STATE_LABEL[active.state]}${active.activity ? `：${active.activity}` : ""}` : "底稿任务进行中"}
      <span className="faint">· {since(task.createdAt)}</span>
    </span>
  );
}

function AttachRow() {
  const store = useAppStore();
  const attach = useApp((x) => x.ui.attach);
  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", padding: "8px 10px 0" }}>
      {attach.map((f) => (
        <span key={f} className="chip">
          {store.fileName(f)}
          <CloseOutlined style={{ fontSize: 10 }} onClick={() => store.setUi((u) => ({ attach: u.attach.filter((x) => x !== f) }))} />
        </span>
      ))}
    </div>
  );
}

function AttachButton() {
  const store = useAppStore();
  const project = useApp((x) => x.ui.project);
  const attach = useApp((x) => x.ui.attach);
  const [files, setFiles] = useState<ProjectFile[]>([]);
  return (
    <Popover
      trigger="click"
      placement="topLeft"
      onOpenChange={(o) => o && project && void store.host.request("files.list", { project }).then((r) => setFiles(r.files))}
      content={
        <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 260 }}>
          <div className="faint" style={{ fontSize: 12 }}>从项目资料里选，加入本条消息</div>
          {files.map((f) => (
            <Checkbox
              key={f.file}
              checked={attach.includes(f.file)}
              onChange={(e) => {
                store.fileNames.set(f.file, f.name);
                store.setUi((u) => ({ attach: e.target.checked ? [...u.attach, f.file] : u.attach.filter((x) => x !== f.file) }));
              }}
            >
              {f.name}
            </Checkbox>
          ))}
          <Button size="small" type="link" style={{ alignSelf: "flex-start", padding: 0 }} onClick={() => store.setUi({ leftTab: "files" })}>
            添加新资料…
          </Button>
        </div>
      }
    >
      <Tooltip title="附加项目资料">
        <Button size="small" type="text" icon={<PaperClipOutlined />} />
      </Tooltip>
    </Popover>
  );
}
