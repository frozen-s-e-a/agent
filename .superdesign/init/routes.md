# Routes

This is a single-page Electron application; it does not use React Router or URL routes.

## `/` — main client
- Entry: `src/client/index.html`
- Render entry: `src/client/main.tsx`
- Main states: chat workspace, settings page, loading state, project modal, tool search, delete confirmation.
- Shared layout: `Sidebar` + topbar + workspace content + optional context rail.

## Chat empty state
- `WelcomePage` appears when the active timeline has no events.

## Chat timeline
- `Messages` appears when events exist and composes message bubbles, markdown, task cards, tool calls, and data tables.

## Settings
- `SettingsPage` replaces the workspace while retaining the shared shell.
