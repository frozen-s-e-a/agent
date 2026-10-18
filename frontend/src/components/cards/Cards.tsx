// 第五节的七种卡片。卡片在对话里，但和工作区的表双向联动：点区域、单元格、编号，表上定位。
import {
  ExclamationCircleFilled,
  FileExcelOutlined,
  TableOutlined,
  UndoOutlined,
  WarningFilled,
} from "@ant-design/icons";
import { Button, Input, Modal, Popconfirm, Radio, Tag, Tooltip } from "antd";
import { useMemo, useState } from "react";
import type {
  ActionConfirmationBody,
  DiscrepancyBody,
  Question,
  ResultSummaryBody,
  UnderstandingBody,
  WriteConfirmationBody,
} from "../../protocol/types";
import { amt, BASIS_LABEL, regionShort } from "../../lib/format";
import { draftChanges, type UnderstandingDraft } from "../../store/appStore";
import { useApp, useAppStore, useTokens } from "../../store/context";
import type { CardState } from "../../store/reduce";
import { CardShell } from "./CardShell";

export function CardView({ c }: { c: CardState }) {
  switch (c.card.kind) {
    case "workpaper_understanding":
      return <UnderstandingCard c={c} body={c.card.body} />;
    case "basis_confirmation":
      return <QuestionsCard c={c} questions={c.card.body.questions} />;
    case "question":
      return <QuestionsCard c={c} questions={c.card.body.questions} />;
    case "discrepancy":
      return <DiscrepancyCard c={c} body={c.card.body} />;
    case "write_confirmation":
      return <WriteCard c={c} body={c.card.body} />;
    case "result_summary":
      return <ResultCard c={c} body={c.card.body} />;
    case "action_confirmation":
      return <ActionCard c={c} body={c.card.body} />;
  }
}

function useAnswer(c: CardState) {
  const store = useAppStore();
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const answer = async (action: string, edits?: Record<string, unknown>, note?: string) => {
    setBusy(action);
    setErr(null);
    try {
      await store.answer(c.card, action, edits, note);
    } catch (e) {
      setErr(String((e as Error).message ?? e));
    } finally {
      setBusy(null);
    }
  };
  return { answer, busy, err };
}

function RegionLink({ region, task }: { region: string; task?: string }) {
  const store = useAppStore();
  const t = useTokens();
  const state = useApp((s) => (s.ui.session ? s.ev.sessions[s.ui.session]?.tasks[task ?? ""]?.regions[region]?.state : undefined));
  return (
    <Tooltip title="在表上查看">
      <span className="chip" onClick={() => store.focusRegion(region, task)}>
        <span className="region-swatch" style={{ background: t.regionState[state ?? "pending"], width: 8, height: 8 }} />
        {regionShort(region)}
      </span>
    </Tooltip>
  );
}

function RefChip({ id, task }: { id: string; task?: string }) {
  const store = useAppStore();
  return (
    <span className="chip ref" onClick={() => store.openRef(id, { task })}>
      {id}
    </span>
  );
}

// ---------- 5.2 底稿理解卡 ----------

const TYPE_LABEL: Record<string, string> = {
  detail_table: "明细表",
  fixed_table: "固定项目表",
  form: "表单",
  checklist: "检查表",
  text: "文字区",
  none: "不需填写",
};

