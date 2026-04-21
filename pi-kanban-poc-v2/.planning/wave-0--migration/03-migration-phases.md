# 03 — Migration Phases

## Overview

The migration should proceed in **small, reversible waves**.

Recommended sequence:

1. establish baseline parity in v2
2. isolate v2 from v1 state and identity
3. inventory actual live boundaries
4. reorganize by feature
5. stabilize interfaces for future development
6. defer deeper architectural surgery until after parity

---

## Wave 1 — Independent baseline fork

### Goal
Create a working `pi-kanban-poc-v2/` that behaves like the current app.

### Work included

- copy baseline app structure into v2
- ensure install/run/build works in v2
- isolate browser persistence namespace
- update package/app identity where needed
- verify env assumptions for v2
- verify route-level parity for core flows

### Rules

- do not redesign the product
- do not split the store yet
- do not change agent payload contracts yet
- do not remove suspiciously redundant files until proven safe

### Exit criteria

- v2 runs locally
- v2 builds
- v2 planning works
- v2 mission control works
- v2 does not share localStorage state with v1

---

## Wave 2 — Feature ownership mapping in the live v2 fork

### Goal
Understand what is truly live and what is accidental overlap.

### Work included

- identify route entry points
- identify top-level components per route
- identify hooks used by each feature
- identify direct store access hotspots
- identify which components are legacy vs live vs ambiguous

### Deliverable
A route-to-feature dependency map that future reorganization can follow.

### Exit criteria

- every core route has a known entry chain
- ambiguous overlaps are documented
- direct store hotspots are visible

---

## Wave 3 — Reorganize by feature slice

### Goal
Improve structure without changing product behavior.

### Suggested target shape

Possible direction:

- `app/` for routes only
- `features/planning/...`
- `features/mission-control/...`
- `features/chat/...`
- `features/import/...`
- `features/directory/...`
- `server/agent/...`
- `shared/ui/...`
- `shared/lib/...`
- `state/...`
- `domain/...`

This is a direction, not a mandatory exact tree.

### Important rule
Move consumers and boundaries before changing deep semantics.

For example:

- move planning components into a planning feature folder before changing how planning state works
- move agent prompt/parsing helpers before changing the agent contract
- wrap store access before splitting store internals

### Exit criteria

- feature ownership is clearer
- route files are thinner
- imports are easier to reason about
- app behavior remains stable

---

## Wave 4 — Stabilize seam modules

### Goal
Create clean places to build on in future iterations.

### Seams worth establishing

#### 1. Agent client seam
A client-facing module that owns interaction with `/api/agent`, rather than hand-built fetches being scattered across hooks.

#### 2. Store access seam
Feature-specific selectors/actions or service-style wrappers to reduce direct raw store reads everywhere.

#### 3. Domain seam
A clearly owned home for types, transformations, and invariants.

#### 4. Server seam
A clearer split inside the agent route by mode or concern:

- provider/config
- planning
- streaming chat
- breakdown
- doer
- reviewer
- parsing/normalization

### Exit criteria

- future work can target seams instead of spelunking the whole app
- high-coupling areas are easier to isolate

---

## Wave 5 — Optional deeper cleanup

These are good candidates after the baseline and reorg are stable:

- split `kanbanStore` internally
- reduce React Query compatibility scaffolding if no longer useful
- clean up duplicated or obsolete planning components
- improve lint posture selectively
- document architecture more accurately
- harden route/link consistency

This wave is explicitly optional for migration success.

---

## What not to combine in one wave

Avoid combining all of these at once:

- copy/fork
- storage isolation
n- feature reorg
- store redesign
- route redesign
- lint cleanup
- AI contract changes

That combination creates hard-to-diagnose regressions.

## Recommended working cadence

For each wave:

1. define exact scope
2. make only changes required for that scope
3. run `npm run build`
4. run the manual smoke checklist for impacted flows
5. checkpoint conclusions before starting the next wave

## Suggested checkpoints

- after baseline v2 boots
- after storage isolation is verified
- after route/feature inventory is updated
- after each feature-slice move
- after any internal split of the agent route or store helpers

## Summary

A conservative fork wins by making progress **boring and legible**.

The best migration shape is not the cleverest one. It is the one where each wave can be explained, verified, and rolled forward confidently.
