# 02 — Compatibility Contract

## Purpose

This document defines what should remain stable during the **initial conservative fork** from `pi-kanban-poc/` to `pi-kanban-poc-v2/`.

The goal is to prevent the migration from quietly becoming a redesign.

## Rule of thumb

If changing something would force us to re-validate most of the product manually, it is probably part of the compatibility contract and should stay stable in the first migration wave.

## Compatibility scope

### 1. Product behavior contract
The following user-visible flows should behave substantially the same in the initial v2 baseline:

- dashboard opens and lists projects
- creating a project works
- importing project content seeds planning
- onboarding/example path still works if carried over
- planning thread auto-creation still works
- planning messages can be sent and agent replies are persisted
- question batches still render and submit
- phase transition prompts still work
- task proposals can still be approved/dismissed
- mission control displays approved tasks
- kanban task status transitions still work
- task chat still works
- breakdown/doer/reviewer flows still work
- summary/directory/hub surfaces still render meaningful data

The exact folder layout may change; these behaviors should not change in the fork baseline.

### 2. Route contract
These routes should remain functionally present in the first v2 baseline:

- `/`
- `/planning/[id]`
- `/mission-control/[id]`
- `/chat/[id]`
- `/summary/[id]`
- `/directory`
- `/hub`

Optional/non-core routes such as `/components` can be deferred, but should not be deleted casually without an explicit decision.

### 3. Domain model contract
The initial v2 baseline should preserve the semantics of the current core types in `types/domain.ts`, including:

- `Project`
- `Task`
- `Subtask`
- `Conversation`
- `PlanningThread`
- `PlanningMessage`
- `VisionVersion`
- `AgentEnvelope`
- `DoerEnvelope`
- `ReviewerEnvelope`
- `BreakdownEnvelope`
- `TaskActivityEntry`
- `CachedBreakdown`

This does not require keeping the exact file untouched forever. It does require preserving meaning and payload shape initially.

### 4. Store contract
The initial v2 baseline should preserve the observable behavior of the main store actions and selectors in `lib/storage/kanbanStore.ts`.

Especially high-risk actions include:

- project creation/update/delete
- task creation/update/delete/restore/reorder
- subtask creation/update/delete/restore
- planning thread/message creation and update
- vision version creation/restore/publish
- activity logging
- doer/reviewer persistence helpers
- cached breakdown persistence helpers
- reset and rehydration behavior

The store may be moved or wrapped later, but this contract should remain stable in the baseline fork.

### 5. Agent API contract
The initial v2 baseline should preserve the request/response behavior of `POST /api/agent` for these modes:

- `plan`
- `chat`
- `breakdown`
- `doer`
- `reviewer`

That includes, at minimum:

- accepted request payload shapes
- structured response envelope semantics
- SSE behavior for chat mode
- timeouts and error handling behavior at a functional level

The route implementation can be refactored internally later, but these external behaviors should remain stable during the first fork.

### 6. Local-first architecture contract
The initial v2 baseline should preserve these architectural assumptions:

- app state is persisted in browser localStorage
- there is no required database
- the app remains runnable with `npm install` + `npm run dev`
- planning and execution flows still depend on the browser-local store as the source of truth

## Intended incompatibility: persistence isolation

One change is explicitly recommended in the first fork:

### v2 should not share browser persistence state with v1
That means v2 should use a different localStorage namespace/key.

Reason:

- prevents cross-app contamination
- makes verification more trustworthy
- avoids accidental breakage from future schema drift
- avoids hidden coupling between colleague-owned v1 and your v2 branch of work

This is an intentional compatibility break at the storage boundary, and it is desirable.

## Things allowed to change early

The following may change during the first migration wave without violating the compatibility contract, as long as behavior remains stable:

- folder layout
- internal module locations
- naming of private helper files
- where prompt builders live
- where feature-specific components live
- how imports are organized
- how docs describe the app
- package name/app title/branding details needed to distinguish v2

## Things that should not change early

Avoid changing these in the baseline fork:

- route semantics
- planning phase meanings
- task lifecycle semantics
- structured AI response contracts
- the persistence model itself
- status transition rules
- approval flows for tasks/subtasks
- published-vision semantics
- hub/directory data expectations

## Compatibility test question

For any proposed migration step, ask:

> If this change breaks, will I need to manually retest half the product?

If yes, the change is probably touching the compatibility contract and should either:

- be deferred
- be isolated more carefully
- or be treated as an explicit post-baseline redesign step

## Summary

The first v2 milestone is **behavioral continuity plus isolation**, not conceptual cleanup perfection.

The compatibility contract exists so that later reorganization has a stable reference point.
