# Next.js Kanban Project: Complete Structure & Component Analysis

**Project Location:** `/Users/tri.phan/tech-research/kanban/demo-personal-kanban/nextjs-kanban/`

**Last Updated:** April 10, 2026

---

## 📋 TECH STACK

### Core Dependencies
- **Next.js** (v16.2.2) - React framework with App Router
- **React** (v19.2.4) - UI library
- **TypeScript** (v5) - Type safety
- **Tailwind CSS** (v4) - Utility-first CSS framework
- **shadcn** (v4.2.0) - Component library UI registry (not fully used yet)

### UI Components & Styling
- **@base-ui/react** (v1.3.0) - Headless component primitives
  - Button, Avatar, Badge, Separator, Progress, Scroll Area primitives
  - Provides accessible, unstyled components for building custom designs
- **class-variance-authority** (v0.7.1) - CVA for component variants
- **clsx** (v2.1.1) - Classname utility
- **tailwind-merge** (v3.5.0) - Merge Tailwind classes safely
- **framer-motion** (v12.38.0) - Animation library (installed but not extensively used yet)
- **lucide-react** (v1.7.0) - Icon library

### Data & State Management
- **@prisma/client** (v7.7.0) - ORM with PostgreSQL adapter
- **@tanstack/react-query** (v5.96.2) - Server state & async query management
- **zustand** (v5.0.12) - Lightweight client state management
- **zod** (v4.3.6) - Schema validation

### Content & Rendering
- **react-markdown** (v10.1.0) - Markdown rendering for AI messages
- **remark-gfm** (v4.0.1) - GitHub Flavored Markdown support
- **diff** (v8.0.4) - Word-level diff for task mutations display

### AI & LLM Integration
- **@anthropic-ai/sdk** (v0.85.0) - Claude API client
- **openai** (v6.33.0) - OpenAI API client
- **@google/genai** (v1.48.0) - Google Generative AI client
- **@jackchen_me/open-multi-agent** (v1.0.1) - Multi-agent orchestration

### Font & Typography
- **@fontsource-variable/geist** (v5.2.8)
- **@fontsource-variable/plus-jakarta-sans** (v5.2.8)
- **@fontsource/inter** (v5.2.8)

---

## 📁 DIRECTORY STRUCTURE

