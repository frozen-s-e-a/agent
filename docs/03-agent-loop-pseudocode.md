# 小上下文模型 Agent Loop 伪代码：规划 → 执行 → 验证

> 目标：把"想全、想对"从模型脑子里搬到代码结构里。
> 原则：模型每次只做一个小而明确的动作；流程、预算、验证由代码强制。
> 说明：以下是 Python 风格伪代码，用于表达结构，不能直接运行。`llm()`、`run_tool()` 等函数需要按你们的推理服务和工具实现。

---

## 0. 整体结构

```
用户请求
  │
  ├─ classify() ──► 简单任务 ──► simple_loop()（小循环，直接做）
  │
  └─ 复杂任务
        │
        ▼
     make_plan()          规划：独立调用，产出 3~7 步 JSON 计划
        │
        ▼
     for step in plan:    逐步执行，每步用"干净上下文"
        run_step()        内层工具循环（有轮数上限）
        verify_step()     代码强制验证
        失败 → 重试 → 重规划 → 报 blocker
        │
        ▼
     final_check()        自检轮：对照原始需求逐条核对
        │
        ▼
     最终答复
```

全程通过 `emit()` 向客户端推送事件（流式文本、计划状态、工具进度、错误），并支持中断。

---

## 1. 配置参数

```python
CONFIG = {
    # 标称窗口 128k，但按"有效上下文"做预算：先取 32k，
    # 用真实任务测出质量明显下降的拐点后再调整（见 04-context-budget.md）
    "context_window":        32000,
    "reserve_for_output":    4000,    # 给输出预留
    "budget": {                       # 各部分上下文预算（token）
        "system":            1500,
        "plan_view":         1000,    # 常驻的任务清单
        "step_input":        4000,    # 当前步骤 + 上一步结果摘要
        "history":           10000,   # 本步内的工具往返
        "retrieved":         8000,    # 文件/记忆/检索内容（汇总表、异常清单等）
    },
    "max_plan_steps":        7,
    "max_turns_per_step":    8,       # 单步内工具循环上限
    "max_retries_per_step":  3,       # 单步验证失败重试上限
    "max_replans":           2,       # 整体重规划上限
    "tool_result_max_tokens": 2000,   # 单个工具结果进入上下文前的上限
    "json_repair_attempts":  2,
}
```

---

## 2. 数据结构

```python
class Step:
    id: int
    goal: str                # 这一步要达成什么（一句话）
    tools_hint: list[str]    # 建议使用的工具（可选）
    done_criteria: str       # 完成标准（可被代码或模型检查）
    verify: dict             # 验证方式，如 {"type":"cmd","cmd":"pytest -q"}
    status: str              # pending | in_progress | done | failed | blocked
    result_summary: str      # 完成后的一句话摘要（下一步只看这个）

class Plan:
    original_request: str
    steps: list[Step]
    notes: str               # 关键约束、已知事实（短）

class RunState:
    plan: Plan
    replans: int
    cancelled: bool          # 客户端可置位实现中断
```

---

## 3. 入口

```python
def handle_request(user_msg, session):
    emit("start", user_msg)

    kind = classify(user_msg)          # 见 3.1
    if kind == "simple":
        return simple_loop(user_msg, session)

    state = RunState(plan=make_plan(user_msg, session), replans=0)
    emit("plan", state.plan)           # 客户端展示计划，允许用户编辑/确认

    state.plan = wait_user_confirm_or_edit(state.plan)   # 可选：人工纠偏点

    return execute_plan(state, session)
```

### 3.1 复杂度分类（先用规则，再用小模型）

```python
def classify(msg):
    # 规则优先，便宜且稳定
    if len(msg) < 60 and no_multi_task_words(msg):     # 无"并且/然后/同时/分别"等
        return "simple"
    if mentions_multiple_files_or_deliverables(msg):
        return "complex"
    # 拿不准再让模型判一次（极短 prompt，只输出 simple/complex）
    return llm_choice(msg, options=["simple", "complex"])
```

---

## 4. 规划

