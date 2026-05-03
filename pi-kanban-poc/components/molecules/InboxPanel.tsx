'use client'

import { Bell, X, ChevronRight, AlertCircle, Info, AlertTriangle } from 'lucide-react'
import { useKanbanStore } from '@/lib/storage/kanbanStore'
import type { AttentionType } from '@/types/domain'

const TYPE_LABELS: Record<AttentionType, string> = {
  clarification_needed: 'Needs clarification',
  task_approval_pending: 'Pending approval',
  plan_unpublished: 'Plan not published',
  source_needs_review: 'Source needs review',
  execution_blocked: 'Blocked',
  validation_required: 'Needs validation',
}

// Reduced from 6 colors → 3 semantic groups (warning / info / danger)
const TYPE_TONE: Record<AttentionType, { chip: string; icon: React.ComponentType<{ className?: string }> }> = {
  clarification_needed: { chip: 'bg-warning-bg text-warning', icon: AlertTriangle },
  task_approval_pending: { chip: 'bg-warning-bg text-warning', icon: AlertCircle },
  plan_unpublished: { chip: 'bg-warning-bg text-warning', icon: AlertCircle },
  source_needs_review: { chip: 'bg-info-bg text-info', icon: Info },
  execution_blocked: { chip: 'bg-danger-bg text-danger', icon: AlertTriangle },
  validation_required: { chip: 'bg-warning-bg text-warning', icon: AlertCircle },
}

interface Props {
  onNavigate?: (projectId: string) => void
}

export function InboxPanel({ onNavigate }: Props) {
  const attentionItems = useKanbanStore((s) => s.attentionItems)
  const projects = useKanbanStore((s) => s.projects)
  const resolveAttentionItem = useKanbanStore((s) => s.resolveAttentionItem)

  const openItems = attentionItems
    .filter((item) => item.status === 'open')
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  if (openItems.length === 0) return null

  return (
    <div className="rounded-2xl border border-warning-border bg-warning-bg/50 p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <Bell className="w-4 h-4 text-warning" />
        <h3 className="text-h2 text-ink">Needs your attention</h3>
        <span className="ml-auto px-2 py-0.5 rounded-full bg-warning text-white text-micro">
          {openItems.length}
        </span>
      </div>
      <div className="space-y-2">
        {openItems.map((item) => {
          const project = projects.find((p) => p.id === item.projectId)
          const tone = TYPE_TONE[item.type]
          const Icon = tone.icon
          return (
            <div
              key={item.id}
              className="flex items-start gap-3 bg-surface rounded-xl border border-line px-3 py-2.5"
            >
              <span
                className={`mt-0.5 shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-micro ${tone.chip}`}
              >
                <Icon className="w-3 h-3" />
                {TYPE_LABELS[item.type]}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-meta font-semibold text-ink truncate">{item.title}</p>
                <p className="text-meta text-ink-muted mt-0.5 line-clamp-2">{item.detail}</p>
                {project && (
                  <p className="text-micro text-ink-subtle mt-1 normal-case tracking-normal">
                    📁 {project.name}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {onNavigate && project && (
                  <button
                    onClick={() => onNavigate(item.projectId)}
                    title="Open project"
                    className="p-1.5 rounded-lg text-ink-subtle hover:text-brand hover:bg-brand-subtle transition-colors"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  onClick={() => resolveAttentionItem(item.id)}
                  title="Mark as resolved"
                  className="p-1.5 rounded-lg text-ink-subtle hover:text-ink-muted hover:bg-surface-muted transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
