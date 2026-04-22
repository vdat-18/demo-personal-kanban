import type { PlaybookId } from '@/types/domain'

export interface PlaybookDefinition {
  id: PlaybookId
  label: string
  description: string
  starterPrompt: string
  preferredSections: string[]
  discoveryFocus: string[]
  taskBias: string
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
  },
  {
    id: 'document-brief',
    label: 'Document Brief',
    description: 'Best when the project starts from uploaded files, notes, or a written brief.',
    starterPrompt: 'Read the provided source material carefully, summarise it clearly, and build the plan from the documented context first.',
    preferredSections: ['What the documents say', 'Confirmed facts', 'Assumptions', 'Timeline', 'Risks', 'Open questions'],
    discoveryFocus: ['source fidelity', 'missing context', 'contradictions across files', 'decision gaps'],
    taskBias: 'Only propose tasks after the documented material has been clearly summarised and gaps have been identified.',
  },
  {
    id: 'marketing-campaign',
    label: 'Marketing Campaign',
    description: 'Plan campaigns with audience, message, channels, timeline, and metrics.',
    starterPrompt: 'Structure this like a campaign plan with target audience, key message, channels, timeline, and success metrics.',
    preferredSections: ['Campaign goal', 'Audience', 'Message', 'Channels', 'Timeline', 'Success metrics'],
    discoveryFocus: ['audience clarity', 'offer/message', 'channel mix', 'success metrics'],
    taskBias: 'Bias toward campaign-ready tasks with clear deliverables, deadlines, and channel ownership.',
  },
  {
    id: 'product-launch',
    label: 'Product Launch',
    description: 'Focus on launch scope, milestones, dependencies, owners, and readiness.',
    starterPrompt: 'Treat this as a product launch plan with launch milestones, dependencies, owner responsibilities, and launch-readiness checks.',
    preferredSections: ['Launch objective', 'Readiness scope', 'Dependencies', 'Milestones', 'Owners', 'Risks'],
    discoveryFocus: ['launch criteria', 'dependencies', 'owner alignment', 'readiness risks'],
    taskBias: 'Prefer launch-readiness tasks that expose dependencies and ownership clearly.',
  },
  {
    id: 'event-rollout',
    label: 'Event Rollout',
    description: 'Useful for events, workshops, conferences, and internal rollouts.',
    starterPrompt: 'Turn this into an event execution plan with preparation phases, logistics, communications, and day-of coordination.',
    preferredSections: ['Event goal', 'Audience', 'Logistics', 'Communications', 'Run of show', 'Risks'],
    discoveryFocus: ['attendance goals', 'venue/logistics', 'communications', 'day-of execution'],
    taskBias: 'Break the work into preparation, promotion, logistics, and day-of execution tasks.',
  },
  {
    id: 'personal-weekly',
    label: 'Weekly Focus',
    description: 'A lighter operating cadence for personal planning and weekly prioritisation.',
    starterPrompt: 'Organise this into a practical weekly plan with top priorities, constraints, and a manageable action list.',
    preferredSections: ['Top priorities', 'Commitments', 'Constraints', 'This week timeline', 'Risks', 'Questions'],
    discoveryFocus: ['priority tradeoffs', 'time constraints', 'energy/load', 'must-do outcomes'],
    taskBias: 'Keep tasks concise, realistic, and week-sized rather than overly detailed.',
  },
]

export function getPlaybook(playbookId: PlaybookId | undefined | null): PlaybookDefinition {
  return PLAYBOOKS.find((item) => item.id === playbookId) ?? PLAYBOOKS[0]
}
