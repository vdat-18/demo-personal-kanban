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
  SubtaskApprovalStatus,
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
  AgentEnvelope,
  QuestionBatchSubmission,
  VisionVersion,
  VisionChangeType,
  SubtaskType,
  BreakdownEnvelope,
  DoerResult,
  ReviewerStepResult,
  TaskActivityEntry,
  TaskActivityType,
  CachedBreakdown,
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

/** Friendly status labels for activity log lines. */
function formatStatusLabel(status: TaskStatus): string {
  const map: Record<TaskStatus, string> = {
    TODO: 'TODO',
    IN_PROGRESS: 'In Progress',
    IN_REVIEW: 'In Review',
    DONE: 'Done',
    BLOCKED: 'Blocked',
  }
  return map[status]
}

// ─── State shape ──────────────────────────────────────────────────────────────

interface KanbanState {
  projects: Project[]
  tasks: Task[]
  subtasks: Subtask[]
  conversations: Conversation[]
  planningThreads: PlanningThread[]
  planningMessages: PlanningMessage[]
  visionVersions: VisionVersion[]
  /** Per-task activity timeline (Tier 3.10). */
  activities: TaskActivityEntry[]
  /** AI breakdown suggestions cache (Tier 4.15). */
  cachedBreakdowns: CachedBreakdown[]

  // Project ops
  createProject: (input: { name: string; description?: string; domain?: ProjectDomain }) => Project
  updateProject: (id: string, patch: Partial<Omit<Project, 'id' | 'createdAt'>>) => Project | null
  deleteProject: (id: string) => void

  /** Accumulate token usage on a project for the header counter. Safe to
   *  call with (0, 0) — will just no-op. */
  addTokenUsage: (projectId: string, usage: { input: number; output: number }) => void

  // Task ops
  createTask: (input: {
    projectId: string
    title: string
    description?: string
    status?: TaskStatus
    priority?: TaskPriority
    sourceProposal?: { messageId: string; proposalId: string }
  }) => Task
  createTasksBatch: (
    projectId: string,
    items: Array<{ title: string; description?: string; status?: TaskStatus; priority?: TaskPriority }>,
  ) => Task[]
  updateTask: (id: string, patch: Partial<Omit<Task, 'id' | 'createdAt' | 'projectId'>>) => Task | null
  deleteTask: (id: string) => void
  /** Restore a soft-deleted task (and its cascade snapshot) within the
   *  undo window. No-op if task wasn't deleted or was already purged. */
  restoreTask: (id: string) => void
  /**
   * Reorder tasks within a project. Pass the new ordered list of task IDs;
   * each task's `order` is rewritten to a contiguous integer sequence.
   * No-op if any of the IDs don't belong to the project.
   */
  reorderTasks: (projectId: string, orderedIds: string[]) => void

