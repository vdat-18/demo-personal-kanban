'use client'

/**
 * ConfirmDialog — replaces native window.confirm() with a themed modal.
 *
 * Imperative API via Promise:
 *   const ok = await confirm({ title: '...', message: '...' })
 *
 * Or declarative (controlled): <ConfirmDialog open ... />.
 *
 * Variants: 'danger' | 'warning' | 'info' (visual cue + confirm button color).
 */

import { useEffect, useState, useCallback } from 'react'
import { AlertTriangle, AlertCircle, Info, X } from 'lucide-react'

export type ConfirmVariant = 'danger' | 'warning' | 'info'

export interface ConfirmDialogProps {
  open: boolean
  title: string
  message: React.ReactNode
  confirmLabel?: string
  cancelLabel?: string
  variant?: ConfirmVariant
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'warning',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
      if (e.key === 'Enter') onConfirm()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onCancel, onConfirm])

  if (!open) return null

  const Icon = variant === 'danger' ? AlertCircle : variant === 'warning' ? AlertTriangle : Info
  const iconColor =
    variant === 'danger' ? 'text-danger' : variant === 'warning' ? 'text-amber-500' : 'text-blue-500'
  const confirmBtn =
    variant === 'danger'
      ? 'bg-danger hover:opacity-90 text-white'
      : variant === 'warning'
      ? 'bg-amber-600 hover:bg-amber-700 text-white'
      : 'bg-blue-600 hover:bg-blue-700 text-white'

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink/50 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative z-10 w-full max-w-md bg-white rounded-3xl shadow-2xl border border-white overflow-hidden animate-in zoom-in-95 duration-200">
        <header className="px-5 py-4 border-b border-slate-100 flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <Icon className={`w-5 h-5 mt-0.5 shrink-0 ${iconColor}`} />
            <h3 className="text-base font-bold text-ink tracking-tight">{title}</h3>
          </div>
          <button
            onClick={onCancel}
            aria-label="Close"
            className="p-1.5 rounded-xl text-slate-400 hover:text-ink hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </header>

        <div className="p-5 text-sm text-slate-700">{message}</div>

        <footer className="px-5 py-3 border-t border-slate-100 bg-slate-50/40 flex items-center justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors ${confirmBtn}`}
          >
            {confirmLabel}
          </button>
        </footer>
      </div>
    </div>
  )
}

// ── Imperative hook: useConfirm() ───────────────────────────────────────

interface ConfirmOptions {
  title: string
  message: React.ReactNode
  confirmLabel?: string
  cancelLabel?: string
  variant?: ConfirmVariant
}

interface ConfirmState extends ConfirmOptions {
  open: boolean
  resolve?: (ok: boolean) => void
}

/**
 * Hook returns:
 *   - confirm(opts) → Promise<boolean>
 *   - element to render somewhere in the tree
 *
 * Example:
 *   const { confirm, element } = useConfirm()
 *   ...
 *   if (await confirm({ title: 'Delete task?', message: '...', variant: 'danger' })) {
 *     deleteTask(id)
 *   }
 *   return <>{element}{...children}</>
 */
export function useConfirm() {
  const [state, setState] = useState<ConfirmState>({ open: false, title: '', message: '' })

  const confirm = useCallback((opts: ConfirmOptions): Promise<boolean> => {
    return new Promise<boolean>((resolve) => {
      setState({ ...opts, open: true, resolve })
    })
  }, [])

  const handle = (ok: boolean) => {
    state.resolve?.(ok)
    setState((s) => ({ ...s, open: false, resolve: undefined }))
  }

  const element = (
    <ConfirmDialog
      open={state.open}
      title={state.title}
      message={state.message}
      confirmLabel={state.confirmLabel}
      cancelLabel={state.cancelLabel}
      variant={state.variant}
      onConfirm={() => handle(true)}
      onCancel={() => handle(false)}
    />
  )

  return { confirm, element }
}
