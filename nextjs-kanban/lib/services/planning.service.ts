/**
 * Planning Service — business logic for planning threads and messages.
 * Encapsulates auto-titling, agent orchestration, and mutation actions.
 */

import { getThreadsByProject, getThread, createThread, updateThread, deleteThread } from '@/lib/db/planning-threads'
import { getMessagesByThread, createMessage, getRecentMessages, persistMutationAction } from '@/lib/db/planning-messages'
import { runAgent } from '@/lib/agents/orchestrator'
import { buildPlanPrompt } from '@/lib/agents/prompts'
import { NotFoundError } from '@/lib/api/errors'
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

    // Build prompt and call AI
    const prompt = await buildPlanPrompt(content, thread.projectId, conversationHistory)
    const agentResult: AgentRunResult = await runAgent('architect', prompt)
    const resultText = agentResult.output
    const tokenUsage = agentResult.tokenUsage
      ? { input: agentResult.tokenUsage.input_tokens, output: agentResult.tokenUsage.output_tokens }
      : null

    // Persist assistant response
    const assistantMessage = await createMessage(threadId, 'assistant', resultText, tokenUsage)

    return { userMessage, assistantMessage, tokenUsage }
  },

  async persistMutationAction(
    messageId: string,
    mutationIndex: number,
    action: 'approved' | 'dismissed',
  ) {
    return persistMutationAction(messageId, mutationIndex, action)
  },
}
