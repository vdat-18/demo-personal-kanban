import { create } from 'zustand';

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
}

interface ProjectState {
  projects: Project[];
  activeProjectId: string | null;
  
  // Actions
  setActiveProject: (id: string) => void;
  addProject: (project: Project) => void;
  moveTask: (projectId: string, taskId: string, newStatus: TaskStatus) => void;
  toggleSubtask: (projectId: string, taskId: string, subtaskId: string) => void;
  addTask: (projectId: string, task: Task) => void;
}

const AGENT_MAPPING: Record<TaskStatus, string> = {
  todo: 'Starter Agent',
  planning: 'Planner Agent',
  doing: 'Doer Agent',
  review: 'Reviewer Agent',
  done: 'Reporter Agent',
  cancelled: 'System'
};

export const useProjectStore = create<ProjectState>((set) => ({
  projects: [
    {
      id: '1',
      name: 'Competitor Research Veclam24h',
      description: 'Analyze top 5 competitors in the recruitment market.',
      status: 'execution',
      tasks: [
        {
          id: 't1',
          title: 'Identify top 5 competitors',
          description: 'List and verify 5 direct competitors of Veclam24h.',
          status: 'done',
          agentType: 'Reporter Agent',
          updatedAt: '2h ago',
          subtasks: [
            { id: 's1', text: 'Search Google for recruitment platforms', completed: true },
            { id: 's2', text: 'Verify traffic and popularity', completed: true }
          ]
        },
        {
          id: 't2',
          title: 'Collect social media data',
          description: 'Followers, engagement, and posting frequency.',
          status: 'doing',
          agentType: 'Doer Agent',
          updatedAt: 'Just now',
          subtasks: [
            { id: 's3', text: 'Check Facebook follower counts', completed: true },
            { id: 's4', text: 'Calculate average engagement rate', completed: false },
            { id: 's5', text: 'Screenshot sample posts', completed: false }
          ]
        },
        {
          id: 't3',
          title: 'Analyze landing pages & UX',
          description: 'Compare UI/UX and conversion funnels.',
          status: 'planning',
          agentType: 'Planner Agent',
          updatedAt: '1h ago',
          subtasks: [
            { id: 's6', text: 'Define comparison criteria', completed: false }
          ]
        }
      ]
    }
  ],
  activeProjectId: '1',

  setActiveProject: (id) => set({ activeProjectId: id }),

  addProject: (project) => set((state) => ({ 
    projects: [...state.projects, project],
    activeProjectId: project.id 
  })),

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
            updatedAt: 'Just now'
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
  }))
}));
