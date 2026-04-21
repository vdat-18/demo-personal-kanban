# 00 — Migration Charter

## Objective

Create `pi-kanban-poc-v2/` as an **independent fork** of `pi-kanban-poc/` that:

- runs on its own
- preserves current user-visible behavior for the main flows
- creates space for cleaner organization and future development
- avoids entangling v2 with the original folder owner's workflow

## Why this migration exists

The current POC is functional and already has meaningful product behavior, but it has several characteristics that make future development harder:

- the app is tightly coupled around one large client-side store
- many features reach directly into the store instead of going through narrow boundaries
- the unified agent route contains multiple responsibilities in one file
- there are signs of evolutionary overlap and compatibility scaffolding
- documentation has drifted from the code in a few important places

The goal of v2 is **not** to redesign the product immediately. The goal is to create an isolated base that is safer to extend.

## Scope for the migration

### In scope

- create an independent `pi-kanban-poc-v2/`
- preserve existing route-level behavior for core flows
- preserve the local-first architecture
- preserve the current domain model initially
- preserve the `/api/agent` contract initially
- reorganize files and modules incrementally after baseline parity is established
- improve clarity of module boundaries and ownership

### Out of scope for the initial migration

- redesigning the planning UX
- replacing localStorage with a database
- changing the agent behavior model or prompt contracts on day one
- changing route semantics or navigation semantics on day one
- broad lint cleanup unrelated to migration safety
- framework upgrades unrelated to migration safety
- introducing a new backend architecture
- data migration from v1 browser storage unless explicitly added later as a feature

## Primary success criteria

The migration is successful when all of the following are true:

1. `pi-kanban-poc-v2/` installs, runs, and builds independently.
2. v2 does not accidentally share browser persistence state with v1.
3. Core flows still work:
   - dashboard and project creation
   - planning
   - task approval into mission control
   - mission control task execution flow
   - summary and directory/hub read surfaces
4. Internal organization is clearer than v1, without requiring a product rewrite.
5. The migration leaves a stable base for future changes.

## Secondary success criteria

- route entry points are easy to locate
- feature ownership is easier to explain
- server-side agent code is easier to split later
- store usage is easier to audit later
- future work can be planned by feature instead of by file scavenging

## Non-goals disguised as goals

These may feel tempting during implementation, but they are not baseline migration goals:

- “fix every lint error while we are here”
- “replace Zustand with something cleaner”
- “normalize all data and split the store now”
- “rewrite the planning flow from scratch”
- “remove every possibly-unused file before we understand it”

## Principles

### 1. Preserve behavior before improving structure
The first safe move is a faithful fork, not a structural rewrite.

### 2. Freeze high-coupling contracts early
The store contract, route semantics, and agent payloads should be treated as stable until v2 has a working baseline.

### 3. Reorganize by feature slice, not by aesthetics
Moving folders around without clarifying ownership is churn, not progress.

### 4. Prefer reversible steps
Every migration wave should be small enough that breakage can be localized.

### 5. Do not trust documentation over code
Current documentation is useful but not always current. Code is the source of truth.

## Assumptions for planning

- v2 should remain a Next.js app using the same basic stack initially.
- v2 should remain local-first with browser persistence in the first wave.
- v2 should preserve the current agent capabilities and limitations initially.
- v2 does not need to import existing v1 browser state in the first wave.
- current build behavior is a better baseline signal than current lint status.

## Wave 0 exit criteria

Wave 0 is complete when:

- migration scope is written down
- the current system has been mapped
- compatibility boundaries are explicit
- migration phases are sequenced
- the main risks are documented
- a manual smoke checklist exists

This folder is intended to satisfy those exit criteria.
