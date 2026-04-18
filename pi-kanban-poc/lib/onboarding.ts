/**
 * Onboarding example seeding (Tier 4.16).
 *
 * On first visit we offer a fully populated example thread so a non-tech user
 * can browse a complete walkthrough — message batch, vision, approved tasks —
 * before creating their own project.
 *
 * Triggering rules:
 *   - Auto-create on first dashboard visit IF localStorage flag is unset.
 *   - User can dismiss; we set the flag so it never reappears.
 *   - User can explicitly create the example again from the dashboard.
 */
'use client'

import { useKanbanStore } from '@/lib/storage/kanbanStore'
import type { AgentEnvelope } from '@/types/domain'

export const ONBOARDING_FLAG_KEY = 'pi-kanban-poc:onboarding-seen'
export const ONBOARDING_PROJECT_NAME = '🌟 Example: 10-year class reunion'

/** True once the user has seen (or dismissed) the onboarding example. */
export function isOnboardingSeen(): boolean {
  if (typeof window === 'undefined') return true
  return window.localStorage.getItem(ONBOARDING_FLAG_KEY) === '1'
}

export function markOnboardingSeen(): void {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(ONBOARDING_FLAG_KEY, '1')
  }
}

const EXAMPLE_VISION = `# 10-Year Reunion — November 2024

## Goal
Warm nostalgic gathering for 40-50 former classmates at a hometown restaurant, with teachers as guests of honor. Budget-conscious but memorable.

## Key constraints
- Budget ceiling 25M VND
- Restaurant booking for 50 seats
- Need ≥30 RSVPs to feel lively

## Success looks like
Teachers visibly touched, classmates exchanging contacts, nostalgic photos captured.

## Main concerns
- Low RSVP — solve by: early announce + peer pressure via WhatsApp group
- Teachers' availability — lock dates with them FIRST
`

const EXAMPLE_TASKS: Array<{ title: string; description: string; priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT' }> = [
  { title: 'Create WhatsApp group, add known classmates', description: 'September, week 1', priority: 'HIGH' },
  { title: 'Contact 3 core teachers — confirm availability', description: 'September, week 1', priority: 'URGENT' },
  { title: 'Research & visit 3 restaurants, pick one', description: 'September, week 2', priority: 'HIGH' },
  { title: 'Design invitation (Canva), send via WA group', description: 'September, week 3', priority: 'MEDIUM' },
  { title: 'Collect RSVPs, create seating chart', description: 'October, all month', priority: 'MEDIUM' },
  { title: 'Hire photographer (4h package)', description: 'October, week 2', priority: 'MEDIUM' },
  { title: 'Prepare memorial slideshow (collect photos)', description: 'October, week 3', priority: 'MEDIUM' },
  { title: 'Draft opening speech & teacher appreciation', description: 'October, week 4', priority: 'LOW' },
  { title: 'Day-of: setup, check-in table, flow coordinator', description: 'November, day-of', priority: 'HIGH' },
  { title: 'Post-event: share photos, thank-you messages', description: 'November, week after', priority: 'LOW' },
]

const EXAMPLE_USER_MSG_1 =
  "I want to organize a 10-year class reunion for my high school class. About 40-50 people, sometime in November."

const EXAMPLE_AGENT_REPLY_1: AgentEnvelope = {
  content:
    "How fun! A 10-year reunion is a real milestone. Before I draft the plan, help me understand a few things — answer what you can, skip what you don't know yet.",
  visionDocument: null,
  visionChanges: null,
  readyForNextPhase: false,
  suggestedPhase: null,
  reasonForTransition: null,
  detectedUserIntent: null,
  targetPhase: null,
  questions: [
    {
      id: 'q-budget',
      dimension: 'how',
      text: 'Roughly what budget do you have in mind?',
      hint: null,
      inputType: 'chip_single',
      suggestions: ['Under 10M VND', '10–25M', '25–50M', 'Over 50M', 'Not sure yet'],
      required: false,
    },
    {
      id: 'q-venue',
      dimension: 'how',
      text: 'What kind of venue are you picturing?',
      hint: null,
      inputType: 'chip_single',
      suggestions: ['Restaurant — private room', 'Casual restaurant', 'Outdoor (park/garden)', 'School itself', 'Open to suggestions'],
      required: false,
    },
    {
      id: 'q-help',
      dimension: 'who',
      text: 'How much help will you have planning this?',
      hint: null,
      inputType: 'chip_single',
      suggestions: ['Just me', '2–3 friends', 'Whole organizing committee', 'Will hire a planner'],
      required: false,
    },
    {
      id: 'q-priority',
      dimension: 'who',
      text: 'Who must absolutely be there?',
      hint: 'E.g. specific teachers, friends overseas',
      inputType: 'text',
      suggestions: null,
      required: true,
    },
    {
      id: 'q-concerns',
      dimension: 'constraint',
      text: 'Any concerns?',
      hint: null,
      inputType: 'chip_multi',
      suggestions: ['Low RSVP rate', 'Teachers unavailable', 'Budget tight', 'Logistics from far cities', 'Nothing major'],
      required: false,
    },
  ],
  tasks: null,
  metadata: null,
}

