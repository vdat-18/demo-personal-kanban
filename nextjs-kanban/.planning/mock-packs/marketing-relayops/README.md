# RelayOps Marketing Mock Pack

This pack is the first full mock-pack implementation for the maintained `nextjs-kanban` app. It turns the RelayOps marketing scenario into deterministic planning, task, and QA artifacts that match the current product model rather than the older lemonade workflow.

## Scenario Identity

- Pack ID: `pack_marketing_relayops_v1`
- Company: `RelayOps`
- Project: `RelayOps Audit Assistant Content Engine`
- Domain: `MARKETING`
- Planning week: `2026-04-06` through `2026-04-10`
- Content engine window: `2026-04-20` through `2026-06-12`
- Canonical project key: `proj_marketing_relayops_001`
- App project UUID: `11111111-1111-4111-8111-111111111111`
- App planning thread UUID: `22222222-2222-4222-8222-222222222222`

## Human Actors

| Canonical ID | Name | Role |
| --- | --- | --- |
| `usr_001` | Maya Chen | Head of Marketing |
| `usr_002` | Priya Nwosu | Product Marketing Manager |
| `usr_003` | Elena Brooks | Content Lead |
| `usr_004` | Samir Patel | Sales Enablement Manager |

## Agent Actors

| Canonical ID | App role | Scenario use |
| --- | --- | --- |
| `agt_001` | `architect` | planning lead and task-generation agent |
| `agt_002` | `reviewer` | deliverable-quality gate for briefs and trackers |
| `agt_003` | `developer` | optional task-level execution helper in chat |

## Folder Layout

- `tutorial/` holds the scenario narrative as seed data, planning chat, board states, source documents, and sample deliverables.
- `unit/` holds deterministic entities, unit-style fixtures, and route-shaped mock API responses.
- `functional/` holds journey scenarios, a Gherkin feature, and a compact test matrix.

## Current-App Semantics

- Planning is phase-based: `discovery` -> `blueprint` -> `task_mapping`.
- The pack does not invent a board-lock API. Instead, the planner withholds the recommendation to enter `task_mapping` until the launch brief, audience, primary message, and KPI target are explicit.
- Review is modeled as reviewer behavior, not as a hard route constraint. A task can reach `IN_REVIEW`, but the scenario expects a reviewer to send it back if artifact evidence is weak or missing.
- Task statuses match the maintained app exactly: `TODO`, `IN_PROGRESS`, `IN_REVIEW`, `DONE`, `BLOCKED`.
- The blocked-task recovery path also matches the app lifecycle: `BLOCKED` restores to `TODO`, not directly to `IN_PROGRESS` or `DONE`.

## Intended Uses

- internal product inheritance and alignment
- demo scripting for planning -> task generation -> mission control
- fixture seeding for future local dev data
- API mock data for frontend work
- QA regression scenarios grounded in realistic marketing content artifacts

## Notes

- The uploaded documents and deliverables are mock assets for scenario realism. They are not evidence that the current product already stores these as first-class objects.
- The canonical IDs in this pack stay stable even where the live app would use UUIDs. Where route-shaped examples need UUIDs, the mapping is recorded in the JSON fixtures.
