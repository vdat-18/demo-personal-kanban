# Three Domain Demo/Test Scenario Specs

This document defines three example scenario packs for the maintained `nextjs-kanban` application.

These are intentionally:

- current-product-first
- dual-use for demo walkthroughs and later fixture creation
- medium depth
- structured after the lemonade mock-data pack, but adapted to the app as it works today

The scenarios are not full mock packs yet. They are decision-complete scenario specs that can later be converted into:

- seed data
- uploaded document samples
- functional QA scenarios
- demo scripts

## Shared Pack Contract

Every scenario in this document uses the same shape:

- company and project shell
- business goal and background story
- 2-4 named human stakeholders
- 5-7 uploaded context files
- planning unlock requirements and blocker cases
- 6-8 generated tasks, all beginning in `TODO`
- logical sequencing dependencies
- required deliverables
- one core happy path
- one planning blocker path
- one review/acceptance gate

Important constraints for all three:

- Status language matches the current app: `TODO`, `IN_PROGRESS`, `IN_REVIEW`, `DONE`, `BLOCKED`
- Dependencies described here are logical sequencing rules for the scenario, not app-enforced persistent dependencies
- Uploaded documents are part of the scenario contract even though the current product does not fully operationalize document ingestion end to end

## Portfolio Overview

| Domain | Company | Primary Story | Main Planning Blocker | Representative Deliverable |
| --- | --- | --- | --- | --- |
| Marketing | RelayOps | Build an 8-week launch content engine for a B2B SaaS module | Missing launch brief or missing KPI target | Approved editorial calendar and content briefs |
| Sales | Northstar Talent | Enter a new staffing market with a focused employer pipeline | Missing recruiter capacity or serviceable role coverage | Top-30 account list plus 60-day pipeline forecast |
| Logistics | ParcelNest Retail | Open a second fulfillment hub before peak season | Missing cutover checklist or carrier readiness details | Cutover runbook and launch readiness tracker |

---

## Scenario 1: Marketing - RelayOps B2B SaaS Content Engine

### Project Shell

- Domain: `MARKETING`
- Project name: `RelayOps Audit Assistant Content Engine`
- Short description: Build an 8-week launch-oriented content plan for a new compliance automation module.
- Goal: Support launch messaging, demand generation, and reusable content production for a mid-market operations audience.
- Primary success signal: Marketing leadership approves the message architecture, editorial calendar, and KPI framework needed to begin execution.

### Background Story

RelayOps is a B2B SaaS company preparing to launch `Audit Assistant`, a compliance automation module for mid-market operations teams. Product momentum is strong, but marketing execution is fragmented. SEO topics have grown opportunistically, webinar messaging does not match the website, and sales says prospects hear different value propositions depending on who they speak with.

Leadership wants an 8-week content engine that is tight enough for launch and reusable enough for the quarter after launch. The team does not want "more content"; it wants a coherent system that turns shared context into aligned briefs, a realistic publishing cadence, and measurable outcomes.

### Human Stakeholders

| Name | Role | What they care about |
| --- | --- | --- |
| Maya Chen | Head of Marketing | Overall launch coherence, KPI accountability, executive confidence |
| Priya Nwosu | Product Marketing Manager | Core audience definition, message hierarchy, launch narrative |
| Elena Brooks | Content Lead | Editorial feasibility, brief quality, publishing workflow |
| Samir Patel | Sales Enablement Manager | Alignment between published content and live sales conversations |

### Uploaded Context Packet

| File | Type | Why it exists | Expected planning use |
| --- | --- | --- | --- |
| `brand_messaging_framework.md` | Markdown | Existing positioning language, value pillars, approved terminology | Ground the messaging matrix and avoid off-brand content directions |
| `launch_brief_audit_assistant.md` | Markdown | Core launch brief for the new module | Confirm target audience, release context, scope, and primary business outcome |
| `icp_interview_notes.csv` | CSV | Structured customer and prospect interview takeaways | Identify pain points, buying triggers, and language patterns |
| `keyword_gap_analysis.csv` | CSV | SEO comparison against priority competitors | Select topic clusters and search opportunities |
| `competitor_content_teardown.md` | Markdown | Notes on how competitors frame similar problems | Distinguish positioning and identify differentiation angles |
| `webinar_and_blog_performance.csv` | CSV | Recent content performance by format and topic | Choose realistic channel mix and calendar priorities |
| `common_sales_objections.md` | Markdown | Objections heard by revenue teams during demos and calls | Ensure content addresses friction points that matter in pipeline conversations |

