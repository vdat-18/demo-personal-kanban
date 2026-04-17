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

  // Inject completed subtask outputs for context — used in Execution Mode to give AI continuity
  const completedWithOutput = (task.subtasks ?? []).filter((st: any) => st.completed && st.output && String(st.output).trim().length > 0)
  const previousOutputsContext = completedWithOutput.length > 0
    ? `\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\nPREVIOUS SUBTASK OUTPUTS (use for continuity — build on this work, don't repeat it)\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n${completedWithOutput.map((st: any) => `### ✅ ${st.title}\n${st.output}`).join('\n\n---\n\n')}\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`
    : ''

  // Determine next pending subtask for proactive suggestion
  const nextPendingSubtask = (task.subtasks ?? []).find((st: any) => !st.completed)

  // When all subtasks are done, provide work history for Master Report generation.
  // Primary source: subtask.output fields (saved by subtask_update tool).
  // Fallback: raw conversation messages (for older tasks without saved outputs).
  let conversationHistory = ''
  if (allCompleted) {
    // Primary: use saved subtask outputs (clean, structured, no token waste)
    // previousOutputsContext already contains this — no need to duplicate here.
    // Only fall back to conversation messages if NO subtasks have saved outputs.
    const hasStoredOutputs = completedWithOutput.length > 0

    if (!hasStoredOutputs && task.conversations && task.conversations.length > 0) {
      const workOutputs: string[] = []

      for (const conv of (task.conversations as any[])) {
        const resultStr = typeof conv.result === 'string'
          ? conv.result
          : conv.result && typeof conv.result === 'object' && typeof conv.result.reply === 'string'
            ? conv.result.reply
            : null
        if (resultStr && resultStr.length > 50) {
          workOutputs.push(resultStr)
          continue
        }
        const msgs = Array.isArray(conv.messages) ? conv.messages as Array<{ role: string; content: string }> : []
        const assistantMsgs = msgs
          .filter(m => m.role === 'assistant' && typeof m.content === 'string' && m.content.length > 50)
          .map(m => m.content)
        if (assistantMsgs.length > 0) {
          workOutputs.push(assistantMsgs[assistantMsgs.length - 1])
        }
      }

      if (workOutputs.length > 0) {
        const fullHistory = workOutputs.join('\n\n---\n\n')
        const cappedHistory = fullHistory.length > 10000
          ? '...[earlier work truncated]\n\n' + fullHistory.slice(-10000)
          : fullHistory
        conversationHistory = `\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\nFULL WORK HISTORY (fallback) — ${workOutputs.length} subtask(s) completed\n(Use ALL of this content to write your detailed report. Reference specific data, findings, and deliverables.)\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n${cappedHistory}\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`
      }
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

  const isTodoMode = task.status === 'TODO'

  const executionInstruction = allCompleted
    ? `ALL SUBTASKS ARE ALREADY COMPLETED. The full work history is provided above — use it to write a DETAILED Master Synthesis Report that quotes specific findings, data points, and deliverables from the actual work. Do NOT call subtask_update again. Wrap the report in [[REPORT_START]] and [[REPORT_END]] tags, then natively call task_update to save it to Task ID: ${task.id}.`
    : isReviewMode
      ? `REVIEW MODE: Task ID is ${task.id}. Task status is IN_REVIEW. The full work history is provided above in the WORK HISTORY section. Review it thoroughly, write your Quality Review Report, then call task_update to finalize the decision (DONE if approved, IN_PROGRESS if changes needed).`
      : isTodoMode
        ? `PLANNING MODE — Task ID: ${task.id}. Task status is TODO. You are the Planner Agent. Your job is to make sure the plan is solid BEFORE any execution begins.

RULES FOR THIS MODE:
1. DO NOT execute any subtask. DO NOT call subtask_update.
2. If there are NO subtasks yet: ask the user to describe what "done" looks like and any constraints (deadline, audience, scope, tech stack). Then propose a concrete subtask breakdown.
3. If subtasks already exist: proactively walk the user through each subtask one at a time. For each subtask, briefly explain its purpose, ask if it needs clarification or refinement, and wait for the user's response before moving to the next.
4. After reviewing all subtasks, summarise the plan and ask: "Does this plan look good? Say 'start execution', 'switch to doer', or 'go ahead' when you're ready to begin."
5. TRANSITION TO EXECUTION: When the user confirms they are ready (e.g. says "start", "go ahead", "switch to doer", "execute now", "begin", or similar), call the 'task_update' tool with { "id": "${task.id}", "status": "IN_PROGRESS" }. Then say: "✅ Switching to execution mode. Doer Agent will take over from here."
6. DO NOT transition to IN_PROGRESS unless the user has explicitly confirmed.`
        : `INSTRUCTION: Focus ONLY on the single subtask requested by the user. Show your detailed work in the chat following the structured format in your system prompt. Then call 'subtask_update' with THREE fields: { "id": "<exact-uuid-from-list>", "completed": true, "output": "<your full work output for this subtask>" }. NEVER omit the "completed" or "output" fields — output is required for the Master Report. After the tool call succeeds, end your response with: "✅ Done. ${nextPendingSubtask ? `Next up: **${nextPendingSubtask.title}** — say 'go' or describe any changes before we begin.` : 'All subtasks complete! Say anything to generate the Master Report.'}" Do not process the next subtask automatically.`

  return [
    `You are a ${roleLabel} working on task: "${task.title}" (Task ID: ${task.id}).`,
    `Task status: ${task.status}`,
    task.description ? `Task description: ${task.description}` : '',
    subtasksContext,
    previousOutputsContext,
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
