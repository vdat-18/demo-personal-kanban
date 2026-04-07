// ─────────────────────────────────────────────────────────────────────────────
// LLM CLIENT — low-level fetch utilities
// All API communication goes through here
// ─────────────────────────────────────────────────────────────────────────────

import type { ChatMessage } from "@/types/domain";

export const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3001";

// ─────────────────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
// BLOCKING CHAT — POST /api/chat
// ─────────────────────────────────────────────────────────────────────────────

export interface ChatRequest {
  projectName?: string;
  agentType?: string;
  messages: ChatMessage[];
}

export async function postChat(req: ChatRequest): Promise<string> {
  const res = await fetch(`${API_BASE}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ projectName: req.projectName ?? "", ...req }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return (data.reply as string) ?? "";
}

// ─────────────────────────────────────────────────────────────────────────────
// STREAMING CHAT — POST /api/chat/stream (SSE)
// ─────────────────────────────────────────────────────────────────────────────

export async function postChatStream(
  req: ChatRequest,
  onDelta: (delta: string) => void
): Promise<void> {
  const res = await fetch(`${API_BASE}/api/chat/stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ projectName: req.projectName ?? "", ...req }),
  });

  if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);

  const reader = res.body.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value, { stream: true });
    for (const line of chunk.split("\n")) {
      if (!line.startsWith("data:")) continue;
      try {
        const json = JSON.parse(line.slice(5).trim());
        if (typeof json.delta === "string") onDelta(json.delta);
      } catch {
        // ignore malformed SSE lines
      }
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// MULTIMODAL CHAT — POST /api/chat/multimodal
// Supports text + images (base64). Used when user uploads image / PDF files.
// ─────────────────────────────────────────────────────────────────────────────

/** One part inside a multimodal message */
export type MultimodalPart =
  | { type: "text"; text: string }
  | { type: "image"; base64: string; mimeType: string };

/** A chat message that may have mixed text + image content */
export interface MultimodalMessage {
  role: "user" | "assistant";
  /** Plain string for text-only, array of parts for mixed content */
  content: string | MultimodalPart[];
}

export interface MultimodalChatRequest {
  messages: MultimodalMessage[];
  projectName?: string;
}

export async function postChatMultimodal(
  req: MultimodalChatRequest
): Promise<string> {
  const res = await fetch(`${API_BASE}/api/chat/multimodal`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return (data.reply as string) ?? "";
}
