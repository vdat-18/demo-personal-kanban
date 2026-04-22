---
name: impeccable-ui
description: UI quality rules, anti-pattern guardrails, and practical frontend design guidance for pi-kanban-poc.
---

# Impeccable UI

Use this skill when working on frontend surfaces in `pi-kanban-poc`, especially for:

- planning screens
- import flow
- revision and history views
- mission control and task surfaces
- any UI polish, audit, or layout cleanup work

This skill is inspired by `pbakaus/impeccable`, but adapted for this repo and Kilo Code.

## Core Goal

Improve UI quality without making the product noisy, generic, or overdesigned.

The product should feel:

- clear
- readable
- structured
- intentional
- calm, not flashy

## Design Principles

1. Prioritize readability over decoration.
2. Use hierarchy through typography, spacing, and structure first.
3. Use color as signal, not as default decoration.
4. Keep interaction states obvious and consistent.
5. Make every panel justify its visual weight.
6. Favor simple, direct UX copy.

## What Good Looks Like In This Repo

- Planning feels like a working surface, not a marketing page.
- Revision drafts read like documents, not dense markdown blobs.
- Imported sources, timeline, attention, and task areas feel related, not visually disconnected.
- Buttons say exactly what they do.
- Empty states help the user decide the next action.

## Anti-Patterns To Avoid

- Do not nest cards without a strong reason.
- Do not add gradients just to make things feel "AI".
- Do not rely on muted gray text on tinted backgrounds.
- Do not make every section equally loud.
- Do not add too many badges, pills, or labels that compete for attention.
- Do not use vague CTA copy like "Continue" when a more specific label is possible.
- Do not create heavy panel chrome around lightweight information.
- Do not use motion that distracts from reading or task flow.

## Working Method

When editing UI, review the surface through these lenses:

1. Typography
2. Spacing and grouping
3. Contrast and color meaning
4. Interaction states
5. UX writing
6. Responsive behavior

Prefer surgical changes. Keep the product's existing tone, but make it cleaner and more coherent.

## Repo-Specific Guidance

- `PlanningClient` should remain information-dense but readable.
- `VisionPanel` and history views should feel document-first.
- `Imported Sources`, `Planning Timeline`, and `Needs Attention` should be easy to scan quickly.
- `MissionControl` should feel operational, not decorative.
- Use the references in this skill before introducing new visual language.

## References

- `reference/typography.md`
- `reference/spacing.md`
- `reference/color.md`
- `reference/interaction.md`
- `reference/ux-writing.md`
- `reference/anti-patterns.md`
