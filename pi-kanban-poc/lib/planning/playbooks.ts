import type { PlaybookId, WorkflowContract } from '@/types/domain'

export interface PlaybookDefinition {
  id: PlaybookId
  label: string
  description: string
  starterPrompt: string
  preferredSections: string[]
  discoveryFocus: string[]
  taskBias: string
  workflowContract: WorkflowContract
}

export const PLAYBOOKS: PlaybookDefinition[] = [
  {
    id: 'general-planning',
    label: 'General Planning',
    description: 'A flexible planning flow for mixed personal or business work.',
    starterPrompt: 'Help me shape this into a clear plan with sensible milestones, risks, and next actions.',
    preferredSections: ['Goal', 'Scope', 'Audience / stakeholders', 'Timeline', 'Constraints / risks', 'Open questions'],
    discoveryFocus: ['goal clarity', 'scope boundaries', 'timeline', 'constraints'],
    taskBias: 'Prefer balanced, practical tasks that are easy to act on without over-fragmenting the work.',
    workflowContract: {
      objective: 'Turn the project into a clear, executable plan with realistic structure before work starts.',
      executionEntryCriteria: ['The plan is understandable', 'Main questions are resolved', 'Tasks have been reviewed'],
      acceptanceCriteria: ['Scope is clear', 'Risks are visible', 'The task list is usable'],
      validationChecklist: ['Plan reviewed', 'Assumptions captured', 'Tasks approved'],
      reviewGate: 'A human should confirm the plan before execution starts.',
      doneCriteria: ['Execution can start without major ambiguity', 'The current plan reflects the latest decisions'],
    },
  },
  {
    id: 'document-brief',
    label: 'Document Brief',
    description: 'Best when the project starts from uploaded files, notes, or a written brief.',
    starterPrompt: 'Read the provided source material carefully, summarise it clearly, and build the plan from the documented context first.',
    preferredSections: ['What the documents say', 'Confirmed facts', 'Assumptions', 'Timeline', 'Risks', 'Open questions'],
    discoveryFocus: ['source fidelity', 'missing context', 'contradictions across files', 'decision gaps'],
    taskBias: 'Only propose tasks after the documented material has been clearly summarised and gaps have been identified.',
    workflowContract: {
      objective: 'Build the project from trusted source documents before moving into execution.',
      executionEntryCriteria: ['Sources are reviewed', 'Document readback is accepted', 'Tasks are approved'],
      acceptanceCriteria: ['Important sources are understood', 'Missing context is visible', 'The plan reflects the source material'],
      validationChecklist: ['Source summaries reviewed', 'Assumptions recorded', 'Task list checked against source material'],
      reviewGate: 'The user should confirm that the AI understood the uploaded documents correctly before execution.',
      doneCriteria: ['The plan matches the source material', 'Execution can start with confidence in the imported context'],
    },
  },
  {
    id: 'marketing-campaign',
    label: 'Marketing Campaign',
    description: 'Plan campaigns with audience, message, channels, timeline, and metrics.',
    starterPrompt: 'Structure this like a campaign plan with target audience, key message, channels, timeline, and success metrics.',
    preferredSections: ['Campaign goal', 'Audience', 'Message', 'Channels', 'Timeline', 'Success metrics'],
    discoveryFocus: ['audience clarity', 'offer/message', 'channel mix', 'success metrics'],
    taskBias: 'Bias toward campaign-ready tasks with clear deliverables, deadlines, and channel ownership.',
    workflowContract: {
      objective: 'Turn campaign intent into a plan with clear audience, message, channels, and metrics.',
      executionEntryCriteria: ['Audience and message are defined', 'Timeline is clear', 'Campaign tasks are approved'],
      acceptanceCriteria: ['Campaign goal is clear', 'Channel strategy exists', 'Success metrics are visible'],
      validationChecklist: ['Audience checked', 'Channel plan checked', 'Metrics checked', 'Tasks approved'],
      reviewGate: 'A human should verify audience, messaging, and channels before execution.',
      doneCriteria: ['The campaign plan is actionable', 'Execution teams can start with aligned messaging'],
    },
  },
  {
    id: 'product-launch',
    label: 'Product Launch',
    description: 'Focus on launch scope, milestones, dependencies, owners, and readiness.',
    starterPrompt: 'Treat this as a product launch plan with launch milestones, dependencies, owner responsibilities, and launch-readiness checks.',
    preferredSections: ['Launch objective', 'Readiness scope', 'Dependencies', 'Milestones', 'Owners', 'Risks'],
    discoveryFocus: ['launch criteria', 'dependencies', 'owner alignment', 'readiness risks'],
    taskBias: 'Prefer launch-readiness tasks that expose dependencies and ownership clearly.',
    workflowContract: {
      objective: 'Prepare a launch plan with clear readiness gates, dependencies, and ownership.',
      executionEntryCriteria: ['Dependencies are known', 'Milestones are defined', 'Launch tasks are approved'],
      acceptanceCriteria: ['Owners are visible', 'Risks are visible', 'Launch readiness can be judged'],
      validationChecklist: ['Dependencies reviewed', 'Readiness reviewed', 'Execution tasks approved'],
      reviewGate: 'A human should confirm readiness assumptions before launch execution begins.',
      doneCriteria: ['Launch execution can begin with known dependencies and owners'],
    },
  },
  {
    id: 'event-rollout',
    label: 'Event Rollout',
    description: 'Useful for events, workshops, conferences, and internal rollouts.',
    starterPrompt: 'Turn this into an event execution plan with preparation phases, logistics, communications, and day-of coordination.',
    preferredSections: ['Event goal', 'Audience', 'Logistics', 'Communications', 'Run of show', 'Risks'],
    discoveryFocus: ['attendance goals', 'venue/logistics', 'communications', 'day-of execution'],
    taskBias: 'Break the work into preparation, promotion, logistics, and day-of execution tasks.',
    workflowContract: {
      objective: 'Create an event plan that is ready for coordination and day-of execution.',
      executionEntryCriteria: ['Logistics are known', 'Run of show exists', 'Tasks are approved'],
      acceptanceCriteria: ['Audience is clear', 'Operational flow is clear', 'Critical risks are listed'],
      validationChecklist: ['Logistics checked', 'Run of show checked', 'Critical tasks approved'],
      reviewGate: 'A human should confirm logistics and communications before execution starts.',
      doneCriteria: ['The event can move into preparation or delivery with clear coordination steps'],
    },
  },
  {
    id: 'personal-weekly',
    label: 'Weekly Focus',
    description: 'A lighter operating cadence for personal planning and weekly prioritisation.',
    starterPrompt: 'Organise this into a practical weekly plan with top priorities, constraints, and a manageable action list.',
    preferredSections: ['Top priorities', 'Commitments', 'Constraints', 'This week timeline', 'Risks', 'Questions'],
    discoveryFocus: ['priority tradeoffs', 'time constraints', 'energy/load', 'must-do outcomes'],
    taskBias: 'Keep tasks concise, realistic, and week-sized rather than overly detailed.',
    workflowContract: {
      objective: 'Create a realistic weekly plan with clear priorities and manageable execution.',
      executionEntryCriteria: ['Priorities are chosen', 'Constraints are visible', 'Weekly tasks are approved'],
      acceptanceCriteria: ['Top priorities are clear', 'The plan fits realistic capacity', 'The task list is manageable'],
      validationChecklist: ['Priorities reviewed', 'Time limits reviewed', 'Weekly tasks approved'],
      reviewGate: 'The user should confirm that the plan fits the real week before execution.',
      doneCriteria: ['The week can start with a realistic approved action list'],
    },
  },
]

export function getDefaultWorkflowContract(): WorkflowContract {
  return PLAYBOOKS[0].workflowContract
}

export function getPlaybook(playbookId: PlaybookId | undefined | null): PlaybookDefinition {
  return PLAYBOOKS.find((item) => item.id === playbookId) ?? PLAYBOOKS[0]
}
