---
name: skill-vetter
description: "安装第三方 Skill 前进行安全审查，检查代码红旗和权限范围"
triggers: "审查skill, 检查skill安全, skill安全, vet skill, review skill, skill审核, 安全检查skill"
---

# skill-vetter

在安装第三方 Skill 前进行安全审查，检查潜在的代码风险和权限范围。

## Prerequisites
- 待审查的 SKILL.md 文件 URL 或内容已提供
- Agent 已初始化 web_search 和 read_file 工具

## Variables
- skill_url: {{skill_url}} — 待审查 Skill 的 URL
- project_path: {{project_path}} — 当前项目工作目录

## Steps

1. **获取内容** — 下载或读取待审查的 SKILL.md 文件内容
2. **检查格式** — 验证 frontmatter 完整性（name、description、triggers 字段）
3. **分析步骤** — 逐步检查工作流步骤中引用的工具和操作
4. **识别风险** — 标记潜在风险：文件删除、网络请求、Shell 命令、敏感路径访问
5. **生成报告** — 输出安全审查报告，包含风险等级（低/中/高）和具体发现
6. **给出建议** — 根据审查结果建议是否安装，或需要哪些修改
