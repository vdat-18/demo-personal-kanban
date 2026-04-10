## 1. Foundation — Directory Structure & Shared Types

- [x] 1.1 Create the atomic directory skeleton: `components/atoms/`, `components/molecules/`, `components/organisms/`, `components/templates/`, each with an empty `index.ts` barrel file
- [x] 1.2 Consolidate duplicate type definitions (`TaskStatus`, `TaskPriority`, `Task`, `Project`, `Conversation`, `ChatMsg`) into `types/domain.ts` (or new `types/ui.ts`), removing all inline re-declarations across component files
- [x] 1.3 Create shared constants file for `STATUS_COLORS` / `STATUS_COLOR` maps (currently duplicated in MissionControlClient, TaskChatClient, DirectoryClient) in `constants/status.ts`

## 2. Atoms — Migrate shadcn Primitives & Extract Inline Atoms

- [x] 2.1 Move all 8 shadcn `components/ui/*.tsx` files (`button`, `badge`, `avatar`, `card`, `progress`, `scroll-area`, `separator`, `skeleton`) into `components/atoms/` preserving file names
- [x] 2.2 Create `components/ui/index.ts` re-export shim that re-exports everything from `atoms/` for backward compatibility
- [x] 2.3 Extract `StatusPill` atom — the inline `<span>` with status color mapping used in MissionControlClient (line 279), TaskChatClient (line 280), and DirectoryClient (lines 167, 188)
- [x] 2.4 Extract `ProgressBar` atom — the inline progress bar `<div>` used in HomeClient (lines 230-235) and DirectoryClient (lines 139-144)
- [x] 2.5 Extract `IconButton` atom — the styled icon-only button pattern used throughout (back buttons, action buttons, close buttons)
- [x] 2.6 Extract `TypingDots` atom — the animated bounce dots used in TaskChatClient (lines 364-370) and PlanningClient (lines 291-305)
- [x] 2.7 Extract `AiAvatar` atom — the "AI" circular avatar used in TaskChatClient (lines 329-331) and PlanningClient (lines 200-202, 225-227, 287-289)
- [x] 2.8 Update `components/atoms/index.ts` barrel with all atom exports

## 3. Molecules — Compose Atoms Into Focused Units

- [x] 3.1 Reclassify `components/shared/AgentBadge.tsx` → `components/molecules/AgentBadge.tsx`, update imports
- [x] 3.2 Reclassify `components/shared/ChatBubble.tsx` → `components/molecules/ChatBubble.tsx`, update imports
- [x] 3.3 Reclassify `components/shared/DiffViewer.tsx` → `components/molecules/DiffViewer.tsx`, update imports
- [x] 3.4 Extract `TaskCard` molecule from MissionControlClient (lines 258-337) — the draggable task card with status pill, hover actions, and description
- [x] 3.5 Extract `ProjectCard` molecule from HomeClient (lines 194-239) — the clickable project card with progress bar, status badge, and delete action
- [x] 3.6 Extract `DomainSelector` molecule from HomeClient (lines 270-286) — the 4-button domain picker grid
- [x] 3.7 Extract `CreateProjectModal` molecule from HomeClient (lines 247-321) — the full modal dialog including domain selector, name input, and submit button
- [x] 3.8 Extract `ChatInput` molecule — the shared textarea + send button pattern used in TaskChatClient (lines 406-443) and PlanningClient (lines 314-344)
- [x] 3.9 Extract `ChatMessageBubble` molecule from TaskChatClient (lines 323-348) — the AI/user message bubble with markdown rendering
- [x] 3.10 Extract `AgentSelector` molecule from TaskChatClient (lines 303-319) — the agent picker button row
- [x] 3.11 Extract `StreamEventPill` molecule from TaskChatClient (lines 63-86) — already an inline sub-component, just move it
- [x] 3.12 Extract `ConversationHistoryPanel` molecule from TaskChatClient (lines 91-158) — the paginated conversation history, already an inline `ConversationHistory` sub-component
- [x] 3.13 Extract `StatusTransitionButton` molecule from MissionControlClient (lines 297-329) — the hover action buttons (restore, cancel, move forward)
- [x] 3.14 Extract `EmptyColumnPlaceholder` molecule from MissionControlClient (lines 341-350)
- [x] 3.15 Extract `SearchInput` molecule from DirectoryClient (lines 95-104) — the search bar with icon
- [x] 3.16 Extract `StatusFilterBar` molecule from DirectoryClient (lines 107-119) — the status filter chips
- [x] 3.17 Extract `DirectoryProjectCard` molecule from DirectoryClient (lines 126-149)
- [x] 3.18 Extract `DirectoryTaskCard` molecule from DirectoryClient (lines 160-177) — grid view task card
- [x] 3.19 Extract `DirectoryTaskRow` molecule from DirectoryClient (lines 182-197) — list view task row
- [x] 3.20 Reclassify `components/planning/TaskMutationCard.tsx` → `components/molecules/TaskMutationCard.tsx`
- [x] 3.21 Extract `PlanningMessageBubble` molecule from PlanningClient (lines 213-283) — the message bubble with mutation card rendering
- [x] 3.22 Update `components/molecules/index.ts` barrel with all molecule exports

## 4. Organisms — Assemble Functional Sections

