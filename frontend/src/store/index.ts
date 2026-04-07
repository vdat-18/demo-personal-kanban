// ─────────────────────────────────────────────────────────────────────────────
// ZUSTAND STORE — combines all slices
// Pattern: Zustand slice pattern (docs.pmnd.rs/zustand/guides/slices-pattern)
// ─────────────────────────────────────────────────────────────────────────────

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

import type {
  Project,
  Task,
  TaskStatus,
  DetailedTask,
  PlanningHistoryEntry,
  Asset,
  TaskMoveRecord,
} from "@/types/domain";
import { AGENT_MAPPING } from "@/constants/agents";

// ─────────────────────────────────────────────────────────────────────────────
// STATE SHAPE
// ─────────────────────────────────────────────────────────────────────────────

export interface StoreState {
  projects: Project[];
  assets: Asset[];
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

  /**
   * Move a task to a new status. Records move history.
   * @param by       "agent" if triggered by agent suggestion confirm, "user" if human dragged
   * @param note     Optional note (e.g. Reviewer feedback summary)
   */
  moveTask: (
    projectId: string,
    taskId: string,
    newStatus: TaskStatus,
    by?: "agent" | "user",
    note?: string
  ) => void;

  /**
   * Mark kickoff as done so we don't re-trigger the LLM greeting on re-render.
   * Called by TaskChat after the first auto-kickoff message is sent.
   */
  markKickoffDone: (projectId: string, taskId: string) => void;

  /**
   * Cancel a task with an optional reason. Records the cancel reason and
   * move history entry.
   */
  cancelTask: (
    projectId: string,
    taskId: string,
    reason?: string,
    by?: "agent" | "user"
  ) => void;

  /**
   * Restore a cancelled task back to "todo" so the Starter Agent can
   * re-evaluate with fresh context.
   */
  restoreTask: (projectId: string, taskId: string) => void;

  toggleSubtask: (projectId: string, taskId: string, subtaskId: string) => void;
  addSubtask: (projectId: string, taskId: string, text: string) => void;
  deleteSubtask: (projectId: string, taskId: string, subtaskId: string) => void;
  updateSubtask: (projectId: string, taskId: string, subtaskId: string, text: string) => void;
  setSubtasks: (projectId: string, taskId: string, texts: string[]) => void;

