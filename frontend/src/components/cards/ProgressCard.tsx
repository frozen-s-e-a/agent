// 进度卡：各阶段、各区域的状态；展开看执行记录、核对结果、重做原因。一直留在对话里。
import {
  CheckCircleFilled,
  CloseCircleFilled,
  DownOutlined,
  LoadingOutlined,
  MinusCircleOutlined,
  MoreOutlined,
  PlayCircleOutlined,
  RedoOutlined,
  RightOutlined,
} from "@ant-design/icons";
import { Button, Dropdown, Input, Modal, Progress, Tag } from "antd";
import { useEffect, useState } from "react";
import type { TaskStatus } from "../../protocol/types";
import { CHECK_LABEL, regionShort, since, STAGES } from "../../lib/format";
import { REGION_STATE_LABEL } from "../../lib/tokens";
import { useAppStore, useTokens } from "../../store/context";
import { nodeLabel, type TaskState } from "../../store/reduce";

const STATUS: Record<TaskStatus, { label: string; color: string }> = {
  running: { label: "进行中", color: "processing" },
  paused: { label: "已中断", color: "warning" },
  completed: { label: "已完成", color: "success" },
  partial: { label: "部分完成", color: "warning" },
  cancelled: { label: "已停止", color: "default" },
  failed: { label: "失败", color: "error" },
  blocked: { label: "卡住了", color: "error" },
};

const IDLE_MS = 20_000; // 这么久没有新事件，就显示"仍在进行"

