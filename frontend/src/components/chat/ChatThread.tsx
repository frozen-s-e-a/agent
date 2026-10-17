// 对话历史：用户消息、Agent 回复（含工具调用折叠）、进度卡、卡片。
import { CheckCircleFilled, CloseCircleFilled, DownOutlined, LoadingOutlined, RightOutlined, ToolOutlined } from "@ant-design/icons";
import { Bubble } from "@ant-design/x";
import { useEffect, useRef, useState } from "react";
import { useAppStore } from "../../store/context";
import { isOpen, type ChatItem, type SessionState, type ToolCall } from "../../store/reduce";
import { CardView } from "../cards/Cards";
import { KIND_LABEL } from "../cards/CardShell";
import { ProgressCard } from "../cards/ProgressCard";

export function ChatThread({ s, hideOpenCards, compact }: { s: SessionState; hideOpenCards?: boolean; compact?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const last = s.items.at(-1);
  const lastText = last?.kind === "assistant" ? last.text.length : 0;
  useEffect(() => {
    const el = ref.current?.closest(".chat-scroll");
    if (el) el.scrollTop = el.scrollHeight;
  }, [s.items.length, lastText]);
  return (
    <div className="chat-col" ref={ref}>
      {s.items.map((it) => (
        <Item key={it.id} it={it} s={s} hideOpenCards={hideOpenCards} compact={compact} />
      ))}
    </div>
  );
}

export function Item({ it, s, hideOpenCards }: { it: ChatItem; s: SessionState; hideOpenCards?: boolean; compact?: boolean }) {
  const store = useAppStore();
  switch (it.kind) {
    case "user":
      return (
        <div className="msg-user">
          {!!it.files?.length && (
            <div className="msg-files">
              {it.files.map((f) => (
                <span key={f} className="chip" onClick={() => store.openSheet(f)}>
                  {store.fileName(f)}
                </span>
              ))}
            </div>
          )}
          <div className="bubble">{it.text}</div>
        </div>
      );
    case "assistant":
      return <AssistantTurn it={it} s={s} />;
    case "progress": {
      const task = s.tasks[it.task];
      return task ? <ProgressCard task={task} /> : null;
    }
    case "card": {
      const c = s.cards[it.card];
      if (!c) return null;
      if (hideOpenCards && isOpen(c) && c.card.kind !== "result_summary")
        return (
          <div className="note-line" style={{ cursor: "pointer" }} onClick={() => document.querySelector(`.pending-stack [data-card="${c.card.card}"]`)?.scrollIntoView({ behavior: "smooth" })}>
            {KIND_LABEL[c.card.kind]}卡等你处理 · 在输入框上方
          </div>
        );
      return <CardView c={c} />;
    }
    case "note":
      return <div className="note-line">{it.text}</div>;
  }
}

function AssistantTurn({ it, s }: { it: Extract<ChatItem, { kind: "assistant" }>; s: SessionState }) {
  const store = useAppStore();
  const tools = it.tools.map((c) => s.tools[c]).filter(Boolean) as ToolCall[];
  return (
    <div className="msg-ai">
      {tools.length > 0 && <ToolCalls tools={tools} />}
      {(it.text || !it.done) && (
        <Bubble
          placement="start"
          variant="borderless"
          content={it.text}
          styles={{ content: { padding: 0, background: "transparent", minHeight: 0 }, root: { paddingInlineEnd: 0 } }}
          contentRender={(text: string) => (
            <span className="text">
              {text}
              {!it.done && <span className="caret" />}
            </span>
          )}
        />
      )}
      {it.refs.length > 0 && (
        <div className="refs">
          {it.refs.map((r) => {
            const card = s.cards[r];
            return (
              <span
                key={r}
                className="chip ref"
                onClick={() => (card ? document.querySelector(`[data-card="${r}"]`)?.scrollIntoView({ behavior: "smooth", block: "center" }) : store.openRef(r))}
              >
                {card ? `${KIND_LABEL[card.card.kind]}卡` : r}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ToolCalls({ tools }: { tools: ToolCall[] }) {
  const store = useAppStore();
  const [open, setOpen] = useState(false);
  const running = tools.some((t) => t.ok === undefined);
  // 一次调用直接显示一行；连续多次折叠成"调用了 N 次工具"
  const rows = tools.length === 1 || open ? tools : [];
  return (
    <div className="tools">
      {tools.length > 1 && (
        <div className="tools-head" onClick={() => setOpen(!open)}>
          {running ? <LoadingOutlined /> : <ToolOutlined />}
          调用了 {tools.length} 次工具
          <span style={{ marginLeft: "auto" }}>{open ? <DownOutlined /> : <RightOutlined />}</span>
        </div>
      )}
      {rows.map((t) => (
        <div key={t.call} className="tool-row" style={tools.length === 1 ? { borderTop: 0 } : undefined}>
          {t.ok === undefined ? (
            <LoadingOutlined style={{ color: "var(--accent)" }} />
          ) : t.ok ? (
            <CheckCircleFilled style={{ color: "var(--success)" }} />
          ) : (
            <CloseCircleFilled style={{ color: "var(--danger)" }} />
          )}
          <span className="sys">{t.system}</span>
          <span className="sum" title={`${t.tool} ${t.argsSummary ?? ""}`}>
            {t.ok === undefined ? t.argsSummary ?? t.tool : t.resultSummary ?? t.argsSummary}
            {t.refs?.map((r) => (
              <span key={r} className="chip ref" style={{ marginLeft: 6 }} onClick={() => store.openRef(r)}>
                {r}
              </span>
            ))}
          </span>
          <span className="ms">{t.durationMs != null ? `${(t.durationMs / 1000).toFixed(1)}s` : ""}</span>
        </div>
      ))}
    </div>
  );
}
