import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type TaskStatus = 'todo' | 'planning' | 'doing' | 'review' | 'done' | 'cancelled';

export interface Subtask {
  id: string;
  text: string;
  completed: boolean;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  subtasks: Subtask[];
  agentType: string;
  updatedAt: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  status: 'planning' | 'execution' | 'done';
  tasks: Task[];
  // Permenant fields for planning history
  planningMessages?: any[]; 
  planningReport?: string;
  planningHistory?: { content: string; timestamp: number; author: "ai" | "user" }[];
  planningStructured?: any;
  createdAt: string;
}

interface ProjectState {
  projects: Project[];
  activeProjectId: string | null;
  
  // Actions
  setActiveProject: (id: string) => void;
  addProject: (project: Project) => void;
  deleteProject: (id: string) => void;
  updateProjectPlanning: (id: string, messages: any[], report?: string, structured?: any) => void;
  moveTask: (projectId: string, taskId: string, newStatus: TaskStatus) => void;
  toggleSubtask: (projectId: string, taskId: string, subtaskId: string) => void;
  addTask: (projectId: string, task: Task) => void;
  startExecution: (projectId: string, tasks: Task[]) => void;
}

const AGENT_MAPPING: Record<TaskStatus, string> = {
  todo: 'Starter Agent',
  planning: 'Planner Agent',
  doing: 'Doer Agent',
  review: 'Reviewer Agent',
  done: 'Reporter Agent',
  cancelled: 'System'
};

export const useProjectStore = create<ProjectState>()(
  persist(
    (set) => ({
      projects: [],
      activeProjectId: null,

      setActiveProject: (id) => set({ activeProjectId: id }),

      addProject: (project) => set((state) => ({ 
        projects: [...state.projects, project],
        activeProjectId: project.id 
      })),

      deleteProject: (id) => set((state) => ({
        projects: state.projects.filter(p => p.id !== id),
        activeProjectId: state.activeProjectId === id ? null : state.activeProjectId
      })),

      updateProjectPlanning: (id, messages, report, structured) => set((state) => ({
        projects: state.projects.map(p => 
          p.id === id 
            ? { 
                ...p, 
                planningMessages: messages, 
                planningReport: report ?? p.planningReport, 
                planningStructured: structured ?? p.planningStructured 
              } 
            : p
        )
      })),

      updateProjectPlanningReport: (projectId: string, report: string, author: "ai" | "user") => set((state) => {
        const projects = state.projects.map((p) => {
          if (p.id === projectId) {
            const oldReport = p.planningReport || "";
            if (oldReport === report) return p;

            const historyItem = { content: oldReport, timestamp: Date.now(), author };
            const newHistory = [...(p.planningHistory || []), historyItem];
            
            return { 
              ...p, 
              planningReport: report, 
              planningHistory: newHistory 
            };
          }
          return p;
        });
        return { projects };
      }),

      moveTask: (projectId, taskId, newStatus) => set((state) => ({
        projects: state.projects.map(p => {
          if (p.id !== projectId) return p;
          return {
            ...p,
            tasks: p.tasks.map(t => {
              if (t.id !== taskId) return t;
              return { 
                ...t, 
                status: newStatus, 
                agentType: AGENT_MAPPING[newStatus],
                updatedAt: new Date().toISOString()
              };
            })
          };
        })
      })),

      toggleSubtask: (projectId, taskId, subtaskId) => set((state) => ({
        projects: state.projects.map(p => {
          if (p.id !== projectId) return p;
          return {
            ...p,
            tasks: p.tasks.map(t => {
              if (t.id !== taskId) return t;
              return {
                ...t,
                subtasks: t.subtasks.map(s => s.id === subtaskId ? { ...s, completed: !s.completed } : s)
              };
            })
          };
        })
      })),

      addTask: (projectId, task) => set((state) => ({
        projects: state.projects.map(p => {
          if (p.id !== projectId) return p;
          return { ...p, tasks: [...p.tasks, task] };
        })
      })),

      startExecution: (projectId: string, tasks: Task[]) => set((state) => ({
        projects: state.projects.map(p => {
          if (p.id !== projectId) return p;
          return { ...p, status: 'execution', tasks };
        })
      }))
    }),
    {
      name: 'pi-kanban-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
