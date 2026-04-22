'use client'

import { AlertTriangle } from 'lucide-react'

import type { AttentionItem } from '@/types/domain'

export function PlanningAttentionPanel({
  items,
  onResolve,
}: {
  items: AttentionItem[]
  onResolve: (id: string) => void
}) {
  return (
    <section className="rounded-[1.75rem] border border-amber-200 bg-amber-50/70 shadow-[0_12px_40px_rgba(245,158,11,0.08)] overflow-hidden">
      <div className="px-6 py-4 border-b border-amber-200/60 bg-[linear-gradient(180deg,#fffaf0_0%,#fffbeb_100%)] flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-amber-500">Needs Attention</p>
          <h3 className="mt-1 text-sm font-bold text-[#0a192f]">Things waiting for your input</h3>
        </div>
        <AlertTriangle className="w-4 h-4 text-amber-500" />
      </div>
      <div className="px-6 py-5 space-y-3 max-h-[260px] overflow-y-auto">
        {items.length === 0 ? (
          <p className="text-sm text-slate-600">Nothing urgent right now. The planning workflow is clear to continue.</p>
        ) : (
          items.map((item) => (
            <div key={item.id} className="rounded-2xl border border-amber-200/70 bg-white px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-[#0a192f]">{item.title}</p>
                  <p className="mt-1 text-xs text-slate-600 leading-relaxed">{item.detail}</p>
                </div>
                <button
                  onClick={() => onResolve(item.id)}
                  className="shrink-0 px-3 py-1.5 rounded-lg bg-amber-50 text-amber-700 text-[10px] font-black uppercase tracking-[0.14em] hover:bg-amber-100 transition-colors"
                >
                  Mark done
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  )
}
