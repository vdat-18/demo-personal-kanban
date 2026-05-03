'use client'

import { useEffect, useState } from 'react'
import { Settings, X } from 'lucide-react'

import { useKanbanStore } from '@/lib/storage/kanbanStore'
import { useI18n } from '@/lib/i18n/context'

export function PersonalAIContextDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const context = useKanbanStore((s) => s.personalAIContext)
  const updatePersonalAIContext = useKanbanStore((s) => s.updatePersonalAIContext)
  const { t } = useI18n()

  const [preferredLanguage, setPreferredLanguage] = useState(context.preferredLanguage)
  const [responseStyle, setResponseStyle] = useState(context.responseStyle)
  const [planningStyle, setPlanningStyle] = useState(context.planningStyle)
  const [note, setNote] = useState(context.note)

  useEffect(() => {
    if (!open) return
    setPreferredLanguage(context.preferredLanguage)
    setResponseStyle(context.responseStyle)
    setPlanningStyle(context.planningStyle)
    setNote(context.note)
  }, [open, context])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-ink/45 backdrop-blur-sm" onClick={onClose} />
      <aside className="relative h-full w-full max-w-md bg-white shadow-2xl border-l border-slate-200 flex flex-col animate-in slide-in-from-right duration-300">
        <div className="px-6 py-5 border-b border-slate-100 flex items-start justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-600 text-micro border border-blue-100 mb-3">
              <Settings className="w-3.5 h-3.5" />
              {t('personalAI.title', 'Personal AI Context')}
            </div>
            <h2 className="text-xl font-black tracking-tight text-ink">{t('personalAI.title', 'Personal AI Context')}</h2>
            <p className="mt-1 text-sm text-slate-500 leading-relaxed">
              {t('personalAI.subtitle', 'These preferences are reused across projects so planning can feel more consistent.')}
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:text-ink hover:bg-slate-100 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">
          <Field label={t('personalAI.preferredLanguage', 'Preferred language')}>
            <select value={preferredLanguage} onChange={(e) => setPreferredLanguage(e.target.value as typeof preferredLanguage)} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-ink focus:outline-none focus:border-blue-400">
              <option value="english">{t('personalAI.english', 'English')}</option>
              <option value="vietnamese">{t('personalAI.vietnamese', 'Vietnamese')}</option>
              <option value="bilingual">{t('personalAI.bilingual', 'Bilingual')}</option>
            </select>
          </Field>

          <Field label={t('personalAI.responseStyle', 'Response style')}>
            <select value={responseStyle} onChange={(e) => setResponseStyle(e.target.value as typeof responseStyle)} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-ink focus:outline-none focus:border-blue-400">
              <option value="concise">{t('personalAI.concise', 'Concise')}</option>
              <option value="balanced">{t('personalAI.balanced', 'Balanced')}</option>
              <option value="detailed">{t('personalAI.detailed', 'Detailed')}</option>
            </select>
          </Field>

          <Field label={t('personalAI.planningFormat', 'Planning format')}>
            <select value={planningStyle} onChange={(e) => setPlanningStyle(e.target.value as typeof planningStyle)} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-ink focus:outline-none focus:border-blue-400">
              <option value="bullets-first">{t('personalAI.bulletsFirst', 'Bullets first')}</option>
              <option value="structured-doc">{t('personalAI.structuredDoc', 'Structured document')}</option>
              <option value="action-first">{t('personalAI.actionFirst', 'Action first')}</option>
            </select>
          </Field>

          <Field label={t('personalAI.workingNotes', 'Working notes for the AI')}>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={8}
              placeholder={t('personalAI.notePlaceholder', 'Examples: Use Vietnamese by default. Keep outputs structured and easy to scan. Prefer action items with clear owners and deadlines.')}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-ink focus:outline-none focus:border-blue-400 resize-y leading-relaxed"
            />
          </Field>
        </div>

        <div className="px-6 py-5 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-500 hover:bg-white transition-colors">
            {t('common.cancel', 'Cancel')}
          </button>
          <button
            onClick={() => {
              updatePersonalAIContext({ preferredLanguage, responseStyle, planningStyle, note })
              onClose()
            }}
            className="px-5 py-2.5 rounded-xl bg-ink text-white text-sm font-semibold hover:bg-blue-700 transition-colors"
          >
            {t('personalAI.savePreferences', 'Save preferences')}
          </button>
        </div>
      </aside>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <label className="text-xs font-semibold text-slate-500">{label}</label>
      {children}
    </div>
  )
}