  // ── Assets ─────────────────────────────────────────────────────────────────
  addAsset: (asset: Asset) => void;
  deleteAsset: (id: string) => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// STORE
// ─────────────────────────────────────────────────────────────────────────────

export const useProjectStore = create<StoreState>()(
  persist(
    (set) => ({
      projects: [],
      assets: [],
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
            const hasChanged =
              (updatedFields.title && updatedFields.title !== oldTask.title) ||
              (updatedFields.description &&
                updatedFields.description !== oldTask.description);

            if (hasChanged) {
              const historyEntry = {
                title: oldTask.title,
                description: oldTask.description,
                timestamp: Date.now(),
                author,
              };
              newTasks[taskIndex] = {
                ...oldTask,
                ...updatedFields,
                history: [...(oldTask.history ?? []), historyEntry],
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

      moveTask: (projectId, taskId, newStatus, by = "user", note) =>
        set((state) => ({
          projects: state.projects.map((p) => {
            if (p.id !== projectId) return p;
            return {
              ...p,
              tasks: p.tasks.map((t) => {
                if (t.id !== taskId) return t;

                const moveRecord: TaskMoveRecord = {
                  from: t.status,
                  to: newStatus,
                  timestamp: Date.now(),
                  by,
                  ...(note ? { note } : {}),
                };

                return {
                  ...t,
                  status: newStatus,
                  agentType: AGENT_MAPPING[newStatus],
                  updatedAt: new Date().toISOString(),
                  // Reset kickoff flag whenever task moves to a new column
                  kickoffDone: false,
                  moveHistory: [...(t.moveHistory ?? []), moveRecord],
                };
              }),
            };
          }),
        })),

      markKickoffDone: (projectId, taskId) =>
        set((state) => ({
          projects: state.projects.map((p) => {
            if (p.id !== projectId) return p;
            return {
              ...p,
              tasks: p.tasks.map((t) =>
                t.id !== taskId ? t : { ...t, kickoffDone: true }
              ),
            };
          }),
        })),

      cancelTask: (projectId, taskId, reason, by = "user") =>
        set((state) => ({
          projects: state.projects.map((p) => {
            if (p.id !== projectId) return p;
            return {
              ...p,
              tasks: p.tasks.map((t) => {
                if (t.id !== taskId) return t;

                const moveRecord: TaskMoveRecord = {
                  from: t.status,
                  to: "cancelled",
                  timestamp: Date.now(),
                  by,
                  ...(reason ? { note: reason } : {}),
                };

                return {
                  ...t,
                  status: "cancelled" as TaskStatus,
                  agentType: AGENT_MAPPING["cancelled"],
                  updatedAt: new Date().toISOString(),
                  kickoffDone: true, // no kickoff needed for cancelled
                  cancelReason: reason,
                  moveHistory: [...(t.moveHistory ?? []), moveRecord],
                };
              }),
            };
          }),
        })),

      restoreTask: (projectId, taskId) =>
        set((state) => ({
          projects: state.projects.map((p) => {
            if (p.id !== projectId) return p;
            return {
              ...p,
              tasks: p.tasks.map((t) => {
                if (t.id !== taskId || t.status !== "cancelled") return t;

                const moveRecord: TaskMoveRecord = {
                  from: "cancelled",
                  to: "todo",
                  timestamp: Date.now(),
                  by: "user",
                  note: "Restored by user",
                };

                return {
                  ...t,
                  status: "todo" as TaskStatus,
                  agentType: AGENT_MAPPING["todo"],
                  updatedAt: new Date().toISOString(),
                  kickoffDone: false, // trigger fresh kickoff from Starter Agent
                  cancelReason: undefined,
                  moveHistory: [...(t.moveHistory ?? []), moveRecord],
                };
              }),
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

      addSubtask: (projectId, taskId, text) =>
        set((state) => ({
          projects: state.projects.map((p) => {
            if (p.id !== projectId) return p;
            return {
              ...p,
              tasks: p.tasks.map((t) => {
                if (t.id !== taskId) return t;
                const newSubtask = {
                  id: `sub-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                  text,
                  completed: false,
                };
                return {
                  ...t,
                  subtasks: [...t.subtasks, newSubtask],
                };
              }),
            };
          }),
        })),

      deleteSubtask: (projectId, taskId, subtaskId) =>
        set((state) => ({
          projects: state.projects.map((p) => {
            if (p.id !== projectId) return p;
            return {
              ...p,
              tasks: p.tasks.map((t) => {
                if (t.id !== taskId) return t;
                return {
                  ...t,
                  subtasks: t.subtasks.filter((s) => s.id !== subtaskId),
                };
              }),
            };
          }),
        })),

      updateSubtask: (projectId, taskId, subtaskId, text) =>
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
                    s.id === subtaskId ? { ...s, text } : s
                  ),
                };
              }),
            };
          }),
        })),

      setSubtasks: (projectId, taskId, texts) =>
        set((state) => ({
          projects: state.projects.map((p) => {
            if (p.id !== projectId) return p;
            return {
              ...p,
              tasks: p.tasks.map((t) => {
                if (t.id !== taskId) return t;
                const subtasks = texts.map((text, i) => ({
                  id: `sub-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 5)}`,
                  text,
                  completed: false,
                }));
                return { ...t, subtasks };
              }),
            };
          }),
        })),

      // ── Assets ───────────────────────────────────────────────────────────
      addAsset: (asset) =>
        set((state) => ({
          assets: [asset, ...state.assets],
        })),

      deleteAsset: (id) =>
        set((state) => ({
          assets: state.assets.filter((a) => a.id !== id),
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
