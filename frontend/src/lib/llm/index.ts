// ─────────────────────────────────────────────────────────────────────────────
// @/lib/llm — barrel export
// Usage: import { chatWithAgenticAI, generateDetailedTasks } from "@/lib/llm"
// ─────────────────────────────────────────────────────────────────────────────

export { generateProjectReport, chatWithAgenticAI } from "./planning";
export type { ProjectReportResult } from "./planning";

export { generateDetailedTasks } from "./tasks";

export { chatWithAgent } from "./agent";

export { buildKickoffUserMessage, getAgentSystemPrompt } from "./kickoff";

export {
  postChat,
  postChatStream,
  postChatMultimodal,
  extractJSON,
  API_BASE,
} from "./client";
export type { MultimodalPart, MultimodalMessage, MultimodalChatRequest } from "./client";

