## Why

The current component structure mixes levels of abstraction — monolithic "Client" components (300–500+ lines) sit alongside small presentational elements in a flat, feature-based layout. There is no formal hierarchy distinguishing primitive UI elements from composed widgets or full-page layouts. This makes components hard to discover, reuse, and test in isolation. Adopting Atomic Design introduces a clear, graduated hierarchy (atoms → molecules → organisms → templates → pages) that enforces single-responsibility, improves discoverability, and enables systematic reuse across the growing feature set.

## What Changes

- **Introduce `components/atoms/`** — Relocate and refine the existing `components/ui/` primitives (Button, Badge, Avatar, Card, Progress, Separator, Skeleton, ScrollArea) as Atomic Design atoms. Extract additional inline atoms currently hidden inside monolithic components (e.g., status pills, icon wrappers, input fields, loading spinners).
- **Introduce `components/molecules/`** — Compose atoms into small, focused units: `ChatBubble`, `AgentBadge`, `DiffViewer`, `TaskMutationCard`, `AutoModeToggle`, `StatusPill`, `ProjectCard`, `TaskCard`, `DomainSelector`, `ThreadItem`, `ChatInput`, `StatusTransitionButton`.
- **Introduce `components/organisms/`** — Assemble molecules into self-contained sections: `KanbanBoard`, `KanbanColumn`, `ChatPanel`, `ThreadListSidebar`, `TaskPanel`, `ProjectGrid`, `AgentDirectory`, `NavigationBar`, `AutoModeStatusBar`.
- **Introduce `components/templates/`** — Define page-level layout shells that compose organisms: `DashboardTemplate`, `MissionControlTemplate`, `PlanningTemplate`, `ChatTemplate`, `SummaryTemplate`, `DirectoryTemplate`.
- **Decompose monolithic Client components** — Break apart `HomeClient` (325 LOC), `MissionControlClient` (442 LOC), `TaskChatClient` (523 LOC), `PlanningClient` (357 LOC), `DirectoryClient` (211 LOC), and `TaskSummaryClient` (145 LOC) into organisms composed of molecules and atoms.
- **Add barrel exports** — Each atomic level gets an `index.ts` re-exporting all public components for clean imports.
- **Update all import paths** — Migrate every consumer (pages, other components) from old paths to the new atomic structure.

## Capabilities

### New Capabilities
- `atomic-component-hierarchy`: Defines the folder structure, naming conventions, and barrel export pattern for the five Atomic Design levels (atoms, molecules, organisms, templates, pages).
- `component-decomposition`: Rules for extracting atoms and molecules from the existing monolithic Client components, ensuring each unit has a single responsibility and well-defined props interface.

### Modified Capabilities
<!-- No existing specs to modify -->

## Impact

- **Components directory** — Every file under `components/` will be reorganized. Old paths (`components/ui/`, `components/shared/`, `components/home/`, `components/layout/`, `components/planning/`, `components/mission-control/`, `components/task-chat/`, `components/task-summary/`, `components/directory/`) will be replaced with `components/atoms/`, `components/molecules/`, `components/organisms/`, `components/templates/`.
- **App router pages** — All `app/(routes)/*/page.tsx` files will update imports to use the new template + organism structure.
- **Import aliases** — The existing `@/components/*` path alias remains valid; only subdirectory paths change.
- **No runtime behaviour change** — This is a pure structural refactor; the rendered UI, API layer, hooks, stores, and types are untouched.
- **Zero dependency additions** — No new packages required.
