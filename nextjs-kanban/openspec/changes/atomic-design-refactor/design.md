## Context

The Next.js Kanban app currently has ~23 component files organized by feature domain: `components/ui/` (8 shadcn primitives), `components/shared/` (3 reusable widgets), `components/layout/` (1 nav), and six feature folders each containing a monolithic `*Client.tsx` (145–523 LOC). These Client components inline local sub-components, type definitions, constants, event handlers, API calls, and deeply nested JSX — mixing every layer of abstraction in a single file. The tech stack is Next.js 16, React 19, Tailwind CSS 4, shadcn/base-ui primitives, Zustand, TanStack Query, lucide-react icons, and framer-motion.

## Goals / Non-Goals

**Goals:**
- Establish a five-level Atomic Design directory hierarchy (`atoms/`, `molecules/`, `organisms/`, `templates/`) under `components/`.
- Decompose the six monolithic Client components into small, single-responsibility units mapped to the correct atomic level.
- Ensure every extracted component has an explicit props interface and barrel export.
- Maintain bit-for-bit rendering parity — zero visual or behavioural changes.
- Keep `lib/`, `types/`, `constants/`, `app/api/`, and Prisma layers completely untouched.

**Non-Goals:**
- Creating a shared design-system package or Storybook documentation.
- Refactoring hooks, stores, API routes, or server-side logic.
- Introducing new npm dependencies or build tooling.
- Adding unit/integration tests as part of this change (tests can follow in a separate change).
- Changing the app router file structure (`app/(routes)/`); pages will only update their imports.

## Decisions

### 1. Directory structure mirrors standard Atomic Design, without a "pages" level

```
components/
├── atoms/         # Indivisible UI elements (Button, Badge, Avatar, StatusPill, etc.)
├── molecules/     # Compositions of 2-3 atoms (ChatBubble, TaskCard, DomainSelector, etc.)
├── organisms/     # Self-contained sections (KanbanBoard, ChatPanel, ThreadSidebar, etc.)
├── templates/     # Page-level layout shells that compose organisms
└── index.ts       # Optional root barrel (re-exports all levels)
```

**Rationale**: The Next.js `app/` router already defines "pages" via `page.tsx` files, so a separate `components/pages/` level would duplicate responsibility. Templates provide the layout wiring, and `page.tsx` files remain the entry points.

### 2. Existing `components/ui/` files become atoms with a thin re-export shim

Move all 8 shadcn files (`button.tsx`, `badge.tsx`, `card.tsx`, `avatar.tsx`, `progress.tsx`, `scroll-area.tsx`, `separator.tsx`, `skeleton.tsx`) into `atoms/`. Add a `components/ui/index.ts` barrel that re-exports from `atoms/` so any external tooling (e.g., shadcn CLI) continues to work without config changes.

**Alternative considered**: Leaving `ui/` in place and only moving custom atoms — rejected because the split creates a confusing "two homes for atoms" pattern.

### 3. Client component extraction strategy — bottom-up

Extraction follows bottom-up order: first identify and extract atoms (inline status pills, loading dots, icon wrappers), then compose them into molecules (TaskCard, ProjectCard, ChatInput), then wrap molecules into organisms (KanbanColumn → KanbanBoard, ChatPanel), and finally define templates.

**Rationale**: Bottom-up guarantees each extracted piece is independently testable before being composed upward. It also avoids circular dependencies that could arise from top-down splitting.

### 4. Shared type definitions stay in `types/` — not co-located

Types like `TaskStatus`, `TaskPriority`, `Project`, `Task` are referenced across many atomic levels. They stay in `types/domain.ts` (and new `types/ui.ts` for component prop types if needed) rather than being co-located inside atomic folders.

**Alternative considered**: Co-locating types per-component — rejected because the same `Task` interface is needed in atoms (StatusPill), molecules (TaskCard), organisms (KanbanColumn), and templates.

### 5. Barrel exports at each level

Each atomic level gets an `index.ts` that re-exports all public components. Consumers import from the level: `import { Button, StatusPill } from '@/components/atoms'`.

**Rationale**: Keeps import paths short and level-aware. If a component moves between levels during future refactors, only the barrel export needs updating.

### 6. Implementation proceeds feature-by-feature, not level-by-level

Rather than extracting all atoms first across every feature, work feature-by-feature (HomeClient → MissionControlClient → etc.) to ensure each page keeps working after its refactor. Each feature gets atoms → molecules → organism → template in sequence, then move to the next feature.

**Alternative considered**: Level-by-level (extract all atoms, then all molecules, etc.) — rejected because it would leave intermediate states where pages have broken imports.

## Risks / Trade-offs

- **Large diff size** → Mitigated by working feature-by-feature with verification after each page refactor. Each page's refactor can be reviewed independently.
- **Shadcn CLI regeneration** → Mitigated by keeping a `components/ui/index.ts` shim that re-exports from `atoms/`. The CLI's output path can also be updated in config if needed.
- **Import path churn** → Every existing import under `@/components/` will change. Mitigated by barrel exports that let future moves happen with minimal downstream impact.
- **Subjective atom/molecule boundary** → Some components (e.g., `AgentBadge`) could arguably be either. Decision: if it composes 2+ atoms with layout logic, it's a molecule; if it's a single styled element, it's an atom. Document the rule in a `components/README.md` (optional follow-up).
- **`'use client'` boundary management** → Templates and organisms that compose client molecules must remain client components. No change from current behaviour since all Client components are already `'use client'`.
