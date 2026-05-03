'use client'

import { useState } from 'react'
import { Repeat, Plus, Trash2, X, Check } from 'lucide-react'
import { useKanbanStore } from '@/lib/storage/kanbanStore'
import type { RecurringFrequency } from '@/types/domain'

const FREQ_LABELS: Record<RecurringFrequency, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
}

interface Props {
  projectId: string
  onClose: () => void
}

export function RecurringTemplateDialog({ projectId, onClose }: Props) {
  const allTemplates = useKanbanStore((s) => s.recurringTemplates)
  const templates = allTemplates.filter((t) => t.projectId === projectId)
  const createRecurringTemplate = useKanbanStore((s) => s.createRecurringTemplate)
  const deleteRecurringTemplate = useKanbanStore((s) => s.deleteRecurringTemplate)

  const [adding, setAdding] = useState(false)
  const [title, setTitle] = useState('')
  const [desc, setDesc] = useState('')
  const [freq, setFreq] = useState<RecurringFrequency>('weekly')

  const handleAdd = () => {
    if (!title.trim()) return
    createRecurringTemplate({
      projectId,
      title: title.trim(),
      description: desc.trim() || null,
      frequency: freq,
    })
    setTitle('')
    setDesc('')
    setFreq('weekly')
    setAdding(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Repeat className="w-4 h-4 text-indigo-500" />
            <h2 className="text-sm font-bold text-[#0a192f]">Recurring tasks</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-3 max-h-72 overflow-y-auto">
          {templates.length === 0 && !adding && (
            <p className="text-[11px] text-slate-400 italic text-center py-4">
              No templates yet. Add one to get reminders for recurring tasks.
            </p>
          )}

          {templates.map((t) => (
            <div
              key={t.id}
              className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3"
            >
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-[#0a192f]">{t.title}</p>
                {t.description && (
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">{t.description}</p>
                )}
                <span className="inline-block mt-1.5 px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-bold">
                  {FREQ_LABELS[t.frequency]}
                </span>
              </div>
              <button
                onClick={() => deleteRecurringTemplate(t.id)}
                className="p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors shrink-0"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}

          {adding && (
            <div className="rounded-xl border border-indigo-200 bg-indigo-50/40 p-3 space-y-2">
              <input
                autoFocus
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Task name (e.g. Weekly report)"
                className="w-full text-xs bg-white border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-400"
              />
              <textarea
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                placeholder="Description (optional)"
                rows={2}
                className="w-full text-xs bg-white border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-400 resize-none"
              />
              <div className="flex gap-2">
                {(['daily', 'weekly', 'monthly'] as RecurringFrequency[]).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFreq(f)}
                    className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold border transition-colors ${
                      freq === f
                        ? 'border-indigo-400 bg-indigo-600 text-white'
                        : 'border-slate-200 text-slate-600 hover:border-slate-300 bg-white'
                    }`}
                  >
                    {FREQ_LABELS[f]}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-slate-100 flex gap-2 justify-end">
          {adding ? (
            <>
              <button
                onClick={() => { setAdding(false); setTitle(''); setDesc('') }}
                className="px-3 py-2 text-xs text-slate-500 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAdd}
                disabled={!title.trim()}
                className="px-4 py-2 text-xs bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-40 transition-colors font-bold flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" /> Add
              </button>
            </>
          ) : (
            <>
              <button
                onClick={onClose}
                className="px-3 py-2 text-xs text-slate-500 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-colors"
              >
                Close
              </button>
              <button
                onClick={() => setAdding(true)}
                className="px-4 py-2 text-xs bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors font-bold flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" /> Add template
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