### Planning Unlock Contract

The planner should not recommend board/task generation until all of the following are explicit:

- core audience definition
- primary product message
- content KPI target
- launch scope and time horizon

The planning conversation is expected to reference these documents directly:

- `launch_brief_audit_assistant.md`
- `brand_messaging_framework.md`
- `icp_interview_notes.csv`
- `keyword_gap_analysis.csv`
- `webinar_and_blog_performance.csv`
- `common_sales_objections.md`

### Main Planning Blocker

The primary negative path is one of:

- the launch brief is missing, so the team cannot align on scope
- the KPI target is missing, so the planner cannot justify content priorities or cadence

Expected planner behavior in the blocker path:

- state that context is still incomplete
- ask for the missing launch brief or KPI target explicitly
- keep the board locked

### Generated Task Map

All generated tasks begin in `TODO`.

| ID | Task | Priority | Logical depends on | Required deliverable before `IN_REVIEW` |
| --- | --- | --- | --- | --- |
| M1 | Define target audience and launch success metrics | HIGH | None | Audience definition and KPI statement |
| M2 | Approve the launch messaging matrix | CRITICAL | M1 | Messaging matrix with primary message, proof points, and objection handling |
| M3 | Select topic clusters and SEO priorities | HIGH | M2 | Prioritized topic-cluster list tied to search demand and product narrative |
| M4 | Build the 8-week editorial calendar | CRITICAL | M3 | Editorial calendar with dates, owners, formats, and channels |
| M5 | Draft 3 priority content briefs | HIGH | M4 | Three approved briefs with audience, angle, CTA, and SME needs |
| M6 | Create the distribution checklist by channel | MEDIUM | M5 | Channel checklist covering website, email, webinar, and sales handoff |
| M7 | Define KPI tracker and reporting cadence | HIGH | M4 | KPI tracker spec and weekly reporting rhythm |

### Required Deliverables

- approved messaging matrix
- 8-week editorial calendar
- 3 priority content briefs
- distribution checklist by channel
- KPI tracker spec

### Core Happy Path

1. Create the marketing project and enter planning.
2. Provide the full context packet, including the launch brief and KPI target.
3. The planner synthesizes audience, message, and channel priorities.
4. Tasks are generated from planning and appear in `TODO`.
5. Move `Draft 3 priority content briefs` through the full lifecycle:
   - `TODO`: confirm brief scope
   - `IN_PROGRESS`: produce draft briefs
   - `IN_REVIEW`: attach the three brief documents
   - `DONE`: content lead approves that the briefs are execution-ready

### Balanced QA Cases

#### Planning blocker case

- Omit `launch_brief_audit_assistant.md` or leave the KPI target undefined.
- Expected result: planner refuses to unlock task generation and asks for the missing business anchor.

#### Review gate case

- Try to move `Draft 3 priority content briefs` to `IN_REVIEW` without attached briefs or equivalent draft output.
- Expected result: the task should be treated as incomplete in the scenario script and sent back for real deliverables.

---

## Scenario 2: Sales - Northstar Talent New Market Push

### Project Shell

- Domain: `SALES`
- Project name: `Northstar Talent Metro Expansion Launch`
- Short description: Build a 60-day go-to-market plan for entering a new staffing market.
- Goal: Identify priority employers, confirm serviceable coverage, and produce an initial qualified pipeline.
- Primary success signal: Sales leadership approves the market-entry brief, target-account plan, outreach motion, and operating cadence.

### Background Story

