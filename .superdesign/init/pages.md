# Page dependency tree

## `/` main client
- `src/client/main.tsx`
  - `src/client/api.ts`
  - `src/client/style.css`
  - `src/client/Sidebar.tsx`
    - `src/client/types.ts`
  - `src/client/WelcomePage.tsx`
  - `src/client/Composer.tsx`
    - `src/client/Attachments.tsx`
    - `src/client/ModelSettings.tsx`
    - `src/client/types.ts`
  - `src/client/Messages.tsx`
    - `src/client/MarkdownMessage.tsx`
    - `src/client/TaskCard.tsx`
    - `src/client/ToolCallCard.tsx`
    - `src/client/components/DataTable.tsx`
  - `src/client/ContextPanel.tsx`
  - `src/client/island/IslandLayer.tsx`
    - `src/client/island/ToolIsland.tsx`
  - `src/client/SettingsPage.tsx`
  - `src/client/ProjectModal.tsx`
  - `src/client/ToolSearchModal.tsx`
  - `src/client/ToolParameterModal.tsx`

The empty state, shell, and context rail are the most relevant surfaces for a client redesign.
