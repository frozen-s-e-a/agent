// 底部中间的输入区：输入框固定在这里；等处理的卡片、悬浮模式下的最新回复都从它上方弹出。
import {
  CloseOutlined,
  ExpandOutlined,
  HistoryOutlined,
  LayoutOutlined,
  PaperClipOutlined,
  PicCenterOutlined,
} from "@ant-design/icons";
import { Sender } from "@ant-design/x";
import { Button, Checkbox, Dropdown, Popover, Tooltip } from "antd";
import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import type { ProjectFile } from "../../protocol/types";
import type { ChatMode } from "../../store/appStore";
import { useApp, useAppStore, useSession } from "../../store/context";
import { isOpen, type CardState, type ChatItem, type SessionState } from "../../store/reduce";
import { CardView } from "../cards/Cards";
import { Item } from "./ChatThread";

export const COMPOSER_RESERVE = 150; // 表格底部留白
export const REVIEW_PANE_WIDTH = 400;

/** 要对照表格看的卡：放到表格右侧的窄栏，不盖在表上 */
const SHEET_CARD_KINDS = new Set(["workpaper_understanding", "basis_confirmation", "write_confirmation", "discrepancy"]);

/** 等处理的卡分两拨：对照表格看的（右侧窄栏）和其余的（输入框上方） */
export function usePendingCards(sheetOpen: boolean) {
  const s = useSession();
  const ui = useApp((x) => x.ui);
  return useMemo(() => {
    const all = s ? Object.values(s.cards).filter((c) => isOpen(c) && c.card.kind !== "result_summary") : [];
    // 对话停在右侧时卡片本来就在表格旁边，不另开窄栏
    const pane = sheetOpen && !ui.collapsed && (ui.chatMode === "float" || ui.chatMode === "left");
    if (!pane) return { side: [] as CardState[], stack: all };
    return { side: all.filter((c) => SHEET_CARD_KINDS.has(c.card.kind)), stack: all.filter((c) => !SHEET_CARD_KINDS.has(c.card.kind)) };
  }, [s, sheetOpen, ui.collapsed, ui.chatMode]);
}

export function ComposerZone({ sheetOpen }: { sheetOpen: boolean }) {
  const s = useSession();
  const ui = useApp((x) => x.ui);
  const { side, stack } = usePendingCards(sheetOpen);
  const floating = sheetOpen && ui.chatMode === "float" && !ui.collapsed;
  const docked = sheetOpen && !ui.collapsed && (ui.chatMode === "left" || ui.chatMode === "right");
  // 停靠时输入区跟着对话栏走，不盖在表上；右侧开了卡片栏时，输入区在剩下的表格区域里居中
  const dockStyle: CSSProperties | undefined = docked
    ? { transform: "none", width: ui.dockWidth - 24, [ui.chatMode === "left" ? "left" : "right"]: 12, [ui.chatMode === "left" ? "right" : "left"]: "auto" }
    : side.length
      ? { left: `calc((100% - ${REVIEW_PANE_WIDTH}px) / 2)`, width: `min(680px, calc(100% - ${REVIEW_PANE_WIDTH + 32}px))` }
      : undefined;

  return (
    <div className={`composer-zone ${floating ? "over-sheet" : ""}`} style={dockStyle}>
      {floating && s && !ui.historyOpen && <FloatPanel s={s} hasPending={stack.length > 0} />}
      {stack.length > 0 && (
        <div className="pending-stack">
          {stack.map((c) => (
            <CardView key={c.card.card} c={c} />
          ))}
        </div>
      )}
      <Composer sheetOpen={sheetOpen} />
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
  // 有底稿任务在跑时，默认补充给任务；点掉就是普通对话
  const [detached, setDetached] = useState<string | null>(null);
  const streaming = !!s?.items.some((i) => i.kind === "assistant" && !i.done);
  const runningTask = s ? Object.values(s.tasks).find((t) => t.status === "running") : undefined;
  const toTask = !!runningTask && detached !== runningTask.task;
  const disabled = !ui.session || ui.modelReady === false;

  const submit = async (v: string) => {
    if (!v.trim()) return;
    setText("");
    if (toTask && runningTask) await store.host.request("task.message", { task: runningTask.task, text: v });
    else await store.send(v);
  };

  const header =
    ui.attach.length || toTask ? (
      <div className="composer-head">
        {toTask && runningTask && (
          <Tooltip title="这句话会补充给正在进行的底稿任务；点 × 改成普通对话">
            <span className="chip to-task">
              补充给{runningTask.workpaperFile ? `「${store.fileName(runningTask.workpaperFile).replace(/\.xlsx?$/, "")}」` : "底稿"}任务
              <CloseOutlined style={{ fontSize: 10 }} onClick={() => setDetached(runningTask.task)} />
            </span>
          </Tooltip>
        )}
        <AttachRow />
      </div>
    ) : undefined;

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
            : toTask
              ? "补充给正在进行的任务，例如：D 列用本年期初"
              : "说要做什么，或者问问题。Enter 发送，Shift+Enter 换行"
        }
        header={header}
        prefix={<AttachButton />}
        suffix={(ori) => (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
            {sheetOpen && <ChatLayoutMenu />}
            {ori}
          </span>
        )}
        styles={{ input: { fontSize: 13.5 } }}
      />
    </div>
  );
}

const MODE_ITEMS: { key: ChatMode; label: string; icon: ReactNode }[] = [
  { key: "float", label: "对话悬浮在表格上", icon: <PicCenterOutlined /> },
  { key: "left", label: "对话停在左侧", icon: <LayoutOutlined /> },
  { key: "right", label: "对话停在右侧", icon: <LayoutOutlined style={{ transform: "scaleX(-1)" }} /> },
  { key: "full", label: "对话铺满（收起表格）", icon: <ExpandOutlined /> },
];

/** 对话的显示方式和完整历史收在一个按钮里 */
function ChatLayoutMenu() {
  const store = useAppStore();
  const ui = useApp((x) => x.ui);
  return (
    <Dropdown
      trigger={["click"]}
      placement="topRight"
      menu={{
        selectable: true,
        selectedKeys: [ui.chatMode],
        items: [
          ...(ui.chatMode === "float" ? [{ key: "history", icon: <HistoryOutlined />, label: "查看完整对话" }, { type: "divider" as const }] : []),
          ...MODE_ITEMS,
        ],
        onClick: ({ key }) => {
          if (key === "history") return store.setUi({ historyOpen: !ui.historyOpen });
          store.setUi({ chatMode: key as ChatMode, collapsed: key === "full", historyOpen: false });
        },
      }}
    >
      <Tooltip title="对话显示方式">
        <Button size="small" type="text" icon={MODE_ITEMS.find((m) => m.key === ui.chatMode)?.icon} />
      </Tooltip>
    </Dropdown>
  );
}

function AttachRow() {
  const store = useAppStore();
  const attach = useApp((x) => x.ui.attach);
  return (
    <>
      {attach.map((f) => (
        <span key={f} className="chip">
          {store.fileName(f)}
          <CloseOutlined style={{ fontSize: 10 }} onClick={() => store.setUi((u) => ({ attach: u.attach.filter((x) => x !== f) }))} />
        </span>
      ))}
    </>
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
