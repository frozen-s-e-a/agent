---
name: cicpa-query
description: "通过中注协行业知识库查询企业工商信息。支持轻量搜索、企业详情、全维度导出、子公司发现。"
triggers: "工商信息, 查公司, 企业查询, 工商查询, 股东信息, 子公司, org_id, cicpa, 地址核查, 关联方"
---

# 注协系统工商信息查询

## 可用工具

| 工具 | 用途 |
|------|------|
| `cicpa_query` | 注协系统工商信息查询（MCP Tool，所有模式统一入口） |

## 查询模式

通过 `query_mode` 参数选择：

| 用户需求 | query_mode | 耗时 | 返回 |
|---------|------------|------|------|
| "查一下XX公司"、确认企业名称 | `search` | <1秒 | 基础信息 + org_id |
| "XX公司详情"、查股东高管 | `detail` | 2~3秒 | 工商+股东+人员+股权 |
| "全维度导出"、"完整工商信息" | `export` | 30秒~3分钟 | ZIP（53个Excel） |
| "查子公司"、"对外投资" | `subsidiary` | 1~2秒 | 子公司列表（含持股比例） |
| "检查 cookie 状态" | `check_cookies` | <1秒 | cookie 有效性 |

## Cookie 管理

Cookie 存储在 `config.json` → `cicpa_cookie`，GUI 和 MCP 共享。

### 检查 Cookie 状态

```
调用 cicpa_query(query_mode="check_cookies")
→ 返回 {"status": "valid"/"expired"/"no_cookies", "cookie_count": N, "remaining_hours": H}
```

### Cookie 无效时的处理

**方式 1：AI 浏览器登录（推荐）**
1. 使用 `playwright-mcp_browser_navigate` 打开 `https://cmis.cicpa.org.cn/#/login`
2. 用户手动登录 → 点击「行业执业知识库」
3. 通过 `playwright-mcp_browser_run_code_unsafe` 执行 `page.context().cookies()` 获取 cookie
4. 将 cookie 解析为 `key=value; key=value` 字符串
5. 调用 `cicpa_query(query_mode="check_cookies", cookie_json="解析后的cookie字符串")` 保存

**方式 2：让用户手动粘贴**
1. 提示用户在浏览器 F12 → Network → 复制 Cookie 请求头
2. 调用 `cicpa_query(query_mode="check_cookies", cookie_json="用户粘贴的cookie")` 保存

⚠ 必须走完整 SSO 流程（登录 cmis → 点击「行业执业知识库」→ 进入 zsk），否则只有 4 个不完整 cookie，查询会报"未登陆用户"。完整 cookie 应有 9 个。

⚠ Cookie 有效期 24 小时。

## 调用示例

### 轻量搜索 — 只需 org_id 或确认企业存在

```
cicpa_query(query_mode="search", company_name="华为技术有限公司")
→ [{"name": "华为技术有限公司", "org_id": "T003573795", "legal_person": "任正非", ...}]
```

### 企业详情 — 查股东、高管、股权结构

```
cicpa_query(query_mode="detail", company_name="华为技术有限公司")
→ {"basic_info": {...}, "shareholders": {...}, "main_persons": {...}, "equity": {...}}
```

也可直接用 org_id：`cicpa_query(query_mode="detail", org_id="T003573795")`

### 子公司发现 — 关联方识别预查

```
cicpa_query(query_mode="subsidiary", company_name="审计目标公司", subsidiary_threshold=50)
→ [{"name": "子公司A", "ratio": 100.0, "org_id": "Txxx"}, ...]
```

### 全维度导出 — 61维度53个Excel

```
cicpa_query(query_mode="export", company_name="企业A,企业B,企业C")
→ {"status": "success", "output": "output/工商信息全维度_xxx.zip"}
```

## 参数说明

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `query_mode` | string | 否 | 默认 search。可选 search/detail/export/subsidiary/check_cookies |
| `company_name` | string | 视模式 | 企业精确工商注册全称，多个用逗号分隔 |
| `org_id` | string | 否 | 中注协内部ID，detail 模式可代替 company_name |
| `output_path` | string | 否 | 输出路径，默认 output/ |
| `subsidiary_threshold` | int | 否 | 子公司持股阈值，默认 50 |
| `cookie_json` | string | 否 | 手动传入 cookie（保存到 cookie 文件） |

## 与其他 Skill 配合

| 场景 | 配合方式 |
|------|---------|
| 关联方识别 | 先 `subsidiary` 发现子公司，再 `search` 拿 org_id 给关联方识别模块 |
| 函证地址核查 | `search` 获取企业地址、电话，用于地址比对 |
| 审计底稿 | `detail` 查股东高管信息，写入底稿 |

## 注意事项

- 企业名称必须用**工商注册全称**，简称无法匹配
- `export` 模式企业数量多时可能需要 2-3 分钟
- `search` 返回的是列表（可能有多个匹配），取第一条的 org_id 即可
