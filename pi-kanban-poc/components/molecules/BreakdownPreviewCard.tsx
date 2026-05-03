'use client'

import { useMemo, useState, useCallback } from 'react'
import { Plus, Trash2, Edit3, Check, X, Sparkles, AlertTriangle, ListChecks } from 'lucide-react'
import type { BreakdownEnvelope, SubtaskProposal, SubtaskType } from '@/types/domain'

/**
 * Editable preview card for AI-suggested subtasks (Tier 3.9).
 *
 * State model:
 *   - All local. Nothing persists until the user hits "Approve selected"
 *     or "Approve all".
 *   - Each row is selectable via checkbox. Defaults to selected=true so the
 *     default path (click once, approve all) is frictionless.
 *   - Inline edit: click the pencil icon to edit title/description/effort.
 *   - Add custom: opens a new row with type='custom'. Custom rows are
 *     treated like AI rows on approve (UI badge differentiates).
 */

const TYPE_STYLE: Record<SubtaskType, { chip: string; emoji: string; label: string }> = {
  research:    { chip: 'bg-brand-subtle text-brand',  emoji: '🔍', label: 'Research' },
  create:      { chip: 'bg-warning-bg text-warning',  emoji: '🎨', label: 'Create' },
  communicate: { chip: 'bg-brand-subtle text-brand', emoji: '💬', label: 'Communicate' },
  decide:      { chip: 'bg-warning-bg text-warning',  emoji: '🎯', label: 'Decide' },
  custom:      { chip: 'bg-surface-muted text-ink-muted', emoji: '👤', label: 'Custom' },
}

interface EditableProposal extends SubtaskProposal {
  selected: boolean
  isCustom: boolean
  isEditing: boolean
}

export interface BreakdownPreviewCardProps {
  envelope: BreakdownEnvelope
  onApprove: (params: { subtasksToApprove: SubtaskProposal[]; totalSuggested: number }) => void
  onDismiss: () => void
  onRefineRequest?: () => void
  disabled?: boolean
  /** If true, hide the "Refine" button (shown when no subtasks exist yet in
   *  the store — refinement only makes sense after approve). */
  hideRefine?: boolean
}

