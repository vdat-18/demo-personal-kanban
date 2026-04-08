// ─────────────────────────────────────────────────────────────────────────────
// Agent Kickoff Prompt Builder
// Generates the opening system + user message when a task enters a new column.
// Called once per (taskId, status) combination — guarded by kickoffDone flag.
// ─────────────────────────────────────────────────────────────────────────────

import type { Task, TaskStatus, TaskMoveRecord, Project } from "@/types/domain";

// ─────────────────────────────────────────────────────────────────────────────
// SYSTEM PROMPT PER AGENT
// ─────────────────────────────────────────────────────────────────────────────


const SYSTEM_PROMPTS: Record<TaskStatus, string> = {

  // ── TODO: Planner Agent ──────────────────────────────────────────────────
  todo: `You are the Planner Agent. Break this task into executable subtasks immediately.

FIRST RESPONSE — always follow this structure:
1. One sentence on what this task is and why it matters.
2. Emit subtasks as JSON (required, no questions first):
\`\`\`json
{
  "action": "SET_SUBTASKS",
  "subtasks": [
    {
      "text": "Title [Est: ~Xh | Priority: HIGH/MED/LOW]",
      "description": "WHAT: what to do. HOW: how to do it. OUTPUT: exact deliverable. Dependencies: prerequisite subtasks or None."
    }
  ]
}
\`\`\`
3. State whether context is sufficient (✅) or what's missing (⚠️).
4. Invite feedback in one sentence.

SUBSEQUENT RESPONSES:
- If user modifies subtasks → re-emit SET_SUBTASKS with the complete updated list.
- If user approves → verify every subtask has HOW + OUTPUT, then emit:
\`\`\`json
{ "action": "SUGGEST_MOVE", "target": "doing", "message": "Plan ready — all subtasks have clear HOW and OUTPUT" }
\`\`\`
- Never emit SUGGEST_MOVE if HOW or OUTPUT is missing from any subtask.
- Respond in the same language the user uses.`,

  // ── PLANNING: Planner Agent (enrich mode) ────────────────────────────────
  planning: `You are the Planner Agent. Enrich the existing subtask list with full execution detail.

1. Confirm understanding in 1-2 sentences.
2. Improve each subtask — add WHAT, HOW, OUTPUT, Dependencies, estimated time, priority:
\`\`\`json
{
  "action": "SET_SUBTASKS",
  "subtasks": [{ "text": "Title [Est: ~Xh | Priority: HIGH]", "description": "WHAT: ... HOW: ... OUTPUT: ... Dependencies: ..." }]
}
\`\`\`
3. List top risks and required resources (2-3 bullets each).
4. Signal readiness:
\`\`\`json
{ "action": "SUGGEST_MOVE", "target": "doing", "message": "Plan enriched and ready for execution" }
\`\`\`
Do not ask clarifying questions — state assumptions explicitly.`,

  // ── DOING: Doer Agent ────────────────────────────────────────────────────
  doing: `You are the Doer Agent. Execute the plan — do not re-discuss or re-plan.

FIRST RESPONSE: State which subtask you are starting and why (priority + dependencies).

FOR EACH SUBTASK:
1. Produce concrete output (not advice) — write the actual content, draft, analysis, or steps.
2. After completing, emit:
\`\`\`json
{ "action": "COMPLETE_SUBTASK", "subtask_text": "Exact subtask title" }
\`\`\`
3. Immediately suggest the next subtask.

BLOCKERS: State the problem + offer 2-3 options. Never fabricate.

WHEN ALL SUBTASKS DONE:
\`\`\`json
{ "action": "SUGGEST_MOVE", "target": "review", "message": "All subtasks completed — ready for review" }
\`\`\``,

  // ── REVIEW: Reviewer Agent ───────────────────────────────────────────────
  review: `You are the Reviewer Agent. Immediately review all subtasks against the task goals.

FOR EACH SUBTASK, rate it:
- ✅ PASS — complete and correct
- ⚠️ MINOR — small gap, fixable in Doing
- ❌ MAJOR — wrong approach or missing deliverable

Format: **[Subtask]**: ✅/⚠️/❌ — Reason. Fix: [action if needed]

VERDICT (emit one of):
\`\`\`json
{ "action": "SUGGEST_MOVE", "target": "done", "message": "All outputs approved" }
\`\`\`
\`\`\`json
{ "action": "VERDICT", "result": "needs_doing", "issues": ["specific issue"] }
\`\`\`
\`\`\`json
{ "action": "VERDICT", "result": "needs_planning", "issues": ["specific issue"] }
\`\`\`
Be objective. Every issue needs a concrete fix action.`,

  // ── DONE: Reporter Agent ─────────────────────────────────────────────────
  done: `You are the Reporter Agent.
1. Congratulate the user on completing the task.
2. Summarize what was accomplished and key outputs produced.
3. Share 1-3 lessons learned or improvement suggestions.
4. Suggest the next logical task for the project.`,

  cancelled: `This task has been cancelled. No action required.`,
};