Northstar Talent is a staffing firm that performs well in two existing metros and now wants to expand into a third. Leadership sees demand in light-industrial and customer-support hiring, but the team is split on which employer segments to target first. Some leaders want aggressive volume, while recruiters are concerned that the current team cannot service every role being discussed. Pricing is also under debate because the new market contains both price-sensitive accounts and faster-moving premium employers.

The business needs a disciplined 60-day launch plan, not a vague expansion memo. The scenario should force the planner to reconcile market opportunity, role coverage, recruiter capacity, and margin guardrails before the board unlocks.

### Human Stakeholders

| Name | Role | What they care about |
| --- | --- | --- |
| Daniel Ross | VP Sales | Fast market entry, credible forecast, target-account focus |
| Talia Morgan | Market Expansion Lead | Practical launch sequence, local employer prioritization |
| Irene Park | Senior Recruiter | Realistic serviceability by role family and recruiter load |
| Victor Alvarez | Delivery Operations Manager | Margin protection, placement quality, and execution discipline |

### Uploaded Context Packet

| File | Type | Why it exists | Expected planning use |
| --- | --- | --- | --- |
| `new_market_labor_report.md` | Markdown | Market sizing, employer demand patterns, and local labor trends | Set segment priorities and hiring-volume assumptions |
| `target_employer_universe.csv` | CSV | Raw employer list for the new metro | Build the tiered target-account plan |
| `win_loss_notes.md` | Markdown | Lessons from recent successful and failed pursuits | Sharpen messaging and qualification logic |
| `rate_card_and_margin_guardrails.csv` | CSV | Pricing floors, margin expectations, and exception rules | Keep outreach strategy commercially realistic |
| `recruiter_capacity_roster.csv` | CSV | Current recruiter availability and specialization | Confirm staffing feasibility for the launch |
| `serviceable_role_matrix.csv` | CSV | Which role families can be supported from day one | Prevent overcommitting to unsupported job categories |
| `local_partnership_shortlist.md` | Markdown | Candidate local associations, schools, and referral partners | Create partnership tasks and launch leverage points |

### Planning Unlock Contract

The planner should not recommend board/task generation until all of the following are explicit:

- target employer segment
- serviceable role families
- recruiter capacity limits
- pricing floor / margin guardrails

The planning conversation is expected to reference these documents directly:

- `new_market_labor_report.md`
- `target_employer_universe.csv`
- `recruiter_capacity_roster.csv`
- `serviceable_role_matrix.csv`
- `rate_card_and_margin_guardrails.csv`
- `win_loss_notes.md`

### Main Planning Blocker

The primary negative path is one of:

- missing `recruiter_capacity_roster.csv`
- missing `serviceable_role_matrix.csv`

Expected planner behavior in the blocker path:

- explain that the team cannot responsibly promise coverage without capacity and role-serviceability data
- ask for the missing file explicitly
- keep the board locked

### Generated Task Map

All generated tasks begin in `TODO`.

| ID | Task | Priority | Logical depends on | Required deliverable before `IN_REVIEW` |
| --- | --- | --- | --- | --- |
| S1 | Confirm target segments and role coverage | CRITICAL | None | Market-entry brief with segments, role focus, and launch boundaries |
| S2 | Tier the employer universe into top-30 target accounts | HIGH | S1 | Tiered account list with rationale and owner notes |
| S3 | Align recruiter capacity to launch coverage | CRITICAL | S1 | Capacity plan tied to role families and recruiter load |
| S4 | Approve pricing floor and margin rules for the new market | HIGH | S1 | Pricing decision sheet with guardrails and exception rules |
| S5 | Build outbound outreach sequence and talk tracks | HIGH | S2, S4 | Multi-step outreach sequence and call/email talking points |
| S6 | Build local partnership plan | MEDIUM | S2 | Partnership shortlist with outreach priority and purpose |
| S7 | Produce the 60-day pipeline forecast and weekly operating cadence | CRITICAL | S3, S5, S6 | Forecast sheet plus recurring operating cadence |

### Required Deliverables

- market-entry brief
- tiered top-30 target account list
- outbound outreach sequence
- local partnership shortlist
- 60-day pipeline forecast
- weekly operating cadence

