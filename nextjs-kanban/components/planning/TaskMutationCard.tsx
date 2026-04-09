'use client'

import { useState } from 'react'
import { Check, X, Plus, Pencil, Trash2 } from 'lucide-react'
import type { TaskMutation } from '@/lib/utils/parseTaskMutations'

interface TaskMutationCardProps {
  mutation: TaskMutation
  onApprove: (mutation: TaskMutation) => Promise<void>
  onDismiss: () => void
}

export function TaskMutationCard({ mutation, onApprove, onDismiss }: TaskMutationCardProps) {
  const [isApproving, setIsApproving] = useState(false)
  const [isDismissed, setIsDismissed] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (isDismissed) return null

  const handleApprove = async () => {
    setIsApproving(true)
    setError(null)
    try {
      await onApprove(mutation)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to apply')
    } finally {
      setIsApproving(false)
    }
  }

  const handleDismiss = () => {
    setIsDismissed(true)
    onDismiss()
  }

  const icon =
    mutation.action === 'add' ? <Plus className="w-3.5 h-3.5" /> :
    mutation.action === 'update' ? <Pencil className="w-3.5 h-3.5" /> :
    <Trash2 className="w-3.5 h-3.5" />

  const colorClass =
    mutation.action === 'add' ? 'border-green-200 bg-green-50' :
    mutation.action === 'update' ? 'border-blue-200 bg-blue-50' :
    'border-red-200 bg-red-50'

  const iconColorClass =
    mutation.action === 'add' ? 'text-green-600' :
    mutation.action === 'update' ? 'text-blue-600' :
    'text-red-600'

  const label =
    mutation.action === 'add' ? 'Add Task' :
    mutation.action === 'update' ? 'Update Task' :
    'Delete Task'

  let description: string
  if (mutation.action === 'add') {
    description = mutation.title
  } else if (mutation.action === 'update') {
    const fields = Object.entries(mutation.fields)
      .map(([k, v]) => `${k}: ${v}`)
      .join(', ')
    description = fields || 'No changes specified'
  } else {
    description = mutation.reason || 'Remove task'
  }

  return (
    <div className={`rounded-xl border p-3 mt-2 ${colorClass}`}>
      <div className="flex items-start gap-2">
        <div className={`mt-0.5 ${iconColorClass}`}>{icon}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-wide text-gray-500">{label}</span>
          </div>
          <p className="text-sm text-[#0a192f] font-medium">{description}</p>
          {mutation.action === 'add' && mutation.description && (
            <p className="text-xs text-gray-500 mt-0.5">{mutation.description}</p>
          )}
          {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={handleApprove}
            disabled={isApproving}
            className="p-1.5 rounded-lg bg-white hover:bg-green-100 text-green-600 transition-colors border border-green-200 disabled:opacity-40"
            title="Approve"
          >
            {isApproving ? (
              <span className="w-3.5 h-3.5 border-2 border-green-400 border-t-transparent rounded-full animate-spin block" />
            ) : (
              <Check className="w-3.5 h-3.5" />
            )}
          </button>
          <button
            onClick={handleDismiss}
            className="p-1.5 rounded-lg bg-white hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors border border-gray-200"
            title="Dismiss"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}