export function ProgressCard({ task }: { task: TaskState }) {
  const store = useAppStore();
  const t = useTokens();
  const [open, setOpen] = useState<"log" | "checks" | null>(null);
  const [now, setNow] = useState(Date.now());
  const running = task.status === "running";
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setNow(Date.now()), 5000);
    return () => clearInterval(id);
  }, [running]);

  const stageIdx = STAGES.findIndex((s) => s.stage === task.stage);
  const regions = Object.values(task.regions);
  // 按"核对项 + 区域"取 attempt 最大的那次计数（接口约定 4.2）
  const best = new Map<string, (typeof task.checks)[number]>();
  for (const c of task.checks) {
    const k = `${c.check}|${c.region ?? ""}`;
    const prev = best.get(k);
    if (!prev || c.attempt >= prev.attempt) best.set(k, c);
  }
  const latest = [...best.values()];
  const passed = latest.filter((c) => c.passed).length;
  const failed = latest.filter((c) => !c.passed).length;
  const current = [...task.nodes].reverse().find((n) => !n.finishedAt);
  const idle = running && now - Date.parse(task.lastEventAt) > IDLE_MS;

  const stalled = task.status === "blocked" || task.status === "paused";
  const resume = () =>
    store.host.request("task.resume", { task: task.task }).catch((e: Error) => Modal.error({ title: "没能继续", content: e.message }));

  const rerun = (region?: string) => {
    let note = "";
    Modal.confirm({
      title: region ? `重做 ${regionShort(region)}` : "整个任务重跑",
      content: (
        <Input.TextArea autoFocus placeholder="改了什么口径？比如：账龄改从发票日期起算" onChange={(e) => (note = e.target.value)} autoSize={{ minRows: 2 }} />
      ),
      okText: "重做",
      cancelText: "取消",
      onOk: () => store.host.request("task.rerun", { task: task.task, scope: { regions: region ? [region] : [], fromStage: "basis" }, note }),
    });
  };

  return (
    <div className="card" data-progress={task.task}>
      <div className="card-head">
        <span className="card-kind">进度</span>
        <span className="card-title" style={{ fontWeight: 500 }}>
          {task.files.find((f) => f.file === task.workpaperFile)?.name ?? "底稿任务"}
          {task.understood?.period && <span className="faint"> · {task.understood.period} 年度</span>}
        </span>
        <Tag color={STATUS[task.status].color} style={{ marginInlineEnd: 0 }}>
          {STATUS[task.status].label}
        </Tag>
        <Dropdown
          trigger={["click"]}
          menu={{
            items: [
              ...(stalled ? [{ key: "resume", icon: <PlayCircleOutlined />, label: "从检查点继续" }] : []),
              { key: "rerun", icon: <RedoOutlined />, label: "改口径后重跑…", disabled: running && !task.finishedAt && regions.length === 0 },
              { key: "cancel", icon: <MinusCircleOutlined />, label: "停止任务", danger: true, disabled: !running },
            ],
            onClick: ({ key }) => {
              if (key === "resume") resume();
              if (key === "rerun") rerun();
              if (key === "cancel")
                Modal.confirm({
                  title: "停止这个任务？",
                  content: "已经写好的产出会保留，之后可以从检查点继续。",
                  okText: "停止",
                  okButtonProps: { danger: true },
                  cancelText: "取消",
                  onOk: () => store.host.request("task.cancel", { task: task.task }),
                });
            },
          }}
        >
          <Button size="small" type="text" icon={<MoreOutlined />} />
        </Dropdown>
      </div>
      <div className="card-body">
        <div className="stages">
          {STAGES.map((s, i) => {
            const done = task.status === "completed" || i < stageIdx;
            return (
              <div key={s.stage} className={`stage ${done ? "done" : i === stageIdx ? "current" : ""}`}>
                <span className="pip" />
                {s.label}
              </div>
            );
          })}
        </div>

        {regions.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {regions.map((r) => (
              <div key={r.region} className="region-status" onClick={() => store.focusRegion(r.region, task.task)}>
                <span className="region-swatch" style={{ background: t.regionState[r.state] }} />
                <b>{regionShort(r.region)}</b>
                <span className="activity">
                  {REGION_STATE_LABEL[r.state]}
                  {r.activity ? `：${r.activity}` : ""}
                  {r.attempt > 1 && <span className="faint">（第 {r.attempt} 次）</span>}
                </span>
                <Dropdown
                  trigger={["click"]}
                  menu={{ items: [{ key: "rerun", icon: <RedoOutlined />, label: "重做这个区域…" }], onClick: () => rerun(r.region) }}
                >
                  <Button size="small" type="text" icon={<MoreOutlined />} onClick={(e) => e.stopPropagation()} />
                </Dropdown>
              </div>
            ))}
          </div>
        )}

        {running && current?.progress?.total ? (
          <div>
            <div className="muted" style={{ fontSize: 12 }}>
              {current.progress.message}
            </div>
            <Progress percent={Math.round(((current.progress.done ?? 0) / current.progress.total) * 100)} size="small" showInfo={false} />
          </div>
        ) : null}

        {idle && (
          <div className="idle-hint">
            <LoadingOutlined /> 仍在进行：{current ? `${nodeLabel(current.node)}${current.region ? `（${regionShort(current.region)}）` : ""}` : "等待下一步"}，已用时 {since(task.createdAt, now)}
          </div>
        )}
        {task.blocked && (
          <div className="danger-text">
            卡在{STAGES.find((s) => s.stage === task.blocked?.where)?.label ?? ` ${task.blocked.where}`}：{task.blocked.why}
            {task.blocked.suggest && <div className="muted">建议：{task.blocked.suggest}</div>}
            {stalled && (
              <Button size="small" icon={<PlayCircleOutlined />} style={{ marginTop: 6 }} onClick={resume}>
                从检查点继续
              </Button>
            )}
          </div>
        )}

        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <Button size="small" type={open === "log" ? "primary" : "default"} ghost={open === "log"} icon={open === "log" ? <DownOutlined /> : <RightOutlined />} onClick={() => setOpen(open === "log" ? null : "log")}>
            执行记录 {task.nodes.length}
          </Button>
          <Button size="small" type={open === "checks" ? "primary" : "default"} ghost={open === "checks"} icon={open === "checks" ? <DownOutlined /> : <RightOutlined />} onClick={() => setOpen(open === "checks" ? null : "checks")}>
            核对 {passed} 通过{failed ? ` · ${failed} 未通过` : ""}
          </Button>
          {regions.some((r) => r.retries.length) && (
            <Tag color="warning" style={{ alignSelf: "center" }}>
              重做 {regions.reduce((n, r) => n + r.retries.length, 0)} 次
            </Tag>
          )}
        </div>

        {open === "log" && (
          <div className="log">
            {task.nodes.map((n, i) => (
              <div key={i} className="log-row">
                {n.outcome === "passed" ? (
                  <CheckCircleFilled style={{ color: "var(--success)" }} />
                ) : n.outcome === "failed" ? (
                  <CloseCircleFilled style={{ color: "var(--danger)" }} />
                ) : n.outcome === "skipped" ? (
                  <MinusCircleOutlined />
                ) : (
                  <LoadingOutlined style={{ color: "var(--accent)" }} />
                )}
                <span>
                  {nodeLabel(n.node)}
                  {n.region && <span className="faint">（{regionShort(n.region)}）</span>}
                  {n.kind === "model" && <span className="faint"> · 模型</span>}
                  {n.refs?.length ? <span className="mono faint"> → {n.refs.join(", ")}</span> : null}
                </span>
                <span className="faint">{n.finishedAt ? `${((Date.parse(n.finishedAt) - Date.parse(n.startedAt)) / 1000).toFixed(1)}s` : ""}</span>
              </div>
            ))}
            {regions.flatMap((r) =>
              r.retries.map((x) => (
                <div key={`${r.region}-${x.attempt}`} className="log-row" style={{ color: "var(--warning)" }}>
                  <RedoOutlined />
                  <span>
                    {regionShort(r.region)} 第 {x.attempt} 次：{x.reason}
                  </span>
                  <span />
                </div>
              )),
            )}
          </div>
        )}
        {open === "checks" && (
          <div className="log">
            {task.checks.map((c, i) => (
              <div key={i} className="log-row">
                {c.passed ? <CheckCircleFilled style={{ color: "var(--success)" }} /> : <CloseCircleFilled style={{ color: "var(--danger)" }} />}
                <span>
                  {CHECK_LABEL[c.check] ?? c.check}
                  {c.region && <span className="faint">（{regionShort(c.region)}）</span>}
                  {c.detail && typeof c.detail.left === "object" && c.detail.left && (
                    <span className="faint">
                      {" "}
                      {c.detail.left.label} {c.detail.left.value} / {typeof c.detail.right === "object" ? `${c.detail.right?.label} ${c.detail.right?.value}` : ""}
                      {c.detail.diff && c.detail.diff !== "0.00" ? `，差额 ${c.detail.diff}` : ""}
                    </span>
                  )}
                  {c.detail?.items && <span className="faint">：{c.detail.items.join("；")}</span>}
                </span>
                <span />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
