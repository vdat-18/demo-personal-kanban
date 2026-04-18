# pi-kanban-poc

A Next.js + React kanban POC where the agent backend is `@mariozechner/pi-coding-agent`
and **all data lives in browser localStorage**. No database, no Docker, just `npm` + a
terminal.

## What's inside

- **Next.js 16** (App Router, Turbopack) + React 19 + TailwindCSS 4
- **Zustand** persisted to `localStorage` for projects, tasks, conversations,
  planning threads, and planning messages
- **TanStack React Query** kept around for component compatibility, but all queries
  resolve synchronously from the local store
- **`@mariozechner/pi-coding-agent`** SDK exposed through a single `/api/agent` route
  for both planning (JSON response) and chat (SSE stream)

## Prerequisites

- Node.js 20+
- An LLM API key in your environment (the SDK reads them from env vars):
  - `ANTHROPIC_API_KEY` for Claude, or
  - `OPENAI_API_KEY` for OpenAI, or
  - any other provider supported by `pi-coding-agent`

## Run

```bash
npm install
npm run dev
```

Then open http://localhost:3000.

The first time you create a project everything is stored in your browser. Clear the
key `pi-kanban-poc:store-v1` in `localStorage` to wipe state.

## Architecture

```
Browser
├─ Next.js client components
├─ Zustand store (localStorage persisted) ← single source of truth
└─ fetch /api/agent ──► Server route
                         └─ pi-coding-agent SDK ──► LLM provider
```

- `lib/storage/kanbanStore.ts` — the single Zustand store with all entities and
  cascading deletes.
- `lib/hooks/*` — thin wrappers around the store that keep the same API as the
  previous React Query hooks so existing components don't need to change.
- `app/api/agent/route.ts` — the only server route. Two modes:
  - `mode: "plan"` — single-shot JSON response with phase + vision extraction
  - `mode: "chat"` — SSE stream of token deltas + final `complete` event

## Notes / limitations

- The agent does **not** have filesystem or shell tools enabled in this POC. It
  only generates text (and proposes structured task mutations the user approves
  in the UI).
- Status lifecycle is enforced client-side in `useUpdateTask` /
  `MissionControlTemplate`.
- Auto mode in Mission Control still works but advances tasks heuristically since
  the agent cannot mutate the local store directly.
