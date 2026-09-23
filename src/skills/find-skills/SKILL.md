---
name: find-skills
description: "搜索网络 Skill 注册表，发现可安装的新 Skill"
triggers: "搜索skill, 查找skill, find skill, 发现技能, 搜索技能, 找skill, skill商店"
---

# find-skills

搜索网络 Skill 注册表，帮助用户发现和安装新的 Skill 扩展 Agent 能力。

## Prerequisites
- 网络连接可用
- Agent 已初始化 find_skill 工具

## Variables
- keyword: {{keyword}} — 用户搜索的关键词

## Steps

1. **分析需求** — 理解用户想要什么类型的 Skill，提取关键词
2. **搜索注册表** — 调用 `find_skill` 工具搜索匹配的 Skill
3. **展示结果** — 向用户展示搜索结果，包含名称、描述和安装链接
4. **推荐安装** — 根据匹配度推荐最佳 Skill，询问用户是否安装
5. **执行安装** — 用户确认后调用 `install_skill` 工具完成安装