const EXAMPLE_USER_MSG_2 = `Budget 10–25M, restaurant private room, just me organizing. Must-have: our homeroom teacher Mrs. Lan and 2 oversea friends Trang and Khoa. Concerns: Low RSVP rate, Teachers unavailable.`

const EXAMPLE_AGENT_REPLY_2: AgentEnvelope = {
  content:
    "Got a clear picture now. A budget-conscious private dinner with Mrs. Lan as guest of honor, and Trang + Khoa flying in. I'll draft the plan — review it, then we'll break it into action items.",
  visionDocument: EXAMPLE_VISION,
  visionChanges: ['Initial draft based on discovery answers'],
  readyForNextPhase: true,
  suggestedPhase: 'task_mapping',
  reasonForTransition:
    "I have enough about goals, scale, budget, key people, and concerns to draft both the plan and the task list.",
  detectedUserIntent: null,
  targetPhase: null,
  questions: null,
  tasks: EXAMPLE_TASKS.map((t, i) => ({
    id: `t-${i}`,
    title: t.title,
    description: t.description,
    priority: t.priority,
    estimatedEffort: null,
    milestone: null,
    dependencies: null,
  })),
  metadata: { confidenceNote: null, openQuestions: null },
}

/**
 * Idempotently create the example project + thread + messages + tasks.
 * Returns the project id so the caller can navigate to it.
 */
export function ensureOnboardingProject(): string {
  const store = useKanbanStore.getState()

  const existing = store.projects.find((p) => p.name === ONBOARDING_PROJECT_NAME)
  if (existing) return existing.id

  const project = store.createProject({
    name: ONBOARDING_PROJECT_NAME,
    description: 'A complete walkthrough of the AI planner on a real-life event.',
    domain: 'GENERAL',
  })

  // Approve all example tasks immediately so they're visible in the Tasks panel.
  store.createTasksBatch(
    project.id,
    EXAMPLE_TASKS.map((t) => ({
      title: t.title,
      description: t.description,
      priority: t.priority,
    })),
  )

  const thread = store.createPlanningThread({
    projectId: project.id,
    title: 'Walkthrough — discovery → plan → tasks',
  })

  // Pre-populate conversation
  store.createPlanningMessage({
    threadId: thread.id,
    role: 'user',
    content: EXAMPLE_USER_MSG_1,
  })
  const a1 = store.createPlanningMessage({
    threadId: thread.id,
    role: 'assistant',
    content: EXAMPLE_AGENT_REPLY_1.content,
    envelope: EXAMPLE_AGENT_REPLY_1,
  })
  store.createPlanningMessage({
    threadId: thread.id,
    role: 'user',
    content: EXAMPLE_USER_MSG_2,
  })
  const a2 = store.createPlanningMessage({
    threadId: thread.id,
    role: 'assistant',
    content: EXAMPLE_AGENT_REPLY_2.content,
    envelope: EXAMPLE_AGENT_REPLY_2,
  })

  // Mark all task proposals approved on a2 so they look like they were
  // accepted in the example flow.
  if (EXAMPLE_AGENT_REPLY_2.tasks) {
    for (const t of EXAMPLE_AGENT_REPLY_2.tasks) {
      store.setTaskProposalAction(a2.id, t.id, 'approved')
    }
  }

  // Move the thread to task_mapping phase + attach the vision document.
  store.updatePlanningThread(thread.id, {
    phase: 'task_mapping',
    visionDocument: EXAMPLE_VISION,
  })
  store.createVisionVersion({
    threadId: thread.id,
    content: EXAMPLE_VISION,
    createdBy: 'ai',
    changeType: 'initial',
    summary: 'Initial draft from discovery answers',
    diffFromPrevious: null,
    triggerMessage: EXAMPLE_USER_MSG_2,
  })

  // Suppress unused warnings from a1 destructure
  void a1

  return project.id
}
