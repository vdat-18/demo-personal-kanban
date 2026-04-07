// ─────────────────────────────────────────────────────────────────────────────
// AGENT LLM — per-task agent chat (streaming)
// ─────────────────────────────────────────────────────────────────────────────

import type { ChatMessage } from "@/types/domain";
import { postChatStream } from "./client";

/**
 * Chat with a specific task agent using SSE streaming.
 * @param agentType    e.g. "Doer Agent", "Planner Agent"
 * @param messages     full conversation history
 * @param onDelta      called with each streamed text chunk
 * @param systemPrompt optional system prompt override (used by kickoff)
 */
export async function chatWithAgent(
  agentType: string,
  messages: ChatMessage[],
  onDelta: (delta: string) => void,
  systemPrompt?: string
): Promise<void> {
  await postChatStream({ agentType, messages, ...(systemPrompt ? { systemPrompt } : {}) } as Parameters<typeof postChatStream>[0], onDelta);
}
