'use client'

import { X, History, RotateCcw, User as UserIcon, Bot } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useState } from 'react'
import type { VisionVersion } from '@/types/domain'

interface VisionHistoryDrawerProps {
  open: boolean
  onClose: () => void
  versions: VisionVersion[]
  currentContent: string | null
  onRestore: (versionId: string) => void
}

const CHANGE_LABEL: Record<VisionVersion['changeType'], string> = {
  initial: 'Initial draft',
  ai_draft: 'AI revised the plan',
  user_direct_edit: 'You edited directly',
  ai_via_chat: 'AI revised via chat',
  phase_transition: 'Phase transition snapshot',
  restored: 'Restored from earlier version',
}

/**
 * Side-drawer for the vision version timeline (Tier 3.11).
 *
 * - Lists all versions newest-first.
 * - "View" expands the version content inline.
 * - "Restore" creates a forward-only restore (current becomes a new version).
 */
export function VisionHistoryDrawer({
  open,
  onClose,
  versions,
  currentContent,
  onRestore,
}: VisionHistoryDrawerProps) {
  const [openVersionId, setOpenVersionId] = useState<string | null>(null)

  if (!open) return null

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <aside className="relative w-full max-w-md bg-white shadow-2xl flex flex-col h-full animate-in slide-in-from-right duration-300">
        <header className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-2xl bg-blue-100 flex items-center justify-center">
              <History className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <h3 className="font-black text-sm text-[#0a192f]">Plan history</h3>
              <p className="text-[10px] text-slate-400 font-semibold">{versions.length} version{versions.length !== 1 ? 's' : ''}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {versions.length === 0 && (
            <div className="text-center py-12 text-sm text-slate-400">
              No revisions yet. Edits to your plan will appear here.
            </div>
          )}
          {versions.map((v, idx) => {
            const isExpanded = openVersionId === v.id
            const isCurrent = idx === 0
            const Icon = v.createdBy === 'user' ? UserIcon : Bot
            return (
              <div
                key={v.id}
                className={`rounded-2xl border overflow-hidden transition-all ${
                  isCurrent ? 'border-blue-200 bg-blue-50/30' : 'border-slate-100 bg-white'
                }`}
              >
                <div className="px-4 py-3 flex items-start gap-3">
                  <div className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center ${
                    v.createdBy === 'user' ? 'bg-blue-100' : 'bg-indigo-100'
                  }`}>
                    <Icon className={`w-3.5 h-3.5 ${
                      v.createdBy === 'user' ? 'text-blue-600' : 'text-indigo-600'
                    }`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-[11px] font-black text-[#0a192f]">
                        {CHANGE_LABEL[v.changeType]}
                      </span>
                      {isCurrent && (
                        <span className="text-[9px] font-bold text-green-600 uppercase tracking-wider">
                          • current
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-500">
                      {formatRelative(v.createdAt)}
                    </p>
                    {v.summary && (
                      <p className="text-xs text-slate-600 mt-1 italic">&quot;{v.summary}&quot;</p>
                    )}
                    {v.diffFromPrevious && v.diffFromPrevious.length > 0 && (
                      <ul className="text-[10px] text-slate-500 mt-1.5 list-disc list-inside">
                        {v.diffFromPrevious.slice(0, 3).map((c, i) => (
                          <li key={i}>{c}</li>
                        ))}
                      </ul>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                      <button
                        onClick={() => setOpenVersionId(isExpanded ? null : v.id)}
                        className="text-[10px] font-bold text-blue-600 hover:text-blue-700"
                      >
                        {isExpanded ? 'Hide' : 'View'}
                      </button>
                      {!isCurrent && (
                        <button
                          onClick={() => {
                            if (window.confirm('Restore this version? Your current plan will be saved as a new version in history.')) {
                              onRestore(v.id)
                              onClose()
                            }
                          }}
                          className="flex items-center gap-1 text-[10px] font-bold text-amber-600 hover:text-amber-700"
                        >
                          <RotateCcw className="w-2.5 h-2.5" />
                          Restore
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-slate-100 pt-3 prose prose-xs max-w-none text-slate-700 text-xs">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{v.content}</ReactMarkdown>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </aside>
    </div>
  )
}

function formatRelative(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime()
  if (ms < 60_000) return 'just now'
  const mins = Math.floor(ms / 60_000)
  if (mins < 60) return `${mins} min ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}