export function BreakdownPreviewCard({
  envelope,
  onApprove,
  onDismiss,
  onRefineRequest,
  disabled,
  hideRefine,
}: BreakdownPreviewCardProps) {
  const initial: EditableProposal[] = useMemo(
    () =>
      envelope.subtasks.map((s) => ({
        ...s,
        selected: true,
        isCustom: false,
        isEditing: false,
      })),
    [envelope],
  )

  const [items, setItems] = useState<EditableProposal[]>(initial)

  const selectedCount = items.filter((i) => i.selected).length
  const totalCount = items.length

  const toggleSelected = useCallback(
    (id: string) => {
      setItems((prev) => prev.map((i) => (i.id === id ? { ...i, selected: !i.selected } : i)))
    },
    [],
  )

  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id))
  }, [])

  const startEdit = useCallback((id: string) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, isEditing: true } : i)))
  }, [])

  const commitEdit = useCallback((id: string, patch: Partial<SubtaskProposal>) => {
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, ...patch, isEditing: false } : i)),
    )
  }, [])

  const cancelEdit = useCallback((id: string) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, isEditing: false } : i)))
  }, [])

  const addCustom = useCallback(() => {
    const id = `st_custom_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
    setItems((prev) => [
      ...prev,
      {
        id,
        title: '',
        description: null,
        estimatedEffort: null,
        type: 'custom',
        selected: true,
        isCustom: true,
        isEditing: true,
      },
    ])
  }, [])

  const handleApproveSelected = () => {
    const toApprove = items.filter((i) => i.selected && i.title.trim().length > 0)
    onApprove({
      subtasksToApprove: toApprove.map(stripEditMeta),
      totalSuggested: envelope.subtasks.length,
    })
  }

  const handleApproveAll = () => {
    const all = items.filter((i) => i.title.trim().length > 0)
    onApprove({
      subtasksToApprove: all.map(stripEditMeta),
      totalSuggested: envelope.subtasks.length,
    })
  }

  return (
    <div className="mt-3 rounded-2xl border border-brand-border bg-brand-subtle/40 overflow-hidden shadow-sm">
      <div className="px-4 py-2.5 bg-surface/60 border-b border-brand-border flex items-center gap-2">
        <Sparkles className="w-3.5 h-3.5 text-brand" />
        <span className="text-meta font-semibold text-brand flex-1">
          AI suggests {envelope.subtasks.length} step{envelope.subtasks.length === 1 ? '' : 's'}
        </span>
      </div>

      <div className="px-4 py-3 space-y-3" onClick={(e) => e.stopPropagation()}>
        {envelope.taskUnderstanding && (
          <p className="text-meta italic text-ink-muted leading-relaxed border-l-2 border-brand-border pl-2.5">
            &ldquo;{envelope.taskUnderstanding}&rdquo;
          </p>
        )}

        {envelope.prerequisites.length > 0 && (
          <div className="rounded-xl bg-warning-bg border border-warning-border px-3 py-2">
            <div className="text-micro normal-case font-semibold text-warning mb-1">
              ⚠️ Before you start
            </div>
            <ul className="text-meta text-warning space-y-0.5">
              {envelope.prerequisites.map((p, i) => (
                <li key={i}>• {p}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="space-y-1.5">
          {items.map((item) => (
            <SubtaskRow
              key={item.id}
              item={item}
              disabled={disabled}
              onToggle={() => toggleSelected(item.id)}
              onRemove={() => removeItem(item.id)}
              onStartEdit={() => startEdit(item.id)}
              onCommitEdit={(patch) => commitEdit(item.id, patch)}
              onCancelEdit={() => cancelEdit(item.id)}
            />
          ))}
        </div>

        <button
          onClick={addCustom}
          disabled={disabled}
          className="w-full flex items-center justify-center gap-1 py-1.5 rounded-xl border border-dashed border-brand-border text-meta font-semibold text-brand hover:bg-surface transition-colors disabled:opacity-40"
        >
          <Plus className="w-3 h-3" />
          Add my own step
        </button>

        {envelope.risks.length > 0 && (
          <div className="rounded-xl bg-danger-bg border border-danger-border px-3 py-2">
            <div className="text-micro normal-case font-semibold text-danger mb-1 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              Heads up
            </div>
            <ul className="text-meta text-danger space-y-0.5">
              {envelope.risks.map((r, i) => (
                <li key={i}>• {r}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="px-4 py-3 border-t border-brand-border bg-surface/40 flex items-center gap-1.5 flex-wrap">
        <button
          onClick={(e) => {
            e.stopPropagation()
            onDismiss()
          }}
          disabled={disabled}
          className="px-2.5 py-1.5 rounded-lg text-meta font-semibold text-ink-muted hover:bg-surface transition-colors active:scale-95 disabled:opacity-40"
        >
          Dismiss all
        </button>
        {!hideRefine && onRefineRequest && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onRefineRequest()
            }}
            disabled={disabled}
            className="px-2.5 py-1.5 rounded-lg text-meta font-semibold text-brand hover:bg-surface transition-colors active:scale-95 disabled:opacity-40"
          >
            ✨ Ask to refine
          </button>
        )}
        <div className="ml-auto flex items-center gap-1.5">
          <button
            onClick={(e) => {
              e.stopPropagation()
              handleApproveSelected()
            }}
            disabled={disabled || selectedCount === 0}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-surface border border-brand-border text-brand text-meta font-semibold hover:bg-brand-subtle transition-colors active:scale-95 disabled:opacity-40"
          >
            <ListChecks className="w-3 h-3" />
            Selected ({selectedCount})
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              handleApproveAll()
            }}
            disabled={disabled || totalCount === 0}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-brand text-white text-meta font-semibold hover:bg-brand-hover transition-colors active:scale-95 disabled:opacity-40 shadow-sm"
          >
            <Check className="w-3 h-3" />
            Approve all
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Row ─────────────────────────────────────────────────────────────────────

interface SubtaskRowProps {
  item: EditableProposal
  disabled?: boolean
  onToggle: () => void
  onRemove: () => void
  onStartEdit: () => void
  onCommitEdit: (patch: Partial<SubtaskProposal>) => void
  onCancelEdit: () => void
}

function SubtaskRow({
  item,
  disabled,
  onToggle,
  onRemove,
  onStartEdit,
  onCommitEdit,
  onCancelEdit,
}: SubtaskRowProps) {
  const [draftTitle, setDraftTitle] = useState(item.title)
  const [draftDesc, setDraftDesc] = useState(item.description ?? '')
  const [draftEffort, setDraftEffort] = useState(item.estimatedEffort ?? '')

  if (item.isEditing) {
    return (
      <div className="rounded-xl bg-surface border border-brand-border p-2.5 space-y-1.5">
        <input
          type="text"
          autoFocus
          value={draftTitle}
          onChange={(e) => setDraftTitle(e.target.value)}
          placeholder="Step title (required)"
          className="w-full bg-transparent text-meta font-semibold text-ink placeholder:text-ink-subtle border-b border-line focus:border-brand outline-none pb-1"
        />
        <textarea
          value={draftDesc}
          onChange={(e) => setDraftDesc(e.target.value)}
          placeholder="Description (optional)"
          rows={2}
          className="w-full bg-transparent text-meta text-ink-muted placeholder:text-ink-subtle resize-none outline-none"
        />
        <input
          type="text"
          value={draftEffort}
          onChange={(e) => setDraftEffort(e.target.value)}
          placeholder="Estimated effort (e.g. 30 min)"
          className="w-full bg-transparent text-meta text-ink-muted placeholder:text-ink-subtle border-t border-line pt-1 outline-none"
        />
        <div className="flex items-center justify-end gap-1.5 pt-1">
          <button
            onClick={(e) => {
              e.stopPropagation()
              onCancelEdit()
            }}
            className="p-1 rounded-lg text-ink-subtle hover:text-ink hover:bg-surface-muted"
          >
            <X className="w-3 h-3" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              if (draftTitle.trim().length === 0) return
              onCommitEdit({
                title: draftTitle.trim(),
                description: draftDesc.trim() || null,
                estimatedEffort: draftEffort.trim() || null,
              })
            }}
            className="p-1 rounded-lg text-brand hover:text-white hover:bg-brand"
          >
            <Check className="w-3 h-3" />
          </button>
        </div>
      </div>
    )
  }

  const style = TYPE_STYLE[item.type]

  return (
    <div
      className={`flex items-start gap-2 rounded-xl px-2.5 py-2 transition-colors ${
        item.selected ? 'bg-surface border border-brand-border' : 'bg-surface/40 border border-transparent'
      }`}
    >
      <input
        type="checkbox"
        checked={item.selected}
        onChange={onToggle}
        onClick={(e) => e.stopPropagation()}
        disabled={disabled}
        className="mt-0.5 w-3.5 h-3.5 rounded border-line text-brand focus:ring-brand shrink-0 cursor-pointer"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center flex-wrap gap-1.5 mb-0.5">
          <span className={`text-micro normal-case px-1.5 py-0.5 rounded font-semibold ${style.chip}`}>
            {style.emoji} {style.label}
          </span>
          {item.estimatedEffort && (
            <span className="text-micro normal-case text-ink-subtle">~ {item.estimatedEffort}</span>
          )}
        </div>
        <p className={`text-meta font-semibold leading-snug ${item.selected ? 'text-ink' : 'text-ink-subtle line-through'}`}>
          {item.title || <em className="text-ink-subtle">Untitled step</em>}
        </p>
        {item.description && (
          <p className="text-meta text-ink-muted mt-0.5 leading-relaxed">{item.description}</p>
        )}
      </div>
      <div className="flex items-center gap-0.5 shrink-0">
        <button
          onClick={(e) => {
            e.stopPropagation()
            onStartEdit()
          }}
          disabled={disabled}
          className="p-1 rounded-lg text-ink-subtle hover:text-brand hover:bg-brand-subtle transition-colors"
          title="Edit"
        >
          <Edit3 className="w-3 h-3" />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation()
            onRemove()
          }}
          disabled={disabled}
          className="p-1 rounded-lg text-ink-subtle hover:text-danger hover:bg-danger-bg transition-colors"
          title="Remove"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
    </div>
  )
}

function stripEditMeta(item: EditableProposal): SubtaskProposal {
  return {
    id: item.id,
    title: item.title,
    description: item.description,
    estimatedEffort: item.estimatedEffort,
    type: item.type,
  }
}
