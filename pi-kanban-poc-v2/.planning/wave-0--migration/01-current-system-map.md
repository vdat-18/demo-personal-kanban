# 01 — Current System Map

## Executive summary

`pi-kanban-poc/` is a **local-first Next.js application** where the real application state lives in a single persisted Zustand store in the browser, while AI behavior is mediated through a single server route: `app/api/agent/route.ts`.

The biggest source of migration complexity is **coupling**, not size.

## Verified runtime baseline

Observed during inspection:

- `npm install` succeeds
- `npm run dev` boots successfully
- `/api/agent` responds successfully for planning mode
- `npm run build` succeeds
- `npm run lint` fails due to pre-existing issues

Implication: the app is **functionally runnable** but **not cleanly lint-green**.

## Actual architecture

```text
Browser
├─ Next.js App Router pages and client components
├─ Zustand persisted store in localStorage
├─ feature hooks wrapping store access and fetches
└─ fetch /api/agent
      └─ unified server route
            └─ pi-coding-agent SDK / OpenAI-compatible provider
```

## Stack

- Next.js 16
- React 19
- TailwindCSS 4
- Zustand
- TanStack React Query
- `@mariozechner/pi-coding-agent`
- browser localStorage persistence

## Important code-vs-doc drift already present

### Provider configuration
The README suggests a broad “any supported provider env vars” story, but the actual route implementation is currently wired around:

- `TROLLLLM_API_KEY` or fallback `LLM_API_KEY`
- `TROLLLLM_BASE_URL`
- `TROLLLLM_MODEL`

### Browser storage key
The README mentions clearing `pi-kanban-poc:store-v1`, but the actual store key in `lib/storage/kanbanStore.ts` is:

- `pi-kanban-poc:store-v3`

with persisted state version `4`.

### Agent modes
The README documents two modes (`plan`, `chat`), but the actual route supports five:

- `plan`
- `chat`
- `breakdown`
- `doer`
- `reviewer`

These mismatches matter because migration work should follow the code, not the README.

## Core system centers of gravity

### 1. `lib/storage/kanbanStore.ts`
This is the main application core. It owns:

- projects
- tasks
- subtasks
- conversations
- planning threads
- planning messages
- vision versions
- activity timeline
- cached breakdowns
- persistence and migration behavior
- soft-delete semantics
- cascading delete behavior

Many components and hooks access it directly.

### 2. `app/api/agent/route.ts`
This is the main server integration surface. It owns:

- provider registration
- session caching
- prompt building
- multimodal planning behavior
- JSON parsing and normalization
- planning/chat/breakdown/doer/reviewer dispatch
- timeout handling

This file is large and multi-responsibility, making it a likely later split point.

### 3. `types/domain.ts`
This is the central model contract for the client-side application. It defines:

- `Project`
- `Task`
- `Subtask`
- `Conversation`
- `PlanningThread`
- `PlanningMessage`
- `VisionVersion`
- agent envelopes for planning/doer/reviewer/breakdown
- activity and cached breakdown types

## Route map

| Route | Page file | Main component / behavior | Notes |
|---|---|---|---|
| `/` | `app/(routes)/page.tsx` | `DashboardTemplate` | project list, project creation, import flow, onboarding |
| `/planning/[id]` | `app/(routes)/planning/[id]/page.tsx` | `PlanningClient` | main planning experience; thread management, vision doc, task proposals |
| `/mission-control/[id]` | `app/(routes)/mission-control/[id]/page.tsx` | `MissionControlTemplate` | kanban execution view |
| `/chat/[id]` | `app/(routes)/chat/[id]/page.tsx` | `ChatTemplate` | task-level chat / doer-reviewer adjacent flow |
| `/summary/[id]` | `app/(routes)/summary/[id]/page.tsx` | `SummaryTemplate` | task/project summary surface |
| `/directory` | `app/(routes)/directory/page.tsx` | `DirectoryTemplate` | project/task directory view |
| `/hub` | `app/(routes)/hub/page.tsx` | Knowledge Hub page | cross-project published-plan library |
| `/components` | `app/(routes)/components/page.tsx` | component showcase | not a primary product flow |

## Navigation mismatch worth noting

`components/organisms/NavigationBar.tsx` includes links for:

- `/`
- `/directory`
- `/timeline`
- `/insights`

But inspected route pages currently exist for `/` and `/directory`, not for `/timeline` or `/insights`.

This may represent unfinished navigation, placeholders, or removed features.

## Main feature slices

### Dashboard / Project bootstrap
Main files:

