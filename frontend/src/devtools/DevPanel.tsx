// 开发面板：控制假宿主的回放（播放、暂停、单步、跳到某个 seq、速度、模拟断线）。接真宿主时不显示。
import { useEffect, useState } from "react";
import type { FakeHost, ReplayState } from "../host/fake/FakeHost";

export function DevPanel({ host }: { host: FakeHost }) {
  const [st, setSt] = useState<ReplayState | null>(null);
  const [seq, setSeq] = useState("");
  const [open, setOpen] = useState(true);
  useEffect(() => {
    const off = host.onReplayState(setSt);
    return () => void off();
  }, [host]);
  if (!st) return null;
  if (!open)
    return (
      <div className="devpanel" style={{ padding: "4px 8px" }}>
        <button onClick={() => setOpen(true)}>回放 {st.cursor}/{st.total}</button>
      </div>
    );
  return (
    <div className="devpanel">
      <b style={{ color: "#93c5fd" }}>回放</b>
      <span>
        {st.cursor}/{st.total} · seq {st.lastSeq}
      </span>
      {st.waitingCard && <span style={{ color: "#fbbf24" }}>等回答 {st.waitingCard}</span>}
      {st.playing ? <button onClick={() => host.pause()}>暂停</button> : <button onClick={() => host.play()}>播放</button>}
      <button onClick={() => host.step()} disabled={!!st.waitingCard}>
        单步
      </button>
      <input value={seq} placeholder="seq" onChange={(e) => setSeq(e.target.value)} onKeyDown={(e) => e.key === "Enter" && seq && host.jumpTo(Number(seq))} />
      <button onClick={() => seq && host.jumpTo(Number(seq))}>跳到</button>
      <select value={st.speed} onChange={(e) => host.setSpeed(Number(e.target.value))} style={{ background: "#1f2937", color: "#e5e7eb", border: "1px solid #374151", borderRadius: 6 }}>
        {[0.5, 1, 2, 5, 20].map((s) => (
          <option key={s} value={s}>
            {s}×
          </option>
        ))}
      </select>
      <button onClick={() => host.setConnected(!st.connected)} style={st.connected ? undefined : { background: "#7f1d1d" }}>
        {st.connected ? "断线" : "重连"}
      </button>
      <button onClick={() => setOpen(false)}>收起</button>
    </div>
  );
}
