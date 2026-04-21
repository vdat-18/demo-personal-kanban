# 06 — Open Questions

These questions do not block Wave 0 planning, but they should be answered before or during Wave 1 implementation.

## 1. What exact folder organization should v2 target first?

Current recommendation:

- keep the first fork close to v1
- avoid an aggressive tree redesign in the same step as the copy
- only begin feature-slice reorganization after baseline parity is proven

Open point:

- do we want the first visible reorg target to be `features/...`, or do we want one smaller intermediate cleanup first?

## 2. Should v2 intentionally ignore all existing v1 browser state?

Recommendation: **yes**.

Reason:

- isolation is more valuable than continuity during the initial fork
- state migration can be added later if it becomes useful

Open point:

- do we want a future optional import/export bridge between v1 and v2?

## 3. Should v2 keep the current route surface exactly, including the component showcase route?

Recommendation:

- keep core routes exactly
- defer judgment on non-core routes until route inventory is complete

Open point:

- should `/components` be preserved as-is, moved, or dropped later?

## 4. How much cleanup is allowed during Wave 1?

Recommendation:

- only the cleanup necessary to make v2 independent and understandable
- no opportunistic lint crusade
- no architectural rewrites hidden as cleanup

Open point:

- do you want strict minimal-change Wave 1, or are a few obvious naming/docs cleanups acceptable if they do not affect behavior?

## 5. Should the provider/env setup remain exactly as-is initially?

Recommendation: **yes**.

Reason:

- changing AI provider assumptions at the same time as the fork multiplies debugging complexity

Open point:

- do you already expect v2 to use a different provider or model soon after baseline fork?

## 6. What should count as “reorganization success” for v2?

Possible outcomes:

- route files become thinner
- feature ownership becomes obvious
- future changes stop requiring edits across many folders
- store and agent code become easier to split later

Open point:

- which of those outcomes matters most to you personally for v2?

## 7. Should Wave 1 also fix obvious documentation drift?

Examples already observed in v1:

- README env/provider description does not fully match code
- README storage key does not match actual store key
- README agent mode list is incomplete

Recommendation:

- yes, but only as documentation corrections after baseline parity, not as behavior changes

## 8. Should we preserve navigation links that do not currently map to discovered routes?

Observed nav entries include `/timeline` and `/insights`, but those route pages were not found during inspection.

Open point:

- should these links be preserved temporarily, removed later, or treated as placeholders to restore in v2?

## 9. How do you want to checkpoint migration progress?

Possible options:

- planning docs only in `.planning/wave-*`
- git commits per wave
- both docs and milestone commits

Recommendation:

- both, once implementation starts

## 10. What is the first reorganization target after the fork baseline?

Candidates:

- split server agent route by mode
- move planning into a `features/planning` slice
- move mission control into a `features/mission-control` slice
- introduce store-access wrappers/selectors before moving features

Recommendation:

- planning feature slice is probably the best first target after baseline parity, because it is the richest user flow and the clearest place where feature ownership can be made more legible.
