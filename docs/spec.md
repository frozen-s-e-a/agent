# 审计助手 — 前端规范

## 一句话定位

桌面审计助手：在本地电脑上处理 Excel/CSV 文件，结合大语言模型辅助财务审计。

## 核心页面

1. **聊天页** — 主工作区，消息流 + 工具调用 + 文件选择侧栏
2. **设置页** — 模型配置、资源权限、用量统计、迁移信息
3. **欢迎页** — 空聊天时的引导页面
4. **模态框** — 创建项目、工具搜索、工具参数填写

## 布局结构

```
App Shell (flex row, 100vh)
├── Sidebar (264px, left brand border)
│   ├── Brand mark + title
│   ├── New Chat button
│   ├── Search button (Ctrl+K)
│   ├── Projects list (collapsible sessions)
│   ├── Standalone sessions
│   └── Bottom: migration + settings + local badge
├── Main (flex 1, flex column)
│   ├── Topbar (breadcrumb + local pill + panel toggle)
│   ├── Notification stack (top-right banners)
│   └── Workspace (flex 1)
│       ├── Chat page
│       │   ├── WelcomePage (empty) or Messages + ContextPanel
│       │   └── Composer (text + attachments + send)
│       └── Settings page (tabbed content)
└── Modals (full-screen backdrop, centered)
```

## 设计原则

1. **清爽专业 2.0** — 白色背景 + 品牌紫 (#5b5bd6)，无花哨渐变，无 emoji
2. **功能优先** — 工具面板 > 聊天 > 设置；先解决问题再美化
3. **本地运行** — 所有数据处理在本机，不在云端；全局 badge 始终可见
4. **中文优先** — 所有 UI 文本用中文，注释除外

## 不做

- 不要加用户登录/注册
- 不要加实时协作
- 不要改品牌主色（#5b5bd6）
- 不要改 sidebar 宽度（264px）
- 不要引入新的 UI 库（只用 lucide-react 图标）
- 不要修改 electron 宿主代码（只改 src/client/）
