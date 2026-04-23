'use client'

import type { PlaybookId } from '@/types/domain'
import { PLAYBOOKS } from '@/lib/planning/playbooks'
import { useI18n } from '@/lib/i18n/context'

export function PlaybookSelect({
  value,
  onChange,
}: {
  value: PlaybookId
  onChange: (value: PlaybookId) => void
}) {
  const { t } = useI18n()
  return (
    <div className="space-y-2">
      <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
        {t('playbook.label', 'Playbook')}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as PlaybookId)}
        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-[#0a192f] focus:outline-none focus:border-blue-400"
      >
        {PLAYBOOKS.map((playbook) => (
          <option key={playbook.id} value={playbook.id}>
            {playbook.label}
          </option>
        ))}
      </select>
      <p className="text-xs text-slate-500 leading-relaxed">
        {PLAYBOOKS.find((item) => item.id === value)?.description}
      </p>
    </div>
  )
}