function UnderstandingCard({ c, body }: { c: CardState; body: UnderstandingBody }) {
  const store = useAppStore();
  const t = useTokens();
  const draft = useApp((s) => s.ui.drafts[c.card.card]) as UnderstandingDraft | undefined;
  const { answer, busy, err } = useAnswer(c);
  const [rejecting, setRejecting] = useState(false);
  const [note, setNote] = useState("");
  const open = !c.answer;
  const changes = draftChanges(draft);
  const uncertainCount = body.regions.reduce((n, r) => n + (r.uncertain?.length ?? 0), 0);

  const submit = () => {
    const edits: Record<string, unknown> = {};
    const unc: Record<string, number | string> = {};
    for (const r of body.regions)
      for (const u of r.uncertain ?? []) unc[`${r.region}/${u.item}`] = draft?.uncertain[`${r.region}/${u.item}`] ?? u.suggest ?? 0;
    if (Object.keys(unc).length) edits.uncertain = unc;
    if (changes) {
      // 表上的修改只有坐标，按接口约定 5.2 补上工作表名
      const sheet = body.regions[0]?.range.split("!")[0] ?? "";
      const full = (a: string) => `${sheet}!${a}`;
      edits.regions = [
        ...Object.entries(draft!.regions).map(([region, v]) => ({ region, ...v, ...(v.range ? { range: full(v.range) } : {}) })),
        ...draft!.added.map((a) => ({ add: { ...a, range: full(a.range) } })),
      ];
      edits.manual = { add: draft!.manualAdd.map(full), remove: draft!.manualRemove.map(full) };
    }
    void answer(changes ? "edit" : "confirm", edits);
  };

  return (
    <CardShell
      c={c}
      extraHead={body.template && !body.template.known ? <Tag style={{ marginInlineEnd: 0 }}>新模板</Tag> : null}
      footer={
        rejecting ? (
          <>
            <Input size="small" autoFocus placeholder="哪里不对？比如：前五名区域应该到第 22 行" value={note} onChange={(e) => setNote(e.target.value)} />
            <Button size="small" onClick={() => setRejecting(false)}>
              取消
            </Button>
            <Button size="small" danger loading={busy === "reject"} onClick={() => void answer("reject", {}, note)}>
              退回
            </Button>
          </>
        ) : (
          <>
            {changes > 0 ? (
              <span className="muted" style={{ fontSize: 12 }}>
                已修改 {changes} 处
                <Button size="small" type="link" icon={<UndoOutlined />} onClick={() => store.undoDraft(c.card.card)}>
                  撤销
                </Button>
              </span>
            ) : (
              <span className="faint" style={{ fontSize: 12 }}>
                可以直接在表上拖动区域边框、右键标人工格
              </span>
            )}
            <span className="spacer" />
            <Button size="small" onClick={() => setRejecting(true)}>
              不对
            </Button>
            <Button size="small" type="primary" loading={busy === "confirm" || busy === "edit"} onClick={submit}>
              {changes ? "按修改确认" : "确认"}
            </Button>
          </>
        )
      }
    >
      <div className="muted" style={{ fontSize: 12.5 }}>
        识别出 {body.regions.length} 个要填的区域{uncertainCount ? `，${uncertainCount} 处不确定需要你选` : "，没有不确定的地方"}。点区域名在表上查看。
      </div>
      {body.regions.map((r) => {
        const rd = draft?.regions[r.region];
        const skipped = rd?.type === "none";
        return (
          <div key={r.region} className="region-row" style={skipped ? { opacity: 0.55 } : undefined}>
            <div className="region-row-head" onClick={() => store.focusRegion(r.region, c.task)}>
              <span className="region-swatch" style={{ background: t.regionState.awaiting_confirmation }} />
              <b>{regionShort(r.region)}</b>
              <span>{r.purpose}</span>
              <span className="mono faint">{(rd?.range ?? r.range.split("!")[1]) + (rd?.range ? "（已改）" : "")}</span>
              {r.type && <Tag style={{ marginInlineEnd: 0 }}>{TYPE_LABEL[r.type] ?? r.type}</Tag>}
              {skipped && <Tag color="default">不需要填写</Tag>}
            </div>
            <table className="col-table">
              <thead>
                <tr>
                  <th>列</th>
                  <th>含义</th>
                  <th>期间</th>
                  <th>单位</th>
                  <th>依据</th>
                </tr>
              </thead>
              <tbody>
                {r.columns.map((col) => (
                  <tr key={col.col}>
                    <td className="mono">{col.col}</td>
                    <td>
                      {col.measure}
                      {col.direction && <span className="faint">（{col.direction === "debit" ? "借方" : "贷方"}）</span>}
                    </td>
                    <td className="mono">{col.period ?? "—"}</td>
                    <td>{col.unit ?? "—"}</td>
                    <td>
                      <Tooltip title={col.basisRef ? `来自 ${col.basisRef}` : undefined}>
                        <span className={`basis-tag ${col.basis === "inferred" ? "inferred" : ""}`}>{BASIS_LABEL[col.basis ?? ""] ?? col.basis}</span>
                      </Tooltip>
                      {col.confidence === "low" && <WarningFilled style={{ color: "var(--warning)", marginLeft: 4 }} />}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!!r.manual?.length && (
              <div className="muted" style={{ fontSize: 12 }}>
                人工填写：<span className="mono">{r.manual.map((m) => m.split("!")[1]).join("、")}</span>
              </div>
            )}
            {(r.uncertain ?? []).map((u) => {
              const key = `${r.region}/${u.item}`;
              const v = draft?.uncertain[key] ?? u.suggest ?? 0;
              return (
                <div key={u.item} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <div>
                    <ExclamationCircleFilled style={{ color: "var(--warning)" }} /> {u.item}
                    {u.why && <span className="faint">（{u.why}）</span>}
                  </div>
                  <Radio.Group
                    disabled={!open}
                    value={v}
                    onChange={(e) => store.updateDraft(c.card.card, (d) => void (d.uncertain[key] = e.target.value))}
                    options={u.options.map((o, i) => ({ value: i, label: `${o}${i === u.suggest ? "（建议）" : ""}` }))}
                  />
                </div>
              );
            })}
          </div>
        );
      })}
      {(draft?.added ?? []).map((a, i) => (
        <div key={i} className="region-row" style={{ borderStyle: "dashed" }}>
          <div className="region-row-head">
            <span className="region-swatch" style={{ background: t.accent }} />
            <b>新增区域</b>
            <span className="mono faint">{a.range}</span>
            <Tag style={{ marginInlineEnd: 0 }}>{TYPE_LABEL[a.type] ?? a.type}</Tag>
          </div>
        </div>
      ))}
      {c.answer?.note && <div className="muted">退回说明：{c.answer.note}</div>}
      {err && <div className="danger-text">{err}</div>}
    </CardShell>
  );
}

// ---------- 5.3 口径确认卡 / 5.6 一般追问 ----------

function QuestionsCard({ c, questions }: { c: CardState; questions: Question[] }) {
  const { answer, busy, err } = useAnswer(c);
  const answered = c.answer?.edits as Record<string, number | string> | undefined;
  const isBasis = c.card.kind === "basis_confirmation";
  const [vals, setVals] = useState<Record<string, number | string>>(() =>
    Object.fromEntries(questions.map((q) => [q.id, q.options.length ? (q.suggest ?? 0) : ""])),
  );
  const [other, setOther] = useState<Record<string, string>>({});
  const open = !c.answer;
  const ready = questions.every((q) => (vals[q.id] === "other" ? !!other[q.id]?.trim() : vals[q.id] !== "" && vals[q.id] != null));

  return (
    <CardShell
      c={c}
      footer={
        <>
          <span className="faint" style={{ fontSize: 12 }}>
            {isBasis ? "影响金额由代码算出；建议项已预选" : `${questions.length} 个问题`}
          </span>
          <span className="spacer" />
          <Button
            size="small"
            type="primary"
            disabled={!ready}
            loading={!!busy}
            onClick={() =>
              void answer(
                "confirm",
                Object.fromEntries(questions.map((q) => [q.id, vals[q.id] === "other" ? other[q.id] : vals[q.id]])),
              )
            }
          >
            {isBasis ? "确认口径" : "提交回答"}
          </Button>
        </>
      }
    >
      {questions.map((q, qi) => {
        const cur = open ? vals[q.id] : answered?.[q.id];
        return (
          <div key={q.id} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              {questions.length > 1 && <span className="faint">{qi + 1}.</span>}
              <b>{q.text}</b>
              {q.region && <RegionLink region={q.region} task={c.task} />}
            </div>
            {q.options.length ? (
              <>
                {q.options.map((o, i) => (
                  <div
                    key={i}
                    className={`option ${cur === i ? "selected" : ""}`}
                    onClick={() => open && setVals((v) => ({ ...v, [q.id]: i }))}
                    style={!open ? { cursor: "default", opacity: cur === i ? 1 : 0.5 } : undefined}
                  >
                    <Radio checked={cur === i} disabled={!open} />
                    <div style={{ display: "flex", flexDirection: "column", gap: 2, flex: 1 }}>
                      <span>
                        {o.label} {i === q.suggest && <span className="suggest">建议</span>}
                      </span>
                      {o.impact && <span className="impact">{o.impact}</span>}
                    </div>
                  </div>
                ))}
                {q.allowText && open && (
                  <div className={`option ${vals[q.id] === "other" ? "selected" : ""}`} onClick={() => setVals((v) => ({ ...v, [q.id]: "other" }))}>
                    <Radio checked={vals[q.id] === "other"} />
                    <Input
                      size="small"
                      variant="borderless"
                      placeholder="其他，写下你的口径"
                      value={other[q.id] ?? ""}
                      onChange={(e) => {
                        setOther((x) => ({ ...x, [q.id]: e.target.value }));
                        setVals((v) => ({ ...v, [q.id]: "other" }));
                      }}
                    />
                  </div>
                )}
                {!open && typeof cur === "string" && <div className="option selected">其他：{cur}</div>}
              </>
            ) : (
              <Input.TextArea
                autoSize={{ minRows: 1, maxRows: 4 }}
                disabled={!open}
                value={open ? String(vals[q.id] ?? "") : String(cur ?? "")}
                onChange={(e) => setVals((v) => ({ ...v, [q.id]: e.target.value }))}
              />
            )}
          </div>
        );
      })}
      {err && <div className="danger-text">{err}</div>}
    </CardShell>
  );
}

// ---------- 5.4 差异卡 ----------

function DiscrepancyCard({ c, body }: { c: CardState; body: DiscrepancyBody }) {
  const store = useAppStore();
  const { answer, busy, err } = useAnswer(c);
  const [note, setNote] = useState("");
  const actions = body.actions ?? c.card.actions;
  return (
    <CardShell
      c={c}
      footer={
        <>
          <Input size="small" placeholder="备注（接受差异时必填）" value={note} onChange={(e) => setNote(e.target.value)} />
          {actions.includes("stop") && (
            <Button size="small" danger loading={busy === "stop"} onClick={() => void answer("stop", {}, note)}>
              停止
            </Button>
          )}
          {actions.includes("fix_data") && (
            <Button size="small" loading={busy === "fix_data"} onClick={() => void answer("fix_data", {}, note)}>
              修正资料
            </Button>
          )}
          {actions.includes("accept_with_note") && (
            <Button size="small" type="primary" disabled={!note.trim()} loading={busy === "accept_with_note"} onClick={() => void answer("accept_with_note", {}, note)}>
              接受差异
            </Button>
          )}
        </>
      }
    >
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <RegionLink region={body.region} task={c.task} />
        <span className="muted">{body.check === "control" ? "控制数核对不一致，自动重做后仍未解决" : "双路复算不一致"}</span>
      </div>
      <div className="stat-row">
        <div className="stat">
          <div className="label">{body.left.label}</div>
          <div className="big-number" style={{ fontSize: 16 }}>{amt(body.left.value)}</div>
          {body.left.ref && <RefChip id={body.left.ref} task={c.task} />}
        </div>
        <div className="stat">
          <div className="label">{body.right.label}</div>
          <div className="big-number" style={{ fontSize: 16 }}>{amt(body.right.value)}</div>
          {body.right.ref && <RefChip id={body.right.ref} task={c.task} />}
        </div>
        <div className="stat" style={{ borderColor: "color-mix(in srgb, var(--danger) 40%, var(--border))" }}>
          <div className="label">差额{body.threshold ? `（阈值 ${amt(body.threshold)}）` : ""}</div>
          <div className="big-number" style={{ fontSize: 16, color: "var(--danger)" }}>{amt(body.diff)}</div>
        </div>
      </div>
      {!!body.candidates?.length && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span className="muted">可能原因</span>
          {body.candidates.map((cand, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ flex: 1 }}>{cand.label}</span>
              {cand.ref && (
                <Button size="small" icon={<TableOutlined />} onClick={() => store.openRef(cand.ref!, { task: c.task })}>
                  查看行
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
      {c.answer?.note && <div className="muted">备注：{c.answer.note}</div>}
      {err && <div className="danger-text">{err}</div>}
    </CardShell>
  );
}

// ---------- 5.5 写入确认卡 ----------

function WriteCard({ c, body }: { c: CardState; body: WriteConfirmationBody }) {
  const store = useAppStore();
  const { answer, busy, err } = useAnswer(c);
  const total = body.regions.reduce((n, r) => n + r.cells, 0);
  const manualCells = useMemo(() => body.manual.reduce((n, m) => n + rangeSize(m), 0), [body.manual]);
  const task = useApp((s) => (c.task && s.ui.session ? s.ev.sessions[s.ui.session]?.tasks[c.task] : undefined));
  return (
    <CardShell
      c={c}
      footer={
        <>
          <Button
            size="small"
            icon={<TableOutlined />}
            onClick={() => task?.workpaperFile && store.openSheet(task.workpaperFile, { mode: "plan", task: task.task })}
          >
            在表上查看拟写值
          </Button>
          <span className="spacer" />
          <Button size="small" loading={busy === "reject"} onClick={() => void answer("reject")}>
            不写
          </Button>
          <Button size="small" type="primary" loading={busy === "confirm"} onClick={() => void answer("confirm")}>
            确认写入
          </Button>
        </>
      }
    >
      <div className="stat-row">
        <div className="stat">
          <div className="label">写入格数</div>
          <div className="big-number">{total}</div>
        </div>
        <div className="stat" style={body.overwrites.length ? { borderColor: "color-mix(in srgb, var(--danger) 45%, var(--border))" } : undefined}>
          <div className="label">覆盖原有内容</div>
          <div className="big-number" style={body.overwrites.length ? { color: "var(--danger)" } : undefined}>
            {body.overwrites.length}
          </div>
        </div>
        <div className="stat">
          <div className="label">留给人工</div>
          <div className="big-number">{manualCells}</div>
        </div>
      </div>
      {body.regions.map((r) => (
        <div key={r.region} style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <RegionLink region={r.region} task={c.task} />
          <span>{r.cells} 格</span>
          <span className="muted">口径：{r.basis}</span>
          <span className="faint">来源</span>
          {r.sources.map((s) => (
            <RefChip key={s} id={s} task={c.task} />
          ))}
        </div>
      ))}
      <div className="kv">
        <span className="k">写到</span>
        <span className="mono">{body.output}</span>
        <span className="k">原文件</span>
        <span>{body.target}（不改动）</span>
        {!!body.manual.length && (
          <>
            <span className="k">人工格</span>
            <span className="mono">{body.manual.map((m) => m.split("!")[1]).join("、")}</span>
          </>
        )}
      </div>
      {err && <div className="danger-text">{err}</div>}
    </CardShell>
  );
}

function rangeSize(ref: string) {
  const body = ref.split("!").pop()!;
  const [a, b] = body.split(":");
  if (!b) return 1;
  const p = /([A-Z]+)(\d+)/.exec(a)!;
  const q = /([A-Z]+)(\d+)/.exec(b)!;
  const col = (s: string) => [...s].reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 64, 0);
  return (Math.abs(col(q[1]) - col(p[1])) + 1) * (Math.abs(Number(q[2]) - Number(p[2])) + 1);
}

// ---------- 5.7 结果卡 ----------

function ResultCard({ c, body }: { c: CardState; body: ResultSummaryBody }) {
  const store = useAppStore();
  const { answer } = useAnswer(c);
  return (
    <CardShell c={c}>
      <div className="stat-row">
        <div className="stat">
          <div className="label">核对通过</div>
          <div className="big-number" style={{ color: body.checks.failed ? undefined : "var(--success)" }}>
            {body.checks.passed}
            <span className="faint" style={{ fontSize: 12, fontWeight: 400 }}> / {body.checks.passed + body.checks.failed}</span>
          </div>
          {!!body.checks.retried && <div className="faint" style={{ fontSize: 11.5 }}>其中重做 {body.checks.retried} 次后通过</div>}
        </div>
        <div className="stat">
          <div className="label">未通过</div>
          <div className="big-number" style={{ color: body.checks.failed ? "var(--danger)" : undefined }}>{body.checks.failed}</div>
        </div>
        <div className="stat">
          <div className="label">需人工填写</div>
          <div className="big-number">{body.manual}</div>
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {body.outputs.map((o) => (
          <div key={o.output ?? o.file} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <FileExcelOutlined style={{ color: "#1f8a50" }} />
            <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis" }}>{o.file.split("/").pop()}</span>
            <Button size="small" onClick={() => store.openSheet(o.output ?? o.file, { mode: o.kind === "workpaper" ? "filled" : "raw", task: c.task, title: o.file.split("/").pop() })}>
              在表上查看
            </Button>
            <Button size="small" onClick={() => store.host.request("output.open", { file: o.output ?? o.file }).catch((e: Error) => Modal.error({ title: "打不开文件", content: e.message }))}>
              用 Excel 打开
            </Button>
          </div>
        ))}
      </div>
      {!!body.notes?.length && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {body.notes.map((n, i) => (
            <div key={i} className="suggested-note">
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                <b style={{ fontSize: 12.5 }}>{n.section}</b>
                <Tag color={n.status === "suggested" ? "processing" : "success"} style={{ marginInlineEnd: 0 }}>
                  {n.status === "suggested" ? "建议 · 待你确认" : "已确认"}
                </Tag>
              </div>
              <div>{n.text}</div>
            </div>
          ))}
          <div className="faint" style={{ fontSize: 11.5 }}>上面的数字由代码算出并核对；说明文字由模型起草，确认后才算定稿。</div>
        </div>
      )}
      {!c.answer && (
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <Button size="small" type="link" onClick={() => void answer("confirm")}>
            知道了
          </Button>
        </div>
      )}
    </CardShell>
  );
}

// ---------- 5.8 动作确认卡 ----------

function ActionCard({ c, body }: { c: CardState; body: ActionConfirmationBody }) {
  const { answer, busy, err } = useAnswer(c);
  const irreversible = body.reversible !== true; // null 也按不可撤销
  return (
    <CardShell
      c={c}
      footer={
        <>
          <span className="faint" style={{ fontSize: 12 }}>只对这一次调用有效</span>
          <span className="spacer" />
          {irreversible ? (
            <>
              <Popconfirm title="此操作不可撤销，确定执行？" okText="执行" okButtonProps={{ danger: true }} cancelText="再想想" onConfirm={() => void answer("confirm")}>
                <Button size="small" danger loading={busy === "confirm"}>
                  仍然执行
                </Button>
              </Popconfirm>
              <Button size="small" type="primary" autoFocus loading={busy === "reject"} onClick={() => void answer("reject")}>
                拒绝
              </Button>
            </>
          ) : (
            <>
              <Button size="small" loading={busy === "reject"} onClick={() => void answer("reject")}>
                拒绝
              </Button>
              <Button size="small" type="primary" loading={busy === "confirm"} onClick={() => void answer("confirm")}>
                允许这一次
              </Button>
            </>
          )}
        </>
      }
    >
      {irreversible && (
        <div className="danger-text" style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <WarningFilled /> 此操作不可撤销
        </div>
      )}
      <div className="kv">
        <span className="k">系统</span>
        <span>{body.system}</span>
        <span className="k">操作</span>
        <span>{body.operation}</span>
        <span className="k">对象</span>
        <span className={body.target ? undefined : "faint"}>{body.target ?? "宿主没能识别"}</span>
        {body.argsSummary.map((a) => (
          <FragmentKV key={a.label} k={a.label} v={a.value} />
        ))}
        {body.reversible && body.reverseHow && <FragmentKV k="怎么撤销" v={body.reverseHow} />}
        <span className="k">工具</span>
        <span className="mono faint">{body.tool}</span>
      </div>
      {err && <div className="danger-text">{err}</div>}
    </CardShell>
  );
}

function FragmentKV({ k, v }: { k: string; v: string }) {
  return (
    <>
      <span className="k">{k}</span>
      <span>{v}</span>
    </>
  );
}

