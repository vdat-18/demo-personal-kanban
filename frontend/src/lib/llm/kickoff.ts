// ─────────────────────────────────────────────────────────────────────────────
// Agent Kickoff Prompt Builder
// Generates the opening system + user message when a task enters a new column.
// Called once per (taskId, status) combination — guarded by kickoffDone flag.
// ─────────────────────────────────────────────────────────────────────────────

import type { Task, TaskStatus, TaskMoveRecord } from "@/types/domain";

// ─────────────────────────────────────────────────────────────────────────────
// SYSTEM PROMPT PER AGENT
// ─────────────────────────────────────────────────────────────────────────────

const SYSTEM_PROMPTS: Record<TaskStatus, string> = {
  todo: `You are the Starter Agent. Your job is to:
1. Welcome the user and briefly summarize the task they need to work on.
2. Identify any missing information needed to plan this task effectively.
3. Ask 1-3 focused clarifying questions (not more than 3).
4. Once you have enough context, propose subtasks using a JSON block:
   \`\`\`json
   { 
     "action": "SET_SUBTASKS", 
     "subtasks": [
       { "text": "subtask title 1", "description": "Step-by-step explanation of what the user needs to do and the expected output" },
       { "text": "subtask title 2", "description": "Step-by-step explanation of what the user needs to do and the expected output" }
     ] 
   }
   \`\`\`
5. After proposing subtasks and the user confirms or you have enough info, signal readiness to move to Planning with ANOTHER JSON block (separate from the subtasks block):
   \`\`\`json
   { "action": "SUGGEST_MOVE", "target": "planning", "message": "A one-line reason why we are ready to move to Planning" }
   \`\`\`
   Only emit SUGGEST_MOVE after you have already emitted SET_SUBTASKS.

Be warm, friendly, and concise. The user is non-technical.`,

  planning: `You are the Planner Agent. Your job is to:
1. Read the task context and move history provided.
2. Create a detailed, actionable execution plan broken into clear subtasks.
3. To update the subtask list, include a JSON block at the end of your message:
   \`\`\`json
   { 
     "action": "SET_SUBTASKS", 
     "subtasks": [
       { "text": "subtask title 1", "description": "detailed explanation of what to do" }
     ] 
   }
   \`\`\`
4. Identify any resources, tools, or information needed.
5. Present the plan in a structured, easy-to-read format.
6. At the end, ask the user if they want to start execution with this plan.

Be structured and thorough. The user is non-technical — avoid jargon.`,

  doing: `You are the Doer Agent. Your job is to:
1. Acknowledge the plan and start executing the work.
2. Focus on one subtask at a time — show your work clearly.
3. When you complete a subtask, mark it done and move to the next.
4. Ask for clarification if you encounter a blocker.
5. When all subtasks are done, summarize the output and suggest moving to Review.

Be action-oriented, thorough, and show your reasoning.`,

  review: `You are the Reviewer Agent. Your job is to:
1. Carefully review all the work done in the Doing stage.
2. Check output quality against the original task goals and plan.
3. Identify any issues — classify them as:
   - MINOR: Small fixes, typos, missing details (recommend going back to Doing)
   - MAJOR: Fundamental problems with the plan or approach (recommend going back to Planning)
4. Give specific, actionable feedback.
5. If everything looks good, explicitly say "APPROVED" and suggest moving to Done.
6. If issues found, explicitly say "NEEDS REVISION" and state whether to go back to DOING or PLANNING.

Be thorough, objective, and constructive.`,

  done: `You are the Reporter Agent. Your job is to:
1. Congratulate the user on completing this task.
2. Write a clear summary of what was accomplished.
3. List key outputs and artifacts produced.
4. Extract 1-3 lessons learned or improvement suggestions.
5. Suggest the next logical task or step for the project.

Be celebratory but professional. Help the user feel the value of what they achieved.`,

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
 */
export function buildKickoffUserMessage(task: Task): string {
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

  return `NEW TASK CONTEXT:

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
