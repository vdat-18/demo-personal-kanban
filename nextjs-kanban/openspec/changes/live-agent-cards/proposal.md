## Why

On Mission Control, task cards show static information (title, priority, agent hint). To know what an agent said or what's happening with a task, users must click into `/chat/[id]`. When managing 10+ tasks across a project, this constant context-switching is painful. Inspired by Cline/Kanban's approach of showing live agent activity on cards, enriching the kanban cards with the latest conversation snippet, token usage, and streaming indicators would let users monitor progress at a glance.

## What Changes

- Fetch the last conversation message for each task and display a truncated snippet on the card
- Show token usage badge (total input + output tokens) on cards that have conversations
- When an agent is actively streaming for a task, show a live pulsing indicator on the card
- Add a mini activity timeline (last 2-3 events) visible on hover or card expand
- Optimize data fetching: include last conversation in the task list query to avoid N+1
- Cards remain clickable to navigate to full chat view

## Capabilities

### New Capabilities

- `live-agent-cards`: Enriched kanban cards showing last agent message snippet, token usage badge, streaming indicator, and mini activity timeline — providing at-a-glance monitoring without leaving Mission Control

### Modified Capabilities

## Impact

- **`lib/db/tasks.ts`** — `getTasks()` includes last conversation message (optimized query)
- **`app/api/tasks/route.ts`** — GET returns enriched task data with last message
- **`components/mission-control/MissionControlClient.tsx`** — enriched card rendering with snippets, badges, indicators
- **`components/mission-control/TaskCard.tsx`** (new or refactored) — extracted card component with activity display
- **`lib/stores/uiStore.ts`** — track which tasks have active streams (for pulsing indicator)
- **No database schema changes** — leverages existing Conversation model
