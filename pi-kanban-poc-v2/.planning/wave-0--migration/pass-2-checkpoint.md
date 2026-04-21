# Pass 2 Checkpoint — Isolation (Storage, Identity, Env)

**Date:** 2026-04-21
**Status:** ✅ PASS

## What was done

### Storage namespace isolation (4 keys changed)

| Key | Old (v1) | New (v2) |
|---|---|---|
| Main store | `pi-kanban-poc:store-v3` | `pi-kanban-poc-v2:store-v1` |
| Breakdown hint | `pi-kanban-poc:breakdown-hint-dismissed` | `pi-kanban-poc-v2:breakdown-hint-dismissed` |
| Onboarding flag | `pi-kanban-poc:onboarding-seen` | `pi-kanban-poc-v2:onboarding-seen` |
| Agent timings | `pi-kanban-poc:agent-timings` | `pi-kanban-poc-v2:agent-timings` |

### Store migration version reset

- Version reset from `4` to `1`
- Complex v1→v2→v3→v4 migration function replaced with a simple pass-through
- v2 starts fresh; it will never encounter v1 persisted state

### Identity changes

- `package.json` name: `pi-kanban-poc` → `pi-kanban-poc-v2`
- `app/layout.tsx` metadata title: `Personal Kanban` → `Personal Kanban v2`
- `README.md`: fully rewritten for v2 with accurate env docs, storage key, and all 5 agent modes documented

### What was NOT changed

- No route changes
- No domain type changes
- No agent contract changes
- No feature behavior changes
- No file moves or reorganization

## Files changed in this pass

1. `package.json` — name field
2. `lib/storage/kanbanStore.ts` — store key, version, migrate function, breakdown hint keys
3. `lib/onboarding.ts` — onboarding flag key
4. `lib/timing.ts` — timing storage key
5. `app/layout.tsx` — metadata title
6. `README.md` — full rewrite

## Verification

- [x] `npm run build` succeeds after all changes
- [x] `npm run dev` boots and `/` renders
- [x] zero remaining `pi-kanban-poc:` references in app source code (confirmed via grep)
- [x] all localStorage keys are namespaced to `pi-kanban-poc-v2:*`

## Isolation not yet verified in-browser

The following require browser-level testing (Pass 3):

- [ ] v1 and v2 running side by side show independent empty states
- [ ] creating a project in v2 does not appear in v1
- [ ] clearing v2 storage does not affect v1

## Next

Pass 3: Full smoke verification. **Awaiting signal.**
