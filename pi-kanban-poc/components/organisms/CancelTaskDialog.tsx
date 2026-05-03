'use client'

import { AlertTriangle } from 'lucide-react'

export interface CancelTaskDialogProps {
  isOpen: boolean
  taskTitle: string
  cancelReason: string
  onReasonChange: (reason: string) => void
  onConfirm: () => void
  onCancel: () => void
}

export function CancelTaskDialog({
  isOpen,
  taskTitle,
  cancelReason,
  onReasonChange,
  onConfirm,
  onCancel,
}: CancelTaskDialogProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-[2.5rem] p-10 w-full max-w-md shadow-2xl">
        <div className="flex items-center gap-3 mb-3">
          <AlertTriangle className="w-5 h-5 text-red-500" />
          <h2 className="text-xl font-black text-ink">Cancel Task</h2>
        </div>
        <p className="text-sm text-gray-400 mb-6 font-medium">&ldquo;{taskTitle}&rdquo;</p>
        <textarea
          className="w-full border border-gray-200 rounded-2xl p-4 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-100 text-ink placeholder:text-gray-300"
          rows={3}
          placeholder="Reason for cancelling... (optional)"
          value={cancelReason}
          onChange={(e) => onReasonChange(e.target.value)}
        />
        <div className="flex gap-3 mt-6">
          <button
            onClick={onCancel}
            className="flex-1 py-3 rounded-2xl border border-gray-100 text-sm font-black text-gray-500 hover:bg-gray-50 transition-colors"
          >
            Keep Task
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-3 rounded-2xl bg-red-500 text-white text-sm font-black hover:bg-red-600 transition-colors"
          >
            Cancel Task
          </button>
        </div>
      </div>
    </div>
  )
}