```
nextjs-kanban/
├── app/                              # Next.js App Router
│   ├── (routes)/                     # Route group with shared layout
│   │   ├── chat/[id]/page.tsx       # Task chat page
│   │   ├── components/page.tsx       # Component showcase
│   │   ├── directory/page.tsx        # Directory page
│   │   ├── mission-control/[id]/page.tsx  # Kanban board page
│   │   ├── planning/[id]/page.tsx   # Planning (AI threads) page
│   │   ├── summary/[id]/page.tsx    # Project summary page
│   │   └── layout.tsx               # Route group layout
│   ├── api/                         # API Route Handlers
│   │   ├── agents/                  # Agent endpoints (plan, tasks, run, team, stream, etc.)
│   │   ├── analytics/               # Analytics endpoints
│   │   ├── conversations/           # Chat conversations
│   │   ├── planning-threads/        # Planning thread management
│   │   ├── projects/                # Project CRUD
│   │   ├── tasks/                   # Task CRUD & mutations
│   │   └── test/                    # Testing endpoints
│   ├── layout.tsx                   # Root layout (fonts, providers)
│   ├── page.tsx                     # Home page
│   ├── providers.tsx                # Context/Provider wrappers
│   ├── globals.css                  # Global Tailwind & styles
│   ├── error.tsx                    # Error boundary
│   ├── loading.tsx                  # Loading UI
│   └── not-found.tsx                # 404 page
│
├── components/                       # React Components (organized by feature)
│   ├── ui/                          # Base/Atomic UI Components
│   │   ├── button.tsx               # CVA-based button with variants
│   │   ├── card.tsx                 # Card with header, content, footer, action slots
│   │   ├── badge.tsx                # CVA-based badge variants
│   │   ├── avatar.tsx               # Avatar with image, fallback, badge, group support
│   │   ├── separator.tsx            # Horizontal/vertical divider
│   │   ├── progress.tsx             # Progress bar with track, indicator, label, value
│   │   ├── scroll-area.tsx          # Scrollable container with styled scrollbar
│   │   └── skeleton.tsx             # Loading placeholder
│   │
│   ├── shared/                      # Shared Feature Components
│   │   ├── AgentBadge.tsx           # Agent type display badge
│   │   ├── ChatBubble.tsx           # Message bubble (agent/user) with Markdown
│   │   └── DiffViewer.tsx           # Word-level diff visualization
│   │
│   ├── layout/
│   │   └── Navigation.tsx           # Top header navigation
│   │
│   ├── home/
│   │   └── HomeClient.tsx           # Home page: project list & creation modal
│   │
│   ├── directory/
│   │   └── DirectoryClient.tsx      # Directory: cross-project task browser
│   │
│   ├── mission-control/
│   │   ├── MissionControlClient.tsx # Kanban board with drag-and-drop
│   │   ├── AutoModeToggle.tsx       # Auto-mode enable/disable button
│   │   └── AutoModeStatusBar.tsx    # Column automation status display
│   │
│   ├── planning/
│   │   ├── PlanningClient.tsx       # AI planning threads interface
│   │   ├── ThreadListSidebar.tsx    # Thread list navigation
│   │   ├── TaskPanel.tsx            # Current project/task display
│   │   └── TaskMutationCard.tsx     # Task mutation display with diffs
│   │
│   ├── task-chat/
│   │   └── TaskChatClient.tsx       # Per-task chat interface
│   │
│   └── task-summary/
│       └── TaskSummaryClient.tsx    # Task summary view
│
├── lib/                             # Utility & Business Logic
│   ├── hooks/                       # Custom React Hooks
│   │   ├── useAgentStream.ts        # Stream agent responses
│   │   ├── useColumnAutoMode.ts     # Column automation state
│   │   ├── useConversations.ts      # Conversation queries
│   │   ├── usePlanningMessages.ts   # Planning thread messages
│   │   ├── usePlanningThreads.ts    # Planning threads CRUD
│   │   ├── useProjects.ts           # Project queries
│   │   └── useTasks.ts              # Task queries
│   │
│   ├── db/                          # Database Queries
│   │   ├── client.ts                # Prisma client singleton
│   │   ├── projects.ts              # Project queries
│   │   ├── tasks.ts                 # Task queries
│   │   ├── conversations.ts         # Conversation queries
│   │   ├── planning-threads.ts      # Planning thread queries
│   │   └── planning-messages.ts     # Planning message queries
│   │
│   ├── agents/                      # AI Agent Logic
│   │   ├── configs.ts               # Agent configurations
│   │   ├── orchestrator.ts          # Agent orchestration
│   │   ├── prompts.ts               # System prompts for agents
│   │   └── tools/                   # Agent tools
│   │
│   ├── auto-mode/
│   │   └── constants.ts             # Auto-mode column settings
│   │
│   ├── stores/
│   │   └── uiStore.ts               # Zustand UI state store
│   │
│   ├── utils/
│   │   ├── parseTaskMutations.ts    # Parse AI-generated task changes
│   │   └── security.ts              # Security utilities
│   │
│   ├── validations/
│   │   └── schemas.ts               # Zod validation schemas
│   │
│   ├── status-lifecycle.ts           # Task status state machine
│   ├── status-mapping.ts             # Status enum mappings
│   ├── utils.ts                      # General utilities (cn, newId, relativeTime)
│   └── generated/prisma/            # Generated Prisma types
│
├── types/
│   └── domain.ts                    # Core domain types (TaskStatus, AgentHint)
│
├── constants/
│   └── agents.ts                    # Agent mapping, colors, icons, columns
│
├── prisma/                          # Database Schema & Migrations
│   ├── schema.prisma                # Data models
│   ├── migrations/                  # Migration history
│   └── seed.ts                      # Seed data
│
├── public/                          # Static assets
│
├── scripts/
│   └── test-agent.ts                # Testing script
│
├── openspec/                        # OpenSpec change tracking
│   └── changes/                     # Completed/in-progress changes
│
├── docs/                            # Documentation
│
├── package.json                     # Dependencies & scripts
├── tsconfig.json                    # TypeScript config
├── tailwind.config.ts              # Tailwind configuration
├── postcss.config.mjs              # PostCSS configuration
├── next.config.ts                  # Next.js configuration
└── eslint.config.mjs               # ESLint rules
```

