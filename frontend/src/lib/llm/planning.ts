// ─────────────────────────────────────────────────────────────────────────────
// PLANNING LLM — report generation + agentic planning chat
// ─────────────────────────────────────────────────────────────────────────────

import type {
  ChatMessage,
  AgenticResponse,
} from "@/types/domain";
import { postChat } from "./client";

// ─────────────────────────────────────────────────────────────────────────────
// generateProjectReport
// ─────────────────────────────────────────────────────────────────────────────

const REPORT_SYSTEM_PROMPT_NEW = `You are a project strategist. Generate a structured Markdown project report from the brainstorming conversation.

Include: project title, goal, objectives & success criteria, stakeholders, risks, suggested task titles (numbered list).
Write ONLY Markdown — no JSON, no code blocks, no extra text.`;

const REPORT_SYSTEM_PROMPT_UPDATE = `You are a project strategist. Update an existing project report based on the user's instruction.

Rules:
- Apply ONLY the requested changes. Preserve everything else.
- Do not regenerate the full report from scratch.
- Write ONLY the updated Markdown — no JSON, no code blocks, no extra text.`;

const STRUCTURED_EXTRACT_PROMPT = `Extract key information from the project report below as raw JSON (no markdown, no code fences):
{
  "title": "project title",
  "goal": "one sentence goal",
  "suggested_tasks": ["Task 1", "Task 2"]
}`;

export interface ProjectReportResult {
  report: string;
  structured: {
    title: string;
    goal: string;
    suggested_tasks: string[];
  } | null;
}

export async function generateProjectReport(
  projectName: string,
  history: ChatMessage[],
  currentReport?: string,
  userInstruction?: string
): Promise<ProjectReportResult> {
  // ── Call 1: Generate (new) or Update (existing) the Markdown report ────────
  let reportMessages: ChatMessage[];

  if (currentReport && userInstruction) {
    // UPDATE MODE: apply only the user's requested changes to the existing report
    reportMessages = [
      { role: "user", content: REPORT_SYSTEM_PROMPT_UPDATE },
      {
        role: "user",
        content: `EXISTING REPORT:\n${currentReport}\n\nUSER INSTRUCTION: ${userInstruction}\n\nApply the instruction and return the updated Markdown report. Write ONLY Markdown, no JSON.`,
      },
    ];
  } else {
    // NEW REPORT MODE: generate from brainstorming conversation
    reportMessages = [
      { role: "user", content: REPORT_SYSTEM_PROMPT_NEW },
      ...history,
      {
        role: "user",
        content: `Now generate the complete Markdown project report for: "${projectName}". Write ONLY Markdown, no JSON.`,
      },
    ];
  }

  const rawReport = await postChat({ projectName, messages: reportMessages });

  const cleanReport = rawReport.trim();

  const extractMessages: ChatMessage[] = [
    { role: "user", content: STRUCTURED_EXTRACT_PROMPT },
    { role: "assistant", content: cleanReport },
    { role: "user", content: "Extract the JSON now. Return ONLY the JSON object, nothing else." },
  ];
  const rawJson = await postChat({ projectName, messages: extractMessages });
  
  const structured = JSON.parse(rawJson.trim());

  return { report: cleanReport, structured };
}


// ─────────────────────────────────────────────────────────────────────────────
// chatWithAgenticAI
// ─────────────────────────────────────────────────────────────────────────────

function buildAgenticSystemPrompt(
  pendingActionType: string | null | undefined,
  reportContent: string | undefined
): string {
  const hasReport = !!reportContent;
  return `You are a project analyst helping users define a project strategy via brainstorming.

Move efficiently toward a structured report. Identify all missing pillars at once (Purpose, Platform, Scope, Constraints).
Once clarified, set suggestedAction.type = "generate_report".

Current context:
- Pending action: ${pendingActionType ?? "none"}
- Report exists: ${hasReport ? "YES" : "NO"}
${hasReport ? `\n--- CURRENT REPORT ---\n${reportContent}\n--- END REPORT ---\n` : ""}

Return raw JSON (no markdown fences):
{
  "reply": "response text",
  "userIntent": "confirm|explore|reject|neutral",
  "suggestedAction": { "type": "generate_report|proceed_to_tasks|suggest_tasks", "hint": "hint text" }
}

userIntent rules:
- "confirm": user says yes/ok/go ahead, or gives a direct command to update/revise the report or tasks.
- "neutral": user provides information or asks questions.
- "explore": user wants to discuss options.
- "reject": user declines.

If user asks to UPDATE/REVISE the report → userIntent = "confirm", suggestedAction.type = "generate_report".
If user asks to EDIT A SPECIFIC TASK (e.g. "edit task 1 to...") → confirm in reply + include taskUpdate { index (0-based), title, description }.`;
}

export async function chatWithAgenticAI(
  history: ChatMessage[],
  pendingActionType?: string | null,
  reportContent?: string
): Promise<AgenticResponse> {
  const messages: ChatMessage[] = [
    { role: "user", content: buildAgenticSystemPrompt(pendingActionType, reportContent) },
    ...history,
  ];

  const raw = await postChat({ messages });

  // Since we assume LLM outputs perfect JSON 100% of the time, we can parse and return directly.
  return JSON.parse(raw.trim()) as AgenticResponse;
}