// ─────────────────────────────────────────────────────────────────────────────
// CONTEXT BUILDER
// ─────────────────────────────────────────────────────────────────────────────

function formatMoveHistory(moveHistory?: TaskMoveRecord[]): string {
  if (!moveHistory || moveHistory.length === 0) return "No previous moves.";
  return moveHistory
    .map((m) => {
      const time = new Date(m.timestamp).toLocaleString();
      const note = m.note ? ` Note: ${m.note}` : "";
      return `- ${m.from} → ${m.to} (by ${m.by}, ${time})${note}`;
    })
    .join("\n");
}

/**
 * Build the kickoff user message sent to the LLM when a task enters a column.
 * This message is injected as the first "user" turn so the agent can respond
 * with a context-aware greeting.
 *
 * When project is provided (for todo status), it injects the full project
 * planning context so the AI can immediately propose subtasks without asking
 * clarifying questions.
 */
export function buildKickoffUserMessage(task: Task, project?: Project): string {
  const subtaskSummary =
    task.subtasks.length > 0
      ? task.subtasks
          .map((s) => `- [${s.completed ? "x" : " "}] ${s.text}`)
          .join("\n")
      : "No subtasks defined yet.";

  const moveHistory = formatMoveHistory(task.moveHistory);

  // Detect if this is a backward move (from a later stage)
  const lastMove = task.moveHistory?.[task.moveHistory.length - 1];
  const isBackwardMove =
    lastMove &&
    ["doing", "review", "done"].includes(lastMove.from) &&
    ["todo", "planning", "doing"].includes(lastMove.to);

  const backwardContext = isBackwardMove
    ? `\n⚠️ IMPORTANT: This task was moved BACKWARD from "${lastMove.from}" to "${lastMove.to}". ${
        lastMove.note
          ? `Reason: ${lastMove.note}`
          : "Please acknowledge this and address any issues from the previous stage."
      }`
    : "";

  // Build project context block for todo status (AI-first subtask proposal)
  let projectContext = "";
  if (task.status === "todo" && project) {
    const goal = project.planningStructured?.goal ?? "";
    const suggestedTasks = project.planningStructured?.suggested_tasks ?? [];

    // Truncate planning report to avoid token overflow (~2000 chars)
    const reportSnippet = project.planningReport
      ? project.planningReport.slice(0, 2000) + (project.planningReport.length > 2000 ? "\n...[truncated]" : "")
      : "";

    // Find the detailed task that matches this task by title similarity
    const detailedTask = project.planningDetailedTasks?.find(
      (dt) => dt.title.toLowerCase().includes(task.title.toLowerCase().slice(0, 20)) ||
              task.title.toLowerCase().includes(dt.title.toLowerCase().slice(0, 20))
    );

    projectContext = `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PROJECT CONTEXT (use this to propose subtasks immediately)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Project: ${project.name}
${goal ? `Project Goal: ${goal}` : ""}

${suggestedTasks.length > 0 ? `All project tasks:\n${suggestedTasks.map((t, i) => `${i + 1}. ${t}`).join("\n")}` : ""}

${detailedTask ? `Elaborated details for THIS task:
- Description: ${detailedTask.description}
- Why it matters: ${detailedTask.why}
- Suggested agent: ${detailedTask.agent_hint}` : ""}

${reportSnippet ? `Planning Report (summary):\n${reportSnippet}` : ""}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
INSTRUCTION: Based on ALL the context above, immediately propose subtasks for THIS task.
Do NOT ask questions — use the context to make smart assumptions.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;
  }

  return `NEW TASK CONTEXT:
${projectContext}
Title: ${task.title}
Description: ${task.description}
${task.why ? `Why it matters: ${task.why}` : ""}

Current Status: ${task.status}
Assigned Agent: ${task.agentType}

Subtasks:
${subtaskSummary}

Move History:
${moveHistory}
${backwardContext}

Please begin your role as the ${task.agentType} for this task.`;
}

/**
 * Get the system prompt for a given task status.
 */
export function getAgentSystemPrompt(status: TaskStatus): string {
  return SYSTEM_PROMPTS[status] ?? SYSTEM_PROMPTS.todo;
}
