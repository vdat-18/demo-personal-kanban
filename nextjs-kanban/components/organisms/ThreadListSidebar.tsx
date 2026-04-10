'use client'

import { useState } from 'react'
import { Plus, Trash2, MessageSquare } from 'lucide-react'
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
  isCreating?: boolean
  isLoading?: boolean
}

export function ThreadListSidebar({
  threads,
  activeThreadId,
  onSelectThread,
  onNewThread,
  onDeleteThread,
  isCreating,
  isLoading,
}: ThreadListSidebarProps) {
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  return (
    <div className="flex flex-col h-full bg-[#f1f3f5] border-r border-gray-200">
      {/* Header */}
      <div className="h-16 px-4 border-b border-gray-200 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-blue-600" />
          <span className="font-bold text-sm text-[#0a192f]">Threads</span>
        </div>
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
              <button
                onClick={() => onSelectThread(thread.id)}
                className={`w-full text-left px-4 py-3 transition-colors ${
                  activeThreadId === thread.id
                    ? 'bg-white border-r-2 border-blue-600'
                    : 'hover:bg-gray-100'
                }`}
              >
                <p
                  className={`text-sm font-semibold truncate ${
                    activeThreadId === thread.id ? 'text-blue-600' : 'text-[#0a192f]'
                  }`}
                >
                  {thread.title}
                </p>
                <p className="text-xs text-gray-400 mt-0.5 truncate">
                  {thread.lastMessage || 'No messages yet'}
                </p>
                <p className="text-[10px] text-gray-300 mt-1">
                  {formatRelativeTime(thread.updatedAt)}
                </p>
              </button>

              {/* Delete button */}
              {confirmDeleteId === thread.id ? (
                <div className="absolute right-2 top-2 flex items-center gap-1 bg-white rounded-lg shadow-md p-1 z-10">
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
              ) : (
                <button
                  onClick={() => setConfirmDeleteId(thread.id)}
                  className="absolute right-2 top-3 p-1 opacity-0 group-hover:opacity-100 hover:bg-red-50 rounded-lg transition-all text-gray-300 hover:text-red-500"
                  title="Delete thread"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
