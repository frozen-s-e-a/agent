// 点已填或拟写的格：在格子旁弹出来源小卡（cell.trace）。
import { CheckCircleFilled, CloseCircleFilled, CloseOutlined, TableOutlined } from "@ant-design/icons";
import { Button, Spin } from "antd";
import { useEffect, useState } from "react";
import type { CellTrace } from "../../protocol/types";
import { amt, BASIS_LABEL } from "../../lib/format";
import { useAppStore } from "../../store/context";

export function TracePopover({ cell, output, x, y, onClose }: { cell: string; output: string; x: number; y: number; onClose: () => void }) {
  const store = useAppStore();
  const [data, setData] = useState<CellTrace | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    setData(null);
    store.host.request("cell.trace", { output, cell }).then(setData, (e) => setErr(String(e.message ?? e)));
  }, [store, cell, output]);
  const left = Math.min(x + 8, window.innerWidth - 360);
  const top = Math.min(Math.max(8, y - 10), window.innerHeight - 380);
  return (
    <div style={{ position: "fixed", left, top, zIndex: 30 }} className="card">
      <div className="card-head">
        <span className="card-kind">来源</span>
        <span className="card-title mono">{cell}</span>
        <Button size="small" type="text" icon={<CloseOutlined />} onClick={onClose} />
      </div>
      <div className="card-body trace-pop">
        {!data && !err && <Spin size="small" />}
        {err && <span className="danger-text">{err}</span>}
        {data && (
          <>
            <div className="kv">
              <span className="k">值</span>
              <span style={{ fontVariantNumeric: "tabular-nums" }}>{data.value && /^-?[\d.]+$/.test(data.value) ? amt(data.value) : (data.value ?? "—")}</span>
              {data.from ? (
                <>
                  <span className="k">结果</span>
                  <span>
                    <span className="chip ref" onClick={() => store.openTable(data.from!.result, data.from!.row)}>
                      {data.from.result}#{data.from.row}
                    </span>{" "}
                    第 {data.from.row} 行 · {data.from.column}
                  </span>
                </>
              ) : (
                <>
                  <span className="k">来源</span>
                  <span className="muted">公式计算，不是写入的值</span>
                </>
              )}
              {data.source && (
                <>
                  <span className="k">资料</span>
                  <span>
                    {data.source.file} · {data.source.sheet}
                    {data.source.rowCount != null && <span className="faint">（{data.source.rowCount} 行明细）</span>}
                  </span>
                </>
              )}
            </div>
            {!!data.basis?.length && (
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <span className="muted" style={{ fontSize: 12 }}>口径</span>
                {data.basis.map((b) => (
                  <div key={b.label} style={{ display: "flex", gap: 8 }}>
                    <span className="faint" style={{ width: 64 }}>{b.label}</span>
                    <span style={{ flex: 1 }}>{b.value}</span>
                    {b.basis && <span className={`basis-tag ${b.basis === "inferred" ? "inferred" : ""}`}>{BASIS_LABEL[b.basis]}</span>}
                  </div>
                ))}
              </div>
            )}
            {!!data.checks?.length && (
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <span className="muted" style={{ fontSize: 12 }}>核对</span>
                {data.checks.map((c) => (
                  <div key={c.check} style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    {c.passed ? <CheckCircleFilled style={{ color: "var(--success)" }} /> : <CloseCircleFilled style={{ color: "var(--danger)" }} />}
                    <span>{c.label ?? c.check}</span>
                  </div>
                ))}
              </div>
            )}
            {data.source && (
              <Button size="small" icon={<TableOutlined />} onClick={() => store.openTable(data.source!.table, data.source!.rows[0] ?? null)}>
                查看明细行
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
