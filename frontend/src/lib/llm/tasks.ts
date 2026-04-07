// ─────────────────────────────────────────────────────────────────────────────
// TASKS LLM — AI elaboration of task titles into detailed task objects
// ─────────────────────────────────────────────────────────────────────────────

import type { DetailedTask, DetailedTasksResponse } from "@/types/domain";
import { postChat, extractJSON } from "./client";

function buildElaborationPrompt(projectReport: string, taskTitles: string[]): string {
  return `You are an expert project manager. Given the project report below and a list of task titles,
expand each task with a detailed description, a "why this matters" explanation,
3-5 concrete subtasks, and the most appropriate agent type.

PROJECT REPORT:
${projectReport}

TASK TITLES TO ELABORATE:
${taskTitles.map((t, i) => `${i + 1}. ${t}`).join("\n")}

Return ONLY valid JSON in this exact format:
{
  "summary": "One sentence describing the overall execution plan",
  "tasks": [
    {
      "title": "Exact task title from the list",
      "description": "2-3 sentences describing what this task involves and what the output looks like",
      "why": "1-2 sentences explaining why this task is critical to the project",
      "suggested_subtasks": ["Subtask A", "Subtask B", "Subtask C"],
      "agent_hint": "Doer Agent"
    }
  ]
}

Agent hint options: "Starter Agent", "Planner Agent", "Doer Agent", "Reviewer Agent", "Reporter Agent"
- Use "Planner Agent" for research/analysis tasks
- Use "Doer Agent" for execution/implementation tasks
- Use "Reviewer Agent" for QA/validation tasks
- Use "Reporter Agent" for reporting/documentation tasks
- Use "Starter Agent" for initial setup tasks`;
}

export async function generateDetailedTasks(
  projectReport: string,
  taskTitles: string[]
): Promise<DetailedTasksResponse> {
  const raw = await postChat({
    messages: [{ role: "user", content: buildElaborationPrompt(projectReport, taskTitles) }],
  });

  try {
    const parsed = JSON.parse(extractJSON(raw));
    const tasks: DetailedTask[] = (parsed.tasks ?? []).map((t: Partial<DetailedTask>) => ({
      title: t.title ?? "",
      description: t.description ?? "",
      why: t.why ?? "",
      suggested_subtasks: Array.isArray(t.suggested_subtasks) ? t.suggested_subtasks : [],
      agent_hint: t.agent_hint ?? "Starter Agent",
    }));
    return { summary: parsed.summary ?? "", tasks };
  } catch {
    // Fallback — bare task list without AI elaboration
    return {
      summary: "",
      tasks: taskTitles.map((title) => ({
        title,
        description: "",
        why: "",
        suggested_subtasks: [],
        agent_hint: "Starter Agent" as const,
      })),
    };
  }
}
