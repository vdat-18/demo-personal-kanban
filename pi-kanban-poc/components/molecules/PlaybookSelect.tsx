'use client'

import { useState } from 'react'
import type { PlaybookId } from '@/types/domain'
import { PLAYBOOKS, type PlaybookDefinition } from '@/lib/planning/playbooks'
import { useI18n } from '@/lib/i18n/context'

function PlaybookPreview({ playbook }: { playbook: PlaybookDefinition }) {
  return (
    <div className="absolute left-full top-0 ml-3 w-72 z-50 bg-white rounded-2xl shadow-2xl border border-slate-100 p-4 pointer-events-none">
      <p className="text-xs font-black text-[#0a192f] leading-snug">{playbook.label}</p>
      <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">{playbook.description}</p>

      <div className="mt-3 pt-3 border-t border-slate-100">
        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Mục tiêu</p>
        <p className="text-[11px] text-slate-600 leading-relaxed">{playbook.workflowContract.objective}</p>
      </div>

      <div className="mt-3 pt-3 border-t border-slate-100">
        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Bạn sẽ có</p>
        <ul className="space-y-1">
          {playbook.workflowContract.acceptanceCriteria.map((c) => (
            <li key={c} className="flex items-start gap-1.5 text-[11px] text-slate-600">
              <span className="text-green-500 mt-0.5 shrink-0">✓</span>
              {c}
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-3 pt-3 border-t border-slate-100">
        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Phù hợp cho</p>
        <div className="flex flex-wrap gap-1">
          {playbook.discoveryFocus.map((f) => (
            <span key={f} className="px-2 py-0.5 rounded-md bg-slate-100 text-[10px] text-slate-600 font-medium">
              {f}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

export function PlaybookSelect({
  value,
  onChange,
}: {
  value: PlaybookId
  onChange: (value: PlaybookId) => void
}) {
  const { t } = useI18n()
  const [hoveredId, setHoveredId] = useState<PlaybookId | null>(null)

  return (
    <div className="space-y-2">
      <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
        {t('playbook.label', 'Playbook')}
      </label>

      <div className="space-y-1.5">
        {PLAYBOOKS.map((playbook) => {
          const selected = value === playbook.id
          const hovered = hoveredId === playbook.id
          return (
            <div
              key={playbook.id}
              className="relative"
              onMouseEnter={() => setHoveredId(playbook.id)}
              onMouseLeave={() => setHoveredId(null)}
            >
              <button
                type="button"
                onClick={() => onChange(playbook.id)}
                className={`w-full text-left px-3 py-2.5 rounded-xl border transition-all ${
                  selected
                    ? 'border-blue-400 bg-blue-50 shadow-sm'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`w-3.5 h-3.5 rounded-full border-2 shrink-0 flex items-center justify-center ${
                      selected ? 'border-blue-500 bg-blue-500' : 'border-slate-300'
                    }`}
                  >
                    {selected && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </span>
                  <span className={`text-sm font-semibold ${selected ? 'text-blue-700' : 'text-[#0a192f]'}`}>
                    {playbook.label}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1 ml-5 leading-relaxed line-clamp-1">
                  {playbook.description}
                </p>
              </button>

              {hovered && <PlaybookPreview playbook={playbook} />}
            </div>
          )
        })}
      </div>
    </div>
  )
}
