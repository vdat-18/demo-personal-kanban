'use client'

import { useState } from 'react'
import { Activity } from 'lucide-react'
import type { UIConversation } from '@/types/domain'

const PAGE_SIZE = 3

export interface ConversationHistoryPanelProps {
  conversations: UIConversation[]
}

export function ConversationHistoryPanel({ conversations }: ConversationHistoryPanelProps) {
  const [page, setPage] = useState(0)
  const total = conversations.length
  const totalPages = Math.ceil(total / PAGE_SIZE)
  // Show most-recent first
  const sorted = [...conversations].reverse()
  const visible = sorted.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE)

  return (
    <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm">
      <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
        <Activity className="w-3 h-3" /> History ({total})
      </h3>
      <div className="space-y-2">
        {visible.map((conv) => {
          const tu = conv.tokenUsage as { input?: number; output?: number } | null
          return (
            <div
              key={conv.id}
              className="text-xs text-gray-500 py-2 border-b border-gray-50 last:border-0"
            >
              <p className="font-semibold text-ink text-meta">
                {new Date(conv.createdAt).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
              {conv.result && (
                <p className="mt-0.5 line-clamp-2 leading-relaxed">
                  {conv.result.slice(0, 120)}{conv.result.length > 120 ? '...' : ''}
                </p>
              )}
              {tu && (tu.input != null || tu.output != null) && (
                <p className="mt-1 text-micro text-gray-400 font-mono">
                  {tu.input ?? 0}↑ {tu.output ?? 0}↓ tokens
                </p>
              )}
            </div>
          )
        })}
      </div>
      {/* Pagination controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-50">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="text-meta font-bold text-gray-400 disabled:opacity-30 hover:text-gray-600 transition-colors"
          >
            ← Newer
          </button>
          <span className="text-micro text-gray-300 font-mono">
            {page + 1}/{totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            className="text-meta font-bold text-gray-400 disabled:opacity-30 hover:text-gray-600 transition-colors"
          >
            Older →
          </button>
        </div>
      )}
    </div>
  )
}
