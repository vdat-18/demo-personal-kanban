'use client'

import { useState } from 'react'
import { Plus, Trash2, MessageSquare, Pencil, Check, PanelLeftClose } from 'lucide-react'
import type { PlanningThread } from '@/lib/hooks/usePlanningThreads'

function formatRelativeTime(dateStr: string): string {
  const now = Date.now()
  const date = new Date(dateStr).getTime()
  const diff = now - date
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

interface ThreadListSidebarProps {
  threads: PlanningThread[]
  activeThreadId: string | null
  onSelectThread: (id: string) => void
  onNewThread: () => void
  onDeleteThread: (id: string) => void
  onRenameThread: (id: string, title: string) => void
  onToggleSidebar?: () => void
  isCreating?: boolean
  isLoading?: boolean
}

export function ThreadListSidebar({
  threads,
  activeThreadId,
  onSelectThread,
  onNewThread,
  onDeleteThread,
  onRenameThread,
  onToggleSidebar,
  isCreating,
  isLoading,
}: ThreadListSidebarProps) {
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')

  const handleStartEdit = (thread: PlanningThread) => {
    setEditingId(thread.id)
    setEditTitle(thread.title)
  }

  const handleSaveEdit = (id: string) => {
    if (editTitle.trim() && editTitle !== threads.find((t) => t.id === id)?.title) {
      onRenameThread(id, editTitle.trim())
    }
    setEditingId(null)
  }

  return (
    <div className="flex flex-col h-full bg-surface-muted/40 border-r border-line">
      {/* Header */}
      <div className="h-16 px-5 border-b border-line flex items-center justify-between shrink-0 bg-surface/80 backdrop-blur-xl">
        <div className="flex items-center gap-2.5">
          <MessageSquare className="w-4 h-4 text-brand" />
          <span className="text-h2 text-ink">Threads</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onNewThread}
            disabled={isCreating}
            className="p-2 hover:bg-surface-muted rounded-xl transition-colors text-ink-muted hover:text-brand disabled:opacity-40 active:scale-95"
            title="New thread"
          >
            {isCreating ? (
              <span className="w-4 h-4 border-2 border-line border-t-brand rounded-full animate-spin block" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
          </button>
          {onToggleSidebar && (
            <button
              onClick={onToggleSidebar}
              className="p-2 hover:bg-surface-muted rounded-xl transition-colors text-ink-muted hover:text-ink active:scale-95"
              title="Collapse sidebar"
            >
              <PanelLeftClose className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Thread list */}
      <div className="flex-1 overflow-y-auto py-3 px-3 space-y-1.5">
        {isLoading ? (
          <div className="px-4 py-12 text-center">
            <div className="w-6 h-6 border-2 border-line border-t-brand rounded-full animate-spin mx-auto mb-3" />
            <p className="text-meta text-ink-subtle">Loading…</p>
          </div>
        ) : threads.length === 0 ? (
          <div className="px-4 py-12 text-center">
            <MessageSquare className="w-10 h-10 mx-auto mb-4 text-ink-subtle/60" />
            <p className="text-meta text-ink-subtle">No conversations yet</p>
          </div>
        ) : (
          threads.map((thread) => (
            <div key={thread.id} className="relative group">
              <div
                onClick={() => onSelectThread(thread.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    onSelectThread(thread.id)
                  }
                }}
                className={`w-full text-left px-4 py-3.5 rounded-xl transition-colors cursor-pointer relative border ${
                  activeThreadId === thread.id
                    ? 'bg-surface border-brand-border shadow-sm'
                    : 'bg-transparent border-transparent hover:bg-surface/70 hover:border-line'
                }`}
              >
                {activeThreadId === thread.id && (
                  <div className="absolute left-0 top-3 bottom-3 w-1 bg-brand rounded-r-full" />
                )}
                <div
                  className={`text-meta font-semibold truncate ${
                    activeThreadId === thread.id ? 'text-brand' : 'text-ink'
                  }`}
                >
                  {editingId === thread.id ? (
                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <input
                        autoFocus
                        className="flex-1 bg-surface border border-brand rounded-lg px-2 py-1 text-meta focus:outline-none"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveEdit(thread.id)
                          if (e.key === 'Escape') setEditingId(null)
                        }}
                      />
                      <button
                        onClick={() => handleSaveEdit(thread.id)}
                        className="p-1 hover:bg-success-bg rounded-lg text-success"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    thread.title
                  )}
                </div>
                <p className="text-meta text-ink-muted mt-1 truncate leading-relaxed">
                  {thread.lastMessage || 'Starting session…'}
                </p>
                <p className="text-micro text-ink-subtle mt-1.5 normal-case tracking-normal">
                  {formatRelativeTime(thread.updatedAt)}
                </p>
              </div>

              {/* Actions */}
              {confirmDeleteId === thread.id ? (
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 bg-surface rounded-xl shadow-md border border-line p-1.5 z-20 animate-in fade-in zoom-in duration-150">
                  <button
                    onClick={() => {
                      onDeleteThread(thread.id)
                      setConfirmDeleteId(null)
                    }}
                    className="px-2.5 py-1 text-micro normal-case font-semibold text-white bg-danger rounded-lg transition-opacity hover:opacity-90 active:scale-95"
                  >
                    Delete
                  </button>
                  <button
                    onClick={() => setConfirmDeleteId(null)}
                    className="px-2.5 py-1 text-micro normal-case font-semibold text-ink-muted hover:bg-surface-muted rounded-lg transition-colors active:scale-95"
                  >
                    Skip
                  </button>
                </div>
              ) : editingId === thread.id ? null : (
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleStartEdit(thread)
                    }}
                    className="p-1.5 hover:bg-brand-subtle rounded-lg text-ink-subtle hover:text-brand bg-surface/80 backdrop-blur-sm shadow-sm border border-line"
                    title="Rename"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setConfirmDeleteId(thread.id)
                    }}
                    className="p-1.5 hover:bg-danger-bg rounded-lg text-ink-subtle hover:text-danger bg-surface/80 backdrop-blur-sm shadow-sm border border-line"
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
