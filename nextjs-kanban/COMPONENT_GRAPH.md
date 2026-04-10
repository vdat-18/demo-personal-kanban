# Component Dependency Graph & Architecture

## 🔗 COMPLETE COMPONENT HIERARCHY

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         APP ROUTING & PAGES                                 │
└─────────────────────────────────────────────────────────────────────────────┘

app/layout.tsx (Root)
  └─ providers.tsx (Context providers)
     └─ (routes)/layout.tsx (Route group wrapper)
        │
        ├─ page.tsx (Home)
        │  └─ HomeClient
        │
        ├─ directory/page.tsx
        │  └─ DirectoryClient
        │
        ├─ mission-control/[id]/page.tsx
        │  └─ MissionControlClient
        │
        ├─ planning/[id]/page.tsx
        │  └─ PlanningClient
        │
        ├─ chat/[id]/page.tsx
        │  └─ TaskChatClient
        │
        ├─ summary/[id]/page.tsx
        │  └─ TaskSummaryClient
        │
        └─ components/page.tsx (Showcase)


┌─────────────────────────────────────────────────────────────────────────────┐
│                      CLIENT COMPONENTS & FEATURES                           │
└─────────────────────────────────────────────────────────────────────────────┘

HomeClient
├─ UI: Input, Modal dialog, Buttons
├─ State: showModal, projectName, selectedDomain, importMode
└─ Features:
   ├─ Domain selector (4 options: Software, Marketing, Sales, Logistics)
   ├─ Project creation modal
   ├─ Project cards with:
   │  ├─ Status badge
   │  ├─ Agent avatars
   │  ├─ Progress bar
   │  └─ Delete button
   └─ Empty state placeholder

DirectoryClient
├─ UI: Search input, Filter buttons, View mode toggle
├─ Features:
│  ├─ Search across projects & tasks
│  ├─ Status filtering (ALL, TODO, IN_PROGRESS, IN_REVIEW, DONE, BLOCKED)
│  ├─ Grid/List view toggle
│  ├─ Project grid
│  └─ Task grid or task list
└─ Data sources:
   ├─ projects (via props)
   └─ All tasks flattened from projects

MissionControlClient (KANBAN BOARD)
├─ UI: Kanban columns (TODO, IN_PROGRESS, IN_REVIEW, DONE, BLOCKED)
├─ Features:
│  ├─ Drag-and-drop between columns
│  ├─ Status lifecycle validation
│  ├─ Auto-mode per column (experimental)
│  ├─ Task cards with:
│  │  ├─ Status badge
│  │  ├─ Title
│  │  ├─ Description (truncated)
│  │  └─ Action buttons (on hover)
│  │     ├─ Restore (if BLOCKED)
│  │     ├─ Cancel (if allowed by lifecycle)
│  │     └─ Move forward (if next status exists)
│  └─ Footer stats (total, in progress, done, cancelled, auto count)
├─ Sub-components:
│  ├─ AutoModeToggle (per column)
│  └─ AutoModeStatusBar (per column, when active)
└─ Hooks:
   ├─ useColumnAutoMode
   └─ updateTaskStatus (callback)

PlanningClient (AI PLANNING)
├─ UI: Thread list sidebar + chat area
├─ Features:
│  ├─ Planning thread management
│  ├─ Message chat interface
│  ├─ Auto-select/create first thread
│  ├─ Message scroll-to-bottom
│  ├─ Markdown rendering for AI messages
│  └─ Task mutation cards
├─ Sub-components:
│  ├─ ThreadListSidebar
│  │  └─ Thread list with timestamps
│  ├─ TaskPanel
│  │  └─ Current project/task display
│  └─ TaskMutationCard
│     ├─ Status badges
│     ├─ DiffViewer (word-level changes)
│     └─ Mutation metadata
└─ Hooks:
   ├─ usePlanningThreads
   ├─ useCreatePlanningThread
   ├─ useDeletePlanningThread
   ├─ usePlanningMessages
   └─ useSendPlanningMessage


┌─────────────────────────────────────────────────────────────────────────────┐
│                         BASE UI COMPONENTS                                  │
└─────────────────────────────────────────────────────────────────────────────┘

Button (CVA-based)
├─ Variants:
│  └─ variant: default | outline | secondary | ghost | destructive | link
│     size: default | xs | sm | lg | icon | icon-xs | icon-sm | icon-lg
└─ Built on: @base-ui/react/button
   Uses: class-variance-authority (cva)

