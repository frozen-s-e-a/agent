---
name: skill-creator
description: "从当前对话上下文中提炼可复用的工作流，创建新的 Skill"
triggers: "创建skill, 新建skill, create skill, 提炼skill, 保存为skill, 封装skill, 生成skill"
---

# skill-creator

从当前对话上下文中提炼可复用的工作流步骤，创建新的 SKILL.md 文件。

## Prerequisites
- 当前对话中包含可提炼的工作流步骤
- Agent 已初始化 create_skill 工具

## Variables
- project_path: {{project_path}} — 当前项目工作目录

## Steps

1. **分析对话** — 回顾当前对话历史，识别可复用的工作流模式
2. **提炼步骤** — 将对话中的操作序列整理为结构化的步骤列表
3. **确认信息** — 询问用户 Skill 名称、描述和触发词
4. **生成文件** — 调用 `create_skill` 工具创建 SKILL.md 文件和目录结构
5. **验证结果** — 确认文件已创建，展示 Skill 内容供用户检查
