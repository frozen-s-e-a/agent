# Extractable components

## Sidebar
- Source: `src/client/Sidebar.tsx`
- Category: layout
- Description: Persistent project and session navigation with settings and local runtime status.
- Extractable props: `activeProjectId`, `activeSessionId`, `page`, `projects`, `sessions`
- Hardcoded: Chinese labels, Lucide icon choices, CSS classes.

## AppShell
- Source: `src/client/main.tsx`
- Category: layout
- Description: Desktop shell with sidebar, topbar, workspace, context rail, and modal layers.
- Extractable props: `page`, `rightPanelOpen`
- Hardcoded: layout regions, topbar breadcrumb, notification placement.

## Composer
- Source: `src/client/Composer.tsx`
- Category: basic
- Description: Prompt composer with attachments, tool picker, model controls, and send state.
- Extractable props: `busy`, `streaming`, `mode`, `sessionModel`, `usageTotal`
- Hardcoded: action labels, Lucide icon choices, CSS classes.

## WelcomePage
- Source: `src/client/WelcomePage.tsx`
- Category: basic
- Description: Empty-state launch surface for selecting a project or opening a demo.
- Extractable props: `toolCount`, `legacyToolCount`
- Hardcoded: welcome copy and action labels.

## ContextPanel
- Source: `src/client/ContextPanel.tsx`
- Category: layout
- Description: Right-side project scope, file browser, and tool parameter channel.
- Extractable props: project, files, selectedFiles, folder, currentTool, preview
- Hardcoded: section labels and file interaction copy.
