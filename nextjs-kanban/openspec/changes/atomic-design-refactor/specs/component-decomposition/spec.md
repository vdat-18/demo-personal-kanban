## ADDED Requirements

### Requirement: HomeClient decomposition
The monolithic `HomeClient` (325 LOC) SHALL be decomposed into: atoms (`StatusPill`, `ProgressBar`, `IconButton`), molecules (`ProjectCard`, `DomainSelector`, `CreateProjectModal`), an organism (`ProjectGrid`), and a template (`DashboardTemplate`). The original `HomeClient.tsx` file SHALL be removed after decomposition.

#### Scenario: HomeClient file no longer exists
- **WHEN** a developer searches for `components/home/HomeClient.tsx`
- **THEN** the file SHALL NOT exist; its functionality SHALL be distributed across the atomic hierarchy

#### Scenario: Dashboard page renders identically
- **WHEN** a user navigates to the root page `/`
- **THEN** the rendered output SHALL be visually identical to the pre-refactor version, including hero header, action cards, project grid, and create-project modal

### Requirement: MissionControlClient decomposition
The monolithic `MissionControlClient` (442 LOC) SHALL be decomposed into: atoms (`StatusPill`, `ColumnHeader`), molecules (`TaskCard`, `StatusTransitionButton`, `EmptyColumnPlaceholder`), organisms (`KanbanColumn`, `KanbanBoard`, `KanbanFooter`, `CancelTaskDialog`), and a template (`MissionControlTemplate`). The original `MissionControlClient.tsx` file SHALL be removed.

#### Scenario: Kanban board renders identically
- **WHEN** a user navigates to `/mission-control/[id]`
- **THEN** the rendered kanban board SHALL display the same columns, task cards, drag-and-drop behaviour, auto-mode toggles, and footer stats as the pre-refactor version

#### Scenario: Drag and drop still works after decomposition
- **WHEN** a user drags a task card from one column to another valid column
- **THEN** the task SHALL move to the new column and the API SHALL be called to persist the status change

### Requirement: TaskChatClient decomposition
The monolithic `TaskChatClient` (523 LOC) SHALL be decomposed into: molecules (`ChatMessageBubble`, `AgentSelector`, `ChatInput`, `StreamEventPill`, `ConversationHistoryPanel`, `StreamStatusCard`), organisms (`ChatPanel`, `TaskInfoSidebar`), and a template (`ChatTemplate`). The inline `StreamEventPill` and `ConversationHistory` sub-components SHALL be extracted as separate files.

#### Scenario: Chat page renders identically
- **WHEN** a user navigates to `/chat/[id]`
- **THEN** the chat interface SHALL display the same message bubbles, agent selector, input bar, right sidebar, and streaming indicators as the pre-refactor version

#### Scenario: Streaming still works after decomposition
- **WHEN** a user sends a message and the agent streams a response
- **THEN** the streaming bubble, progress events, and abort button SHALL function identically to the pre-refactor version

### Requirement: PlanningClient decomposition
The monolithic `PlanningClient` (357 LOC) SHALL be decomposed into: molecules (`ChatInput`, `PlanningMessageBubble`), organisms (`PlanningChatPanel`), and a template (`PlanningTemplate`). The existing extracted components (`ThreadListSidebar`, `TaskPanel`, `TaskMutationCard`) SHALL be reclassified into the correct atomic level.

#### Scenario: Planning page renders identically
- **WHEN** a user navigates to `/planning/[id]`
- **THEN** the planning interface SHALL display the same thread sidebar, chat panel, and task panel as the pre-refactor version

### Requirement: DirectoryClient decomposition
The `DirectoryClient` (211 LOC) SHALL be decomposed into: molecules (`SearchInput`, `StatusFilterBar`, `DirectoryProjectCard`, `DirectoryTaskCard`, `DirectoryTaskRow`), organisms (`DirectoryProjectGrid`, `DirectoryTaskList`), and a template (`DirectoryTemplate`). The original `DirectoryClient.tsx` SHALL be removed.

#### Scenario: Directory page renders identically
- **WHEN** a user navigates to `/directory`
- **THEN** the directory view SHALL display the same search, filters, project cards, and task listings (grid/list view) as the pre-refactor version

### Requirement: TaskSummaryClient decomposition
The `TaskSummaryClient` (145 LOC) SHALL be decomposed into appropriate molecules and a template (`SummaryTemplate`). The original `TaskSummaryClient.tsx` SHALL be removed.

#### Scenario: Summary page renders identically
- **WHEN** a user navigates to `/summary/[id]`
- **THEN** the summary view SHALL render identically to the pre-refactor version

### Requirement: Shared components reclassification
The existing `components/shared/` components SHALL be reclassified: `AgentBadge` → `molecules/`, `ChatBubble` → `molecules/`, `DiffViewer` → `molecules/`. The `components/layout/Navigation.tsx` SHALL be reclassified to `organisms/NavigationBar.tsx`. The `components/shared/` and `components/layout/` directories SHALL be removed after migration.

#### Scenario: Shared directory no longer exists
- **WHEN** a developer looks for `components/shared/`
- **THEN** the directory SHALL NOT exist; all former shared components SHALL reside in the appropriate atomic level

#### Scenario: Layout directory no longer exists
- **WHEN** a developer looks for `components/layout/`
- **THEN** the directory SHALL NOT exist; `Navigation` SHALL reside in `organisms/`

### Requirement: Props interfaces for every extracted component
Every newly extracted component SHALL have an explicitly defined TypeScript `interface` or `type` for its props, exported alongside the component.

#### Scenario: TaskCard has explicit props type
- **WHEN** a developer inspects the `TaskCard` molecule file
- **THEN** there SHALL be an exported `interface TaskCardProps` (or equivalent type alias) defining all accepted props

### Requirement: No duplicate type definitions after decomposition
Shared types (`TaskStatus`, `TaskPriority`, `Project`, `Task`, etc.) SHALL be imported from `types/domain.ts` (or a new `types/` file) rather than re-declared inline in component files. After refactor, each type SHALL have exactly one declaration.

#### Scenario: TaskStatus is defined in one place
- **WHEN** a developer searches the codebase for `type TaskStatus =`
- **THEN** it SHALL appear in exactly one file within `types/`
