'use client'

import type { AttentionItem, PlanningEvent, PlanningPhase } from '@/types/domain'

export function WhereWeLeftOffPanel({
  phase,
  latestEvent,
  pendingApprovals,
  openAttention,
  userContext,
}: {
  phase: PlanningPhase
  latestEvent: PlanningEvent | null
  pendingApprovals: number
  openAttention: AttentionItem[]
  userContext: string | null | undefined
}) {
  return (
    <section className="rounded-[1.5rem] border border-slate-200/90 bg-white shadow-[0_10px_26px_rgba(15,23,42,0.04)] overflow-hidden h-fit">
      <div className="px-6 py-4 border-b border-slate-100 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)]">
        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Where We Left Off</p>
        <h3 className="mt-1 text-sm font-bold text-[#0a192f]">Current planning checkpoint</h3>
      </div>
      <div className="px-6 py-5 grid md:grid-cols-2 gap-4 text-sm">
        <Info label="Current phase" value={phaseLabel(phase)} />
        <Info label="Pending approvals" value={pendingApprovals > 0 ? `${pendingApprovals} task${pendingApprovals === 1 ? '' : 's'} waiting` : 'Nothing pending'} />
        <Info label="Needs attention" value={openAttention.length > 0 ? `${openAttention.length} open item${openAttention.length === 1 ? '' : 's'}` : 'Everything clear'} />
        <Info label="Latest event" value={latestEvent?.summary ?? 'No planning milestones yet'} />
        {userContext?.trim() && (
          <div className="md:col-span-2 rounded-2xl bg-slate-50 border border-slate-100 px-4 py-3">
            <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-400 mb-2">Saved user context</p>
            <p className="text-xs text-slate-600 leading-relaxed">{userContext}</p>
          </div>
        )}
      </div>
    </section>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.15rem] bg-slate-50 border border-slate-100 px-4 py-3">
      <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-400 mb-1.5">{label}</p>
      <p className="text-sm text-[#0a192f] leading-relaxed">{value}</p>
    </div>
  )
}

function phaseLabel(phase: PlanningPhase): string {
  if (phase === 'discovery') return 'Discover'
  if (phase === 'blueprint') return 'Confirm'
  return 'Tasks'
}
