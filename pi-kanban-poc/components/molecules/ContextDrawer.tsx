'use client'

import { X } from 'lucide-react'
import { useEffect } from 'react'

interface ContextDrawerProps {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
}

export function ContextDrawer({ open, onClose, title, children }: ContextDrawerProps) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="absolute inset-0 bg-ink/20 backdrop-blur-[2px]" onClick={onClose} />
      <aside className="relative w-full max-w-md bg-surface shadow-lg flex flex-col h-full animate-in slide-in-from-right duration-300 border-l border-line">
        <header className="px-6 py-5 border-b border-line flex items-center justify-between shrink-0">
          <h2 className="text-h2 text-ink">{title}</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-surface-muted text-ink-subtle hover:text-ink-muted transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto p-5 bg-canvas">{children}</div>
      </aside>
    </div>
  )
}
