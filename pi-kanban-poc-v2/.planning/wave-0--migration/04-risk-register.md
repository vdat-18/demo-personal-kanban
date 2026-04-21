# 04 — Risk Register

## Purpose

This register lists the main migration risks, why they matter, and how to reduce them.

## Risk scale

- **Likelihood**: Low / Medium / High
- **Impact**: Low / Medium / High

---

## R1 — Shared browser persistence between v1 and v2

- Likelihood: High
- Impact: High

### Why it matters
If both apps read/write the same localStorage key, test results become unreliable. One app can appear broken because the other app mutated persisted state unexpectedly.

### Signals

- v2 shows projects created in v1
- clearing state in one app changes the other app
- migration debugging feels inconsistent across refreshes

### Mitigation

- use a new storage key/namespace in v2
- treat storage isolation as a Wave 1 must-have
- verify with manual before/after checks in the browser

---

## R2 — Store contract drift

- Likelihood: High
- Impact: High

### Why it matters
The app is heavily coupled to `useKanbanStore(...)`. Small changes to entity shape or action behavior can ripple into multiple unrelated surfaces.

### Signals

- tasks disappear from some views but not others
- planning thread state updates inconsistently
- restore/delete/reorder behavior regresses
- summary/directory views lag behind execution flows

### Mitigation

- freeze store behavior in the baseline fork
- avoid redesigning the store in Wave 1
- introduce wrappers before splitting internals
- retest all affected flows after any store-facing change

---

## R3 — Agent contract drift

- Likelihood: Medium
- Impact: High

### Why it matters
`/api/agent` is used in different modes with different payload expectations. A subtle contract change can break planning, streaming chat, breakdown, or review flows.

### Signals

- assistant replies render but actions disappear
- phase transitions stop being recognized
- SSE chat stalls or never completes
- doer/reviewer fallback logic starts triggering unexpectedly

### Mitigation

- preserve request/response behavior in the first fork
- avoid changing prompt contracts in the baseline migration
- test one direct request per important mode when needed

---

## R4 — Misidentifying live vs legacy code

- Likelihood: Medium
- Impact: High

### Why it matters
Some files appear overlapping or evolutionary. Deleting or “cleaning up” something before confirming usage can silently break routes.

### Signals

- route compiles but behavior changes unexpectedly
- a route starts rendering an older/partial flow
- imports reveal hidden dependencies after a move

### Mitigation

- map route entry points first
- verify with search/import graph before deletion
- treat ambiguous files as live until disproven

---

## R5 — Navigation inconsistency becoming worse during migration

- Likelihood: Medium
- Impact: Medium

### Why it matters
Navigation already references routes that were not found during inspection (`/timeline`, `/insights`). A reorg can make this drift worse if route ownership is unclear.

### Signals

- nav links break after migration
- app feels partially moved / partially stale
- pages exist but are no longer discoverable

### Mitigation

- explicitly inventory route coverage
- postpone nav cleanup until baseline parity is established
- track route/link mismatches as explicit follow-up work

---

## R6 — Weak safety net from tooling

- Likelihood: High
- Impact: Medium

### Why it matters
`npm run build` succeeds, but `npm run lint` already has many existing failures. That means lint cannot be treated as a reliable regression gate for migration progress.

### Signals

- migration changes are hard to validate automatically
- unrelated lint noise obscures real issues

### Mitigation

- use build + manual smoke testing as primary baseline gates
- avoid bundling unrelated lint cleanup into migration steps
- add focused validation only where it helps migration confidence

---

## R7 — Scope creep into redesign

- Likelihood: High
- Impact: High

### Why it matters
This migration can easily turn into a rewrite if every structural discomfort is treated as a migration requirement.

### Signals

- new data model proposals appear before baseline parity
- route semantics start changing during the fork
- implementation work expands without clear checkpoints

### Mitigation

- keep the charter visible
- enforce the compatibility contract
- explicitly defer deeper redesign ideas to post-baseline waves

---

## R8 — Import/onboarding edge paths get forgotten

- Likelihood: Medium
- Impact: Medium

### Why it matters
These flows may not be used every day, but they seed critical data paths and directly touch planning setup.

### Signals

- imported projects no longer seed the first planning thread correctly
- onboarding example stops loading or looks incomplete

### Mitigation

- include both in the manual smoke checklist
- retest after any dashboard/bootstrap changes

---

## R9 — Summary/directory/hub regressions from indirect data expectations

- Likelihood: Medium
- Impact: Medium

### Why it matters
These surfaces depend on accumulated artifacts and historical state. They often break later than the primary flow that caused the issue.

### Signals

- execution seems fine, but read surfaces appear empty or inconsistent
- published plan history stops appearing in the hub

### Mitigation

- include read surfaces in smoke testing
- verify with a non-trivial project, not only an empty fresh state

---

## R10 — Environment/provider assumptions remain implicit

- Likelihood: Medium
- Impact: Medium

### Why it matters
Current code uses a specific provider configuration model. If v2 documentation or bootstrap assumptions stay vague, local setup becomes fragile.

### Signals

- app boots but AI calls fail in v2
- documentation and code disagree again

### Mitigation

- document actual env requirements in v2
- keep provider behavior stable in the first wave
- verify `/api/agent` once after baseline fork

---

## Top-priority risks for Wave 1

These should be treated as first-wave blockers:

1. R1 — shared browser persistence
2. R2 — store contract drift
3. R3 — agent contract drift
4. R7 — scope creep into redesign

## Summary

The migration risk is mostly about **coupling, hidden assumptions, and low automation**, not exotic technical difficulty.

The safest response is disciplined sequencing, not heroic refactoring.
