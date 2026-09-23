# 关联方核查

基于企业工商信息数据，对被审计单位的客户和供应商进行 12 维度关联方检测。

## 触发词

关联方、关联方核查、关联方识别、关联方扫描、related party、关联方检测、隐性关联方

## 何时使用

- 审计项目中需要识别被审计单位与客户/供应商之间的潜在关联关系
- 需要基于工商数据进行股权穿透、共同股东、同址经营等多维度分析
- 已通过"注协系统工商信息获取"模块导出了目标企业的全维度工商数据

## 前置条件

1. **工商数据**：需要先使用 `cicpa_query` 工具（查询模式 `export`）导出被审计单位、客户、供应商的全维度工商信息（53 个 Excel 文件）
2. **Cookie**：如需启用股权穿透，需要有有效的注协系统 Cookie

## MCP 工具调用

工具名称：`related_party`

### 基本调用

```json
{
  "audit_target": "贵州茅台酒股份有限公司",
  "data_dir": "input/工商信息数据",
  "customers": "客户A,客户B,客户C",
  "suppliers": "供应商X,供应商Y",
  "auto_subsidiary_threshold": 50
}
```

### 带股权穿透的调用

```json
{
  "audit_target": "贵州茅台酒股份有限公司",
  "data_dir": "input/工商信息数据",
  "customers": "客户A,客户B",
  "suppliers": "供应商X",
  "auto_subsidiary_threshold": 50,
  "equity_penetration": "true",
  "equity_threshold": 50,
  "equity_depth": 5,
  "cookie_json": "{\"cookies\": {...}}"
}
```

### 参数说明

| 参数 | 必填 | 说明 |
|------|------|------|
| `audit_target` | 是 | 被审计单位名称（精确工商注册全称） |
| `data_dir` | 是 | 工商信息 Excel 所在目录（相对于项目目录） |
| `customers` | 否 | 客户名称，逗号分隔 |
| `suppliers` | 否 | 供应商名称，逗号分隔 |
| `customer_file` | 否 | 客户名称文件路径（txt 或 xlsx） |
| `supplier_file` | 否 | 供应商名称文件路径（txt 或 xlsx） |
| `former_execs` | 否 | 离任高管姓名，逗号分隔（用于 E01 维度） |
| `former_exec_file` | 否 | 离任高管名单文件路径 |
| `auto_subsidiary_threshold` | 否 | 分子公司识别阈值，默认 50（设 0 禁用） |
| `equity_penetration` | 否 | 启用股权穿透，"true"/"false"，默认 false |
| `equity_threshold` | 否 | 穿透阈值，默认 50 |
| `equity_depth` | 否 | 穿透深度，默认 5 |
| `output_path` | 否 | 报告输出路径 |
| `cookie_json` | 否 | 注协 Cookie（AI 模式使用） |

### 返回值

```json
{
  "status": "success",
  "audit_target": "贵州茅台酒股份有限公司",
  "customers": 5,
  "suppliers": 3,
  "auto_subsidiaries": 2,
  "total_findings": 12,
  "high_confidence": 3,
  "mid_confidence": 6,
  "low_confidence": 3,
  "findings_by_dimension": {
    "D01-股权穿透": [{"target": "...", "confidence": "高", "evidence": "..."}],
    "D07-同址经营": [{"target": "...", "confidence": "中", "evidence": "..."}]
  },
  "report_path": "/path/to/report.xlsx"
}
```

## 12 个检测维度

| 维度 | 名称 | 说明 |
|------|------|------|
| D01 | 股权穿透 | 审计方（含子公司）直接/间接投资了客户/供应商 |
| D02 | 共同股东 | 多个企业共享同一股东 |
| D03 | 实际控制人与受益人穿透 | 不同企业追溯到同一实际控制人或最终受益人 |
| D04 | 关键管理人员重叠 | 同一自然人在审计方和客户/供应商同时任职 |
| D05 | 法定代表人交叉 | 同一人担任多个企业法定代表人 |
| D06 | 法定代表人变更轨迹 | 前法定代表人是审计方现任高管 |
| D07 | 同址经营 | 注册地址相同或高度相似 |
| D08 | 联系方式共用 | 共用电话或邮箱域名 |
| D09 | 变更时间窗口 | 交易前后发生涉及审计方人员的变更 |
| D10 | 企业名称相似度 | 客户/供应商名称与审计方名称高度相似 |
| D11 | 参保人数异常 | 参保人数极少但作为交易对手 |
| E01 | 补充人员关联 | 年报/公告中的董监高（含离任）在客户/供应商中任职 |

## 完整工作流

1. 先调用 `cicpa_query`（export 模式）导出被审计单位的全维度工商数据
2. 对每个客户和供应商也调用 `cicpa_query`（export 模式）导出数据
3. 将所有导出的 Excel 文件放入同一数据目录
4. 调用 `related_party` 执行 12 维度检测
5. 查看返回的 `report_path` 报告，重点关注高置信度线索

## Cookie 管理

如需股权穿透功能，Cookie 获取方式：
1. 在 GUI "参数设置"中粘贴 Cookie
2. 或通过 AI 调用时传入 `cookie_json` 参数
3. Cookie 有效期 24 小时，过期需重新获取