---

## 🎨 DESIGN SYSTEM & STYLING

### Tailwind CSS Setup
- **Version:** v4 with PostCSS v4
- **CSS Variables (oklch):** Custom theme defined in `globals.css`
- **Color Palette:** Light/dark mode support via CSS variables
  - Primary: Dark navy (`oklch(0.205 0 0)`)
  - Accent colors: Blue, indigo, purple, amber, emerald, red
  - Backgrounds: White (light) / Dark (dark mode)
- **Border Radius:** Scalable from `sm` to `4xl` (0.625rem base)

### Font System
- **Heading Font:** Plus Jakarta Sans Variable (Premium typography)
- **Body Font:** Inter (Clean, readable)
- **Mono Font:** Geist Mono (Code/technical)
- Defined as CSS variables: `--font-heading`, `--font-sans`, `--font-geist-mono`

### Component Architecture Pattern
All UI components follow this pattern:
1. **Base UI Component** (e.g., `Button`, `Card`)
   - Built on `@base-ui/react` primitives for accessibility
   - Uses CVA (class-variance-authority) for variants
   - Exports both component and variants
   - Uses `cn()` utility for classname merging

2. **Example: Button Component**
   ```tsx
   const buttonVariants = cva(base-classes, {
     variants: {
       variant: { default, outline, secondary, ghost, destructive, link },
       size: { default, xs, sm, lg, icon, icon-xs, icon-sm, icon-lg }
     },
     defaultVariants: { variant: "default", size: "default" }
   })
   ```

3. **Composition**
   - Button accepts `variant` and `size` props
   - Card has subcomponents: CardHeader, CardTitle, CardDescription, CardContent, CardFooter, CardAction
   - All support className override via `cn()`

### Markdown Styling (`.ai-prose`)
- Custom styles for AI-generated content in `globals.css`
- Includes headings, lists, code blocks, blockquotes, tables
- Used in `ChatBubble` component for agent messages

---

## 🧩 COMPONENT INVENTORY

### UI Base Components (8 total)

| Component | Path | Purpose | Key Features |
|-----------|------|---------|--------------|
| **Button** | `ui/button.tsx` | Interactive button | 6 variants (default, outline, secondary, ghost, destructive, link), 7 sizes, CVA-based |
| **Card** | `ui/card.tsx` | Content container | Header, title, description, content, footer, action slots, size variants |
| **Badge** | `ui/badge.tsx` | Label/tag | 6 variants (default, secondary, destructive, outline, ghost, link), icon support |
| **Avatar** | `ui/avatar.tsx` | User/agent profile picture | Root, Image, Fallback, Badge, Group, GroupCount subcomponents |
| **Separator** | `ui/separator.tsx` | Visual divider | Horizontal/vertical orientation |
| **Progress** | `ui/progress.tsx` | Progress indicator | Root, Track, Indicator, Label, Value subcomponents |
| **ScrollArea** | `ui/scroll-area.tsx` | Scrollable container | Viewport, Scrollbar (with custom thumb styling) |
| **Skeleton** | `ui/skeleton.tsx` | Loading placeholder | Animated pulse effect |

### Shared Feature Components (3 total)

| Component | Path | Purpose | Dependencies |
|-----------|------|---------|--------------|
| **AgentBadge** | `shared/AgentBadge.tsx` | Display agent type with color & icon | Constants: AGENT_COLORS, AGENT_ICONS |
| **ChatBubble** | `shared/ChatBubble.tsx` | Message bubble (agent or user) | react-markdown, remark-gfm, TypingIndicator export |
| **DiffViewer** | `shared/DiffViewer.tsx` | Show text changes with highlights | diff library (word-level diffs) |

### Page/Screen Components (7 total)

