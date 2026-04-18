/**
 * Conversation Service — business logic for conversation operations.
 * Consolidates token usage aggregation from duplicate routes.
 */

import {
  getConversations,
  getConversation,
  createConversation,
  updateConversation,
  deleteConversation,
  getTokenUsageAggregation,
} from '@/lib/db/conversations'
import { NotFoundError } from '@/lib/api/errors'
import type { ConversationMessage, TokenUsage } from '@/lib/types/json-fields'

export const ConversationService = {
  async list(taskId?: string, limit?: number, offset?: number) {
    return getConversations(taskId, limit, offset)
  },

  async get(id: string) {
    const conversation = await getConversation(id)
    if (!conversation) throw new NotFoundError('Conversation', id)
    return conversation
  },

  async create(data: {
    taskId?: string
    messages: ConversationMessage[]
    result?: string | null
    tokenUsage?: TokenUsage | null
  }) {
    return createConversation(data)
  },

  async update(id: string, data: Parameters<typeof updateConversation>[1]) {
    return updateConversation(id, data)
  },

  async delete(id: string) {
    return deleteConversation(id)
  },

  /**
   * Aggregated token usage — used by both conversations/token-usage
   * and analytics/token-usage routes.
   */
  async aggregateTokenUsage(filters?: {
    taskId?: string
    projectId?: string
    startDate?: Date
    endDate?: Date
  }) {
    return getTokenUsageAggregation(filters)
  },
}
