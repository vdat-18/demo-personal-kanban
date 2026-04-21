# 05 — Manual Smoke Checklist

## Purpose

Use this checklist after each meaningful migration wave.

Primary gates:

- app runs
- build succeeds
- core user flows still work
- v2 is isolated from v1 browser state

## Baseline technical checks

### Install
- [ ] `npm install` succeeds in `pi-kanban-poc-v2/`

### Dev boot
- [ ] `npm run dev` starts successfully
- [ ] app opens in the browser

### Build
- [ ] `npm run build` succeeds

### Storage isolation
- [ ] v2 does not show v1 projects by default
- [ ] creating a project in v2 does not make it appear in v1
- [ ] clearing v2 state does not clear v1 state

---

## Dashboard and project bootstrap

### Project listing
- [ ] dashboard loads
- [ ] project grid renders

### Create project
- [ ] creating a project works
- [ ] created project opens planning route

### Delete project
- [ ] delete confirmation appears
- [ ] deleting a project removes it from the dashboard

### Import flow
- [ ] import flow opens
- [ ] imported project is created
- [ ] imported content seeds the first planning thread/user message

### Onboarding
- [ ] onboarding/example flow still opens if preserved
- [ ] example project renders coherent planning data

---

## Planning

### Thread lifecycle
- [ ] first planning thread auto-creates when needed
- [ ] creating a new thread works
- [ ] deleting a thread works
- [ ] renaming a thread works

### Messaging
- [ ] user message sends successfully
- [ ] assistant response appears
- [ ] planning assistant response is persisted after refresh

### Structured planning behavior
- [ ] question batch cards render
- [ ] answering a batch submits correctly
- [ ] phase transition card renders when appropriate
- [ ] accept/reject phase transition works
- [ ] task proposal cards render
- [ ] approving a task proposal creates a mission-control task
- [ ] dismissing a task proposal persists correctly

### Vision doc
- [ ] vision document appears when generated
- [ ] direct vision edit works
- [ ] version history drawer opens
- [ ] restoring a version works
- [ ] publishing a version works

### Attachments
- [ ] file attach UI works
- [ ] text-like attachments are included in planning
- [ ] image attachments do not crash the flow

---

## Mission control

### Board
- [ ] mission control loads for the project
- [ ] approved tasks appear on the board
- [ ] columns render correctly

### Task status changes
- [ ] valid drag/drop transitions work
- [ ] invalid transitions are blocked
- [ ] add-task dialog works
- [ ] blocking/cancel flow works

### Footer/header behavior
- [ ] token usage area renders without breaking layout
- [ ] close project / summary navigation still works

---

## Breakdown / Doer / Reviewer

### Breakdown
- [ ] step planner / breakdown flow runs
- [ ] suggested subtasks render
- [ ] approving suggested subtasks persists them
- [ ] cached breakdown behavior does not regress

### Doer
- [ ] doer action can generate an artifact for a subtask
- [ ] doer result is persisted
- [ ] mark-complete flow works when applicable

### Reviewer
- [ ] reviewer action can generate a review
- [ ] reviewer result is persisted
- [ ] task approval / change-request behavior still works

---

## Task chat and summary

### Chat
- [ ] task chat page loads
- [ ] conversation history renders
- [ ] streaming chat response completes

### Summary
- [ ] summary page loads
- [ ] subtasks and artifacts render
- [ ] summary still reflects prior work after refresh

---

## Directory and hub

### Directory
- [ ] directory page loads
- [ ] projects/tasks display correctly

### Hub
- [ ] published plans appear in the hub
- [ ] search/filter still works
- [ ] links back into project/planning still work

---

## Persistence and refresh behavior

- [ ] refresh does not lose normal project state
- [ ] planning threads/messages survive refresh
- [ ] tasks survive refresh
- [ ] subtasks and doer/reviewer artifacts survive refresh
- [ ] published plan state survives refresh

---

## Regression notes section

When running the checklist, record:

- date/time checked
- branch/commit or milestone
- what failed
- whether the failure is a migration regression or pre-existing behavior

Suggested log format:

```text
Date:
Milestone:
Checked by:
Failures:
Notes:
```