| Component | Path | Purpose | Key Features |
|-----------|------|---------|--------------|
| **HomeClient** | `home/HomeClient.tsx` | Project list & creation | Modal creation, domain selector, project cards with progress, delete action |
| **DirectoryClient** | `directory/DirectoryClient.tsx` | Cross-project task browser | Search, status filters, grid/list view toggle, task cards |
| **MissionControlClient** | `mission-control/MissionControlClient.tsx` | Kanban board | 5-column drag-drop, status-based transitions, auto-mode integration, footer stats |
| **AutoModeToggle** | `mission-control/AutoModeToggle.tsx` | Enable/disable column automation | Status-based styling (error, running, idle, disabled) |
| **AutoModeStatusBar** | `mission-control/AutoModeStatusBar.tsx` | Show automation status | Active task display, error messages, status dot animation |
| **PlanningClient** | `planning/PlanningClient.tsx` | AI planning threads interface | Thread list, message chat, mutation cards, markdown rendering |
| **TaskChatClient** | `task-chat/TaskChatClient.tsx` | Per-task chat | Task-specific conversation |
| **TaskSummaryClient** | `task-summary/TaskSummaryClient.tsx` | Project completion summary | Result display |

### Layout Components

| Component | Path | Purpose |
|-----------|------|---------|
| **Navigation** | `layout/Navigation.tsx` | Top header with nav links, icons, user menu |

---

## 🔄 COMPONENT DEPENDENCY GRAPH

### Import Patterns
```
Pages (app/(routes)/*/page.tsx)
  ↓
Client Components (*Client.tsx)
  ├─→ UI Components (components/ui/*)
  ├─→ Shared Components (components/shared/*)
  ├─→ Feature Sub-components (planning/*, mission-control/*)
  ├─→ Custom Hooks (lib/hooks/*)
  └─→ Utilities (lib/utils/*, constants/agents.ts)

Key flows:
- MissionControlClient
  ├─→ MissionControlClient
  ├─→ AutoModeToggle
  ├─→ AutoModeStatusBar
  └─→ useColumnAutoMode (hook)

- PlanningClient
  ├─→ ThreadListSidebar
  ├─→ TaskPanel
  ├─→ TaskMutationCard
  └─→ usePlanningThreads, usePlanningMessages (hooks)

- HomeClient
  ├─→ Domain selector UI
  ├─→ Project cards
  └─→ Modal dialog

- DirectoryClient
  ├─→ Search & filters
  ├─→ Task grid/list
  └─→ Project cards
```

### Hook Dependencies
```
usePlanningThreads → lib/db/planning-threads.ts → Prisma
useCreatePlanningThread ┘
useDeletePlanningThread ┘

usePlanningMessages → lib/db/planning-messages.ts → Prisma
useSendPlanningMessage ┘

useTasks → lib/db/tasks.ts → Prisma
useProjects → lib/db/projects.ts → Prisma

useColumnAutoMode → State management of automation per column
  ├─→ AUTO_MODE_COLUMNS constant
  └─→ updateTaskStatus function

useConversations → Conversation queries
```

---

## 🎨 UI COMPONENT DETAILS

### Button Variants
```
variant: 'default' | 'outline' | 'secondary' | 'ghost' | 'destructive' | 'link'
size: 'default' | 'xs' | 'sm' | 'lg' | 'icon' | 'icon-xs' | 'icon-sm' | 'icon-lg'

Example: <Button variant="destructive" size="sm">Delete</Button>
```

### Card Composition
```tsx
<Card size="default" | "sm">
  <CardHeader>
    <CardTitle>Title</CardTitle>
    <CardDescription>Description</CardDescription>
    <CardAction>Action buttons</CardAction>
  </CardHeader>
  <CardContent>Content here</CardContent>
  <CardFooter>Footer</CardFooter>
</Card>
```

### Badge Variants
```
variant: 'default' | 'secondary' | 'destructive' | 'outline' | 'ghost' | 'link'

Used for: Agent types, task status labels, priority indicators
```

### Avatar Composition
```tsx
<AvatarGroup>
  <Avatar>
    <AvatarImage src="..." />
    <AvatarFallback>AB</AvatarFallback>
    <AvatarBadge><Icon /></AvatarBadge>
  </Avatar>
  <AvatarGroupCount>+3</AvatarGroupCount>
</AvatarGroup>
```

---

## 📊 CURRENT PAGES & ROUTES

| Route | Component | Purpose |
|-------|-----------|---------|
| `/` | HomeClient | Project listing & creation |
| `/directory` | DirectoryClient | Cross-project task browser |
| `/mission-control/[id]` | MissionControlClient | Kanban board |
| `/planning/[id]` | PlanningClient | AI planning interface |
| `/chat/[id]` | TaskChatClient | Per-task chat |
| `/summary/[id]` | TaskSummaryClient | Project summary |
| `/components` | ? | Component showcase |

