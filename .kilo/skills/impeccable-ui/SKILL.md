---
name: impeccable-ui
description: Project wrapper around the vendored upstream Impeccable design skill, narrowed to practical use in pi-kanban-poc.
---

# Impeccable UI

This project vendors the real upstream `impeccable` repository at:

`vendor/impeccable`

Use the upstream skill as the primary design vocabulary and guardrail source:

- `vendor/impeccable/source/skills/impeccable/SKILL.md`
- `vendor/impeccable/source/skills/impeccable/reference/typography.md`
- `vendor/impeccable/source/skills/impeccable/reference/color-and-contrast.md`
- `vendor/impeccable/source/skills/impeccable/reference/spatial-design.md`
- `vendor/impeccable/source/skills/impeccable/reference/motion-design.md`
- `vendor/impeccable/source/skills/impeccable/reference/interaction-design.md`
- `vendor/impeccable/source/skills/impeccable/reference/responsive-design.md`
- `vendor/impeccable/source/skills/impeccable/reference/ux-writing.md`

## Project-Specific Overlay

Apply upstream `impeccable` guidance through the product constraints of `pi-kanban-poc`:

- prefer clarity and readability over visual spectacle
- planning surfaces should feel operational, not marketing-heavy
- revision views should feel document-first
- avoid AI-slop patterns, especially card nesting and decorative gradients
- preserve the current product tone: calm, structured, practical

## High-Priority Screens

- `pi-kanban-poc/components/planning/PlanningClient.tsx`
- `pi-kanban-poc/components/molecules/VisionPanel.tsx`
- `pi-kanban-poc/components/molecules/VisionHistoryDrawer.tsx`
- `pi-kanban-poc/components/molecules/TaskProposalCard.tsx`
- `pi-kanban-poc/components/templates/MissionControlTemplate.tsx`

## Important Constraint

Do not blindly copy the more extreme visual recommendations from upstream `impeccable`.
Adapt them to this repo's product type:

- workbench-like
- information-dense
- non-technical user friendly
- polished, but not theatrical
