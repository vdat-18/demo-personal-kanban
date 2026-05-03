'use client'

import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { toast } from 'sonner'
import {
  BreakdownActionButton,
  BreakdownLoadingCard,
  BreakdownErrorCard,
  CachedSuggestionBanner,
} from '@/components/molecules/BreakdownPrimitives'
import { BreakdownPreviewCard } from '@/components/molecules/BreakdownPreviewCard'
import { BreakdownNeedInputCard } from '@/components/molecules/BreakdownNeedInputCard'
import { BreakdownRefineDialog } from '@/components/molecules/BreakdownRefineDialog'
import { useBreakdownAgent } from '@/lib/hooks/useBreakdownAgent'
import { useKanbanStore } from '@/lib/storage/kanbanStore'
import type { SubtaskProposal, UITaskStatus, SubtaskApprovalStatus } from '@/types/domain'

interface TodoStepPlannerPanelProps {
  taskId: string
  taskTitle: string
  taskStatus: UITaskStatus
  onMoveToInProgress: () => void
  onMoveToDenied?: () => void
}

/**
 * TODO-specific planning panel rendered INSIDE the chat screen instead of on
 * the task card. This keeps the board clean while preserving the full
 * breakdown / approve / clarify / refine flow.
 */
export function TodoStepPlannerPanel({
  taskId,
  taskTitle,
  taskStatus,
  onMoveToInProgress,
  onMoveToDenied,
}: TodoStepPlannerPanelProps) {
  const allSubtasks = useKanbanStore((s) => s.subtasks)
  const allCachedBreakdowns = useKanbanStore((s) => s.cachedBreakdowns)
  const updateSubtask = useKanbanStore((s) => s.updateSubtask)
  const logActivity = useKanbanStore((s) => s.logActivity)

  // Inline edit state: subtaskId → { title, description }
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editDescription, setEditDescription] = useState('')

  const startEdit = useCallback((sub: { id: string; title: string; description?: string | null }) => {
    setEditingId(sub.id)
    setEditTitle(sub.title)
    setEditDescription(sub.description ?? '')
  }, [])

  const cancelEdit = useCallback(() => setEditingId(null), [])

  const saveEdit = useCallback(() => {
    if (!editingId || !editTitle.trim()) return
    updateSubtask(editingId, { title: editTitle.trim(), description: editDescription.trim() || null })
    logActivity({ taskId, type: 'doer_started_subtask', actor: 'user', summary: `Edited subtask: ${editTitle.trim()}` })
    setEditingId(null)
  }, [editingId, editTitle, editDescription, updateSubtask, logActivity, taskId])

  const subtasks = useMemo(
    () => allSubtasks.filter((sub) => sub.taskId === taskId && !sub.deletedAt),
    [allSubtasks, taskId],
  )
  const cached = useMemo(
    () =>
      allCachedBreakdowns.find(
        (c) => c.taskId === taskId && c.approvedAt == null && c.dismissedAt == null,
      ) ?? null,
    [allCachedBreakdowns, taskId],
  )

  const breakdown = useBreakdownAgent(taskId)
  const [showRefineDialog, setShowRefineDialog] = useState(false)
  const autoStartedRef = useRef(false)

  const hasSubtasks = subtasks.length > 0
  const completedCount = subtasks.filter((s) => s.completed).length

  const pendingSubtasks = subtasks.filter((s) => s.approvalStatus === 'pending')
  const approvedSubtasks = subtasks.filter((s) => s.approvalStatus === 'approved')
  const deniedSubtasks = subtasks.filter((s) => s.approvalStatus === 'denied')

  const hasApproved = approvedSubtasks.length > 0
  const hasDenied = deniedSubtasks.length > 0

  const handleSubmitRefine = async (request: string) => {
    setShowRefineDialog(false)
    const existing: SubtaskProposal[] = subtasks.map((s) => ({
      id: s.id,
      title: s.title,
      description: s.description ?? null,
      estimatedEffort: s.estimatedEffort ?? null,
      type: (s.type ?? 'custom') as SubtaskProposal['type'],
    }))
    await breakdown.refine({ userRefineRequest: request, existingSubtasks: existing })
  }

  const handleApproveSubtask = (subtaskId: string) => {
    const sub = subtasks.find((s) => s.id === subtaskId)
    if (!sub) return
    updateSubtask(sub.id, { approvalStatus: 'approved' })
    logActivity({
      taskId,
      type: 'ai_suggestion_approved',
      actor: 'user',
      summary: `Approved subtask: ${sub.title}`,
      resourceLink: { type: 'subtask', id: sub.id },
    })
  }

  const handleDenySubtask = (subtaskId: string) => {
    const sub = subtasks.find((s) => s.id === subtaskId)
    if (!sub) return
    updateSubtask(sub.id, { approvalStatus: 'denied' })
    logActivity({
      taskId,
      type: 'ai_suggestion_dismissed',
      actor: 'user',
      summary: `Denied subtask: ${sub.title}`,
      resourceLink: { type: 'subtask', id: sub.id },
    })
    toast.success(`Denied "${sub.title}"`, {
      action: {
        label: 'Undo',
        onClick: () => updateSubtask(sub.id, { approvalStatus: 'pending' }),
      },
    })
  }

  const handleResetSubtask = (subtaskId: string) => {
    const sub = subtasks.find((s) => s.id === subtaskId)
    if (!sub) return
    updateSubtask(sub.id, { approvalStatus: 'pending' })
  }

  // ─── Bulk actions ──────────────────────────────────────────────────────────
  // Approve every still-pending step. We don't touch already approved/denied
  // ones — user has already made up their mind on those.
  const handleApproveAll = () => {
    pendingSubtasks.forEach((sub) => {
      updateSubtask(sub.id, { approvalStatus: 'approved' })
    })
    if (pendingSubtasks.length > 0) {
      logActivity({
        taskId,
        type: 'ai_suggestion_approved',
        actor: 'user',
        summary: `Approved all ${pendingSubtasks.length} pending steps`,
      })
    }
  }

  const handleDenyAll = () => {
    pendingSubtasks.forEach((sub) => {
      updateSubtask(sub.id, { approvalStatus: 'denied' })
    })
    if (pendingSubtasks.length > 0) {
      logActivity({
        taskId,
        type: 'ai_suggestion_dismissed',
        actor: 'user',
        summary: `Denied all ${pendingSubtasks.length} pending steps`,
      })
    }
  }

  /** Reset everything back to pending — useful when user wants to start the
   *  approval flow over without losing the subtasks. */
  const handleResetAll = () => {
    subtasks.forEach((sub) => {
      if (sub.approvalStatus !== 'pending') {
        updateSubtask(sub.id, { approvalStatus: 'pending' })
      }
    })
  }

  const showCachedBanner =
    breakdown.state === 'idle' && !hasSubtasks && cached != null

  // In the updated board flow, Mission Control auto-breaks TODO tasks in the
  // background when the user first opens the kanban. This panel should still
  // be robust if the user opens the chat before auto-break finished or if a
  // task slipped through without subtasks (e.g. project data imported from an
  // older store version).
  useEffect(() => {
    if (autoStartedRef.current) return
    if (taskStatus !== 'TODO') return
    if (hasSubtasks) return

    autoStartedRef.current = true
    breakdown.loadFromCacheIfAvailable()
  }, [taskStatus, hasSubtasks, breakdown])

  return (
    <div className="rounded-2xl border border-brand-border bg-brand-subtle/40 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-brand-border bg-surface/60 flex items-start justify-between gap-4">
        <div>
          <div className="text-micro text-brand mb-1">Step planning</div>
          <h3 className="text-h2 text-ink leading-snug">Your task steps live here.</h3>
          <p className="text-meta text-ink-muted mt-1 leading-relaxed max-w-2xl">
            We&apos;ll auto-generate steps in the background. If something&apos;s missing, refine it here.
          </p>
        </div>
        {taskStatus === 'TODO' && hasApproved && (
          <button
            onClick={() => {
              if (pendingSubtasks.length > 0) {
                const confirmed = window.confirm(
                  `${pendingSubtasks.length} step${pendingSubtasks.length === 1 ? ' is' : 's are'} still pending. They won't run until you approve them. Start anyway?`,
                )
                if (!confirmed) return
              }
              onMoveToInProgress()
            }}
            title={
              pendingSubtasks.length > 0
                ? `${pendingSubtasks.length} pending step${pendingSubtasks.length === 1 ? '' : 's'} will be skipped`
                : 'Begin executing approved steps'
            }
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-brand text-white text-meta font-semibold hover:bg-brand-hover transition-colors active:scale-95 shadow-sm"
          >
            🚀 Start working ({approvedSubtasks.length})
          </button>
        )}
        {breakdown.state === 'idle' && !hasSubtasks && !showCachedBanner && (
          <BreakdownActionButton onClick={() => breakdown.startBreakdown()} label="Break into steps" />
        )}
      </div>

      <div className="p-5 space-y-4">
        {/* Section 0: Overall summary + bulk actions toolbar */}
        {hasSubtasks && pendingSubtasks.length + approvedSubtasks.length + deniedSubtasks.length > 0 && (
          <div className="flex items-center justify-between gap-3 px-1">
            <div className="flex items-center gap-3 text-meta font-semibold">
              <span className="inline-flex items-center gap-1.5 text-ink-muted">
                <span className="w-2 h-2 rounded-full bg-brand/60" />
                {pendingSubtasks.length} pending
              </span>
              <span className="inline-flex items-center gap-1.5 text-success">
                <span className="w-2 h-2 rounded-full bg-success" />
                {approvedSubtasks.length} approved
              </span>
              <span className="inline-flex items-center gap-1.5 text-danger">
                <span className="w-2 h-2 rounded-full bg-danger" />
                {deniedSubtasks.length} denied
              </span>
            </div>
            <div className="flex items-center gap-1">
              {pendingSubtasks.length > 0 && (
                <>
                  <button
                    onClick={handleApproveAll}
                    className="px-2.5 py-1 rounded-lg bg-success-bg text-success text-meta font-semibold border border-success-border hover:opacity-90 transition-opacity"
                  >
                    ✓ Approve all
                  </button>
                  <button
                    onClick={handleDenyAll}
                    className="px-2.5 py-1 rounded-lg bg-danger-bg text-danger text-meta font-semibold border border-danger-border hover:opacity-90 transition-opacity"
                  >
                    ✗ Deny all
                  </button>
                </>
              )}
              {approvedSubtasks.length + deniedSubtasks.length > 0 && (
                <button
                  onClick={handleResetAll}
                  title="Reset every step back to pending"
                  className="px-2.5 py-1 rounded-lg text-ink-muted text-meta font-semibold hover:bg-surface-muted transition-colors"
                >
                  ↺ Reset all
                </button>
              )}
            </div>
          </div>
        )}

        {/* Section 1: Pending subtasks - awaiting approval */}
        {pendingSubtasks.length > 0 && (
          <div className="rounded-2xl bg-surface border border-line p-4">
            <div className="flex items-center justify-between gap-3 mb-3">
              <div>
                <div className="text-micro text-ink-muted">Pending approval</div>
                <div className="text-meta font-semibold text-ink mt-0.5">
                  {pendingSubtasks.length} step{pendingSubtasks.length === 1 ? '' : 's'} waiting
                </div>
              </div>
              <div className="flex items-center gap-2">
                <BreakdownActionButton label="Refine" variant="secondary" onClick={() => setShowRefineDialog(true)} />
              </div>
            </div>
            <div className="space-y-1.5">
              {pendingSubtasks.map((sub) => (
                <div
                  key={sub.id}
                  className="w-full flex items-start gap-2 rounded-xl px-3 py-2 bg-brand-subtle/50 text-ink hover:bg-brand-subtle transition-colors"
                >
                  {editingId === sub.id ? (
                    <div className="flex-1 space-y-1.5">
                      <input
                        autoFocus
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') cancelEdit() }}
                        className="w-full text-xs font-semibold bg-white border border-brand-border rounded-lg px-2 py-1 focus:outline-none focus:border-brand-border0"
                      />
                      <input
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Escape') cancelEdit() }}
                        placeholder="Description (optional)"
                        className="w-full text-meta bg-white border border-brand-border rounded-lg px-2 py-1 focus:outline-none focus:border-brand"
                      />
                      <div className="flex gap-1.5">
                        <button onClick={saveEdit} className="px-2 py-0.5 rounded-md bg-brand text-white text-meta font-bold hover:bg-brand-hover">Save</button>
                        <button onClick={cancelEdit} className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-meta font-bold hover:bg-slate-200">Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-semibold leading-snug">{sub.title}</div>
                      {sub.description && (
                        <div className="text-meta text-slate-500 mt-0.5 leading-relaxed">{sub.description}</div>
                      )}
                    </div>
                  )}
                  {editingId !== sub.id && (
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => startEdit(sub)}
                        title="Edit"
                        className="px-1.5 py-1 rounded-lg text-slate-400 text-meta hover:bg-brand-subtle hover:text-brand transition-colors"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => handleApproveSubtask(sub.id)}
                        title="Approve"
                        className="px-2 py-1 rounded-lg bg-success-bg text-success text-meta font-semibold hover:opacity-90 transition-opacity"
                      >
                        ✓
                      </button>
                      <button
                        onClick={() => handleDenySubtask(sub.id)}
                        title="Deny"
                        className="px-2 py-1 rounded-lg bg-danger-bg text-danger text-meta font-semibold hover:opacity-90 transition-opacity"
                      >
                        ✗
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Section 2: Approved (collapsible quick-view) */}
        {approvedSubtasks.length > 0 && (
          <div className="rounded-2xl bg-surface border border-success-border p-4">
            <div className="text-micro text-success mb-3">✓ Approved · {approvedSubtasks.length}</div>
            <div className="space-y-1.5">
              {approvedSubtasks.map((sub) => (
                <div
                  key={sub.id}
                  className="w-full flex items-center gap-2 rounded-xl px-3 py-1.5 bg-success-bg/50 text-ink group"
                >
                  <span className="text-success text-meta">✓</span>
                  {editingId === sub.id ? (
                    <div className="flex-1 space-y-1 min-w-0">
                      <input autoFocus value={editTitle} onChange={(e) => setEditTitle(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') cancelEdit() }} className="w-full text-xs font-semibold bg-white border border-emerald-300 rounded-lg px-2 py-0.5 focus:outline-none" />
                      <div className="flex gap-1"><button onClick={saveEdit} className="px-2 py-0.5 rounded-md bg-emerald-600 text-white text-meta font-bold">Save</button><button onClick={cancelEdit} className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-meta font-bold">Cancel</button></div>
                    </div>
                  ) : (
                    <span className="text-xs font-semibold flex-1 truncate">{sub.title}</span>
                  )}
                  {editingId !== sub.id && (
                    <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => startEdit(sub)} title="Edit" className="px-1 py-0.5 rounded-md text-slate-400 text-meta hover:bg-emerald-100 hover:text-emerald-700 transition-colors">✏️</button>
                      <button onClick={() => handleResetSubtask(sub.id)} title="Move back to pending" className="px-2 py-0.5 rounded-md text-slate-500 text-meta font-bold hover:bg-slate-100 transition-colors">↺ Pending</button>
                      <button onClick={() => handleDenySubtask(sub.id)} title="Change to deny" className="px-2 py-0.5 rounded-md bg-red-50 text-red-600 text-meta font-bold hover:bg-red-100 transition-colors">✗ Deny</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Section 3: Denied — same toggle affordances. */}
        {deniedSubtasks.length > 0 && (
          <div className="rounded-2xl bg-surface border border-danger-border p-4">
            <div className="text-micro text-danger mb-3">✗ Denied · {deniedSubtasks.length}</div>
            <div className="space-y-1.5">
              {deniedSubtasks.map((sub) => (
                <div
                  key={sub.id}
                  className="w-full flex items-center gap-2 rounded-xl px-3 py-1.5 bg-danger-bg/50 text-ink-muted group"
                >
                  <span className="text-danger text-meta">✗</span>
                  {editingId === sub.id ? (
                    <div className="flex-1 space-y-1 min-w-0">
                      <input autoFocus value={editTitle} onChange={(e) => setEditTitle(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') cancelEdit() }} className="w-full text-xs font-semibold bg-white border border-rose-300 rounded-lg px-2 py-0.5 focus:outline-none" />
                      <div className="flex gap-1"><button onClick={saveEdit} className="px-2 py-0.5 rounded-md bg-danger text-white text-meta font-bold">Save</button><button onClick={cancelEdit} className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-meta font-bold">Cancel</button></div>
                    </div>
                  ) : (
                    <span className="text-xs font-semibold flex-1 truncate line-through opacity-70">{sub.title}</span>
                  )}
                  {editingId !== sub.id && (
                    <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => startEdit(sub)} title="Edit" className="px-1 py-0.5 rounded-md text-slate-400 text-meta hover:bg-danger-bg hover:text-danger transition-colors">✏️</button>
                      <button onClick={() => handleResetSubtask(sub.id)} title="Move back to pending" className="px-2 py-0.5 rounded-md text-slate-500 text-meta font-bold hover:bg-slate-100 transition-colors">↺ Pending</button>
                      <button onClick={() => handleApproveSubtask(sub.id)} title="Change to approve" className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-meta font-bold hover:bg-emerald-100 transition-colors">✓ Approve</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {showRefineDialog && (
          <BreakdownRefineDialog
            subtaskCount={subtasks.length}
            onSubmit={handleSubmitRefine}
            onCancel={() => setShowRefineDialog(false)}
            disabled={breakdown.isBusy}
          />
        )}

        {breakdown.state === 'loading' && (
          <BreakdownLoadingCard
            queueLabel={breakdown.queuePosition > 0 ? `Queued — ${breakdown.queuePosition} ahead` : null}
            onCancel={() => breakdown.resetLocal()}
          />
        )}

        {breakdown.state === 'queued' && (
          <BreakdownLoadingCard
            queueLabel={`Queued — ${Math.max(breakdown.queuePosition, 0)} ahead`}
            onCancel={() => breakdown.resetLocal()}
          />
        )}

        {breakdown.state === 'error' && breakdown.error && (
          <BreakdownErrorCard
            error={breakdown.error}
            onRetry={() => breakdown.startBreakdown()}
            onDismiss={() => breakdown.resetLocal()}
          />
        )}

        {breakdown.state === 'needs-input' && breakdown.envelope?.needsHumanInput && (
          <BreakdownNeedInputCard
            question={breakdown.envelope.needsHumanInput.question}
            onAnswer={(a) => breakdown.answerClarification(a)}
            onSkip={() => breakdown.answerClarification('User opted to skip this question — proceed with best-effort assumptions.')}
            onDismiss={() => breakdown.dismiss()}
            disabled={breakdown.isBusy}
          />
        )}

        {breakdown.state === 'preview' && breakdown.envelope && (
          <BreakdownPreviewCard
            envelope={breakdown.envelope}
            onApprove={breakdown.approve}
            onDismiss={() => breakdown.dismiss()}
            disabled={breakdown.isBusy}
          />
        )}

        {showCachedBanner && cached && (
          <CachedSuggestionBanner
            generatedAt={cached.generatedAt}
            count={cached.envelope.subtasks.length}
            onReview={() => breakdown.loadFromCacheIfAvailable()}
            onRefresh={() => breakdown.startBreakdown()}
            onDismiss={() => breakdown.dismiss()}
          />
        )}
      </div>
    </div>
  )
}
