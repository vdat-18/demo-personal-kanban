// ─────────────────────────────────────────────────────────────────────────────
// useTaskElaboration — manages AI task elaboration lifecycle
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect } from "react";
import { useProjectStore } from "@/store";
import { generateDetailedTasks } from "@/lib/llm";
import type { DetailedTask } from "@/types/domain";

export interface UseTaskElaborationOptions {
  projectId: string;
  reportContent: string;
  suggestedTaskTitles: string[];
  /** Called when phase should switch to tasks view */
  onElaborationStart: () => void;
}

export interface UseTaskElaborationReturn {
  detailedTasks: DetailedTask[];
  elaborationSummary: string;
  isElaborating: boolean;
  expandedTasks: Set<number>;
  toggleTaskExpand: (idx: number) => void;
  elaborate: () => Promise<void>;
}

export function useTaskElaboration({
  projectId,
  reportContent,
  suggestedTaskTitles,
  onElaborationStart,
}: UseTaskElaborationOptions): UseTaskElaborationReturn {
  const { projects, updateProjectDetailedTasks } = useProjectStore();

  const existingProject = projects.find((p) => p.id === projectId);

  const [detailedTasks, setDetailedTasks] = useState<DetailedTask[]>(
    existingProject?.planningDetailedTasks ?? []
  );
  const [elaborationSummary, setElaborationSummary] = useState("");
  const [isElaborating, setIsElaborating] = useState(false);
  const [expandedTasks, setExpandedTasks] = useState<Set<number>>(new Set([0]));

  // Persist to store whenever tasks change
  useEffect(() => {
    if (detailedTasks.length > 0) {
      updateProjectDetailedTasks(projectId, detailedTasks);
    }
  }, [detailedTasks]);

  const elaborate = async () => {
    if (!suggestedTaskTitles.length) return;

    onElaborationStart();
    setIsElaborating(true);

    try {
      const result = await generateDetailedTasks(reportContent, suggestedTaskTitles);
      setDetailedTasks(result.tasks);
      setElaborationSummary(result.summary);
      setExpandedTasks(new Set([0])); // expand first task by default
    } catch (err) {
      console.error("[useTaskElaboration] Elaboration failed:", err);
      // Graceful fallback — bare tasks without descriptions
      const fallback: DetailedTask[] = suggestedTaskTitles.map((title) => ({
        title,
        description: "",
        why: "",
        suggested_subtasks: [],
        agent_hint: "Starter Agent" as const,
      }));
      setDetailedTasks(fallback);
    } finally {
      setIsElaborating(false);
    }
  };

  const toggleTaskExpand = (idx: number) => {
    setExpandedTasks((prev) => {
      const next = new Set(prev);
      next.has(idx) ? next.delete(idx) : next.add(idx);
      return next;
    });
  };

  return {
    detailedTasks,
    elaborationSummary,
    isElaborating,
    expandedTasks,
    toggleTaskExpand,
    elaborate,
  };
}