Card (Composition-based)
├─ Subcomponents:
│  ├─ CardHeader (with optional border-b)
│  ├─ CardTitle
│  ├─ CardDescription
│  ├─ CardAction (top-right positioned)
│  ├─ CardContent
│  └─ CardFooter (with border-t)
└─ Props: size = "default" | "sm"

Badge (CVA-based)
├─ Variants:
│  └─ variant: default | secondary | destructive | outline | ghost | link
└─ Features: Icon support, responsive sizing

Avatar (Composition-based)
├─ Subcomponents:
│  ├─ AvatarRoot (container, size variants)
│  ├─ AvatarImage
│  ├─ AvatarFallback (text initials)
│  ├─ AvatarBadge (status indicator)
│  └─ AvatarGroup (container for multiple avatars)
│     └─ AvatarGroupCount (overflow count display)
└─ Sizes: sm | default | lg

Progress (Composition-based)
├─ Subcomponents:
│  ├─ ProgressRoot
│  ├─ ProgressTrack
│  ├─ ProgressIndicator
│  ├─ ProgressLabel
│  └─ ProgressValue
└─ Supports: children, value prop

Separator
├─ Props: orientation = "horizontal" | "vertical"
└─ Built on: @base-ui/react/separator

ScrollArea (Composition-based)
├─ Subcomponents:
│  ├─ ScrollAreaRoot
│  ├─ ScrollAreaViewport
│  ├─ ScrollBar (with orientation)
│  │  └─ ScrollAreaThumb (custom styled thumb)
│  └─ ScrollAreaCorner
└─ Custom scrollbar styling

Skeleton
├─ Simple div with animate-pulse
└─ Customizable via className


┌─────────────────────────────────────────────────────────────────────────────┐
│                       SHARED FEATURE COMPONENTS                             │
└─────────────────────────────────────────────────────────────────────────────┘

AgentBadge
├─ Props: agentType, size, showIcon, className
├─ Maps agentType to:
│  ├─ AGENT_ICONS (lucide-react icons)
│  └─ AGENT_COLORS (Tailwind color classes)
└─ Uses: constants/agents.ts

ChatBubble
├─ Props: sender ("agent" | "user"), text, actionHint
├─ Features:
│  ├─ Agent messages: markdown rendering, white bubble, "AI" badge
│  ├─ User messages: dark navy bubble, plain text
│  ├─ Optional action hint below agent messages
│  └─ TypingIndicator export (three-dot animation)
└─ Uses: react-markdown, remark-gfm

DiffViewer
├─ Props: oldText, newText, version
├─ Features:
│  ├─ Word-level diffs (added, removed, unchanged)
│  ├─ Color coding: green for additions, red for removals
│  └─ Version label display
└─ Uses: diff library (Diff.diffWords)

Navigation (Layout)
├─ Features:
│  ├─ Logo link
│  ├─ Nav links (Projects, Directory, Timeline, Insights)
│  ├─ Active link highlight (bottom border)
│  └─ Right icons (notifications, settings, user avatar)
└─ Uses: lucide-react icons


┌─────────────────────────────────────────────────────────────────────────────┐
│                      HOOKS & UTILITIES LAYER                                │
└─────────────────────────────────────────────────────────────────────────────┘

React Query Hooks
├─ useProjects()
├─ useTasks()
├─ useConversations()
├─ usePlanningThreads(projectId)
├─ useCreatePlanningThread()
├─ useDeletePlanningThread()
├─ usePlanningMessages(threadId)
├─ useSendPlanningMessage()
└─ useAgentStream()

Custom Hooks
└─ useColumnAutoMode(options)
   ├─ Manages auto-mode state per column
   ├─ Subscribes to auto-processing updates
   └─ Provides: columnStates, toggle, dismissError, autoProcessingTaskIds

Utility Functions
├─ cn(...inputs) - Merge Tailwind classes (clsx + tailwind-merge)
├─ newId() - Generate random short ID
└─ relativeTime(isoString) - Format timestamp to relative label

Database Layer
├─ lib/db/projects.ts
├─ lib/db/tasks.ts
├─ lib/db/conversations.ts
├─ lib/db/planning-threads.ts
└─ lib/db/planning-messages.ts
   All use Prisma client for data access


