'use client'

import { AlertTriangle, Activity } from 'lucide-react'

import type { AttentionItem, PlanningEvent, PlanningPhase, RuntimeStatus } from '@/types/domain'
import { useI18n } from '@/lib/i18n/context'

export function StatusPanel({
  phase,
  latestEvent,
  pendingApprovals,
  attentionItems,
  runtimeStatus,
  userContext,
  onResolveAttention,
}: {
  phase: PlanningPhase
  latestEvent: PlanningEvent | null
  pendingApprovals: number
  attentionItems: AttentionItem[]
  runtimeStatus: RuntimeStatus | null | undefined
  userContext: string | null | undefined
  onResolveAttention: (id: string) => void
}) {
  const { t } = useI18n()
  return (
    <section className="rounded-[1.5rem] border border-slate-200/90 bg-white shadow-[0_10px_26px_rgba(15,23,42,0.04)] overflow-hidden h-fit">
      <div className="px-6 py-4 border-b border-slate-100 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">{t('planning.status', 'Status')}</p>
          <h3 className="mt-1 text-sm font-bold text-[#0a192f]">{t('planning.currentPlanningAndRuntime', 'Current planning and runtime state')}</h3>
        </div>
        <Activity className="w-4 h-4 text-slate-400" />
      </div>

      <div className="px-6 py-5 space-y-5">
        <div className="grid md:grid-cols-2 gap-4 text-sm">
          <Info label={t('planning.currentPhase', 'Current phase')} value={phaseLabel(phase)} />
          <Info label={t('planning.pendingApprovals', 'Pending approvals')} value={pendingApprovals > 0 ? `${pendingApprovals} task${pendingApprovals === 1 ? '' : 's'} waiting` : t('common.nothingPending', 'Nothing pending')} />
          <Info label={t('planning.latestEvent', 'Latest event')} value={latestEvent?.summary ?? t('planning.noPlanningMilestones', 'No planning milestones yet')} />
          <Info label={t('planning.attentionItems', 'Attention items')} value={attentionItems.length > 0 ? `${attentionItems.length} open item${attentionItems.length === 1 ? '' : 's'}` : t('common.everythingClear', 'Everything clear')} />
        </div>

        {runtimeStatus && (
          <div className="rounded-[1.25rem] border border-slate-200 bg-slate-50/70 px-4 py-4">
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400 mb-2">{t('planning.aiRuntime', 'AI runtime')}</p>
            <div className="grid md:grid-cols-2 gap-3 text-sm">
              <Info label="State" value={runtimeStatus.state} />
              <Info label="Summary" value={runtimeStatus.summary} />
              <Info label="Last action" value={runtimeStatus.lastAction ?? t('planning.noActionRecorded', 'No action recorded yet')} />
              <Info label="Retry count" value={String(runtimeStatus.retryCount)} />
              {runtimeStatus.blockedReason && <Info label="Blocked reason" value={runtimeStatus.blockedReason} />}
            </div>
          </div>
        )}

        {attentionItems.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-amber-600">{t('planning.needsAttention', 'Needs attention')}</p>
            </div>
            <div className="space-y-3">
              {attentionItems.map((item) => (
                <div key={item.id} className="rounded-[1.25rem] border border-amber-200/70 bg-[#fff9ef] px-4 py-3 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-[#0a192f]">{item.title}</p>
                      <p className="mt-1 text-xs text-slate-600 leading-relaxed">{item.detail}</p>
                    </div>
                    <button
                      onClick={() => onResolveAttention(item.id)}
                      className="shrink-0 px-3 py-1.5 rounded-lg bg-white text-amber-700 text-[10px] font-black uppercase tracking-[0.14em] hover:bg-amber-50 transition-colors border border-amber-200"
                    >
                      {t('common.markDone', 'Mark done')}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {userContext?.trim() && (
          <div className="rounded-[1.25rem] bg-slate-50 border border-slate-100 px-4 py-3">
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400 mb-2">{t('planning.savedUserContext', 'Saved user context')}</p>
            <p className="text-xs text-slate-600 leading-relaxed">{userContext}</p>
          </div>
        )}
      </div>
    </section>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.15rem] bg-white border border-slate-200/80 px-4 py-3">
      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400 mb-1.5">{label}</p>
      <p className="text-sm text-[#0a192f] leading-relaxed">{value}</p>
    </div>
  )
}

function phaseLabel(phase: PlanningPhase): string {
  if (phase === 'discovery') return 'Discover'
  if (phase === 'blueprint') return 'Confirm'
  return 'Tasks'
}
