'use client'

import { useEffect, useState } from 'react'
import { X, Save, AlertTriangle } from 'lucide-react'
import type { TaskPriority, TaskStatus } from '@/types/domain'
import { TASK_PRIORITY_LABEL, TASK_STATUS_LABEL } from '@/lib/display/labels'
import { useConfirm } from './ConfirmDialog'

/**
 * Reusable Add/Edit Task dialog.
 *
 * Used both from the Planning TaskPanel and the Mission Control Kanban so
 * manual task management feels first-class instead of bolted on.
 *
 * Props:
 *  - `mode="add"` shows blank fields and submits to `onSubmit({...})`.
 *  - `mode="edit"` pre-fills from `initial` and submits the same shape.
 *  - `defaultStatus` (add only): shown as readonly chip "Sẽ vào cột: …" so
 *    users adding from a Kanban column know where the task lands.
 *  - ESC closes; Enter (without shift) submits when title is non-empty.
 */

export type TaskFormValues = {
  title: string
  description: string
  priority: TaskPriority
}

export interface TaskFormDialogProps {
  open: boolean
  mode: 'add' | 'edit'
  initial?: Partial<TaskFormValues>
  /** Status the new task will get; only shown as readonly hint. */
  defaultStatus?: TaskStatus
  isSubmitting?: boolean
  onClose: () => void
  onSubmit: (values: TaskFormValues) => Promise<void> | void
}

const PRIORITY_OPTIONS: TaskPriority[] = ['LOW', 'MEDIUM', 'HIGH', 'URGENT']

export function TaskFormDialog({
  open,
  mode,
  initial,
  defaultStatus,
  isSubmitting,
  onClose,
  onSubmit,
}: TaskFormDialogProps) {
  const [title, setTitle] = useState(initial?.title ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [priority, setPriority] = useState<TaskPriority>(initial?.priority ?? 'MEDIUM')
  const { confirm, element: confirmElement } = useConfirm()

  // Re-initialize when the modal is (re-)opened with fresh values.
  useEffect(() => {
    if (open) {
      setTitle(initial?.title ?? '')
      setDescription(initial?.description ?? '')
      setPriority(initial?.priority ?? 'MEDIUM')
    }
  }, [open, initial?.title, initial?.description, initial?.priority])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  if (!open) return null

  const isDirty =
    title !== (initial?.title ?? '') ||
    description !== (initial?.description ?? '') ||
    priority !== (initial?.priority ?? 'MEDIUM')

  const handleClose = async () => {
    if (mode === 'edit' && isDirty && !isSubmitting) {
      const ok = await confirm({
        title: 'Discard changes?',
        message: 'You have unsaved changes. Discard and close?',
        variant: 'warning',
        confirmLabel: 'Discard',
      })
      if (!ok) return
    }
    onClose()
  }

  const handleSubmit = async () => {
    if (!title.trim() || isSubmitting) return
    await onSubmit({ title: title.trim(), description: description.trim(), priority })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[#0a192f]/50 backdrop-blur-sm" onClick={handleClose} />
      <div className="relative z-10 w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-white overflow-hidden animate-in zoom-in-95 duration-200">
        <header className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-[#0a192f] tracking-tight">
              {mode === 'add' ? 'Add task' : 'Edit task'}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {mode === 'add'
                ? 'Create a task manually.'
                : 'Update task details.'}
            </p>
          </div>
          <button
            onClick={handleClose}
            aria-label="Close"
            className="p-2 rounded-xl text-slate-400 hover:text-[#0a192f] hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </header>

        <div className="p-5 space-y-4">
          {mode === 'add' && defaultStatus && (
            <div className="flex items-center gap-2 text-xs text-slate-600">
              <span className="font-semibold">Adding to column:</span>
              <span className="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 font-bold text-[#0a192f]">
                {TASK_STATUS_LABEL[defaultStatus]}
              </span>
            </div>
          )}

          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey && title.trim()) {
                  e.preventDefault()
                  handleSubmit()
                }
              }}
              placeholder="Short, action-oriented title"
              className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-[#0a192f] placeholder:text-slate-400 focus:outline-none focus:border-blue-400"
            />
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Description (optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder="What needs to be done, success criteria, notes…"
              className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-[#0a192f] placeholder:text-slate-400 focus:outline-none focus:border-blue-400 resize-y"
            />
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Priority
            </label>
            <div className="mt-2 flex flex-wrap gap-2">
              {PRIORITY_OPTIONS.map((p) => {
                const selected = priority === p
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPriority(p)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                      selected
                        ? p === 'URGENT'
                          ? 'bg-rose-600 text-white border-rose-600 shadow shadow-rose-500/25'
                          : p === 'HIGH'
                          ? 'bg-orange-500 text-white border-orange-500 shadow shadow-orange-500/25'
                          : p === 'MEDIUM'
                          ? 'bg-yellow-500 text-white border-yellow-500 shadow shadow-yellow-500/25'
                          : 'bg-slate-500 text-white border-slate-500 shadow shadow-slate-500/25'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {TASK_PRIORITY_LABEL[p]}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        <footer className="px-5 py-3 border-t border-slate-100 bg-slate-50/40 flex items-center justify-between gap-3">
          {mode === 'edit' && isDirty ? (
            <div className="text-[11px] text-amber-700 inline-flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              Unsaved changes
            </div>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-2">
            <button
              onClick={handleClose}
              className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!title.trim() || isSubmitting}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0a192f] text-white text-sm font-bold hover:bg-blue-700 transition-colors disabled:opacity-40"
            >
              <Save className="w-3.5 h-3.5" />
              {mode === 'add' ? 'Create task' : 'Save'}
            </button>
          </div>
        </footer>
      </div>
      {confirmElement}
    </div>
  )
}
