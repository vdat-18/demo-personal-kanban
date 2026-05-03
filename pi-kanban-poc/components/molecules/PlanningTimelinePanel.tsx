'use client'

import { Clock3 } from 'lucide-react'
import { useMemo, useState } from 'react'

import type { PlanningEvent } from '@/types/domain'
import { useI18n } from '@/lib/i18n/context'

export function PlanningTimelinePanel({ events }: { events: PlanningEvent[] }) {
  const { t } = useI18n()
  const [filter, setFilter] = useState<'all' | 'sources' | 'revisions' | 'tasks'>('all')
  const visibleEvents = useMemo(() => {
    if (filter === 'all') return events
    if (filter === 'sources') {
      return events.filter((event) => ['sources_imported', 'source_added', 'assistant_readback_created'].includes(event.type))
    }
    if (filter === 'revisions') {
      return events.filter((event) => ['vision_updated', 'vision_published', 'vision_restored', 'phase_transition_accepted', 'phase_transition_rejected'].includes(event.type))
    }
    return events.filter((event) => ['tasks_proposed', 'task_approved', 'task_dismissed', 'execution_started'].includes(event.type))
  }, [events, filter])

  return (
    <section className="rounded-[1.5rem] border border-slate-200/90 bg-white shadow-[0_10px_26px_rgba(15,23,42,0.04)] overflow-hidden h-fit">
      <div className="px-6 py-4 border-b border-slate-100 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] flex items-center justify-between gap-3">
        <div>
          <p className="text-micro text-slate-400">
            {t('planning.planningTimeline', 'Planning Timeline')}
          </p>
          <h3 className="mt-1 text-sm font-bold text-ink">{t('planning.recentPlanningEvents', 'Recent planning events')}</h3>
        </div>
        <Clock3 className="w-4 h-4 text-slate-400" />
      </div>
      <div className="px-6 pt-4 flex flex-wrap gap-2">
        {(['all', 'sources', 'revisions', 'tasks'] as const).map((item) => (
          <button
            key={item}
            onClick={() => setFilter(item)}
            className={`px-3 py-1.5 rounded-xl text-micro transition-colors border ${
              filter === item
                ? 'bg-ink text-white border-ink'
                : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
            }`}
          >
            {item === 'all' ? t('planning.all', 'all') : item === 'sources' ? t('planning.sourcesFilter', 'sources') : item === 'revisions' ? t('planning.revisions', 'revisions') : t('planning.tasks', 'tasks')}
          </button>
        ))}
      </div>
      <div className="px-6 py-5 space-y-4">
        {visibleEvents.length === 0 ? (
          <p className="text-sm text-slate-500">{t('planning.planningMilestonesEvolve', 'Planning milestones will appear here as the project evolves.')}</p>
        ) : (
          visibleEvents.map((event) => (
            <div key={event.id} className="flex gap-3">
              <div className="mt-1 w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0" />
              <div className="min-w-0">
                <p className="text-sm text-slate-700 leading-relaxed">{event.summary}</p>
                <p className="mt-1 text-meta font-semibold uppercase tracking-[0.14em] text-slate-400">
                  {event.actor} · {new Date(event.createdAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  )
}