  // Subtask ops
  createSubtasks: (
    taskId: string,
    items: Array<{
      title: string
      description?: string | null
      estimatedEffort?: string | null
      type?: SubtaskType | null
      aiGenerated?: boolean
    }>,
  ) => Subtask[]
  updateSubtask: (
    id: string,
    patch: Partial<Pick<Subtask, 'title' | 'description' | 'estimatedEffort' | 'type' | 'completed' | 'output' | 'doerResult' | 'approvalStatus'>>,
  ) => Subtask | null
  deleteSubtask: (id: string) => void
  /** Restore a soft-deleted subtask. */
  restoreSubtask: (id: string) => void

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
    patch: Partial<Pick<PlanningThread, 'title' | 'phase' | 'visionDocument' | 'whyProbesUsed'>>,
  ) => PlanningThread | null
  deletePlanningThread: (id: string) => void

  // Planning message ops
  createPlanningMessage: (input: {
    threadId: string
    role: PlanningMessage['role']
    content: string
    tokenUsage?: TokenUsage | null
    mutationActions?: MutationActionState[]
    envelope?: AgentEnvelope | null
    batchSubmission?: QuestionBatchSubmission | null
  }) => PlanningMessage
  setMessageMutationAction: (
    messageId: string,
    mutationIndex: number,
    action: 'approved' | 'dismissed',
  ) => PlanningMessage | null
  setPhaseTransitionResponse: (
    messageId: string,
    response: 'accepted' | 'rejected',
  ) => PlanningMessage | null
  setTaskProposalAction: (
    messageId: string,
    taskId: string,
    action: 'approved' | 'dismissed',
    createdTaskId?: string,
  ) => PlanningMessage | null
  /** Remove an existing approved/dismissed action so the proposal becomes
   *  pending again. Used by the "Reset" affordance on TaskProposalCard. */
  clearTaskProposalAction: (
    messageId: string,
    taskId: string,
  ) => PlanningMessage | null

  // Vision versioning (Tier 3.11)
  createVisionVersion: (input: {
    threadId: string
    content: string
    createdBy: 'user' | 'ai'
    changeType: VisionChangeType
    summary?: string | null
    diffFromPrevious?: string[] | null
    triggerMessage?: string | null
  }) => VisionVersion
  getVisionVersionsForThread: (threadId: string) => VisionVersion[]
  restoreVisionVersion: (versionId: string) => VisionVersion | null
  /**
   * Mark a version as the single "published" plan for its thread (#4).
   * All other versions in the same thread are reset to `draft`.
   * Returns the updated version, or null if the id isn't found.
   */
  publishVisionVersion: (versionId: string) => VisionVersion | null

  // Bulk reset (useful for dev / settings)
  reset: () => void

  // ─── Activity log (Tier 3.10) ──────────────────────────────────────────────
  logActivity: (entry: {
    taskId: string
    type: TaskActivityType
    actor: 'user' | 'ai' | 'system'
    summary: string
    metadata?: Record<string, unknown> | null
    resourceLink?: TaskActivityEntry['resourceLink']
  }) => TaskActivityEntry
  getActivitiesForTask: (taskId: string) => TaskActivityEntry[]

  // ─── Doer helpers (IN_PROGRESS execution) ─────────────────────────────────
  getNextPendingSubtask: (taskId: string) => Subtask | null
  saveDoerResult: (taskId: string, subtaskId: string, result: DoerResult) => Subtask | null
  markSubtaskCompletedByDoer: (taskId: string, subtaskId: string) => Subtask | null
  saveReviewerStepResult: (taskId: string, subtaskId: string, result: ReviewerStepResult) => Subtask | null

  // ─── Cached AI breakdown (Tier 4.15) ───────────────────────────────────────
  saveCachedBreakdown: (input: {
    taskId: string
    envelope: BreakdownEnvelope
    taskTitleAtGeneration: string
    taskDescriptionAtGeneration: string | null
  }) => CachedBreakdown
  getCachedBreakdownForTask: (taskId: string) => CachedBreakdown | null
  markCachedBreakdownDismissed: (taskId: string) => void
  markCachedBreakdownApproved: (taskId: string, approvedSubtaskIds: string[]) => void
  invalidateCachedBreakdown: (taskId: string) => void

  // ─── Hint dismissal (Tier 4.16) ────────────────────────────────────────────
  dismissTaskHint: (taskId: string) => void
  /** Dismiss the onboarding hint for ALL tasks (global flag, single toggle). */
  dismissGlobalBreakdownHint: () => void
  isGlobalBreakdownHintDismissed: () => boolean
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
      visionVersions: [],
      activities: [],
      cachedBreakdowns: [],

      createProject: ({ name, description, domain = 'GENERAL' }) => {
        const project: Project = {
          id: uid('proj'),
          name,
          description: description ?? null,
          domain,
          status: null,
          createdAt: now(),
          updatedAt: now(),
          planningStatus: 'not_started',
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

      addTokenUsage: (projectId, usage) => {
        const input = usage.input ?? 0
        const output = usage.output ?? 0
        if (input === 0 && output === 0) return
        set((s) => ({
          projects: s.projects.map((p) => {
            if (p.id !== projectId) return p
            const prev = p.totalTokenUsage ?? { input: 0, output: 0 }
            return {
              ...p,
              totalTokenUsage: {
                input: prev.input + input,
                output: prev.output + output,
              },
            }
          }),
        }))
      },

      createTask: ({ projectId, title, description, status = 'TODO', priority = 'MEDIUM', sourceProposal }) => {
        // Compute next order: max + 1 of existing tasks in this project,
        // so manually-added tasks land at the bottom of the list.
        const existing = get().tasks.filter((t) => t.projectId === projectId)
        const nextOrder = existing.length === 0
          ? 0
          : Math.max(...existing.map((t) => t.order ?? 0)) + 1
        const task: Task = {
          id: uid('task'),
          projectId,
          title,
          description: description ?? null,
          status,
          priority,
          createdAt: now(),
          updatedAt: now(),
          order: nextOrder,
          statusChangedAt: now(),
          sourceProposal,
        }
        const activity: TaskActivityEntry = {
          id: uid('act'),
          taskId: task.id,
          timestamp: task.createdAt,
          type: 'created',
          actor: 'user',
          summary: 'Task created',
          metadata: null,
          resourceLink: null,
        }
        set((s) => ({
          tasks: [...s.tasks, task],
          activities: [...s.activities, activity],
        }))
        return task
      },

      createTasksBatch: (projectId, items) => {
        const existing = get().tasks.filter((t) => t.projectId === projectId)
        let nextOrder = existing.length === 0
          ? 0
          : Math.max(...existing.map((t) => t.order ?? 0)) + 1
        const created: Task[] = items.map((it) => ({
          id: uid('task'),
          projectId,
          title: it.title,
          description: it.description ?? null,
          status: it.status ?? 'TODO',
          priority: it.priority ?? 'MEDIUM',
          createdAt: now(),
          updatedAt: now(),
          order: nextOrder++,
          statusChangedAt: now(),
        }))
        const newActivities: TaskActivityEntry[] = created.map((t) => ({
          id: uid('act'),
          taskId: t.id,
          timestamp: t.createdAt,
          type: 'created',
          actor: 'user',
          summary: 'Task created',
          metadata: null,
          resourceLink: null,
        }))
        set((s) => ({
          tasks: [...s.tasks, ...created],
          activities: [...s.activities, ...newActivities],
        }))
        return created
      },

      updateTask: (id, patch) => {
        let updated: Task | null = null
        let prevTask: Task | null = null
        set((s) => ({
          tasks: s.tasks.map((t) => {
            if (t.id !== id) return t
            prevTask = t as Task
            // When the status changes we also bump statusChangedAt so the
            // "active task" indicator can compute a meaningful "in
            // progress for X minutes" label.
            const statusChanged = patch.status && patch.status !== t.status
            updated = {
              ...t,
              ...patch,
              updatedAt: now(),
              ...(statusChanged ? { statusChangedAt: now() } : {}),
            } as Task
            return updated
          }),
        }))
        const finalUpdated = updated as Task | null
        const finalPrev = prevTask as Task | null
        if (!finalUpdated || !finalPrev) return finalUpdated

        // Auto-log status changes (Tier 3.10)
        if (patch.status && patch.status !== finalPrev.status) {
          const statusActivity: TaskActivityEntry = {
            id: uid('act'),
            taskId: id,
            timestamp: now(),
            type: 'status_changed',
            actor: 'user',
            summary: `Moved from ${formatStatusLabel(finalPrev.status)} to ${formatStatusLabel(patch.status)}`,
            metadata: { fromStatus: finalPrev.status, toStatus: patch.status },
            resourceLink: null,
          }
          set((s) => ({ activities: [...s.activities, statusActivity] }))
        }

        // Invalidate cached breakdown if title/description changed (Tier 4.15)
        const titleChanged = patch.title != null && patch.title !== finalPrev.title
        const descChanged =
          patch.description !== undefined && patch.description !== finalPrev.description
        if (titleChanged || descChanged) {
          set((s) => ({
            cachedBreakdowns: s.cachedBreakdowns.filter((c) => c.taskId !== id),
          }))
          const editActivity: TaskActivityEntry = {
            id: uid('act'),
            taskId: id,
            timestamp: now(),
            type: 'user_edited_task',
            actor: 'user',
            summary: titleChanged ? 'You edited the task title' : 'You edited the task description',
            metadata: null,
            resourceLink: null,
          }
          set((s) => ({ activities: [...s.activities, editActivity] }))
        }

        return finalUpdated
      },

      deleteTask: (id) => {
        // Soft delete: stamp deletedAt on the task + cascaded subtasks with
        // the SAME timestamp so `restoreTask` can atomically restore the
        // whole bundle. Boot-time sweep hard-deletes entries older than
        // SOFT_DELETE_TTL_MS (see below).
        const ts = now()
        set((s) => ({
          tasks: s.tasks.map((t) => (t.id === id ? { ...t, deletedAt: ts } : t)),
          subtasks: s.subtasks.map((sub) =>
            sub.taskId === id ? { ...sub, deletedAt: ts } : sub,
          ),
        }))
      },

      restoreTask: (id) => {
        const target = get().tasks.find((t) => t.id === id)
        if (!target?.deletedAt) return
        const cascadeTs = target.deletedAt
        set((s) => ({
          tasks: s.tasks.map((t) => (t.id === id ? { ...t, deletedAt: null } : t)),
          subtasks: s.subtasks.map((sub) =>
            sub.taskId === id && sub.deletedAt === cascadeTs
              ? { ...sub, deletedAt: null }
              : sub,
          ),
        }))
      },

      reorderTasks: (projectId, orderedIds) => {
        const idIndex = new Map(orderedIds.map((id, i) => [id, i]))
        set((s) => ({
          tasks: s.tasks.map((t) => {
            if (t.projectId !== projectId) return t
            const newOrder = idIndex.get(t.id)
            if (newOrder == null) return t
            return { ...t, order: newOrder, updatedAt: now() }
          }),
        }))
      },

      createSubtasks: (taskId, items) => {
        const existingCount = get().subtasks.filter((s) => s.taskId === taskId).length
        const created: Subtask[] = items.map((it, i) => ({
          id: uid('sub'),
          taskId,
          title: it.title,
          description: it.description ?? null,
          estimatedEffort: it.estimatedEffort ?? null,
          type: it.type ?? null,
          aiGenerated: it.aiGenerated ?? false,
          completed: false,
          output: null,
          order: existingCount + i,
          approvalStatus: 'pending' as SubtaskApprovalStatus,
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

      deleteSubtask: (id) => {
        set((s) => ({
          subtasks: s.subtasks.map((sub) =>
            sub.id === id ? { ...sub, deletedAt: now() } : sub,
          ),
        }))
      },

      restoreSubtask: (id) => {
        set((s) => ({
          subtasks: s.subtasks.map((sub) =>
            sub.id === id ? { ...sub, deletedAt: null } : sub,
          ),
        }))
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
        set((s) => ({
          planningThreads: [...s.planningThreads, thread],
          // Auto-flip project planningStatus from 'not_started' → 'in_progress'
          // the moment a planning thread is created. Don't downgrade 'completed'
          // back to 'in_progress' though — once user clicks Start Execution the
          // project should keep its 'completed' status even if they revisit
          // planning to add a follow-up thread.
          projects: s.projects.map((p) =>
            p.id === projectId && (p.planningStatus ?? 'not_started') === 'not_started'
              ? { ...p, planningStatus: 'in_progress', updatedAt: now() }
              : p,
          ),
        }))
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
        envelope = null,
        batchSubmission = null,
      }) => {
        const msg: PlanningMessage = {
          id: uid('pmsg'),
          threadId,
          role,
          content,
          tokenUsage,
          createdAt: now(),
          mutationActions,
          envelope,
          batchSubmission,
          phaseTransitionResponse: null,
          taskProposalActions: [],
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

      setPhaseTransitionResponse: (messageId, response) => {
        let updated: PlanningMessage | null = null
        set((s) => ({
          planningMessages: s.planningMessages.map((m) => {
            if (m.id !== messageId) return m
            updated = { ...m, phaseTransitionResponse: response }
            return updated
          }),
        }))
        return updated
      },

      setTaskProposalAction: (messageId, taskId, action, createdTaskId) => {
        let updated: PlanningMessage | null = null
        set((s) => ({
          planningMessages: s.planningMessages.map((m) => {
            if (m.id !== messageId) return m
            const prev = m.taskProposalActions ?? []
            const next = prev.filter((a) => a.taskId !== taskId)
            next.push({ taskId, action, createdTaskId })
            updated = { ...m, taskProposalActions: next }
            return updated
          }),
        }))
        return updated
      },

      clearTaskProposalAction: (messageId, taskId) => {
        let updated: PlanningMessage | null = null
        set((s) => ({
          planningMessages: s.planningMessages.map((m) => {
            if (m.id !== messageId) return m
            const prev = m.taskProposalActions ?? []
            const next = prev.filter((a) => a.taskId !== taskId)
            updated = { ...m, taskProposalActions: next }
            return updated
          }),
        }))
        return updated
      },

      createVisionVersion: ({
        threadId,
        content,
        createdBy,
        changeType,
        summary = null,
        diffFromPrevious = null,
        triggerMessage = null,
      }) => {
        const version: VisionVersion = {
          id: uid('vver'),
          threadId,
          content,
          createdAt: now(),
          createdBy,
          changeType,
          summary,
          diffFromPrevious,
          triggerMessage,
          status: 'draft',
        }
        set((s) => {
          // Cap at 50 versions per thread — keep initial + phase_transition, trim oldest otherwise
          const existing = s.visionVersions.filter((v) => v.threadId === threadId)
          const others = s.visionVersions.filter((v) => v.threadId !== threadId)
          // NOTE: with the supersededBy model (#1) we no longer demote the
          // currently-published version on every new draft. The published
          // version stays as-is until the user explicitly publishes a newer
          // one (which triggers `publishVisionVersion` to mark it superseded).
          // The UI shows a "Published version may be outdated" banner when
          // a newer draft exists past the published one.
          const combined = [...existing, version]
          if (combined.length > 50) {
            // Protected versions always kept
            const protectedVers = combined.filter(
              (v) => v.changeType === 'initial' || v.changeType === 'phase_transition',
            )
            const rest = combined
              .filter(
                (v) => v.changeType !== 'initial' && v.changeType !== 'phase_transition',
              )
              .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
              .slice(0, Math.max(0, 50 - protectedVers.length))
            return {
              visionVersions: [...others, ...protectedVers, ...rest],
            }
          }
          return { visionVersions: [...others, ...combined] }
        })
        return version
      },

      getVisionVersionsForThread: (threadId) => {
        return get()
          .visionVersions.filter((v) => v.threadId === threadId)
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      },

      restoreVisionVersion: (versionId) => {
        const ver = get().visionVersions.find((v) => v.id === versionId)
        if (!ver) return null
        // Create a forward-only restored snapshot + update thread vision
        const restored: VisionVersion = {
          id: uid('vver'),
          threadId: ver.threadId,
          content: ver.content,
          createdAt: now(),
          createdBy: 'user',
          changeType: 'restored',
          summary: `Restored from version ${ver.id}`,
          diffFromPrevious: null,
          triggerMessage: null,
          status: 'draft',
        }
        set((s) => ({
          visionVersions: [...s.visionVersions, restored],
          planningThreads: s.planningThreads.map((t) =>
            t.id === ver.threadId ? { ...t, visionDocument: ver.content, updatedAt: now() } : t,
          ),
        }))
        return restored
      },

      publishVisionVersion: (versionId) => {
        const ver = get().visionVersions.find((v) => v.id === versionId)
        if (!ver) return null
        const stamp = now()
        let updated: VisionVersion | null = null
        set((s) => ({
          visionVersions: s.visionVersions.map((v) => {
            if (v.threadId !== ver.threadId) return v
            if (v.id === versionId) {
              updated = {
                ...v,
                status: 'published',
                publishedAt: stamp,
                supersededBy: null,
                supersededAt: null,
              }
              return updated
            }
            // Mark any previously-published siblings as superseded by this
            // new publish. They keep `status: 'published'` so history reads
            // accurately, plus a `supersededBy/At` pair so the UI can show
            // a "(historical)" badge and the hub can filter to current only.
            if (v.status === 'published' && !v.supersededAt) {
              return { ...v, supersededBy: versionId, supersededAt: stamp }
            }
            return v
          }),
        }))
        return updated
      },

      // ─── Activity log (Tier 3.10) ──────────────────────────────────────────
      logActivity: ({ taskId, type, actor, summary, metadata = null, resourceLink = null }) => {
        const entry: TaskActivityEntry = {
          id: uid('act'),
          taskId,
          timestamp: now(),
          type,
          actor,
          summary,
          metadata,
          resourceLink,
        }
        set((s) => {
          // Cap at 100 entries per task: keep 'created' + most recent 99.
          const forTask = s.activities.filter((a) => a.taskId === taskId)
          const others = s.activities.filter((a) => a.taskId !== taskId)
          const combined = [...forTask, entry]
          if (combined.length <= 100) {
            return { activities: [...others, ...combined] }
          }
          // Always preserve the 'created' entry so timeline stays anchored
          const createdEntry = combined.find((a) => a.type === 'created')
          const recent = combined
            .filter((a) => a.type !== 'created')
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
            .slice(0, createdEntry ? 99 : 100)
          return {
            activities: [
              ...others,
              ...(createdEntry ? [createdEntry] : []),
              ...recent,
            ],
          }
        })
        return entry
      },

      getActivitiesForTask: (taskId) => {
        return get()
          .activities.filter((a) => a.taskId === taskId)
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      },

      // ─── Doer helpers (IN_PROGRESS execution) ─────────────────────────────
      getNextPendingSubtask: (taskId) => {
        return get()
          .subtasks
          .filter((s) => s.taskId === taskId && !s.completed && s.approvalStatus === 'approved')
          .sort((a, b) => a.order - b.order)[0] ?? null
      },

      saveDoerResult: (taskId, subtaskId, result) => {
        let updated: Subtask | null = null
        set((s) => ({
          subtasks: s.subtasks.map((sub) => {
            if (sub.id !== subtaskId || sub.taskId !== taskId) return sub
            updated = {
              ...sub,
              output: result.artifact,
              doerResult: result,
            }
            return updated
          }),
        }))
        const finalUpdated = updated as Subtask | null
        if (finalUpdated) {
          const activity: TaskActivityEntry = {
            id: uid('act'),
            taskId,
            timestamp: now(),
            type: 'doer_saved_result',
            actor: 'ai',
            summary: `AI drafted output for: ${finalUpdated.title}`,
            metadata: { subtaskId },
            resourceLink: { type: 'subtask', id: subtaskId },
          }
          set((s) => ({ activities: [...s.activities, activity] }))
        }
        return finalUpdated
      },

      markSubtaskCompletedByDoer: (taskId, subtaskId) => {
        let updated: Subtask | null = null
        set((s) => ({
          subtasks: s.subtasks.map((sub) => {
            if (sub.id !== subtaskId || sub.taskId !== taskId) return sub
            updated = { ...sub, completed: true }
            return updated
          }),
        }))
        const finalUpdated = updated as Subtask | null
        if (finalUpdated) {
          const activity: TaskActivityEntry = {
            id: uid('act'),
            taskId,
            timestamp: now(),
            type: 'doer_marked_subtask_complete',
            actor: 'ai',
            summary: `AI completed: ${finalUpdated.title}`,
            metadata: { subtaskId },
            resourceLink: { type: 'subtask', id: subtaskId },
          }
          set((s) => ({ activities: [...s.activities, activity] }))
        }
        return finalUpdated
      },

      saveReviewerStepResult: (taskId, subtaskId, result) => {
        let updated: Subtask | null = null
        set((s) => ({
          subtasks: s.subtasks.map((sub) => {
            if (sub.id !== subtaskId || sub.taskId !== taskId) return sub
            updated = {
              ...sub,
              reviewResult: result,
            }
            return updated
          }),
        }))
        const finalUpdated = updated as Subtask | null
        if (finalUpdated) {
          const activity: TaskActivityEntry = {
            id: uid('act'),
            taskId,
            timestamp: now(),
            type: 'reviewer_saved_report',
            actor: 'ai',
            summary: `AI reviewed: ${finalUpdated.title}`,
            metadata: { subtaskId },
            resourceLink: { type: 'subtask', id: subtaskId },
          }
          set((s) => ({ activities: [...s.activities, activity] }))
        }
        return finalUpdated
      },

      // ─── Cached breakdown (Tier 4.15) ──────────────────────────────────────
      saveCachedBreakdown: ({
        taskId,
        envelope,
        taskTitleAtGeneration,
        taskDescriptionAtGeneration,
      }) => {
        const entry: CachedBreakdown = {
          id: uid('cbd'),
          taskId,
          envelope,
          generatedAt: now(),
          taskTitleAtGeneration,
          taskDescriptionAtGeneration,
          dismissedAt: null,
          approvedAt: null,
          approvedSubtaskIds: [],
        }
        set((s) => {
          // Replace any existing cache entry for this task — only one active
          // suggestion lives at a time. The replaced entry is dropped (its
          // activity log entry still references the snapshot via its id if
          // needed, but at cache layer we keep things simple).
          const others = s.cachedBreakdowns.filter((c) => c.taskId !== taskId)
          // Soft cap: 500 entries total
          const trimmed =
            others.length >= 500
              ? others
                  .sort((a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime())
                  .slice(0, 499)
              : others
          return { cachedBreakdowns: [...trimmed, entry] }
        })
        return entry
      },

      getCachedBreakdownForTask: (taskId) => {
        const entries = get().cachedBreakdowns.filter((c) => c.taskId === taskId)
        if (entries.length === 0) return null
        // Latest non-expired entry. 7-day TTL.
        const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000
        const valid = entries.filter((c) => new Date(c.generatedAt).getTime() >= cutoff)
        if (valid.length === 0) return null
        return valid.sort(
          (a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime(),
        )[0]
      },

      markCachedBreakdownDismissed: (taskId) => {
        set((s) => ({
          cachedBreakdowns: s.cachedBreakdowns.map((c) =>
            c.taskId === taskId && c.dismissedAt == null && c.approvedAt == null
              ? { ...c, dismissedAt: now() }
              : c,
          ),
        }))
      },

      markCachedBreakdownApproved: (taskId, approvedSubtaskIds) => {
        set((s) => ({
          cachedBreakdowns: s.cachedBreakdowns.map((c) =>
            c.taskId === taskId && c.approvedAt == null
              ? { ...c, approvedAt: now(), approvedSubtaskIds }
              : c,
          ),
        }))
      },

      invalidateCachedBreakdown: (taskId) => {
        set((s) => ({
          cachedBreakdowns: s.cachedBreakdowns.filter((c) => c.taskId !== taskId),
        }))
      },

      // ─── Hint dismissal (Tier 4.16) ────────────────────────────────────────
      dismissTaskHint: (taskId) => {
        set((s) => ({
          tasks: s.tasks.map((t) =>
            t.id === taskId ? { ...t, hintDismissed: true, updatedAt: now() } : t,
          ),
        }))
      },

      dismissGlobalBreakdownHint: () => {
        if (typeof window !== 'undefined') {
          window.localStorage.setItem('pi-kanban-poc-v2:breakdown-hint-dismissed', '1')
        }
      },

      isGlobalBreakdownHintDismissed: () => {
        if (typeof window === 'undefined') return true
        return window.localStorage.getItem('pi-kanban-poc-v2:breakdown-hint-dismissed') === '1'
      },

      reset: () => {
        set({
          projects: [],
          tasks: [],
          subtasks: [],
          conversations: [],
          planningThreads: [],
          planningMessages: [],
          visionVersions: [],
          activities: [],
          cachedBreakdowns: [],
        })
      },
    }),
    {
      name: 'pi-kanban-poc-v2:store-v1',
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
      migrate: (persistedState: unknown) => {
        // v2 starts fresh — no legacy migration needed.
        // If persisted state exists, pass it through as-is.
        return (persistedState ?? {}) as KanbanState
      },
      onRehydrateStorage: () => () => {
        // Sweep: hard-delete soft-deleted records older than the TTL window.
        // Runs once after the persisted state is rehydrated.
        try {
          const cutoff = Date.now() - SOFT_DELETE_TTL_MS
          useKanbanStore.setState((s) => ({
            tasks: s.tasks.filter(
              (t) => !t.deletedAt || new Date(t.deletedAt).getTime() > cutoff,
            ),
            subtasks: s.subtasks.filter(
              (sub) => !sub.deletedAt || new Date(sub.deletedAt).getTime() > cutoff,
            ),
          }))
        } catch {
          /* ignore — sweep is best-effort */
        }
      },
    },
  ),
)

/** TTL after which soft-deleted records are permanently purged on boot.
 *  Default 7 days — generous so a user can recover accidental deletes after
 *  a weekend off, but bounded so the store doesn't grow unbounded. */
export const SOFT_DELETE_TTL_MS = 7 * 24 * 60 * 60 * 1000

/** Predicate helpers for selectors. Filtering at read time means the store
 *  schema is unchanged for callers that need the raw arrays (export, audit). */
export const isActiveTask = (t: Task): boolean => !t.deletedAt
export const isActiveSubtask = (sub: Subtask): boolean => !sub.deletedAt

// ─── Hydration helper ─────────────────────────────────────────────────────────
// Components can subscribe to this to know when localStorage has finished loading,
// avoiding hydration mismatches.
export function useStoreHydrated(): boolean {
  return useKanbanStore.persist.hasHydrated()
}
