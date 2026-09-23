---
name: monthly-analysis-mcp
description: Use when user requests monthly analysis (月间分析) of chronological ledger data. Triggers on 月间分析, 月度分析, monthly analysis, 序时账分析, 同环比变动. Guides the multi-step MCP tool workflow with user confirmation at each stage.
---

# 月间分析 MCP 工作流

## 核心规则

**这是一个必须分步交互的工作流。每一步完成后必须停下来向用户展示结果并等待确认，然后才能进入下一步。绝对不能一口气连续调用多个工具。**

**违反以下任何一条就是 bug：**
- 不能在用户未确认 column_mapping 的情况下调用 detect_structure
- 不能在用户未确认科目列表的情况下调用 execute
- 不能连续调用两个工具而不等待用户回复
- "用户没说要确认"不成立——这个工作流的确认是强制的

## 工作流（严格按顺序）

```
Step 1: monthly_preview
   → 看数据结构
   → ⛔ 停下来，向用户展示列名 + 建议映射
   → ⛔ 等用户回复确认

Step 2: monthly_detect_structure
   → 分析编码结构，推荐科目
   → ⛔ 停下来，向用户展示科目列表
   → ⛔ 等用户回复确认要分析哪些科目

Step 3: monthly_execute
   → 执行分析（自动检测 AI 配置）
   → 展示结果

Step 4: monthly_ai_analysis [可选]
   → 仅当 execute 未启用 AI 时使用
```

## Step 1: monthly_preview

**调用：**
```json
{
  "file_path": "序时账文件路径",
  "sheet_name": "Sheet名（可不传）",
  "preview_rows": 5
}
```

**返回内容：** columns（列名）、preview（样本行）、subject_code_samples（科目编码样本）

### Step 1 完成后必须做的事：

1. **向用户展示所有列名**，格式如：
   ```
   检测到以下列：日期、凭证字号、摘要、科目代码、科目名称、借方金额、贷方金额
   ```

2. **主动建议 column_mapping**，格式如：
   ```
   字段映射建议：
   - 日期列: "日期"
   - 科目代码列: "科目代码"
   - 科目名称列: "科目名称"
   - 借方金额列: "借方金额"
   - 贷方金额列: "贷方金额"
   - 摘要列: "摘要"（可选）
   ```

3. **停下来，问用户：** "以上字段映射是否正确？如有需要修改请告知。"

4. **等待用户回复后**才能继续 Step 2

## Step 2: monthly_detect_structure

**调用：**
```json
{
  "file_path": "同上文件路径",
  "column_mapping": "{\"date\": \"日期\", \"subject_code\": \"科目代码\", ...}"
}
```

**返回内容：** code_structure（编码参数）、top_subjects（推荐科目列表）

### Step 2 完成后必须做的事：

1. **展示编码结构识别结果**

2. **展示 top_subjects 列表**，格式如：
   ```
   检测到以下科目，建议分析方向：
   序号 | 科目代码 | 科目名称 | 借方合计 | 贷方合计 | 推荐方向
   1   | 6001    | 主营业务收入 | 0 | 5,000,000 | 贷
   2   | 1001    | 库存现金    | 200,000 | 0 | 借
   3   | 1002    | 银行存款    | 3,000,000 | 2,500,000 | 借
   ```

3. **停下来，问用户：** "以上哪些科目需要分析？可以增删科目，也可以修改借贷方向。"

4. **等待用户回复后**才能继续 Step 3

## Step 3: monthly_execute

**调用：**
```json
{
  "this_year_file": "本期文件路径",
  "last_year_file": "上期文件路径（如有）",
  "this_year_sheet": "Sheet名",
  "last_year_sheet": "Sheet名",
  "column_mapping": "确认后的映射 JSON",
  "subjects": "[{\"code\": \"6001\", \"direction\": \"贷\"}, ...]",
  "code_structure": "{\"flag\": \"—\", \"start\": 1, ...}",
  "threshold_amt": 100000,
  "threshold_rate": 0.3
}
```

**可选参数（控制 AI 分析粒度）：**
- `threshold_amt`：变动额阈值（默认 100000），超过才做 AI 分析
- `threshold_rate`：变动率阈值（默认 0.3 即 30%），超过才做 AI 分析

**行为：**
- 自动从 config.json 读取 AI 配置（base_url + api_key）
- AI 配置有效 → 自动执行变动分析（变动原因 + 审计应对）
- AI 配置无效 → 仅生成基础月间分析表

**完成后告知用户：**
- AI 分析是否已启用
- 结果文件路径
- 分析概况摘要

## Step 4: monthly_ai_analysis（可选）

仅在以下情况使用：
- execute 未启用 AI（config.json 无有效 AI 配置），但用户后来提供了 API key
- 用户想对历史结果重新做 AI 分析
- 用户想调整 AI 阈值后重跑

**调用：**
```json
{
  "result_file": "月间分析结果文件路径",
  "this_year_file": "本期原始数据",
  "column_mapping": "同上",
  "threshold_amt": 100000,
  "threshold_rate": 0.3
}
```

## 红线

- **禁止跳过 Step 1 直接 execute** — 会导致列映射错误
- **禁止跳过用户确认科目选择** — 默认分析所有科目是错误的
- **禁止假设 column_mapping** — 必须从 preview 结果推断并让用户确认
- **禁止连续调用两个工具** — 每步之后必须有用户回复
- **有上期数据时必须传入 last_year_file** — 否则无同环比

## 常见错误

| 错误 | 原因 | 修复 |
|------|------|------|
| 生成的表没有 AI 分析 | config.json 中未配置 base_url/api_key，或 MCP Server 未正确加载 | 检查参数设置 |
| 科目方向全错 | 没让用户确认 subjects 的 direction | 展示推荐后让用户修改 |
| 数据校验失败 | column_mapping 中字段名与实际列名不匹配 | 重新 preview 确认 |
| 一次执行多个工具 | 违反了交互式工作流 | 每步必须等待用户 |
| 输出只有 1-6 月 | 这是正常的，数据只覆盖到 6 月 | — |
