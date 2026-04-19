/**
 * Shared constants & helpers for the reviewer auto-loop (#9).
 *
 * The reviewer agent returns a structured envelope with a `verdict`. We
 * derive an action plan from that envelope here so the UI doesn't have to
 * re-encode the same rules in multiple places.
 */
import type { ReviewerEnvelope } from '@/types/domain'

/** Hard cap on auto-retry cycles. After this many attempts the UI
 *  surfaces a human gate (BLOCKED + manual options). */
export const MAX_REVIEW_ITERATIONS = 3

export type ReviewVerdict = NonNullable<ReviewerEnvelope['verdict']>

/**
 * Derive a verdict for legacy envelopes that don't include the field.
 *
 *  - approveTask=true   → approve
 *  - any taskReview/stepReviews findings → minor_revision (default safe)
 *  - changeRequest only → minor_revision (treat as polishable)
 *
 * Major / replan are only inferred from explicit `verdict`. We don't try
 * to be clever here — if the model didn't signal it, we treat it as a
 * minor pass to keep the loop conservative.
 */
export function deriveVerdict(env: ReviewerEnvelope): ReviewVerdict {
  if (env.verdict) return env.verdict
  if (env.approveTask) return 'approve'
  return 'minor_revision'
}

export type NextAction =
  | { kind: 'approve_done' }
  | { kind: 'auto_retry'; iteration: number; instructions: string }
  | { kind: 'human_gate'; reason: string }
  | { kind: 'escalate_replan'; instructions: string }
  | { kind: 'await_human_clarification'; question: string }

export function planNextAction(
  env: ReviewerEnvelope,
  currentIteration: number,
): NextAction {
  if (env.needsHumanInput?.question) {
    return { kind: 'await_human_clarification', question: env.needsHumanInput.question }
  }

  const verdict = deriveVerdict(env)
  switch (verdict) {
    case 'approve':
      return { kind: 'approve_done' }

    case 'replan_needed':
      return {
        kind: 'escalate_replan',
        instructions: env.changeRequest ?? buildInstructionsFromFindings(env),
      }

    case 'major_revision':
      return {
        kind: 'human_gate',
        reason:
          env.changeRequest ??
          'Reviewer flagged significant issues. Please review before continuing.',
      }

    case 'minor_revision':
    default:
      // Cap auto-retries to avoid spinning forever.
      if (currentIteration >= MAX_REVIEW_ITERATIONS) {
        return {
          kind: 'human_gate',
          reason: `Reviewer has run ${currentIteration} cycles without approving. Please decide whether to accept the result, retry manually, or rescope the task.`,
        }
      }
      return {
        kind: 'auto_retry',
        iteration: currentIteration + 1,
        instructions: env.changeRequest ?? buildInstructionsFromFindings(env),
      }
  }
}

/** Stitch findings + recommendations into one prompt block for the Doer. */
function buildInstructionsFromFindings(env: ReviewerEnvelope): string {
  const lines: string[] = []
  if (env.taskReview?.summary) lines.push(env.taskReview.summary)
  for (const r of env.taskReview?.findings ?? []) lines.push(`- ${r}`)
  if (env.taskReview?.recommendation) lines.push(`Recommendation: ${env.taskReview.recommendation}`)
  for (const sr of env.stepReviews ?? []) {
    if (sr.findings.length === 0) continue
    lines.push(`\n[Subtask ${sr.subtaskId}] ${sr.summary}`)
    for (const f of sr.findings) lines.push(`- ${f}`)
    if (sr.recommendation) lines.push(`Recommendation: ${sr.recommendation}`)
  }
  if (env.changeActions && env.changeActions.length > 0) {
    lines.push('\nStructured change requests:')
    for (const a of env.changeActions) {
      lines.push(
        `- [${a.action}${a.subtaskId ? ' · ' + a.subtaskId : ''}] ${a.reason}` +
          (a.suggestedContent ? `\n  Suggested: ${a.suggestedContent}` : ''),
      )
    }
  }
  return lines.join('\n').trim() || 'Apply the reviewer feedback above.'
}

const VERDICT_BADGE: Record<ReviewVerdict, { label: string; tone: string }> = {
  approve: { label: 'Approved', tone: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  minor_revision: { label: 'Minor revision', tone: 'bg-amber-100 text-amber-800 border-amber-200' },
  major_revision: { label: 'Major revision', tone: 'bg-orange-100 text-orange-800 border-orange-200' },
  replan_needed: { label: 'Needs replan', tone: 'bg-rose-100 text-rose-800 border-rose-200' },
}

export function verdictBadge(verdict: ReviewVerdict) {
  return VERDICT_BADGE[verdict]
}
