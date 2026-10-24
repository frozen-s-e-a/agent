// 工作区：顶部文件标签 + 表格；对话按显示方式悬浮、停靠左右或铺满。没有打开文件时对话占满。
// 要对照表格看的卡（理解、口径、写入确认、差异）放在表格右侧的窄栏，不盖在表上。
import { CloseOutlined, FileExcelOutlined, InboxOutlined, TableOutlined } from "@ant-design/icons";
import { Button, Empty, Spin } from "antd";
import { useRef, useState } from "react";
import { useApp, useAppStore, useSession } from "../../store/context";
import { ChatThread } from "../chat/ChatThread";
import { ComposerZone, REVIEW_PANE_WIDTH, usePendingCards } from "../chat/Composer";
import { CardView } from "../cards/Cards";
import { SheetTab } from "../sheet/SheetTab";
import { TableTab } from "../sheet/TableTab";

export function Workspace() {
  const store = useAppStore();
  const ui = useApp((s) => s.ui);
  const s = useSession();
  const active = ui.tabs.find((t) => t.id === ui.activeTab) ?? null;
  const sheetOpen = !!active && !ui.collapsed;
  const docked = sheetOpen && (ui.chatMode === "left" || ui.chatMode === "right");
  const { side } = usePendingCards(sheetOpen);
  if (ui.switching)
    return (
      <section className="workspace" style={{ display: "grid", placeItems: "center" }}>
        <Spin tip={`正在打开「${ui.projects.find((p) => p.project === ui.switching)?.name ?? "项目"}」…`}>
          <div style={{ width: 240, height: 80 }} />
        </Spin>
      </section>
    );

  return (
    <section className="workspace">
      {ui.tabs.length > 0 && (
        <div className="ws-tabs">
          {ui.tabs.map((t) => (
            <div
              key={t.id}
              className={`ws-tab ${t.id === ui.activeTab && !ui.collapsed ? "active" : ""}`}
              onClick={() => store.setUi({ activeTab: t.id, collapsed: false, chatMode: ui.chatMode === "full" ? "float" : ui.chatMode })}
            >
              {t.kind === "sheet" ? <FileExcelOutlined style={{ color: "#1f8a50" }} /> : <TableOutlined style={{ color: "var(--accent)" }} />}
              <span className="name">{t.title}</span>
              <button
                className="x"
                onClick={(e) => {
                  e.stopPropagation();
                  store.closeTab(t.id);
                }}
              >
                <CloseOutlined style={{ fontSize: 10 }} />
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="ws-body">
        {docked && ui.chatMode === "left" && <DockedChat side="left" />}
        {sheetOpen ? (
          active!.kind === "sheet" ? <SheetTab key={active!.id} tab={active!} /> : <TableTab key={active!.id} tab={active!} />
        ) : (
          <FullChat />
        )}
        {side.length > 0 && (
          <aside className="review-pane" style={{ width: REVIEW_PANE_WIDTH }}>
            {side.map((c) => (
              <CardView key={c.card.card} c={c} />
            ))}
          </aside>
        )}
        {docked && ui.chatMode === "right" && <DockedChat side="right" />}
        {sheetOpen && ui.chatMode === "float" && ui.historyOpen && s && (
          <div className="history-sheet" style={{ left: "auto", width: "min(560px, 100%)", borderLeft: "1px solid var(--border)", boxShadow: "-12px 0 32px rgba(15,23,42,.08)" }}>
            <div className="history-head">
              <b>对话历史</b>
              <span style={{ flex: 1 }} />
              <Button size="small" type="text" icon={<CloseOutlined />} onClick={() => store.setUi({ historyOpen: false })} />
            </div>
            <div className="chat-scroll" style={{ paddingTop: 12 }}>
              <ChatThread s={s} hideOpenCards />
            </div>
          </div>
        )}
        <ComposerZone sheetOpen={sheetOpen} />
      </div>
    </section>
  );
}

function DockedChat({ side }: { side: "left" | "right" }) {
  const store = useAppStore();
  const s = useSession();
  const width = useApp((x) => x.ui.dockWidth);
  const drag = useRef<{ x: number; w: number } | null>(null);
  return (
    <div className={`chat-dock ${side}`} style={{ width }}>
      <div
        className="dock-resizer"
        style={side === "left" ? { right: -3 } : { left: -3 }}
        onMouseDown={(e) => {
          drag.current = { x: e.clientX, w: width };
          const move = (ev: MouseEvent) => {
            if (!drag.current) return;
            const dx = ev.clientX - drag.current.x;
            store.setUi({ dockWidth: Math.max(320, Math.min(760, drag.current.w + (side === "left" ? dx : -dx))) });
          };
          const up = () => {
            drag.current = null;
            window.removeEventListener("mousemove", move);
            window.removeEventListener("mouseup", up);
          };
          window.addEventListener("mousemove", move);
          window.addEventListener("mouseup", up);
        }}
      />
      <div className="chat-scroll">{s ? <ChatThread s={s} hideOpenCards /> : null}</div>
    </div>
  );
}

function FullChat() {
  const s = useSession();
  const session = useApp((x) => x.ui.session);
  return (
    <div className="chat-full">
      <div className="chat-scroll">{session && s && s.items.length ? <ChatThread s={s} hideOpenCards /> : <Welcome />}</div>
    </div>
  );
}

/** 第 1 屏：新建。拖放区放底稿和资料，或者从项目资料里勾选，再在输入框里写要求 */
function Welcome() {
  const store = useAppStore();
  const session = useApp((x) => x.ui.session);
  const [over, setOver] = useState(false);
  if (!session)
    return (
      <div className="chat-col welcome">
        <Empty description="在左边选一个对话，或者新建对话" />
      </div>
    );
  return (
    <div className="chat-col welcome">
      <h1>要做什么？</h1>
      <div className="muted">放入底稿和资料，说清楚要填哪份底稿、用哪些资料、哪个期间。也可以直接提问，或者让我调用已接入的系统查数。</div>
      <div
        className={`dropzone ${over ? "over" : ""}`}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={async (e) => {
          e.preventDefault();
          setOver(false);
          await store.addBrowserFiles([...e.dataTransfer.files]);
        }}
      >
        <InboxOutlined style={{ fontSize: 28, color: "var(--accent)" }} />
        <div style={{ marginTop: 8 }}>把底稿和资料拖到这里</div>
        <div className="faint" style={{ fontSize: 12, marginTop: 4 }}>
          文件会加入项目资料，这个项目里的其他对话也能用。原文件只读，产出写到项目的「输出」文件夹。
        </div>
        <Button
          size="small"
          style={{ marginTop: 12 }}
          onClick={async () => {
            const project = store.get().ui.project!;
            const { files } = await store.host.request("files.list", { project });
            for (const f of files) store.fileNames.set(f.file, f.name);
            store.setUi({ attach: files.map((f) => f.file) });
          }}
        >
          从项目资料里选
        </Button>
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {["用余额表和序时账填写应收账款底稿，期间2025年", "前五大客户今年的回款情况怎么样？", "帮我审批报销单 BX-2025-1188"].map((p) => (
          <span key={p} className="chip" style={{ padding: "5px 10px" }} onClick={() => void store.send(p)}>
            {p}
          </span>
        ))}
      </div>
    </div>
  );
}