- [x] 4.1 Reclassify `components/layout/Navigation.tsx` → `components/organisms/NavigationBar.tsx`, update imports in `app/(routes)/layout.tsx`
- [x] 4.2 Extract `KanbanColumn` organism from MissionControlClient (lines 190-353) — a single column with header, auto-mode toggle, task cards, and empty state
- [x] 4.3 Extract `KanbanBoard` organism that composes `KanbanColumn` instances + the "Add Column" ghost, managing drag state
- [x] 4.4 Extract `KanbanHeader` organism from MissionControlClient (lines 145-175) — the mission control page header with back button, project info, and add-task button
- [x] 4.5 Extract `KanbanFooter` organism from MissionControlClient (lines 369-404) — the stats footer with "Close Project" button
- [x] 4.6 Extract `CancelTaskDialog` organism from MissionControlClient (lines 408-438) — the cancel confirmation modal
- [x] 4.7 Extract `ChatPanel` organism from TaskChatClient (lines 262-445) — the left panel containing header, agent selector, messages list, streaming bubble, and input bar
- [x] 4.8 Extract `TaskInfoSidebar` organism from TaskChatClient (lines 448-519) — the right panel with status controls, task details, conversation history, and stream status
- [x] 4.9 Reclassify `components/planning/ThreadListSidebar.tsx` → `components/organisms/ThreadListSidebar.tsx`
- [x] 4.10 Extract `PlanningChatPanel` organism from PlanningClient (lines 175-345) — the center panel with header, messages, and input
- [x] 4.11 Reclassify `components/planning/TaskPanel.tsx` → `components/organisms/TaskPanel.tsx`
- [x] 4.12 Reclassify `components/mission-control/AutoModeStatusBar.tsx` → `components/molecules/AutoModeStatusBar.tsx` (it composes atoms, fits molecule level)
- [x] 4.13 Reclassify `components/mission-control/AutoModeToggle.tsx` → `components/atoms/AutoModeToggle.tsx` (simple toggle, atom level)
- [x] 4.14 Extract `ProjectGrid` organism from HomeClient (lines 169-242) — the "Recent Projects" section with header and grid of ProjectCards
- [x] 4.15 Extract `HeroSection` organism from HomeClient (lines 104-166) — the hero header + action cards
- [x] 4.16 Extract `DirectoryProjectGrid` organism from DirectoryClient (lines 122-150) — projects section
- [x] 4.17 Extract `DirectoryTaskList` organism from DirectoryClient (lines 153-206) — tasks section with grid/list toggle
- [x] 4.18 Update `components/organisms/index.ts` barrel with all organism exports

## 5. Templates — Page-Level Layout Shells

- [x] 5.1 Create `DashboardTemplate` that composes `HeroSection` + `ProjectGrid` + `CreateProjectModal`, replacing HomeClient
- [x] 5.2 Create `MissionControlTemplate` that composes `KanbanHeader` + `KanbanBoard` + `KanbanFooter` + `CancelTaskDialog`, replacing MissionControlClient
- [x] 5.3 Create `ChatTemplate` that composes `ChatPanel` + `TaskInfoSidebar`, replacing TaskChatClient
- [x] 5.4 Create `PlanningTemplate` that composes `ThreadListSidebar` + `PlanningChatPanel` + `TaskPanel`, replacing PlanningClient
- [x] 5.5 Create `DirectoryTemplate` that composes directory header + `SearchInput` + `StatusFilterBar` + `DirectoryProjectGrid` + `DirectoryTaskList`, replacing DirectoryClient
- [x] 5.6 Create `SummaryTemplate`, replacing TaskSummaryClient
- [x] 5.7 Update `components/templates/index.ts` barrel with all template exports

## 6. Wire Up Pages & Cleanup

- [x] 6.1 Update `app/page.tsx` to import `DashboardTemplate` instead of `HomeClient`
- [x] 6.2 Update `app/(routes)/mission-control/[id]/page.tsx` to import `MissionControlTemplate`
- [x] 6.3 Update `app/(routes)/chat/[id]/page.tsx` to import `ChatTemplate`
- [x] 6.4 Update `app/(routes)/planning/[id]/page.tsx` to import `PlanningTemplate`
- [x] 6.5 Update `app/(routes)/directory/page.tsx` to import `DirectoryTemplate`
- [x] 6.6 Update `app/(routes)/summary/[id]/page.tsx` to import `SummaryTemplate`
- [x] 6.7 Update `app/(routes)/layout.tsx` to import `NavigationBar` from `organisms/`
- [x] 6.8 Delete old directories: `components/home/`, `components/mission-control/`, `components/task-chat/`, `components/task-summary/`, `components/directory/`, `components/planning/`, `components/shared/`, `components/layout/`
- [x] 6.9 Remove empty `components/ui/` files (keep only the re-export shim `index.ts`)

## 7. Verification

- [x] 7.1 Run `next build` and confirm zero TypeScript errors and successful compilation
- [x] 7.2 Run `next lint` and confirm zero lint errors
- [x] 7.3 Verify no component imports from a higher atomic level (atoms must not import molecules, etc.) by grepping import paths
- [x] 7.4 Verify every barrel `index.ts` exports all components in its directory
- [ ] 7.5 Smoke-test each page in the browser: `/`, `/directory`, `/planning/[id]`, `/mission-control/[id]`, `/chat/[id]`, `/summary/[id]` — confirm visual parity
