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
  research:    { chip: 'bg-blue-100 text-blue-700',     emoji: '🔍', label: 'Research' },
  create:      { chip: 'bg-amber-100 text-amber-700',   emoji: '🎨', label: 'Create' },
  communicate: { chip: 'bg-violet-100 text-violet-700', emoji: '💬', label: 'Communicate' },
  decide:      { chip: 'bg-orange-100 text-orange-700', emoji: '🎯', label: 'Decide' },
  custom:      { chip: 'bg-slate-100 text-slate-700',   emoji: '👤', label: 'Custom' },
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
    <div className="mt-3 rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50/60 to-blue-50/60 overflow-hidden shadow-sm">
      <div className="px-4 py-2.5 bg-white/50 border-b border-indigo-100 flex items-center gap-2">
        <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
        <span className="text-[10px] font-black text-indigo-700 uppercase tracking-[0.15em] flex-1">
          AI suggests {envelope.subtasks.length} step{envelope.subtasks.length === 1 ? '' : 's'}
        </span>
      </div>

      <div className="px-4 py-3 space-y-3" onClick={(e) => e.stopPropagation()}>
        {envelope.taskUnderstanding && (
          <p className="text-[11px] italic text-slate-600 leading-relaxed border-l-2 border-indigo-200 pl-2.5">
            &ldquo;{envelope.taskUnderstanding}&rdquo;
          </p>
        )}

        {envelope.prerequisites.length > 0 && (
          <div className="rounded-xl bg-amber-50/80 border border-amber-100 px-3 py-2">
            <div className="text-[10px] font-black text-amber-700 uppercase tracking-wider mb-1">
              ⚠️ Before you start
            </div>
            <ul className="text-[11px] text-amber-800 space-y-0.5">
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
          className="w-full flex items-center justify-center gap-1 py-1.5 rounded-xl border border-dashed border-indigo-200 text-[11px] font-bold text-indigo-600 hover:bg-white/60 transition-colors disabled:opacity-40"
        >
          <Plus className="w-3 h-3" />
          Add my own step
        </button>

        {envelope.risks.length > 0 && (
          <div className="rounded-xl bg-rose-50/80 border border-rose-100 px-3 py-2">
            <div className="text-[10px] font-black text-rose-700 uppercase tracking-wider mb-1 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              Heads up
            </div>
            <ul className="text-[11px] text-rose-800 space-y-0.5">
              {envelope.risks.map((r, i) => (
                <li key={i}>• {r}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="px-4 py-3 border-t border-indigo-100 bg-white/40 flex items-center gap-1.5 flex-wrap">
        <button
          onClick={(e) => {
            e.stopPropagation()
            onDismiss()
          }}
          disabled={disabled}
          className="px-2.5 py-1.5 rounded-xl text-[10px] font-bold text-slate-500 hover:bg-white/80 transition-colors active:scale-95 disabled:opacity-40"
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
            className="px-2.5 py-1.5 rounded-xl text-[10px] font-bold text-indigo-600 hover:bg-white/80 transition-colors active:scale-95 disabled:opacity-40"
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
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white border border-indigo-200 text-indigo-700 text-[10px] font-black uppercase tracking-wider hover:bg-indigo-50 transition-colors active:scale-95 disabled:opacity-40"
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
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#0a192f] text-white text-[10px] font-black uppercase tracking-wider hover:bg-blue-700 transition-colors active:scale-95 disabled:opacity-40 shadow-sm"
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
      <div className="rounded-xl bg-white border border-indigo-200 p-2.5 space-y-1.5">
        <input
          type="text"
          autoFocus
          value={draftTitle}
          onChange={(e) => setDraftTitle(e.target.value)}
          placeholder="Step title (required)"
          className="w-full bg-transparent text-xs font-semibold text-[#0a192f] placeholder:text-slate-300 border-b border-slate-100 focus:border-indigo-400 outline-none pb-1"
        />
        <textarea
          value={draftDesc}
          onChange={(e) => setDraftDesc(e.target.value)}
          placeholder="Description (optional)"
          rows={2}
          className="w-full bg-transparent text-[11px] text-slate-600 placeholder:text-slate-300 resize-none outline-none"
        />
        <input
          type="text"
          value={draftEffort}
          onChange={(e) => setDraftEffort(e.target.value)}
          placeholder="Estimated effort (e.g. 30 min)"
          className="w-full bg-transparent text-[10px] text-slate-500 placeholder:text-slate-300 border-t border-slate-100 pt-1 outline-none"
        />
        <div className="flex items-center justify-end gap-1.5 pt-1">
          <button
            onClick={(e) => {
              e.stopPropagation()
              onCancelEdit()
            }}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-50"
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
            className="p-1 rounded-lg text-indigo-600 hover:text-white hover:bg-indigo-600"
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
        item.selected ? 'bg-white border border-indigo-100' : 'bg-white/40 border border-transparent'
      }`}
    >
      <input
        type="checkbox"
        checked={item.selected}
        onChange={onToggle}
        onClick={(e) => e.stopPropagation()}
        disabled={disabled}
        className="mt-0.5 w-3.5 h-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-400 shrink-0 cursor-pointer"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center flex-wrap gap-1.5 mb-0.5">
          <span className={`text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded ${style.chip}`}>
            {style.emoji} {style.label}
          </span>
          {item.estimatedEffort && (
            <span className="text-[9px] text-slate-400 font-bold">~ {item.estimatedEffort}</span>
          )}
        </div>
        <p className={`text-xs font-semibold leading-snug ${item.selected ? 'text-[#0a192f]' : 'text-slate-400 line-through'}`}>
          {item.title || <em className="text-slate-300">Untitled step</em>}
        </p>
        {item.description && (
          <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">{item.description}</p>
        )}
      </div>
      <div className="flex items-center gap-0.5 shrink-0">
        <button
          onClick={(e) => {
            e.stopPropagation()
            onStartEdit()
          }}
          disabled={disabled}
          className="p-1 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
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
          className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
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
