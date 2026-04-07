// ─────────────────────────────────────────────────────────────────────────────
// PLANNING LLM — report generation + agentic planning chat
// ─────────────────────────────────────────────────────────────────────────────

import type {
  ChatMessage,
  AgenticResponse,
  SuggestedAction,
  UserIntent,
} from "@/types/domain";
import { postChat } from "./client";

// ─────────────────────────────────────────────────────────────────────────────
// generateProjectReport
// ─────────────────────────────────────────────────────────────────────────────

const REPORT_SYSTEM_PROMPT = `You are an expert project strategist.
Based on the brainstorming conversation below, generate a comprehensive project report in Markdown.

The report must include:
1. A clear project title and goal statement
2. Key objectives and success criteria
3. Stakeholders and context
4. Risk considerations
5. Suggested high-level task titles (as a numbered list)

IMPORTANT: Write ONLY the Markdown report. Do NOT include any JSON, code blocks, or extra text outside the Markdown.`;

const STRUCTURED_EXTRACT_PROMPT = `Based on the project report below, extract the key information as a JSON object.
Return ONLY a valid JSON object with no markdown, no code fences, and no extra text:
{
  "title": "The project title",
  "goal": "One sentence goal statement",
  "suggested_tasks": ["Task 1", "Task 2", "Task 3"]
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
  history: ChatMessage[]
): Promise<ProjectReportResult> {
  // ── Call 1: Generate the full Markdown report ──────────────────────────────
  const reportMessages: ChatMessage[] = [
    { role: "user", content: REPORT_SYSTEM_PROMPT },
    ...history,
    {
      role: "user",
      content: `Now generate the complete Markdown project report for: "${projectName}". Write ONLY Markdown, no JSON.`,
    },
  ];

  const rawReport = await postChat({ projectName, messages: reportMessages });

  // Strip any accidentally included code blocks or JSON residue
  const cleanReport = rawReport
    .replace(/`{3}(?:json)?[\s\S]*?`{3}/g, "")
    .trim();

  // ── Call 2: Extract structured JSON from the report ───────────────────────
  let structured: ProjectReportResult["structured"] = null;
  try {
    const extractMessages: ChatMessage[] = [
      { role: "user", content: STRUCTURED_EXTRACT_PROMPT },
      { role: "assistant", content: cleanReport },
      { role: "user", content: "Extract the JSON now. Return ONLY the JSON object, nothing else." },
    ];
    const rawJson = await postChat({ projectName, messages: extractMessages });
    
    const parsed = JSON.parse(rawJson.trim());
    if (parsed && parsed.suggested_tasks && Array.isArray(parsed.suggested_tasks)) {
      structured = parsed;
    }
  } catch {
    // structured stays null — report still shows, just no task suggestions
  }

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
  return `You are a Lead System Analyst helping users define a project strategy.

Your goal is to move efficiently from brainstorming to a structured report.
Do NOT ask one question at a time. Instead:
1. Identify ALL missing information pillars at once:
    - Purpose & Vision
    - Platform & Tech
    - Scope & Features
    - Constraints & Audience
2. Present your questions in a CLEAR, STRUCTURED way (use Markdown bullet points).
3. Encourage the user to provide as much detail as possible in one go.
4. Once these factors are clarified, proactively set suggestedAction.type = "generate_report".

Current context:
- Pending action: ${pendingActionType ?? "none"}
- Report exists: ${hasReport ? "YES" : "NO"}
${hasReport ? `\n--- CURRENT REPORT CONTENT ---\n${reportContent}\n--- END CURRENT REPORT ---\n` : ""}

Response format — you MUST return valid JSON (no markdown fences, just raw JSON):
{
  "reply": "Your professional response in English",
  "userIntent": "confirm|explore|reject|neutral",
  "suggestedAction": {
    "type": "generate_report|proceed_to_tasks|suggest_tasks",
    "hint": "Hint for user (e.g. 'Type yes to proceed')"
  }
}

CRITICAL RULES about "userIntent":
- "confirm" ONLY when user explicitly says yes/ok/confirm/proceed/go ahead to confirm a SPECIFIC pending action (generate_report or suggest_tasks).
- "neutral" when user is providing new information, asking questions, OR requesting changes to the report/plan.
- "explore" when user wants to discuss or explore options further.
- "reject" when user declines a suggestion.

CRITICAL RULES about report updates:
- If the user asks to UPDATE or REVISE the report (e.g. "update to 1000 users", "add section X", "revise report"):
  → Set userIntent = "neutral" (NOT "confirm")
  → Set suggestedAction.type = "generate_report"
  → In reply: acknowledge the change and say you will regenerate the report
  → This triggers a fresh report generation with the new context, NOT task elaboration.

- "confirm" leading to suggest_tasks ONLY happens when user explicitly says "yes" after seeing the message "Would you like me to elaborate the tasks?".

Other rules:
- Speak professionally in English.
- Do not use technical UI jargon like 'Click' or 'Press'. Use natural conversational language.
- If report exists and user asks for more info/adjustments, set suggestedAction.type = "generate_report" to create a new version.
- IF USER REQUESTS TO EDIT A SPECIFIC TASK (e.g. 'edit task 1 to...'):
  1. Respond with confirmation in 'reply'.
  2. Must include 'taskUpdate' with 'index' (0-based) and the new content.
  3. NO need to set 'suggestedAction' for individual task edits.`;
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

  // Since we assume LLM outputs perfect JSON 100% of the time
  try {
    const parsed = JSON.parse(raw.trim());
    return {
      reply: parsed.reply ?? raw,
      userIntent: (parsed.userIntent ?? "neutral") as UserIntent,
      suggestedAction: (parsed.suggestedAction ?? null) as SuggestedAction | null,
      report: parsed.report,
      taskUpdate: parsed.taskUpdate,
    };
  } catch {
    // Basic network or blank response fallback
    return { reply: raw, userIntent: "neutral", suggestedAction: null };
  }
}
