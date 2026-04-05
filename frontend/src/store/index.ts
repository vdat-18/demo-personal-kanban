// ─────────────────────────────────────────────────────────────────────────────
// ZUSTAND STORE — combines all slices
// Pattern: Zustand slice pattern (docs.pmnd.rs/zustand/guides/slices-pattern)
// ─────────────────────────────────────────────────────────────────────────────

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

import type { Project, Task, TaskStatus, DetailedTask, PlanningHistoryEntry } from "@/types/domain";
import { AGENT_MAPPING } from "@/constants/agents";

// ─────────────────────────────────────────────────────────────────────────────
// STATE SHAPE
// ─────────────────────────────────────────────────────────────────────────────

export interface StoreState {
  projects: Project[];
  activeProjectId: string | null;

  // ── Project CRUD ───────────────────────────────────────────────────────────
  setActiveProject: (id: string) => void;
  addProject: (project: Project) => void;
  deleteProject: (id: string) => void;

  // ── Planning ───────────────────────────────────────────────────────────────
  /** Sync planning chat messages, report markdown and structured JSON to store */
  updateProjectPlanning: (
    id: string,
    messages: unknown[],
    report?: string,
    structured?: Project["planningStructured"]
  ) => void;

  /** Append current report to history, then set new report content */
  updateProjectPlanningReport: (
    id: string,
    report: string,
    author: PlanningHistoryEntry["author"]
  ) => void;

  /** Store the AI-elaborated detailed task list */
  updateProjectDetailedTasks: (id: string, tasks: DetailedTask[]) => void;

  /** Update a specific detailed task and record history */
  updateProjectDetailedTask: (
    projectId: string,
    taskIndex: number,
    updatedTask: Partial<DetailedTask>,
    author: "ai" | "user"
  ) => void;

  // ── Execution ──────────────────────────────────────────────────────────────
  /** Transition project from planning → execution with generated tasks */
  startExecution: (id: string, tasks: Task[]) => void;

  // ── Task operations ────────────────────────────────────────────────────────
  addTask: (projectId: string, task: Task) => void;
  moveTask: (projectId: string, taskId: string, newStatus: TaskStatus) => void;
  toggleSubtask: (projectId: string, taskId: string, subtaskId: string) => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// STORE
// ─────────────────────────────────────────────────────────────────────────────

export const useProjectStore = create<StoreState>()(
  persist(
    (set) => ({
      projects: [],
      activeProjectId: null,

      // ── Project CRUD ─────────────────────────────────────────────────────

      setActiveProject: (id) => set({ activeProjectId: id }),

      addProject: (project) =>
        set((state) => ({
          projects: [...state.projects, project],
          activeProjectId: project.id,
        })),

      deleteProject: (id) =>
        set((state) => ({
          projects: state.projects.filter((p) => p.id !== id),
          activeProjectId:
            state.activeProjectId === id ? null : state.activeProjectId,
        })),

      // ── Planning ─────────────────────────────────────────────────────────

      updateProjectPlanning: (id, messages, report, structured) =>
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === id
              ? {
                  ...p,
                  planningMessages: messages,
                  planningReport: report ?? p.planningReport,
                  planningStructured: structured ?? p.planningStructured,
                }
              : p
          ),
        })),

      updateProjectPlanningReport: (id, report, author) =>
        set((state) => ({
          projects: state.projects.map((p) => {
            if (p.id !== id) return p;
            const oldReport = p.planningReport ?? "";
            if (oldReport === report) return p; // no-op if content unchanged

            const entry: PlanningHistoryEntry = {
              content: oldReport,
              timestamp: Date.now(),
              author,
            };
            return {
              ...p,
              planningReport: report,
              planningHistory: [...(p.planningHistory ?? []), entry],
            };
          }),
        })),

      updateProjectDetailedTasks: (id, tasks) =>
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === id ? { ...p, planningDetailedTasks: tasks } : p
          ),
        })),

      updateProjectDetailedTask: (projectId, taskIndex, updatedFields, author) =>
        set((state) => ({
          projects: state.projects.map((p) => {
            if (p.id !== projectId || !p.planningDetailedTasks) return p;
            
            const newTasks = [...p.planningDetailedTasks];
            const oldTask = newTasks[taskIndex];
            if (!oldTask) return p;

            // Only update history if title or description actually changed
            const hasChanged = (updatedFields.title && updatedFields.title !== oldTask.title) || 
                               (updatedFields.description && updatedFields.description !== oldTask.description);

            if (hasChanged) {
              const historyEntry = {
                title: oldTask.title,
                description: oldTask.description,
                timestamp: Date.now(),
                author
              };
              newTasks[taskIndex] = {
                ...oldTask,
                ...updatedFields,
                history: [...(oldTask.history ?? []), historyEntry]
              };
            } else {
              newTasks[taskIndex] = { ...oldTask, ...updatedFields };
            }

            return { ...p, planningDetailedTasks: newTasks };
          }),
        })),

      // ── Execution ────────────────────────────────────────────────────────

      startExecution: (id, tasks) =>
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === id ? { ...p, status: "execution", tasks } : p
          ),
        })),

      // ── Task operations ──────────────────────────────────────────────────

      addTask: (projectId, task) =>
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id !== projectId ? p : { ...p, tasks: [...p.tasks, task] }
          ),
        })),

      moveTask: (projectId, taskId, newStatus) =>
        set((state) => ({
          projects: state.projects.map((p) => {
            if (p.id !== projectId) return p;
            return {
              ...p,
              tasks: p.tasks.map((t) =>
                t.id !== taskId
                  ? t
                  : {
                      ...t,
                      status: newStatus,
                      agentType: AGENT_MAPPING[newStatus],
                      updatedAt: new Date().toISOString(),
                    }
              ),
            };
          }),
        })),

      toggleSubtask: (projectId, taskId, subtaskId) =>
        set((state) => ({
          projects: state.projects.map((p) => {
            if (p.id !== projectId) return p;
            return {
              ...p,
              tasks: p.tasks.map((t) => {
                if (t.id !== taskId) return t;
                return {
                  ...t,
                  subtasks: t.subtasks.map((s) =>
                    s.id === subtaskId ? { ...s, completed: !s.completed } : s
                  ),
                };
              }),
            };
          }),
        })),
    }),
    {
      name: "pi-kanban-storage",
      storage: createJSONStorage(() => localStorage),
    }
  )
);

// ─────────────────────────────────────────────────────────────────────────────
// SELECTORS — memoizable, avoids re-renders
// ─────────────────────────────────────────────────────────────────────────────

export const selectProject = (id: string) => (state: StoreState) =>
  state.projects.find((p) => p.id === id);

export const selectTask =
  (projectId: string, taskId: string) => (state: StoreState) =>
    state.projects
      .find((p) => p.id === projectId)
      ?.tasks.find((t) => t.id === taskId);

export const selectTaskByTaskId = (taskId: string) => (state: StoreState) => {
  for (const project of state.projects) {
    const task = project.tasks.find((t) => t.id === taskId);
    if (task) return { project, task };
  }
  return null;
};

// Re-export domain types for convenience (consumers import from store)
export type { Task, Project, TaskStatus, Subtask, DetailedTask } from "@/types/domain";
