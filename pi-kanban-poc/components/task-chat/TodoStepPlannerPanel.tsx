'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
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

  const subtasks = useMemo(
    () => allSubtasks.filter((sub) => sub.taskId === taskId),
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
  }

  const handleResetSubtask = (subtaskId: string) => {
    const sub = subtasks.find((s) => s.id === subtaskId)
    if (!sub) return
    updateSubtask(sub.id, { approvalStatus: 'pending' })
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

    const loadedFromCache = breakdown.loadFromCacheIfAvailable()
    if (!loadedFromCache) {
      void breakdown.startBreakdown()
    }
  }, [taskStatus, hasSubtasks, breakdown])

  return (
    <div className="rounded-3xl border border-indigo-100 bg-gradient-to-br from-indigo-50/70 via-white to-blue-50/50 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-indigo-100 bg-white/50 flex items-start justify-between gap-4">
        <div>
          <div className="text-[10px] font-black uppercase tracking-[0.18em] text-indigo-700 mb-1">
            Step Planning
          </div>
          <h3 className="text-sm font-bold text-[#0a192f] leading-snug">
            Your task steps live here.
          </h3>
          <p className="text-[11px] text-slate-500 mt-1 leading-relaxed max-w-2xl">
            Mission Control auto-generates steps in the background. If something is missing, you can refine it here.
          </p>
        </div>
        {taskStatus === 'TODO' && hasApproved && (
          <button
            onClick={onMoveToInProgress}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-blue-600 text-white text-[10px] font-black uppercase tracking-wider hover:bg-blue-700 transition-colors active:scale-95 shadow-sm"
          >
            🚀 Start working
          </button>
        )}
        {breakdown.state === 'idle' && !hasSubtasks && !showCachedBanner && (
          <BreakdownActionButton onClick={() => breakdown.startBreakdown()} label="Break into steps" />
        )}
      </div>

      <div className="p-5 space-y-4">
        {/* Section 1: Pending subtasks - chờ duyệt */}
        {pendingSubtasks.length > 0 && (
          <div className="rounded-2xl bg-white border border-slate-100 p-4">
            <div className="flex items-center justify-between gap-3 mb-3">
              <div>
                <div className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">
                  Pending approval
                </div>
                <div className="text-xs font-semibold text-[#0a192f] mt-0.5">
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
                  className="w-full flex items-start gap-2 rounded-xl px-3 py-2 bg-indigo-50/50 text-slate-700 hover:bg-indigo-50 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-semibold leading-snug">
                      {sub.title}
                    </div>
                    {sub.description && (
                      <div className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">{sub.description}</div>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleApproveSubtask(sub.id)}
                      className="px-2 py-1 rounded-lg bg-green-100 text-green-700 text-[10px] font-bold uppercase tracking-wider hover:bg-green-200 transition-colors"
                    >
                      ✓
                    </button>
                    <button
                      onClick={() => handleDenySubtask(sub.id)}
                      className="px-2 py-1 rounded-lg bg-red-100 text-red-700 text-[10px] font-bold uppercase tracking-wider hover:bg-red-200 transition-colors"
                    >
                      ✗
                    </button>
                  </div>
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
