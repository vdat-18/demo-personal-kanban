// ── Chat prompt builder ──────────────────────────────────────────────────────

import { getTask } from '@/lib/db/tasks'
import type { AgentRole } from '../types'
import type { ProjectDomain } from '../types'
import { DOMAIN_ROLE_LABELS } from '../role-labels'

export async function buildChatPrompt(
  role: AgentRole,
  userMessage: string,
  taskId: string
): Promise<string> {
  const task = await getTask(taskId)
  if (!task) throw new Error(`Task ${taskId} not found`)

  const domain = (task.project?.domain as ProjectDomain) ?? 'SOFTWARE_ENGINEERING'
  const roleLabel = DOMAIN_ROLE_LABELS[domain][role]

  const allCompleted = task.subtasks && task.subtasks.length > 0 && task.subtasks.every(st => st.completed)
  const pendingCount = task.subtasks?.filter(st => !st.completed).length ?? 0

  const subtasksContext = (task.subtasks && task.subtasks.length > 0)
    ? `\nSubtasks for this task (${task.subtasks.length - pendingCount}/${task.subtasks.length} completed):\n${task.subtasks.map((st: any) => `- ID: ${st.id} | Status: [${st.completed ? 'COMPLETED' : 'PENDING'}] | Title: ${st.title}`).join('\n')}`
    : '\nNo subtasks defined.';

  // When all subtasks are done, inject conversation history so the agent can
  // synthesize a detailed report from the ACTUAL CONTENT produced per subtask.
  let conversationHistory = ''
  if (allCompleted && task.conversations && task.conversations.length > 0) {
    const workOutputs: string[] = []

    for (const conv of (task.conversations as any[])) {
      // Prefer the final 'result' if it exists (clean summary per conversation)
      // result can be a string or a JSON object (e.g. { reply: "..." })
      const resultStr = typeof conv.result === 'string'
        ? conv.result
        : conv.result && typeof conv.result === 'object' && typeof conv.result.reply === 'string'
          ? conv.result.reply
          : null
      if (resultStr && resultStr.length > 50) {
        workOutputs.push(resultStr)
        continue
      }
      // Fallback: extract the last (longest) assistant message from this conversation
      const msgs = Array.isArray(conv.messages) ? conv.messages as Array<{ role: string; content: string }> : []
      const assistantMsgs = msgs
        .filter(m => m.role === 'assistant' && typeof m.content === 'string' && m.content.length > 50)
        .map(m => m.content)
      if (assistantMsgs.length > 0) {
        // Take the last assistant message — usually the most complete work output
        workOutputs.push(assistantMsgs[assistantMsgs.length - 1])
      }
    }

    if (workOutputs.length > 0) {
      // Cap at ~10000 chars to avoid token overflow; keep most recent work
      const fullHistory = workOutputs.join('\n\n---\n\n')
      const cappedHistory = fullHistory.length > 10000
        ? '...[earlier work truncated]\n\n' + fullHistory.slice(-10000)
        : fullHistory
      conversationHistory = `\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\nFULL WORK HISTORY — ${workOutputs.length} subtask(s) completed\n(Use ALL of this content to write your detailed report. Reference specific data, findings, and deliverables.)\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n${cappedHistory}\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`
    }
  }

  // ── Review Mode: inject full work history for Reviewer Agent ──────────────
  // When the Reviewer is called and the task is IN_REVIEW, inject the complete
  // conversation history (including the Master Report) so it can assess quality.
  const isReviewMode = role === 'reviewer' && task.status === 'IN_REVIEW'
  let reviewWorkHistory = ''
  if (isReviewMode && task.conversations && task.conversations.length > 0) {
    const rvOutputs: string[] = []
    for (const conv of (task.conversations as any[])) {
      const resultStr = typeof conv.result === 'string'
        ? conv.result
        : conv.result && typeof conv.result === 'object' && typeof conv.result.reply === 'string'
          ? conv.result.reply
          : null
      if (resultStr && resultStr.length > 50) {
        rvOutputs.push(resultStr)
        continue
      }
      const msgs = Array.isArray(conv.messages) ? conv.messages as Array<{ role: string; content: string }> : []
      const assistantMsgs = msgs
        .filter(m => m.role === 'assistant' && typeof m.content === 'string' && m.content.length > 50)
        .map(m => m.content)
      if (assistantMsgs.length > 0) {
        rvOutputs.push(assistantMsgs[assistantMsgs.length - 1])
      }
    }
    if (rvOutputs.length > 0) {
      const full = rvOutputs.join('\n\n---\n\n')
      const capped = full.length > 12000 ? '...[earlier work truncated]\n\n' + full.slice(-12000) : full
      reviewWorkHistory = `\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\nWORK HISTORY TO REVIEW — ${rvOutputs.length} session(s)\n(Read ALL of this to assess quality before writing your review report.)\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n${capped}\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`
    }
  }

  const executionInstruction = allCompleted
    ? `ALL SUBTASKS ARE ALREADY COMPLETED. The full work history is provided above — use it to write a DETAILED Master Synthesis Report that quotes specific findings, data points, and deliverables from the actual work. Do NOT call subtask_update again. Wrap the report in [[REPORT_START]] and [[REPORT_END]] tags, then natively call task_update to save it to Task ID: ${task.id}.`
    : isReviewMode
      ? `REVIEW MODE: Task ID is ${task.id}. Task status is IN_REVIEW. The full work history is provided above in the WORK HISTORY section. Review it thoroughly, write your Quality Review Report, then call task_update to finalize the decision (DONE if approved, IN_PROGRESS if changes needed).`
      : `INSTRUCTION: Focus ONLY on the single subtask requested by the user. Show your detailed work in the chat. Then call 'subtask_update' with BOTH fields: { "id": "<exact-uuid-from-list>", "completed": true }. NEVER omit the "completed" field. Stop after the tool call succeeds. Do not process the next subtask.`

  return [
    `You are a ${roleLabel} working on task: "${task.title}" (Task ID: ${task.id}).`,
    `Task status: ${task.status}`,
    task.description ? `Task description: ${task.description}` : '',
    subtasksContext,
    conversationHistory,
    reviewWorkHistory,
    '',
    executionInstruction,
    '',
    `User message: ${userMessage}`,
  ]
    .filter(Boolean)
    .join('\n')
}