### Core Happy Path

1. Create the sales project and enter planning.
2. Provide the full context packet, especially role coverage, recruiter capacity, and pricing guardrails.
3. The planner aligns market opportunity with serviceability and target selection.
4. Tasks are generated and appear in `TODO`.
5. Move `Build outbound outreach sequence and talk tracks` through the full lifecycle:
   - `TODO`: confirm target-account tiers and pricing constraints
   - `IN_PROGRESS`: create the sequence and talk tracks
   - `IN_REVIEW`: attach the outreach sequence and messaging assets
   - `DONE`: sales leadership approves the outbound package as launch-ready

### Balanced QA Cases

#### Planning blocker case

- Omit `recruiter_capacity_roster.csv` or `serviceable_role_matrix.csv`.
- Expected result: planner states that market entry cannot be responsibly approved because delivery feasibility is still unknown.

#### Review gate case

- Try to move `Build outbound outreach sequence and talk tracks` to `IN_REVIEW` without attached outreach copy or tiered target references.
- Expected result: the task should be treated as incomplete because the sequence cannot be reviewed without concrete assets.

---

## Scenario 3: Logistics - ParcelNest Retail Fulfillment Hub Site Rollout

### Project Shell

- Domain: `LOGISTICS`
- Project name: `ParcelNest East Hub Go-Live`
- Short description: Prepare a second fulfillment hub for pre-peak launch.
- Goal: Stand up the site with synchronized slotting, staffing, carrier, and cutover readiness before demand spikes.
- Primary success signal: Operations leadership approves the cutover runbook, staffing/training plan, carrier readiness, and launch tracker.

### Background Story

ParcelNest Retail is opening a second regional fulfillment hub because the current site is nearing capacity and peak season is approaching. The lease is signed and leadership wants the site live before order volume surges, but the underlying rollout work is still fragmented. The physical layout has not been fully translated into slotting decisions, labor planning is provisional, carrier commitments are not aligned to dock flow, and the WMS cutover checklist is still being revised.

The business needs a go-live plan that is operationally credible, not just optimistic. The scenario should force planning to reconcile floor layout, staffing, system cutover, and transport readiness before tasks are unlocked.

### Human Stakeholders

| Name | Role | What they care about |
| --- | --- | --- |
| Olivia Hart | Operations Director | Peak readiness, launch timing, and risk control |
| Marcus Reed | Site Launch Manager | Cross-functional sequencing and day-one readiness |
| Jae Kim | Warehouse Supervisor | Staffing, training, slotting practicality, and floor execution |
| Sofia Mendes | Carrier and Transport Lead | Carrier commitments, dock schedule feasibility, and cutoff reliability |

### Uploaded Context Packet

| File | Type | Why it exists | Expected planning use |
| --- | --- | --- | --- |
| `holiday_volume_forecast.csv` | CSV | Forecasted order volume by week and service level | Size launch scope and staffing needs |
| `sku_master_top_sellers.csv` | CSV | Fast-moving SKUs and inventory profile | Inform slotting and initial inventory plan |
| `site_floor_plan_and_zones.md` | Markdown | Physical layout, staging zones, and operating constraints | Translate layout into slotting and process tasks |
| `staffing_model.csv` | CSV | Headcount assumptions, shift model, and labor gaps | Validate launch labor plan |
| `carrier_rate_card_and_cutoff_times.csv` | CSV | Carrier options, cutoffs, and service constraints | Build carrier onboarding and dock plan |
| `wms_cutover_checklist.md` | Markdown | System migration steps and operational dependencies | Anchor cutover sequencing and launch gating |
| `go_live_sop_checklist.md` | Markdown | Required SOPs and readiness checks for day one | Ensure launch tasks end in operational controls, not just setup work |

### Planning Unlock Contract

The planner should not recommend board/task generation until all of the following are explicit:

- floor-plan ownership and launch assumptions
- WMS cutover timing
- carrier readiness / cutoff model
- staffing model for day one and first-week ramp

The planning conversation is expected to reference these documents directly:

