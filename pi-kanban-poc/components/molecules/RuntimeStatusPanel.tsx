'use client'

import { RefreshCw, Activity } from 'lucide-react'

import type { RuntimeStatus } from '@/types/domain'

export function RuntimeStatusPanel({ status }: { status: RuntimeStatus | null | undefined }) {
  if (!status) return null

  return (
    <section className="rounded-[1.5rem] border border-slate-200/90 bg-white shadow-[0_10px_26px_rgba(15,23,42,0.04)] overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">AI Runtime Status</p>
          <h3 className="mt-1 text-sm font-bold text-[#0a192f]">Current automation state</h3>
        </div>
        <Activity className="w-4 h-4 text-slate-400" />
      </div>
      <div className="px-6 py-5 grid sm:grid-cols-2 gap-3 text-sm">
        <Item label="State" value={status.state} />
        <Item label="Summary" value={status.summary} />
        <Item label="Last action" value={status.lastAction ?? 'No action recorded yet'} />
        <Item label="Retry count" value={String(status.retryCount)} />
        {status.blockedReason && <Item label="Blocked reason" value={status.blockedReason} />}
        {status.lastUpdatedAt && (
          <div className="sm:col-span-2 text-[11px] text-slate-400 font-semibold uppercase tracking-[0.14em] flex items-center gap-2">
            <RefreshCw className="w-3 h-3" />
            Updated {new Date(status.lastUpdatedAt).toLocaleString()}
          </div>
        )}
      </div>
    </section>
  )
}

function Item({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.15rem] bg-slate-50 border border-slate-100 px-4 py-3">
      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400 mb-1.5">{label}</p>
      <p className="text-sm text-slate-700 leading-relaxed">{value}</p>
    </div>
  )
}
