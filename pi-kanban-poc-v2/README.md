# pi-kanban-poc-v2

A conservative fork of `pi-kanban-poc/` for independent development.

Next.js + React kanban app where the agent backend is `@mariozechner/pi-coding-agent`
and **all data lives in browser localStorage**. No database, no Docker, just `npm` + a
terminal.

## What's inside

- **Next.js 16** (App Router, Turbopack) + React 19 + TailwindCSS 4
- **Zustand** persisted to `localStorage` for projects, tasks, conversations,
  planning threads, and planning messages
- **TanStack React Query** kept around for component compatibility, but all queries
  resolve synchronously from the local store
- **`@mariozechner/pi-coding-agent`** SDK exposed through a single `/api/agent` route
  for planning (JSON response), chat (SSE stream), breakdown, doer, and reviewer modes

## Prerequisites

- Node.js 20+
- LLM provider credentials in `.env` or `.env.local`:
  - `TROLLLLM_API_KEY` — API key for the OpenAI-compatible provider
  - `TROLLLLM_BASE_URL` — provider endpoint (defaults to `https://chat.trollllm.xyz/v1`)
  - `TROLLLLM_MODEL` — model identifier (defaults to `gpt-5.4`)

## Run

```bash
npm install
npm run dev
```

Then open http://localhost:3000.

To run on a different port:

```bash
PORT=3007 npm run dev
```

## Browser state

All project data is stored in your browser's localStorage under the key
`pi-kanban-poc-v2:store-v1`.

To reset all data, run this in the browser console:

```js
localStorage.removeItem('pi-kanban-poc-v2:store-v1')
```

Then refresh the page.

**Note:** This app uses a separate storage namespace from the original `pi-kanban-poc`.
The two apps do not share browser state.

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
- `app/api/agent/route.ts` — the only server route. Five modes:
  - `mode: "plan"` — single-shot JSON response with phase + vision extraction
  - `mode: "chat"` — SSE stream of token deltas + final `complete` event
  - `mode: "breakdown"` — subtask generation for a single task
  - `mode: "doer"` — structured execution artifact for a subtask
  - `mode: "reviewer"` — structured quality review for a task

## Notes / limitations

- The agent does **not** have filesystem or shell tools enabled. It only generates
  text (and proposes structured task mutations the user approves in the UI).
- Status lifecycle is enforced client-side in `useUpdateTask` /
  `MissionControlTemplate`.
- Auto mode in Mission Control still works but advances tasks heuristically since
  the agent cannot mutate the local store directly.
