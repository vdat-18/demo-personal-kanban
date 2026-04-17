/**
 * Typed interfaces for Prisma JSON columns.
 * Replaces `any` casts in the DB layer with explicit types.
 */

export interface TokenUsage {
  input: number
  output: number
}

export interface ToolCall {
  id: string
  type: string
  function: {
    name: string
    arguments: string
  }
}

export interface ConversationMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp?: Date | string
  toolCalls?: ToolCall[]
}

export interface MutationAction {
  mutationIndex: number
  action: string
}
