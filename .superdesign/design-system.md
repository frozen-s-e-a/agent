# AI 审计助手 · 设计系统

## Product
A Windows desktop local-first audit assistant for professional auditors. The product helps users select an audit project, inspect workbooks and documents, run deterministic audit tools, and discuss results in a traceable chat workspace.

## UX priorities
1. Make the first action obvious: choose a project folder or start an independent chat.
2. Keep evidence visible: the active project scope and selected files stay available beside the conversation.
3. Make execution legible: tool calls, progress, outputs, and errors read as part of one audit timeline.
4. Preserve trust: local processing, current model, and data scope are visible without opening settings.

## Visual direction
Quiet, precise, and workmanlike. Use a deep ink navigation rail to create an anchored workspace, an off-white canvas for reading, and a single indigo brand color for actions and focus. Avoid decorative gradients, oversized marketing visuals, and generic dashboard tiles. The memorable element is the persistent right-side evidence rail: it makes the project scope tangible while the user works.

## Tokens
- Canvas: `#F4F5F8`
- Surface: `#FFFFFF`
- Ink: `#171A24`
- Secondary text: `#687184`
- Muted text: `#9AA1B1`
- Navigation: `#111522` with `#181D2D` active surfaces
- Brand: `#7568F5`; brand hover `#6053E8`; soft brand `#EFEDFF`
- Success: `#30C29A`
- Warning: `#F09A5C`
- Danger: `#DC2626`
- Lines: `#E7E9EF`
- Radii: 8px controls, 12px cards, 15px composer, 18px app frame
- Shadows: restrained, mostly `0 16px 40px rgba(20,26,50,.10)` for the composer and modal surfaces
- Type: Inter / Segoe UI / PingFang SC / Microsoft YaHei

## Layout
- Desktop shell: 248px navigation rail + flexible center workspace + 306px evidence/tool rail.
- Topbar: 68px high, breadcrumb left, local state and settings right.
- Center: max-width 720px reading column, generous vertical rhythm, bottom composer always reachable.
- Evidence rail: project scope first, recent files second, shortcut tools third.
- Empty state: editorial headline + real product counts + two clear launch actions.
- Chat state: user messages right aligned, assistant messages left aligned in readable white cards; execution cards carry status and outputs inline.

## Interaction
- Button feedback 120–180ms, no bounce. Use opacity and surface shifts for secondary controls.
- Composer focus uses a visible indigo ring. Send button is always 32px and has a clear disabled state.
- Keyboard shortcuts appear only where actionable (`Ctrl N`, `Cmd/Ctrl K`).
- Every icon-only button has an accessible label and tooltip.
- Respect `prefers-reduced-motion`.

## Copy
Use direct sentence case Chinese. Name actions by outcomes: `选择项目文件夹`, `添加资料`, `查看工作簿结构`, `识别关联方`. Avoid technical implementation labels in the main path.

## Fidelity constraint
Use only the fonts, colors, spacing, and component styles defined here. Do not introduce new visual styles, random gradients, decorative illustrations, or unrelated color systems.
