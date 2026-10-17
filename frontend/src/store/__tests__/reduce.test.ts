import { describe, expect, it } from "vitest";
import replay from "../../host/fake/replay-workpaper-fill.json";
import type { AuditEvent } from "../../protocol/types";
import { emptyState, openCards, reduceAll } from "../reduce";

const events = (replay as unknown as { events: AuditEvent[] }).events;
const end = (replay as unknown as { snapshotAtEnd: { regions: { region: string; state: string; attempt: number; refs: string[] }[]; openCards: string[]; outputs: string[]; status: string } }).snapshotAtEnd;

describe("按事件累积状态", () => {
  it("回放到底和回放文件给的结束快照一致", () => {
    const s = reduceAll(emptyState, events).sessions["S-41d2"];
    const t = s.tasks["T-0c21"];
    expect(t.status).toBe(end.status);
    for (const r of end.regions) {
      expect(t.regions[r.region].state).toBe(r.state);
      expect(t.regions[r.region].attempt).toBe(r.attempt);
      expect(t.regions[r.region].refs).toEqual(r.refs);
    }
    expect(openCards(s).map((c) => c.card.card)).toEqual(end.openCards);
    expect(t.outputs.map((o) => o.file)).toEqual(end.outputs);
    expect(t.workpaper).toBe("W-003");
    expect(t.plan).toBe("FP-001");
    expect(t.regions["W-003#R5"].retries[0].reason).toMatch(/-500.00/);
  });

  it("断线后补取：中间漏掉一段、补取时又有重复，结果和没断开一样", () => {
    const whole = reduceAll(emptyState, events);
    const before = reduceAll(emptyState, events.slice(0, 40));
    // 断线期间 40..69 没收到；重连后 session.events(after=40) 补取，再继续收到 60..（和补取重叠）
    const caught = reduceAll(before, events.slice(40));
    const dup = reduceAll(caught, events.slice(60));
    expect(dup).toEqual(whole);
  });

  it("对话消息：流式片段拼成一条回复，工具调用挂在这一轮上", () => {
    const ev = (type: string, data: unknown, seq: number) => ({ v: "audit-events/1", session: "S-1", seq, ts: "2026-10-17T00:00:00Z", type, data }) as AuditEvent;
    const s = reduceAll(emptyState, [
      ev("message.created", { message: "M-1", text: "问题" }, 1),
      ev("tool.started", { call: "c1", tool: "query_run", system: "审计工具" }, 2),
      ev("tool.finished", { call: "c1", ok: true, resultSummary: "7 行" }, 3),
      ev("message.delta", { message: "M-2", text: "前五" }, 4),
      ev("message.delta", { message: "M-2", text: "大客户" }, 5),
      ev("message.completed", { message: "M-2", text: "前五大客户回款 83%", refs: ["R-1"] }, 6),
    ]).sessions["S-1"];
    expect(s.items.map((i) => i.kind)).toEqual(["user", "assistant"]);
    const a = s.items[1] as Extract<(typeof s.items)[number], { kind: "assistant" }>;
    expect(a.tools).toEqual(["c1"]);
    expect(a.text).toBe("前五大客户回款 83%");
    expect(a.done).toBe(true);
    expect(s.tools.c1.resultSummary).toBe("7 行");
  });
});
