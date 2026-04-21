# Wave 0 — Migration Planning

This folder contains the planning artifacts for migrating `pi-kanban-poc/` into a new, independent `pi-kanban-poc-v2/`.

## Decision already made

We are taking a **conservative fork** approach:

- copy first
- preserve behavior first
- reorganize second
- avoid product redesign during the migration itself

## What Wave 0 covers

Wave 0 is planning-only. No application code is created or moved here.

The artifacts in this folder are meant to answer:

1. what exists today
2. what must stay stable during the fork
3. where the migration risk really is
4. how to execute the migration in safe waves
5. how to verify that v2 still works

## Artifacts

- `00-charter.md` — migration charter, scope, success criteria
- `01-current-system-map.md` — architecture and feature map of the current POC
- `02-compatibility-contract.md` — what must remain stable in the initial fork
- `03-migration-phases.md` — recommended execution order for the migration
- `04-risk-register.md` — main risks, signals, and mitigations
- `05-manual-smoke-checklist.md` — manual verification checklist for v2
- `06-open-questions.md` — unresolved decisions to settle before or during Wave 1

## Source inspected

Planning was based on direct inspection of the current `pi-kanban-poc/` codebase, including:

- `README.md`
- `package.json`
- `app/api/agent/route.ts`
- `lib/storage/kanbanStore.ts`
- route pages under `app/(routes)/...`
- feature hooks under `lib/hooks/...`
- domain types in `types/domain.ts`

## Current recommendation

Start Wave 1 only after agreeing on:

- the v2 isolation boundary
- the initial target folder organization
- whether v2 should intentionally ignore v1 browser state

Default recommendation: **v2 should be isolated from v1 browser state** and should not promise storage migration in the first implementation wave.
