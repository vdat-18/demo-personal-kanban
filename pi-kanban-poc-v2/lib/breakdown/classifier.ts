/**
 * Lightweight keyword-based task classifier (Tier 2.6).
 *
 * We run this client-side before calling the breakdown agent so the server
 * can pick the right prompt section. Accuracy is "good enough" — if the
 * classifier is wrong the agent falls back to a generic breakdown pattern.
 *
 * Why not use the LLM to classify? Latency + cost. Classification is a
 * one-time branch decision and regex handles it in <1ms.
 *
 * Match rules:
 *   - Case-insensitive, word-boundary aware (so "select" in "selected"
 *     doesn't false-match as 'decide').
 *   - Priority order when multiple categories match:
 *     decide > create > communicate > research > generic.
 *     Reason: a task like "Research and write the report" is a CREATE task
 *     with research as internal step — the deliverable drives the approach.
 */

import type { TaskKind } from '@/types/domain'

interface TypeRule {
  kind: Exclude<TaskKind, 'generic'>
  /** Word list — matched as whole words, case-insensitive. */
  keywords: string[]
}

const RULES: TypeRule[] = [
  {
    kind: 'decide',
    keywords: ['decide', 'decision', 'choose', 'pick', 'select', 'approve', 'confirm', 'finalize', 'settle', 'determine'],
  },
  {
    kind: 'create',
    keywords: [
      'write', 'draft', 'create', 'design', 'produce', 'make', 'build', 'compose',
      'prepare', 'develop', 'assemble', 'record', 'film', 'shoot', 'cook', 'bake',
    ],
  },
  {
    kind: 'communicate',
    keywords: [
      'send', 'invite', 'contact', 'email', 'message', 'notify', 'announce',
      'share', 'call', 'text', 'reach out', 'follow up', 'update', 'inform',
    ],
  },
  {
    kind: 'research',
    keywords: [
      'research', 'find', 'compare', 'investigate', 'explore', 'evaluate',
      'analyze', 'analyse', 'study', 'benchmark', 'survey', 'look into',
      'look for', 'search', 'scout',
    ],
  },
]

/**
 * Return the task kind for the given title + optional description.
 * Falls back to 'generic' when nothing matches (e.g. short titles like "Lunch").
 */
export function classifyTask(title: string, description: string | null = null): TaskKind {
  const haystack = `${title} ${description ?? ''}`.toLowerCase()
  for (const rule of RULES) {
    if (matchesAny(haystack, rule.keywords)) return rule.kind
  }
  return 'generic'
}

function matchesAny(haystack: string, keywords: string[]): boolean {
  for (const kw of keywords) {
    // Multi-word phrases: simple substring is fine (no false-positive risk).
    // Single words: enforce word boundary to avoid matching inside other words.
    if (kw.includes(' ')) {
      if (haystack.includes(kw)) return true
    } else {
      const re = new RegExp(`(^|[^a-z])${escapeRegex(kw)}([^a-z]|$)`, 'i')
      if (re.test(haystack)) return true
    }
  }
  return false
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// ─── Display metadata ─────────────────────────────────────────────────────────

export const TASK_KIND_LABEL: Record<TaskKind, string> = {
  research: 'Research',
  create: 'Create',
  communicate: 'Communicate',
  decide: 'Decide',
  generic: 'General',
}

export const TASK_KIND_ICON: Record<TaskKind, string> = {
  research: '🔍',
  create: '🎨',
  communicate: '💬',
  decide: '🎯',
  generic: '📝',
}
