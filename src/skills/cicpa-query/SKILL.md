---
name: cicpa-query
description: 注协工商信息搜索、详情、批量导出及子公司查询。
triggers: 工商信息, 查公司, 企业查询, 股东信息, 子公司, cicpa
---

# 注协工商查询

使用 cicpa_query，登录状态由“运行设置 → 登录注协”管理并加密保存。缺少授权时说明需要官网登录，不索取 Cookie、JSON 或密钥，不将会话信息写入任务参数。未登录时可继续其他本地操作。

| 模式 | 输入 | 成果 |
|---|---|---|
| search | company_name 企业全称 | 搜索结果 XLSX、JSON，包含企业 ID |
| detail | org_id 或 company_name | 基础信息、股东、主要人员、股权结构 |
| subsidiary | company_name、subsidiary_threshold | 达到持股阈值的子公司清单 |
| export | company_name，多个名称用逗号分隔 | 工商资料 ZIP、解压目录、导出来源记录 |
| check_cookies | 无任务凭据参数 | 当前客户端登录状态检查 |

多个搜索候选需核对企业全称和 ID。批量导出依次上传名单、查询、读取服务维度、触发导出、轮询下载中心；维度数量以实际返回为准。成果自动存入项目 outputs/<任务编号>/。

导出目录可交给 related_party 核查关联线索；结合工商覆盖情况与项目证据复核。