┌─────────────────────────────────────────────────────────────────────────────┐
│                         DATA FLOW ARCHITECTURE                              │
└─────────────────────────────────────────────────────────────────────────────┘

SERVER SIDE (App Router)
  │
  ├─ app/page.tsx (Server Component)
  │  └─ Fetches projects via getProjects()
  │     │
  │     └─ Serializes to JSON-safe format
  │        │
  │        └─ Passes to HomeClient (Client Component)
  │
  ├─ app/(routes)/[feature]/[id]/page.tsx (Server Component)
  │  └─ Fetches single entity (project, task, thread)
  │     │
  │     └─ Passes to *Client Component
  │
  └─ API Routes (app/api/*/route.ts)
     ├─ POST /api/projects (create)
     ├─ GET /api/projects (list)
     ├─ PUT /api/projects/[id] (update)
     ├─ DELETE /api/projects/[id] (delete)
     ├─ Similar for: tasks, conversations, planning-threads, etc.
     └─ Agent routes: /api/agents/plan, /run, /stream, /team, etc.

CLIENT SIDE (React Components)
  │
  ├─ State Management Layers:
  │  │
  │  ├─ React Query (Server State)
  │  │  └─ Manages: projects, tasks, threads, messages, conversations
  │  │     Auto-refetch on focus, window visibility, intervals
  │  │
  │  ├─ useState (Component UI State)
  │  │  └─ Local: inputs, modal visibility, drag targets, selections
  │  │
  │  └─ Zustand (Global UI State)
  │     └─ Current selections, UI flags
  │
  ├─ Mutations via React Query
  │  └─ Create/Update/Delete operations
  │     Optimistic updates where applicable
  │
  ├─ Custom Hooks
  │  └─ Encapsulate business logic
  │     useColumnAutoMode, useAgentStream, etc.
  │
  └─ Component Rendering
     └─ UI components display state
        Event handlers update state
        State changes trigger re-renders


┌─────────────────────────────────────────────────────────────────────────────┐
│                      STYLING & THEMING STRATEGY                             │
└─────────────────────────────────────────────────────────────────────────────┘

CSS Variables (Custom Theme in globals.css)
├─ Color System (oklch color space)
│  ├─ Semantic colors: primary, secondary, destructive, accent, muted
│  ├─ Component colors: card, popover, background, foreground
│  ├─ State colors: border, input, ring
│  └─ Light & Dark mode variants
│
├─ Typography
│  ├─ --font-heading: Plus Jakarta Sans Variable
│  ├─ --font-sans: Inter
│  └─ --font-geist-mono: Geist Mono
│
├─ Spacing
│  └─ --radius: Base radius (0.625rem), scalable to 4xl
│
└─ Chart colors (chart-1 through chart-5)

Tailwind Utilities
├─ Applied via className in all components
├─ Generated at build time (JIT)
└─ Tree-shaken: unused styles removed

Component-Level Styling
├─ @base-ui/react primitives (unstyled, accessible)
│  └─ Receive Tailwind classes via className prop
│
├─ CVA for variant management
│  └─ Composable, type-safe variant combinations
│
└─ Composition for complex components
   └─ Card, Avatar, Progress, ScrollArea as examples

Layout System
├─ Flexbox: Default for most layouts
├─ Grid: Card grid, kanban columns layout
├─ Fixed positioning: Modals, notifications
└─ Overflow handling: Scroll areas, truncation


┌─────────────────────────────────────────────────────────────────────────────┐
│                      FUTURE COMPONENT ADDITIONS                             │
└─────────────────────────────────────────────────────────────────────────────┘

Potential additions (not yet in codebase):
├─ Dialog/Modal primitives (already using conditional render pattern)
├─ Dropdown/Popover menus
├─ Tabs component
├─ Tooltip component
├─ Form inputs (text, textarea, select, checkbox, radio)
├─ Table/DataGrid
├─ Breadcrumbs
├─ Stepper/Wizard
├─ Toast notifications
├─ Loading spinners
└─ Charts/Graphs (charting library integration)

Current workarounds:
├─ Modals: Conditional JSX with fixed positioning
├─ Inputs: Plain HTML input elements with Tailwind
├─ Notifications: No toast library, alerts only
└─ Icons: All from lucide-react