- `holiday_volume_forecast.csv`
- `site_floor_plan_and_zones.md`
- `staffing_model.csv`
- `carrier_rate_card_and_cutoff_times.csv`
- `wms_cutover_checklist.md`
- `go_live_sop_checklist.md`

### Main Planning Blocker

The primary negative path is one of:

- missing `wms_cutover_checklist.md`
- missing carrier schedule and cutoff details from `carrier_rate_card_and_cutoff_times.csv`

Expected planner behavior in the blocker path:

- explain that the site cannot be scheduled for go-live without system and transport readiness
- request the missing cutover or carrier information explicitly
- keep the board locked

### Generated Task Map

All generated tasks begin in `TODO`.

| ID | Task | Priority | Logical depends on | Required deliverable before `IN_REVIEW` |
| --- | --- | --- | --- | --- |
| L1 | Confirm launch scope, go-live assumptions, and risk thresholds | CRITICAL | None | Launch brief with date assumptions, service-level goals, and hard constraints |
| L2 | Finalize floor layout and slotting plan | HIGH | L1 | Slotting and zone plan tied to SKU velocity and floor constraints |
| L3 | Build equipment and setup checklist | MEDIUM | L2 | Setup checklist with owners and completion criteria |
| L4 | Finalize WMS cutover runbook | CRITICAL | L1 | Cutover runbook with timing, rollback notes, and operational handoffs |
| L5 | Build staffing and training schedule | HIGH | L2, L4 | Staffing roster and training schedule for launch week |
| L6 | Confirm carrier onboarding and dock/cutoff plan | HIGH | L1, L4 | Carrier readiness plan with dock flow and cutoff commitments |
| L7 | Run launch dry-run checklist | HIGH | L3, L5, L6 | Dry-run report with open issues and pass/fail outcome |
| L8 | Finalize launch readiness tracker and go-live risk register | CRITICAL | L7 | Launch tracker and risk register ready for sign-off |

### Required Deliverables

- launch readiness tracker
- slotting / inventory plan
- staffing and training schedule
- carrier onboarding plan
- cutover runbook
- go-live risk register

### Core Happy Path

1. Create the logistics project and enter planning.
2. Provide the full context packet, especially cutover, staffing, and carrier files.
3. The planner aligns layout, labor, systems, and transport sequencing.
4. Tasks are generated and appear in `TODO`.
5. Move `Finalize WMS cutover runbook` through the full lifecycle:
   - `TODO`: confirm dependencies and cutover assumptions
   - `IN_PROGRESS`: write the runbook
   - `IN_REVIEW`: attach the runbook with rollback and handoff detail
   - `DONE`: operations leadership signs off that the cutover plan is executable

### Balanced QA Cases

#### Planning blocker case

- Omit `wms_cutover_checklist.md` or leave carrier cutoff data incomplete.
- Expected result: planner states that launch readiness is not sufficiently grounded to unlock execution.

#### Review gate case

- Try to move `Finalize WMS cutover runbook` to `IN_REVIEW` without a concrete runbook artifact or without rollback/handoff notes.
- Expected result: the scenario treats the task as not review-ready because launch-critical execution detail is missing.

---

## Cross-Scenario QA Coverage

Each of the three scenarios should later support the same baseline test script:

1. Create project in the appropriate domain.
2. Provide the full context packet.
3. Complete planning with enough grounded context for the planner to recommend unlocking the board.
4. Generate tasks and confirm that all tasks begin in `TODO`.
5. Move one representative task through `TODO -> IN_PROGRESS -> IN_REVIEW -> DONE`.
6. Validate that a missing critical planning document blocks board/task generation.
7. Validate that a missing concrete deliverable prevents the representative task from being treated as review-ready in the scenario.

## Notes For Future Fixture Conversion

When these are converted into real seed packs, each scenario should later gain:

- a `project_seed.json`
- document sample files under a scenario-specific `documents/` folder
- a planner-chat transcript
- at least one initial board snapshot
- at least one mid-execution snapshot
- a small set of functional scenario cases

That next step is intentionally out of scope for this document.
