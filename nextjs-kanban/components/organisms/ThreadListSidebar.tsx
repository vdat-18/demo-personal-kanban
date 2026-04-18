'use client'

import { useState } from 'react'
import { Plus, Trash2, MessageSquare, Pencil, Check, X, PanelLeftClose } from 'lucide-react'
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
    if (editTitle.trim() && editTitle !== threads.find(t => t.id === id)?.title) {
      onRenameThread(id, editTitle.trim())
    }
    setEditingId(null)
  }

  return (
    <div className="flex flex-col h-full bg-[#f8f9fa] border-r border-gray-200">
      {/* Header */}
      <div className="h-16 px-4 border-b border-gray-200 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-blue-600" />
          <span className="font-bold text-sm text-[#0a192f]">Threads</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onNewThread}
            disabled={isCreating}
            className="p-1.5 hover:bg-gray-200 rounded-lg transition-colors text-gray-500 hover:text-blue-600 disabled:opacity-40"
            title="New Thread"
          >
            {isCreating ? (
              <span className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin block" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
          </button>
          {onToggleSidebar && (
            <button
              onClick={onToggleSidebar}
              className="p-1.5 hover:bg-gray-200 rounded-lg transition-colors text-gray-500 hover:text-[#0a192f]"
              title="Collapse Sidebar"
            >
              <PanelLeftClose className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Thread List */}
      <div className="flex-1 overflow-y-auto py-2">
        {isLoading ? (
          <div className="px-4 py-8 text-center text-xs text-gray-400">Loading threads…</div>
        ) : threads.length === 0 ? (
          <div className="px-4 py-8 text-center text-xs text-gray-400">No threads yet</div>
        ) : (
          threads.map((thread) => (
            <div key={thread.id} className="relative group">
              <div
                onClick={() => onSelectThread(thread.id)}
                role="button"
                tabIndex={0}
                onKeyDown={e => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    onSelectThread(thread.id)
                  }
                }}
                className={`w-full text-left px-4 py-4 transition-all cursor-pointer relative ${
                  activeThreadId === thread.id
                    ? 'bg-white shadow-sm z-10'
                    : 'hover:bg-gray-100/80'
                }`}
              >
                {activeThreadId === thread.id && (
                  <div className="absolute left-0 top-3 bottom-3 w-1 bg-blue-600 rounded-r-full" />
                )}
                <div
                  className={`text-sm font-black truncate ${
                    activeThreadId === thread.id ? 'text-blue-600' : 'text-[#0a192f]'
                  }`}
                >
                  {editingId === thread.id ? (
                    <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                      <input
                        autoFocus
                        className="flex-1 bg-white border border-blue-400 rounded px-1.5 py-0.5 text-sm focus:outline-none"
                        value={editTitle}
                        onChange={e => setEditTitle(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') handleSaveEdit(thread.id)
                          if (e.key === 'Escape') setEditingId(null)
                        }}
                      />
                      <button 
                        onClick={() => handleSaveEdit(thread.id)}
                        className="p-1 hover:bg-green-50 rounded text-green-600"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    thread.title
                  )}
                </div>
                <p className="text-xs text-gray-400 mt-0.5 truncate">
                  {thread.lastMessage || 'No messages yet'}
                </p>
                <p className="text-[10px] text-gray-300 mt-1">
                  {formatRelativeTime(thread.updatedAt)}
                </p>
              </div>

              {/* Delete button */}
              {confirmDeleteId === thread.id ? (
                <div className="absolute right-2 top-2 flex items-center gap-1 bg-white rounded-lg shadow-md p-1 z-20">
                  <button
                    onClick={() => { onDeleteThread(thread.id); setConfirmDeleteId(null) }}
                    className="px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-50 rounded transition-colors"
                  >
                    Delete
                  </button>
                  <button
                    onClick={() => setConfirmDeleteId(null)}
                    className="px-2 py-1 text-xs font-semibold text-gray-500 hover:bg-gray-50 rounded transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              ) : editingId === thread.id ? (
                null
              ) : (
                <div className="absolute right-2 top-3 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all z-10">
                  <button
                    onClick={(e) => { e.stopPropagation(); handleStartEdit(thread) }}
                    className="p-1 hover:bg-gray-200 rounded-md text-gray-400 hover:text-blue-600"
                    title="Rename thread"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(thread.id) }}
                    className="p-1 hover:bg-red-50 rounded-md text-gray-400 hover:text-red-500"
                    title="Delete thread"
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