```python
PLANNER_PROMPT = """
你是任务规划器，只输出 JSON，不要解释。
把用户请求拆成 3~7 个步骤。每步必须：
- goal：一句话，可独立执行
- done_criteria：如何判断完成（可检查）
- verify：能用命令或读文件验证就给出，否则填 null
不要合并不相关的子任务，不要遗漏用户提到的任何交付物。
"""

def make_plan(user_msg, session):
    ctx = build_context(
        system=PLANNER_PROMPT,
        user=user_msg,
        retrieved=cheap_project_overview(session),   # 目录树/README 摘要，限长
    )
    raw = llm(ctx, response_format=PLAN_JSON_SCHEMA)  # 用约束解码保证 JSON 合法
    plan = parse_or_repair(raw, PLAN_JSON_SCHEMA)
    plan = coverage_check(plan, user_msg)             # 见 4.1
    return plan
```

### 4.1 覆盖检查（防漏项）

```python
def coverage_check(plan, user_msg):
    # 让模型（或规则）列出用户请求里的所有"要求点"，检查每点是否被某一步覆盖
    reqs = llm_json(
        "列出下面请求里的所有独立要求，输出字符串数组：\n" + user_msg
    )
    missing = [r for r in reqs if not any(covers(step, r) for step in plan.steps)]
    if missing:
        plan = llm_json_patch(plan, add_steps_for=missing)
    return plan
```

---

## 5. 执行计划（外层循环）

```python
def execute_plan(state, session):
    plan = state.plan

    while has_pending(plan):
        if state.cancelled:
            emit("cancelled"); return summarize_partial(plan)

        step = next_pending(plan)
        step.status = "in_progress"
        emit("step_start", step)

        ok = run_step_with_retries(step, state, session)

        if ok:
            step.status = "done"
            emit("step_done", step)
            continue

        # 单步重试仍失败 → 尝试重规划，否则报 blocker
        step.status = "failed"
        emit("step_failed", step)

        if state.replans < CONFIG["max_replans"]:
            state.replans += 1
            plan = replan(plan, failed_step=step, session=session)
            state.plan = plan
            emit("plan", plan)
        else:
            step.status = "blocked"
            return report_blocker(plan, step)      # 明确告诉用户卡在哪、为什么、建议

    return final_check(plan, session)
```

---

## 6. 单步执行（含重试与验证）

```python
def run_step_with_retries(step, state, session):
    feedback = None                                  # 上一次失败的原因
    for attempt in range(1, CONFIG["max_retries_per_step"] + 1):

        outcome = run_step(step, state.plan, session, feedback)   # 见第 7 节

        verdict = verify_step(step, outcome, session)             # 见第 8 节
        if verdict.passed:
            step.result_summary = summarize_step(step, outcome)   # 一句话，喂给下一步
            return True

        # 把真实失败信息（截断后）作为下次的反馈，不让模型"假装成功"
        feedback = truncate(verdict.reason, 400)
        emit("retry", {"step": step.id, "attempt": attempt, "reason": feedback})

    return False
```

---

## 7. 内层工具循环（每步一个"干净上下文"）

```python
EXECUTOR_PROMPT = """
你在执行一个计划中的单个步骤。只做这一步，不要处理其他步骤。
需要信息就调用工具，不要猜；工具结果就是事实。
完成后输出：DONE: <一句话结果>。做不到输出：BLOCKED: <原因>。
"""

def run_step(step, plan, session, feedback):
    history = []                                     # 只保存本步内的往返

    for turn in range(CONFIG["max_turns_per_step"]):
        if session.cancelled: return Outcome(status="cancelled")

        ctx = build_context(                         # 见第 9 节：带预算
            system=EXECUTOR_PROMPT,
            plan_view=render_plan_view(plan, current=step),   # 常驻任务清单
            step_input=render_step_input(step, plan, feedback),
            history=history,
            tools=allowed_tools(step),               # 只给这一步需要的工具
        )

        resp = stream_llm(ctx, on_token=lambda t: emit("token", t))
        call = extract_tool_call(resp)

        if call is None:                             # 没有工具调用 → 看是否宣告结束
            if resp.text.startswith("DONE:"):
                return Outcome(status="done", text=resp.text)
            if resp.text.startswith("BLOCKED:"):
                return Outcome(status="blocked", text=resp.text)
            history.append(nudge("请调用工具，或用 DONE:/BLOCKED: 结束本步"))
            continue

        call = validate_or_repair_call(call)         # 见 7.1
        emit("tool_start", call)

        result = run_tool_with_policy(call, session) # 权限/审批/超时在这里
        result = shrink_tool_result(result)          # 见 7.2
        emit("tool_done", {"call": call, "result_preview": preview(result)})

        history.append(assistant_call(call))
        history.append(tool_result(call, result))    # 真实结果必须回环

    return Outcome(status="turn_limit")              # 轮数耗尽，交给验证/重试处理
```

