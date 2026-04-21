# Pass 3 Checkpoint — Full Smoke Verification

**Date:** 2026-04-21
**Status:** ✅ PASS (with browser-only items deferred)

## Test environment

- v1 running on port 3005
- v2 running on port 3007
- Both running simultaneously during testing

---

## Baseline technical checks

| Check | Result |
|---|---|
| `npm install` | ✅ |
| `npm run dev` boots | ✅ |
| `npm run build` succeeds | ✅ |

## Route smoke test

| Route | v2 Status | v1 Parity |
|---|---|---|
| `/` | 200 ✅ | ✅ matches |
| `/directory` | 200 ✅ | ✅ matches |
| `/hub` | 200 ✅ | ✅ matches |
| `/components` | 200 ✅ | ✅ matches |
| `/planning/[id]` | 200 ✅ (SSR shell) | — |
| `/mission-control/[id]` | 200 ✅ (SSR shell) | — |
| `/chat/[id]` | 200 ✅ (SSR shell) | — |
| `/summary/[id]` | 200 ✅ (SSR shell) | — |

Dynamic routes return the SSR shell (200), then client-side `notFound()` fires after hydration for invalid IDs. This matches v1 behavior.

## Agent API test — all 5 modes

| Mode | HTTP Status | Envelope Valid | Notes |
|---|---|---|---|
| `plan` | 200 ✅ | ✅ questions, content, metadata | Full structured planning response |
| `chat` | 200 ✅ | ✅ SSE stream | `started` → `token` × N → `complete` events verified |
| `breakdown` | 200 ✅ | ✅ taskUnderstanding, confidence | Correctly returned needsHumanInput for vague task |
| `doer` | 200 ✅ | ✅ structured envelope | All expected keys present |
| `reviewer` | 200 ✅ | ✅ structured envelope | All expected keys present |
| (empty body) | 400 ✅ | — | Error handling works |

## Storage isolation verification (source-level)

| Check | Result |
|---|---|
| Zero `pi-kanban-poc:` references in v2 app source | ✅ confirmed via grep |
| All localStorage keys namespaced to `pi-kanban-poc-v2:*` | ✅ 4 keys verified |
| Store version reset to 1 | ✅ |
| Legacy v1 migration code removed | ✅ |

## Identity verification

| Check | Result |
|---|---|
| `package.json` name is `pi-kanban-poc-v2` | ✅ |
| Root layout metadata title is `Personal Kanban v2` | ✅ |
| README accurately describes v2 | ✅ |

---

## Items requiring browser-level verification

These cannot be fully verified via curl/CLI and should be tested manually in a browser:

### Storage isolation (browser)
- [ ] Opening v1 (port 3005) and v2 (port 3007) side by side shows independent empty states
- [ ] Creating a project in v2 does not appear in v1
- [ ] Clearing v2 storage does not affect v1

### Dashboard and project bootstrap
- [ ] Dashboard loads and project grid renders
- [ ] Create project works and opens planning route
- [ ] Delete project confirmation and removal works
- [ ] Import flow creates project and seeds planning
- [ ] Onboarding example opens with coherent data

### Planning
- [ ] First thread auto-creates
- [ ] User message sends, assistant response persists after refresh
- [ ] Question batch cards render and submit
- [ ] Phase transition accept/reject works
- [ ] Task proposal approve/dismiss works and creates tasks
- [ ] Vision document editing and versioning works
- [ ] File attachments work

### Mission control
- [ ] Approved tasks appear on board
- [ ] Drag/drop status transitions work
- [ ] Add task dialog works
- [ ] Close project / summary navigation works

### Breakdown / Doer / Reviewer
- [ ] Breakdown generates subtasks in the UI
- [ ] Doer generates artifacts
- [ ] Reviewer generates reviews

### Chat and summary
- [ ] Task chat streaming works in the UI
- [ ] Summary page renders work artifacts

### Directory and hub
- [ ] Directory shows projects/tasks
- [ ] Hub shows published plans

### Persistence
- [ ] Browser refresh preserves all state

---

## Pre-existing issues (NOT migration regressions)

- `npm run lint` has many existing failures — same as v1, not introduced by migration
- Nav bar links to `/timeline` and `/insights` which have no route pages — same as v1
- Per-page title says "Personal Kanban" not "v2" — cosmetic, per-route metadata overrides root layout

---

## Summary

**All programmatically verifiable checks pass.**

The v2 fork is:
- functionally equivalent to v1 at the route and API level
- fully isolated at the storage namespace level
- independently installable, bootable, and buildable

Browser-level UI flow testing remains the one gap — flagged above as a manual checklist for you to walk through at your convenience.

## Migration Wave 0 status

| Pass | Status |
|---|---|
| Pass 1 — Mechanical copy + boot | ✅ Complete |
| Pass 2 — Isolation | ✅ Complete |
| Pass 3 — Smoke verification | ✅ Complete (browser items deferred) |

**Wave 0 migration is complete. v2 is ready for development.**
