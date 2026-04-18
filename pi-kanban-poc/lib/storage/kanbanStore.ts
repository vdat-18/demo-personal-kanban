/**
 * Client-side persistent store backed by localStorage (Zustand persist).
 * Replaces Prisma/Postgres for the POC. All entities live in the browser only.
 *
 * Single store on purpose: lots of cross-entity invariants (delete project →
 * cascade tasks/conversations/threads) are easier to enforce in one place.
 */
'use client'

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type {
  Project,
  Task,
  Subtask,
  Conversation,
  ConversationMessage,
  TokenUsage,
  PlanningThread,
  PlanningMessage,
  MutationActionState,
  ProjectDomain,
  TaskStatus,
  TaskPriority,
  PlanningPhase,
} from '@/types/domain'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function uid(prefix = 'id'): string {
  // crypto.randomUUID is available in modern browsers + Node 19+. Fallback for safety.
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
}

function now(): string {
  return new Date().toISOString()
}

// ─── State shape ──────────────────────────────────────────────────────────────

interface KanbanState {
  projects: Project[]
  tasks: Task[]
  subtasks: Subtask[]
  conversations: Conversation[]
  planningThreads: PlanningThread[]
  planningMessages: PlanningMessage[]

  // Project ops
  createProject: (input: { name: string; description?: string; domain?: ProjectDomain }) => Project
  updateProject: (id: string, patch: Partial<Omit<Project, 'id' | 'createdAt'>>) => Project | null
  deleteProject: (id: string) => void

  // Task ops
  createTask: (input: {
    projectId: string
    title: string
    description?: string
    status?: TaskStatus
    priority?: TaskPriority
  }) => Task
  createTasksBatch: (
    projectId: string,
    items: Array<{ title: string; description?: string; status?: TaskStatus; priority?: TaskPriority }>,
  ) => Task[]
  updateTask: (id: string, patch: Partial<Omit<Task, 'id' | 'createdAt' | 'projectId'>>) => Task | null
  deleteTask: (id: string) => void

  // Subtask ops
  createSubtasks: (taskId: string, items: Array<{ title: string }>) => Subtask[]
  updateSubtask: (id: string, patch: Partial<Pick<Subtask, 'title' | 'completed' | 'output'>>) => Subtask | null

  // Conversation ops
  createConversation: (input: {
    taskId: string
    messages: ConversationMessage[]
    result?: string | null
    tokenUsage?: TokenUsage | null
  }) => Conversation
  deleteConversation: (id: string) => void

  // Planning thread ops
  createPlanningThread: (input: { projectId: string; title?: string }) => PlanningThread
  updatePlanningThread: (
    id: string,
    patch: Partial<Pick<PlanningThread, 'title' | 'phase' | 'visionDocument'>>,
  ) => PlanningThread | null
  deletePlanningThread: (id: string) => void

  // Planning message ops
  createPlanningMessage: (input: {
    threadId: string
    role: PlanningMessage['role']
    content: string
    tokenUsage?: TokenUsage | null
    mutationActions?: MutationActionState[]
  }) => PlanningMessage
  setMessageMutationAction: (
    messageId: string,
    mutationIndex: number,
    action: 'approved' | 'dismissed',
  ) => PlanningMessage | null