### 7.1 工具调用容错

```python
def validate_or_repair_call(call):
    for _ in range(CONFIG["json_repair_attempts"] + 1):
        errs = schema_validate(call)                 # 工具名、必填参数、类型
        if not errs:
            return call
        call = llm_fix_call(call, errs)              # 让模型只修这一个 JSON
        # 若推理框架支持：改用 grammar / JSON schema 约束解码，从源头避免
    raise ToolCallError("工具调用无法修复")           # 上层当作一次失败反馈
```

### 7.2 工具结果压缩（进入上下文之前）

```python
def shrink_tool_result(result):
    text = result.text
    if tokens(text) <= CONFIG["tool_result_max_tokens"]:
        return result

    if result.kind == "log":                         # 日志：保留错误行附近
        text = keep_error_windows(text, window=15)
    elif result.kind == "file":                      # 文件：保留头部 + 命中片段
        text = head(text, 40) + "\n...\n" + matched_snippets(text, limit=3)
    elif result.kind == "search":
        text = top_k(text, k=5)
    else:
        text = head_tail(text, head=300, tail=200)

    text += "\n[已截断，如需更多请指定行号/关键词再次读取]"
    return result.with_text(text)
```

---

## 8. 验证（代码强制，不靠模型自觉）

```python
def verify_step(step, outcome, session):
    if outcome.status == "blocked":
        return Verdict(False, outcome.text)
    if outcome.status in ("turn_limit", "cancelled"):
        return Verdict(False, "本步未在限定轮数内完成")

    v = step.verify
    # 1) 有可执行验证：直接跑，结果以命令输出为准
    if v and v["type"] == "cmd":
        r = run_tool_with_policy(Call("exec", {"cmd": v["cmd"]}), session)
        return Verdict(r.exit_code == 0, truncate(r.text, 600))

    # 2) 读回验证：例如确认文件真的被修改
    if v and v["type"] == "file_contains":
        content = read_file(v["path"])
        return Verdict(v["pattern"] in content, f"{v['path']} 未包含预期内容")

    # 3) 无法程序化验证：让模型对照 done_criteria 做一次严格判定
    judge = llm_json(JUDGE_PROMPT.format(
        criteria=step.done_criteria,
        outcome=truncate(outcome.text, 800),
    ))                                               # 输出 {"passed": bool, "reason": str}
    return Verdict(judge["passed"], judge["reason"])

JUDGE_PROMPT = """
严格判断：下面的执行结果是否满足完成标准？证据不足按未通过处理。
完成标准：{criteria}
执行结果：{outcome}
只输出 JSON：{{"passed": true/false, "reason": "..."}}
"""
```

---

## 9. 上下文构建（预算强制）

```python
def build_context(system, plan_view="", step_input="", history=(),
                  retrieved="", tools=None, user=""):
    B = CONFIG["budget"]

    parts = [
        ("system",     system,                       B["system"]),
        ("plan_view",  plan_view,                    B["plan_view"]),
        ("step_input", step_input or user,           B["step_input"]),
        ("retrieved",  retrieved,                    B["retrieved"]),
    ]
    msgs = [fit(text, limit) for (_, text, limit) in parts]

    # history 从最新往回装，装不下的旧往返压成一句摘要
    hist_msgs = fit_history_newest_first(history, B["history"],
                                         summarize_old=summarize_turns)

    ctx = assemble(msgs, hist_msgs, tools)

    # 兜底：总量仍超限时，先压 history，再压 retrieved，最后才动 step_input
    while tokens(ctx) > CONFIG["context_window"] - CONFIG["reserve_for_output"]:
        ctx = shrink_next_lowest_priority(ctx)
    return ctx

def render_plan_view(plan, current):
    # 常驻任务清单：短、稳定、放在固定位置
    lines = []
    for s in plan.steps:
        mark = {"done":"[x]","in_progress":"[>]","pending":"[ ]",
                "failed":"[!]","blocked":"[!]"}[s.status]
        tail = f" — {s.result_summary}" if s.status == "done" else ""
        lines.append(f"{mark} {s.id}. {s.goal}{tail}")
    return "任务清单：\n" + "\n".join(lines)

def render_step_input(step, plan, feedback):
    prev = last_done_summary(plan)                   # 只带上一步的一句话摘要
    txt  = f"当前步骤：{step.goal}\n完成标准：{step.done_criteria}\n"
    if prev:     txt += f"上一步结果：{prev}\n"
    if feedback: txt += f"上次失败原因（请避免重复）：{feedback}\n"
    return txt
```

