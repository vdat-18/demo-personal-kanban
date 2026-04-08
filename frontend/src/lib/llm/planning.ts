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

const REPORT_SYSTEM_PROMPT_NEW = `You are an expert project strategist.
Based on the brainstorming conversation below, generate a comprehensive project report in Markdown.

The report must include:
1. A clear project title and goal statement
2. Key objectives and success criteria
3. Stakeholders and context
4. Risk considerations
5. Suggested high-level task titles (as a numbered list)

IMPORTANT: Write ONLY the Markdown report. Do NOT include any JSON, code blocks, or extra text outside the Markdown.`;

const REPORT_SYSTEM_PROMPT_UPDATE = `You are an expert project strategist.
You are given an EXISTING project report and a USER INSTRUCTION describing what changes to make.

Your job:
- Apply ONLY the specific changes requested by the user.
- Preserve all sections that are not affected by the request.
- Do NOT regenerate the entire report from scratch — keep the existing structure and content, then apply the edit.
- If the user asks to "add X", add it to the appropriate section.
- If the user asks to "change X to Y", update only that part.
- If the user asks to "remove X", delete only that part.

IMPORTANT: Write ONLY the updated Markdown report. Do NOT include any JSON, code blocks, or extra explanation outside the Markdown.`;

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
- "confirm": Use this when the user explicitly says yes/ok/go ahead OR when the user gives a DIRECT COMMAND to update, revise, or change the report/tasks (e.g. "Update the report", "Add section X", "Sửa lại report..."). This triggers immediate execution.
- "neutral": Use when user is providing new information, asking general questions, or still in the brainstorming flow.
- "explore": Use when user wants to discuss or explore options further.
- "reject": Use when user declines a suggestion.

EXECUTION LOGIC:
- If the user asks to UPDATE or REVISE the report:
  → Set userIntent = "confirm"
  → Set suggestedAction.type = "generate_report"
  → In reply: acknowledge the change and say you are regenerating the report now.

- If the user asks for more info or adjustments that require a new report version:
  → Set userIntent = "confirm"
  → Set suggestedAction.type = "generate_report"

Other rules:
- Speak professionally in English.
- Do not use technical UI jargon.
- IF USER REQUESTS TO EDIT A SPECIFIC TASK (e.g. 'edit task 1 to...'):
  1. Respond with confirmation in 'reply'.
  2. Must include 'taskUpdate' with 'index' (0-based) and the new content.
  3. No need to set 'suggestedAction' for individual task edits.`;
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
