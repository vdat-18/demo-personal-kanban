/**
 * Planning Service — business logic for planning threads and messages.
 * Encapsulates auto-titling, agent orchestration, and mutation actions.
 */

import { getThreadsByProject, getThread, createThread, updateThread, deleteThread } from '@/lib/db/planning-threads'
import { getMessagesByThread, createMessage, getRecentMessages, persistMutationAction } from '@/lib/db/planning-messages'
import { runAgent } from '@/lib/agents/orchestrator'
import { buildPlanPrompt, extractPhaseTransition, extractVisionDocument } from '@/lib/agents/prompts'
import type { PlanningPhase as PromptPlanningPhase } from '@/lib/agents/prompts'
import { NotFoundError } from '@/lib/api/errors'
import { isAgnoBackend, smartRun, AgnoServiceError } from '@/lib/agno-client'
import type { AgentRunResult } from '@jackchen_me/open-multi-agent'

export const PlanningService = {
  async listThreads(projectId: string) {
    return getThreadsByProject(projectId)
  },

  async getThread(id: string) {
    const thread = await getThread(id)
    if (!thread) throw new NotFoundError('Thread', id)
    return thread
  },

  async createThread(projectId: string, title?: string) {
    return createThread(projectId, title)
  },

  async deleteThread(id: string) {
    return deleteThread(id)
  },

  async listMessages(threadId: string) {
    return getMessagesByThread(threadId)
  },

  /**
   * Send a user message, auto-title thread if needed, call AI, persist response.
   */
  async sendMessage(threadId: string, content: string) {
    // Verify thread exists
    const thread = await getThread(threadId)
    if (!thread) throw new NotFoundError('Thread', threadId)

    // Persist user message
    const userMessage = await createMessage(threadId, 'user', content)

    // Auto-title: if thread is "New Thread" and this is the first user message
    const userMsgCount = thread.messages.filter((m) => m.role === 'user').length
    if (thread.title === 'New Thread' && userMsgCount === 0) {
      const autoTitle = content.slice(0, 80) + (content.length > 80 ? '…' : '')
      await updateThread(threadId, { title: autoTitle })
    }

    // Get recent messages for conversation history
    const recentMessages = await getRecentMessages(threadId, 20)
    const conversationHistory = recentMessages.map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }))

    // Build prompt with current phase and vision document from the thread
    const currentPhase = (thread.phase as PromptPlanningPhase) ?? 'discovery'
    const currentVisionDoc = thread.visionDocument ?? null
    const prompt = await buildPlanPrompt(
      content,
      thread.projectId,
      conversationHistory,
      currentPhase,
      currentVisionDoc,
    )

    let resultText: string
    let tokenUsage: { input: number; output: number } | null = null

    if (isAgnoBackend()) {
      try {
        const agnoResult = await smartRun({ message: prompt, project_id: thread.projectId })
        resultText = agnoResult.result
      } catch (err) {
        if (err instanceof AgnoServiceError) {
          console.warn(`[planning] Agno unavailable (${err.code}), falling back to multi-agent`)
          const agentResult: AgentRunResult = await runAgent('architect', prompt)
          resultText = agentResult.output
          tokenUsage = agentResult.tokenUsage
            ? { input: agentResult.tokenUsage.input_tokens, output: agentResult.tokenUsage.output_tokens }
            : null
        } else {
          throw err
        }
      }
    } else {
      const agentResult: AgentRunResult = await runAgent('architect', prompt)
      resultText = agentResult.output
      tokenUsage = agentResult.tokenUsage
        ? { input: agentResult.tokenUsage.input_tokens, output: agentResult.tokenUsage.output_tokens }
        : null
    }

    // Extract phase transition and vision document from AI response
    const newPhase = extractPhaseTransition(resultText, currentPhase)
    const newVisionDoc = extractVisionDocument(resultText, currentVisionDoc)

    // Update thread if phase or vision changed
    const threadUpdates: { phase?: string; visionDocument?: string } = {}
    if (newPhase) threadUpdates.phase = newPhase
    if (newVisionDoc !== undefined && newVisionDoc !== currentVisionDoc) {
      threadUpdates.visionDocument = newVisionDoc ?? ''
    }
    if (Object.keys(threadUpdates).length > 0) {
      await updateThread(threadId, threadUpdates as Parameters<typeof updateThread>[1])
    }

    // Persist assistant response
    const assistantMessage = await createMessage(threadId, 'assistant', resultText, tokenUsage)

    const updatedPhase = newPhase ?? currentPhase
    const updatedVisionDoc = newVisionDoc ?? currentVisionDoc

    return { userMessage, assistantMessage, tokenUsage, phase: updatedPhase, visionDocument: updatedVisionDoc }
  },

  async persistMutationAction(
    messageId: string,
    mutationIndex: number,
    action: 'approved' | 'dismissed',
  ) {
    return persistMutationAction(messageId, mutationIndex, action)
  },
}