---

## 🔌 STATE MANAGEMENT

### React Query (TanStack Query)
- Used for server state: projects, tasks, threads, messages, conversations
- Auto-refetch on window focus/interval
- Mutation handling for create/update/delete

### Zustand
- `uiStore.ts` - Client UI state (current selections, UI flags)
- Lightweight alternative to Context API

### Local State (useState)
- Component-level state (inputs, modals, drag-over tracking)
- Active thread/message selection
- Form inputs

---

## 🎯 KEY DESIGN PATTERNS

### 1. Server Components → Client Wrappers
```tsx
// app/(routes)/planning/[id]/page.tsx (Server Component)
export default async function Page({ params }) {
  const project = await getProject(params.id)
  return <PlanningClient project={serialized} />
}

// components/planning/PlanningClient.tsx (Client Component - 'use client')
export function PlanningClient({ project }) { ... }
```

### 2. Component Composition with Subcomponents
```tsx
// Multiple sub-parts that work together
<Card>
  <CardHeader>
    <CardTitle />
    <CardDescription />
  </CardHeader>
  <CardContent />
  <CardFooter />
</Card>
```

### 3. CVA for Flexible Variants
```tsx
const buttonVariants = cva(baseClasses, {
  variants: {
    variant: { ... },
    size: { ... }
  }
})

export function Button({ variant = "default", size = "default", ...props }) {
  return <button className={cn(buttonVariants({ variant, size }))} />
}
```

### 4. Custom Hooks for Business Logic
```tsx
const { data: projects } = useProjects()
const createProject = useCreateProject()
createProject.mutate({ name: "..." })
```

### 5. Modal Dialogs as Conditional Renders
```tsx
{showModal && (
  <div className="fixed inset-0 bg-black/40">
    <div className="bg-white rounded-3xl shadow-2xl">
      {/* Modal content */}
    </div>
  </div>
)}
```

---

## 🚀 COMPONENT CREATION TEMPLATE

When adding new components, follow this pattern:

```tsx
// components/[feature]/MyComponent.tsx
'use client' // if it uses hooks, state, or events

import { cn } from '@/lib/utils'
import { Icon } from 'lucide-react'
import type { Props } from './types'

export function MyComponent({ prop1, prop2, className }: Props) {
  return (
    <div className={cn("base-styles", className)}>
      {/* Component content */}
    </div>
  )
}
```

**Key principles:**
- Always use `cn()` for classname merging
- Prefer composition over rigid hierarchy
- Export variants if using CVA
- Use `data-slot` attributes for styling hooks
- Keep components focused and reusable

---

## 📦 BUILD ARTIFACTS

- **Next.js Build:** TypeScript → JavaScript (app router)
- **Tailwind CSS:** JIT compilation, tree-shaking unused styles
- **Font Loading:** Local files via `@fontsource` packages

---

## 🔍 QUICK REFERENCE

### Add a new UI component:
1. Create `components/ui/new-component.tsx`
2. Use `@base-ui/react` primitive as base
3. Create CVA variants if needed
4. Export component and variants
5. Use in feature components

### Add a new page:
1. Create `app/(routes)/[feature]/page.tsx` (Server Component)
2. Fetch data server-side
3. Serialize data (dates, etc.)
4. Pass to Client Component wrapper

### Add client state:
1. Use React Query for server state
2. Use `useState` for UI state
3. Consider Zustand for complex UI state

### Style everything:
- Use Tailwind utility classes
- Reference CSS variables for colors/spacing
- Use `cn()` to merge conditional classes
- Never use inline styles (except for dynamic values)

---

## 📝 NOTES

- **No external CSS modules:** All styling is Tailwind + `@layer`
- **No styled-components:** Not in the tech stack
- **shadcn/ui mentioned but not actively used:** Project has its own custom components built on `@base-ui/react`
- **Icons:** All from `lucide-react` (1.7.0)
- **AI Integration:** Multiple LLM providers (Claude, OpenAI, Google)
- **Database:** PostgreSQL with Prisma ORM
- **Auto-mode:** Experimental feature for column automation (uses hooks + state)