---

## 10. 重规划、阻塞报告、最终自检

```python
def replan(plan, failed_step, session):
    # 保留已完成步骤，只重排剩余部分
    done = [s for s in plan.steps if s.status == "done"]
    ctx = build_context(
        system=REPLAN_PROMPT,
        step_input=render_replan_input(plan, failed_step),
    )
    new_tail = llm_json(ctx, response_format=PLAN_JSON_SCHEMA)
    return Plan(plan.original_request, done + new_tail.steps, plan.notes)

def report_blocker(plan, step):
    # 不无限转圈：明确告诉用户 卡在哪 / 为什么 / 建议
    return {
        "status":   "blocked",
        "step":     step.goal,
        "reason":   step.last_failure_reason,
        "done":     [s.goal for s in plan.steps if s.status == "done"],
        "suggest":  suggest_next_actions(step),
    }

FINAL_CHECK_PROMPT = """
对照【原始请求】逐条核对【已完成步骤】。
输出 JSON：{"covered": [...], "missing": [...], "summary": "给用户的最终答复"}
只根据步骤结果判断，不要编造未做的事。
"""

def final_check(plan, session):
    ctx = build_context(
        system=FINAL_CHECK_PROMPT,
        step_input=plan.original_request + "\n\n" + render_plan_view(plan, None),
    )
    r = llm_json(ctx)
    if r["missing"]:
        # 有漏项：把漏项追加成新步骤，回到执行循环补做（限一次）
        plan.steps += steps_for(r["missing"])
        return execute_plan(RunState(plan=plan, replans=0), session)
    emit("final", r["summary"])
    return r["summary"]
```

---

## 11. 简单任务小循环

```python
def simple_loop(user_msg, session):
    # 不做规划，但仍保留：预算控制 + 工具容错 + 轮数上限
    step = Step(goal=user_msg, done_criteria="回答/完成用户请求", verify=None)
    outcome = run_step(step, Plan(user_msg, [step], ""), session, feedback=None)
    return outcome.text
```

---

## 12. 客户端事件协议（建议）

```
start        {request}
plan         {steps:[{id,goal,status}]}        // 计划视图，可编辑
step_start   {id, goal}
token        "流式文本片段"
tool_start   {name, args}
tool_done    {name, result_preview}
retry        {step, attempt, reason}
step_done    {id, summary}
step_failed  {id, reason}
approval     {cmd, cwd, diff?}                  // 需要用户确认的操作
cancelled    {}
final        "最终答复"
```

客户端应支持：**停止、从某步重来、编辑计划、审批/拒绝、查看某步的完整工具输出**。

---

## 13. 落地顺序建议

1. 先做：第 7.1（工具调用容错）、第 7.2（结果截断）、第 12 节（流式和进度事件）。
2. 再做：第 4、5、6、8 节（规划、执行、重试、验证），这是能力提升的核心。
3. 最后做：第 4.1 覆盖检查、第 10 节自检、多采样、流程模板。

## 14. 调参提示

- `max_turns_per_step` 和 `tool_result_max_tokens` 先保守，再根据失败日志放宽。
- 每次改动都用同一批真实失败任务回测，记录"哪一步坏了"，不要凭感觉调。
- 若推理框架支持前缀缓存，保持 system 和工具描述在最前且不变。
