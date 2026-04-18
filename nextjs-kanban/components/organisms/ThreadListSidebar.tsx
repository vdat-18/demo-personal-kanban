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
    <div className="flex flex-col h-full bg-slate-50 border-r border-gray-100">
      {/* Header */}
      <div className="h-20 px-6 border-b border-gray-100 flex items-center justify-between shrink-0 bg-white/50 backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <MessageSquare className="w-4 h-4 text-blue-600" />
          <span className="font-black text-[11px] text-[#0a192f] uppercase tracking-[0.2em]">Threads</span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={onNewThread}
            disabled={isCreating}
            className="p-2.5 hover:bg-gray-200 rounded-2xl transition-all text-gray-500 hover:text-blue-600 disabled:opacity-40 active:scale-95"
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
              className="p-2.5 hover:bg-gray-200 rounded-2xl transition-all text-gray-500 hover:text-[#0a192f] active:scale-95"
              title="Collapse Sidebar"
            >
              <PanelLeftClose className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Thread List */}
      <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1.5">
        {isLoading ? (
          <div className="px-4 py-12 text-center">
            <div className="w-6 h-6 border-2 border-gray-100 border-t-blue-500 rounded-full animate-spin mx-auto mb-3" />
            <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Synchronizing...</p>
          </div>
        ) : threads.length === 0 ? (
          <div className="px-4 py-12 text-center opacity-40">
            <MessageSquare className="w-10 h-10 mx-auto mb-4 text-slate-300" />
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-relaxed">No conversations started yet</p>
          </div>
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
                className={`w-full text-left px-5 py-5 rounded-[1.5rem] transition-all cursor-pointer relative ${
                  activeThreadId === thread.id
                    ? 'bg-white shadow-xl shadow-slate-200/50 z-10 scale-[1.02]'
                    : 'hover:bg-white/60'
                }`}
              >
                {activeThreadId === thread.id && (
                  <div className="absolute left-0 top-5 bottom-5 w-1 bg-blue-600 rounded-r-full" />
                )}
                <div
                  className={`text-[13px] font-black truncate tracking-tight ${
                    activeThreadId === thread.id ? 'text-blue-600' : 'text-[#0a192f]'
                  }`}
                >
                  {editingId === thread.id ? (
                    <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                      <input
                        autoFocus
                        className="flex-1 bg-white border border-blue-400 rounded-xl px-2 py-1 text-sm focus:outline-none"
                        value={editTitle}
                        onChange={e => setEditTitle(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') handleSaveEdit(thread.id)
                          if (e.key === 'Escape') setEditingId(null)
                        }}
                      />
                      <button 
                        onClick={() => handleSaveEdit(thread.id)}
                        className="p-1.5 hover:bg-green-50 rounded-lg text-green-600"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    thread.title
                  )}
                </div>
                <p className="text-[11px] text-slate-400 mt-1 truncate font-medium">
                  {thread.lastMessage || 'Starting session...'}
                </p>
                <p className="text-[9px] font-black text-slate-300 mt-2 uppercase tracking-widest">
                  {formatRelativeTime(thread.updatedAt)}
                </p>
              </div>

              {/* Actions */}
              {confirmDeleteId === thread.id ? (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 bg-white rounded-2xl shadow-2xl border border-slate-100 p-2 z-20 animate-in fade-in zoom-in duration-200">
                  <button
                    onClick={() => { onDeleteThread(thread.id); setConfirmDeleteId(null) }}
                    className="px-3 py-1.5 text-[10px] font-black text-white bg-red-500 rounded-xl transition-all active:scale-95 uppercase tracking-widest"
                  >
                    Delete
                  </button>
                  <button
                    onClick={() => setConfirmDeleteId(null)}
                    className="px-3 py-1.5 text-[10px] font-black text-slate-500 hover:bg-slate-50 rounded-xl transition-all active:scale-95 uppercase tracking-widest"
                  >
                    Skip
                  </button>
                </div>
              ) : editingId === thread.id ? (
                null
              ) : (
                <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all z-10 translate-x-2 group-hover:translate-x-0">
                  <button
                    onClick={(e) => { e.stopPropagation(); handleStartEdit(thread) }}
                    className="p-2 hover:bg-blue-50 rounded-xl text-slate-300 hover:text-blue-600 bg-white/80 backdrop-blur-sm shadow-sm border border-slate-50"
                    title="Rename"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(thread.id) }}
                    className="p-2 hover:bg-red-50 rounded-xl text-slate-300 hover:text-red-500 bg-white/80 backdrop-blur-sm shadow-sm border border-slate-50"
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