  // Bulk reset (useful for dev / settings)
  reset: () => void
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useKanbanStore = create<KanbanState>()(
  persist(
    (set, get) => ({
      projects: [],
      tasks: [],
      subtasks: [],
      conversations: [],
      planningThreads: [],
      planningMessages: [],

      createProject: ({ name, description, domain = 'SOFTWARE_ENGINEERING' }) => {
        const project: Project = {
          id: uid('proj'),
          name,
          description: description ?? null,
          domain,
          status: null,
          createdAt: now(),
          updatedAt: now(),
        }
        set((s) => ({ projects: [...s.projects, project] }))
        return project
      },

      updateProject: (id, patch) => {
        let updated: Project | null = null
        set((s) => ({
          projects: s.projects.map((p) => {
            if (p.id !== id) return p
            updated = { ...p, ...patch, updatedAt: now() }
            return updated
          }),
        }))
        return updated
      },

      deleteProject: (id) => {
        // Cascade
        const taskIds = new Set(get().tasks.filter((t) => t.projectId === id).map((t) => t.id))
        const threadIds = new Set(
          get().planningThreads.filter((t) => t.projectId === id).map((t) => t.id),
        )
        set((s) => ({
          projects: s.projects.filter((p) => p.id !== id),
          tasks: s.tasks.filter((t) => t.projectId !== id),
          subtasks: s.subtasks.filter((sub) => !taskIds.has(sub.taskId)),
          conversations: s.conversations.filter((c) => !taskIds.has(c.taskId)),
          planningThreads: s.planningThreads.filter((t) => t.projectId !== id),
          planningMessages: s.planningMessages.filter((m) => !threadIds.has(m.threadId)),
        }))
      },

      createTask: ({ projectId, title, description, status = 'TODO', priority = 'MEDIUM' }) => {
        const task: Task = {
          id: uid('task'),
          projectId,
          title,
          description: description ?? null,
          status,
          priority,
          createdAt: now(),
          updatedAt: now(),
        }
        set((s) => ({ tasks: [...s.tasks, task] }))
        return task
      },

      createTasksBatch: (projectId, items) => {
        const created: Task[] = items.map((it) => ({
          id: uid('task'),
          projectId,
          title: it.title,
          description: it.description ?? null,
          status: it.status ?? 'TODO',
          priority: it.priority ?? 'MEDIUM',
          createdAt: now(),
          updatedAt: now(),
        }))
        set((s) => ({ tasks: [...s.tasks, ...created] }))
        return created
      },

      updateTask: (id, patch) => {
        let updated: Task | null = null
        set((s) => ({
          tasks: s.tasks.map((t) => {
            if (t.id !== id) return t
            updated = { ...t, ...patch, updatedAt: now() }
            return updated
          }),
        }))
        return updated
      },

      deleteTask: (id) => {
        set((s) => ({
          tasks: s.tasks.filter((t) => t.id !== id),
          subtasks: s.subtasks.filter((sub) => sub.taskId !== id),
          conversations: s.conversations.filter((c) => c.taskId !== id),
        }))
      },

      createSubtasks: (taskId, items) => {
        const existingCount = get().subtasks.filter((s) => s.taskId === taskId).length
        const created: Subtask[] = items.map((it, i) => ({
          id: uid('sub'),
          taskId,
          title: it.title,
          completed: false,
          output: null,
          order: existingCount + i,
        }))
        set((s) => ({ subtasks: [...s.subtasks, ...created] }))
        return created
      },

      updateSubtask: (id, patch) => {
        let updated: Subtask | null = null
        set((s) => ({
          subtasks: s.subtasks.map((sub) => {
            if (sub.id !== id) return sub
            updated = { ...sub, ...patch }
            return updated
          }),
        }))
        return updated
      },

      createConversation: ({ taskId, messages, result = null, tokenUsage = null }) => {
        const conv: Conversation = {
          id: uid('conv'),
          taskId,
          messages,
          result,
          tokenUsage,
          createdAt: now(),
          updatedAt: now(),
        }
        set((s) => ({ conversations: [...s.conversations, conv] }))
        return conv
      },

      deleteConversation: (id) => {
        set((s) => ({ conversations: s.conversations.filter((c) => c.id !== id) }))
      },

      createPlanningThread: ({ projectId, title }) => {
        const thread: PlanningThread = {
          id: uid('thread'),
          projectId,
          title: title ?? 'New planning session',
          phase: 'discovery',
          visionDocument: null,
          createdAt: now(),
          updatedAt: now(),
          lastMessage: null,
          lastMessageAt: null,
        }
        set((s) => ({ planningThreads: [...s.planningThreads, thread] }))
        return thread
      },

      updatePlanningThread: (id, patch) => {
        let updated: PlanningThread | null = null
        set((s) => ({
          planningThreads: s.planningThreads.map((t) => {
            if (t.id !== id) return t
            updated = { ...t, ...patch, updatedAt: now() }
            return updated
          }),
        }))
        return updated
      },

      deletePlanningThread: (id) => {
        set((s) => ({
          planningThreads: s.planningThreads.filter((t) => t.id !== id),
          planningMessages: s.planningMessages.filter((m) => m.threadId !== id),
        }))
      },

      createPlanningMessage: ({
        threadId,
        role,
        content,
        tokenUsage = null,
        mutationActions = [],
      }) => {
        const msg: PlanningMessage = {
          id: uid('pmsg'),
          threadId,
          role,
          content,
          tokenUsage,
          createdAt: now(),
          mutationActions,
        }
        set((s) => ({
          planningMessages: [...s.planningMessages, msg],
          planningThreads: s.planningThreads.map((t) =>
            t.id === threadId
              ? { ...t, lastMessage: content.slice(0, 200), lastMessageAt: msg.createdAt, updatedAt: now() }
              : t,
          ),
        }))
        return msg
      },

      setMessageMutationAction: (messageId, mutationIndex, action) => {
        let updated: PlanningMessage | null = null
        set((s) => ({
          planningMessages: s.planningMessages.map((m) => {
            if (m.id !== messageId) return m
            const next = m.mutationActions.filter((a) => a.mutationIndex !== mutationIndex)
            next.push({ mutationIndex, action })
            updated = { ...m, mutationActions: next }
            return updated
          }),
        }))
        return updated
      },

      reset: () => {
        set({
          projects: [],
          tasks: [],
          subtasks: [],
          conversations: [],
          planningThreads: [],
          planningMessages: [],
        })
      },
    }),
    {
      name: 'pi-kanban-poc:store-v1',
      storage: createJSONStorage(() => {
        // SSR-safe: return a no-op storage during server render.
        if (typeof window === 'undefined') {
          return {
            getItem: () => null,
            setItem: () => {},
            removeItem: () => {},
          }
        }
        return window.localStorage
      }),
      version: 1,
    },
  ),
)

// ─── Hydration helper ─────────────────────────────────────────────────────────
// Components can subscribe to this to know when localStorage has finished loading,
// avoiding hydration mismatches.
export function useStoreHydrated(): boolean {
  return useKanbanStore.persist.hasHydrated()
}