- `components/templates/DashboardTemplate.tsx`
- `components/organisms/HeroSection.tsx`
- `components/molecules/CreateProjectModal.tsx`
- `components/molecules/ImportProjectFlow.tsx`
- `lib/onboarding.ts`

Responsibilities:

- create/delete projects
- import seed content into planning
- create initial planning thread/message for imports
- launch onboarding example

### Planning
Main files:

- `components/planning/PlanningClient.tsx`
- `components/organisms/PlanningChatPanel.tsx`
- `components/molecules/BatchQuestionCard.tsx`
- `components/molecules/PhaseTransitionCard.tsx`
- `components/molecules/TaskProposalCard.tsx`
- `components/molecules/VisionPanel.tsx`
- `components/molecules/VisionHistoryDrawer.tsx`
- `lib/hooks/usePlanningThreads.ts`
- `lib/hooks/usePlanningMessages.ts`

Responsibilities:

- planning thread lifecycle
- structured question batches
- phase transitions
- vision document editing/versioning
- task proposal approval
- attachments and lightweight file ingestion

### Mission control / Kanban execution
Main files:

- `components/templates/MissionControlTemplate.tsx`
- `components/organisms/KanbanBoard.tsx`
- `components/organisms/KanbanColumn.tsx`
- `components/organisms/KanbanHeader.tsx`
- `components/organisms/KanbanFooter.tsx`
- `components/mission-control/TodoBreakdownAutoRunner.tsx`
- `lib/hooks/useColumnAutoMode.ts`
- `lib/hooks/useBreakdownConcurrency.ts`

Responsibilities:

- status movement
- drag/drop lifecycle
- auto mode behavior
- task creation in execution flow
- breakdown prefetch/auto-run behavior

### Breakdown / Doer / Reviewer
Main files:

- `lib/hooks/useBreakdownAgent.ts`
- `lib/hooks/useDoerAgent.ts`
- `lib/hooks/useReviewerAgent.ts`
- `components/task-chat/TodoStepPlannerPanel.tsx`

Responsibilities:

- subtask generation
- cached breakdown suggestions
- doer artifacts
- reviewer reports
- token accounting
- activity logging

### Chat and summary surfaces
Main files:

- `components/templates/ChatTemplate.tsx`
- `components/templates/SummaryTemplate.tsx`
- `lib/hooks/useAgentStream.ts`
- `lib/hooks/useConversations.ts`

Responsibilities:

- task chat streaming
- conversation history
- summary rollup of work artifacts

### Read surfaces / archive surfaces
Main files:

- `components/templates/DirectoryTemplate.tsx`
- `components/organisms/DirectoryArtifactsPanel.tsx`
- `app/(routes)/hub/page.tsx`

Responsibilities:

- browse projects/tasks/artifacts
- browse published vision docs across projects

## Data model inventory

Key entities and their role:

- `Project` — root container for planning and task execution
- `Task` — kanban execution item
- `Subtask` — breakdown/doer/reviewer execution unit
- `Conversation` — task chat history
- `PlanningThread` — planning conversation container
- `PlanningMessage` — planning message + structured envelope/action state
- `VisionVersion` — versioned planning document snapshots
- `TaskActivityEntry` — audit-style activity timeline for tasks
- `CachedBreakdown` — remembered AI subtask suggestions

## Coupling hotspots

### Direct store access is widespread
The store is not hidden behind a single repository layer. Many components and hooks call `useKanbanStore(...)` directly.

Migration implication: any store contract change is high risk.

### Unified agent route is broad
The single route handles multiple AI roles and multiple response styles.

Migration implication: reorganizing server code requires extra care to avoid cross-mode regressions.

### Planning has overlap / evolution signals
There is a newer route path that uses `components/planning/PlanningClient.tsx`, while `components/templates/PlanningTemplate.tsx` still exists and appears conceptually overlapping.

Migration implication: treat these as potentially live-or-legacy until explicitly proven otherwise.

### Compatibility wrappers remain in place
React Query wrappers are still present even though data mostly resolves synchronously from the local store.

Migration implication: there is likely value in keeping these seams initially, even if they look redundant.

## Baseline constraints to respect

- local-first architecture is intentional
- no database is required for the POC
- the AI does not mutate the store directly server-side
- status lifecycle rules are partly enforced client-side
- there is no strong automated test safety net today

## Practical takeaway

The migration is not large because the codebase is huge. It is large because the architecture is **stateful, feature-rich, and tightly connected**.

The safe migration posture is:

1. freeze behavior
2. fork cleanly
3. isolate v2 persistence
4. reorganize in small vertical slices
