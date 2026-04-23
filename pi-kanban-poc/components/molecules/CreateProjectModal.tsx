'use client'

import { useEffect } from 'react'
import { Plus, X, ArrowRight, Sparkles, Upload } from 'lucide-react'
import { PlaybookSelect } from '@/components/molecules/PlaybookSelect'
import type { PlaybookId } from '@/types/domain'
import { useI18n } from '@/lib/i18n/context'

/**
 * Project creation modal (Tier 2.6).
 *
 * The domain selector was removed: the planning agent self-adapts to the
 * nature of whatever the user describes (wedding, product launch, learning,
 * team ops, etc.). Asking users to classify upfront felt forced for non-tech
 * audiences — the AI does it implicitly from the first message instead.
 *
 * Sizing note (#9 UI standardization): modal is max-w-lg with rounded-3xl
 * and p-8 — down from the prior max-w-xl / rounded-[4rem] / p-16, which felt
 * oversized on a 1366px laptop and made the action hierarchy fuzzy. Input /
 * button scale mirrors the design tokens in lib/design-tokens.ts.
 */
export interface CreateProjectModalProps {
  isOpen: boolean
  onClose: () => void
  projectName: string
  onProjectNameChange: (name: string) => void
  playbookId: PlaybookId
  onPlaybookChange: (value: PlaybookId) => void
  importMode: boolean
  isCreating: boolean
  onSubmit: () => void
  onImportSubmit: () => void
}

export function CreateProjectModal({
  isOpen,
  onClose,
  projectName,
  onProjectNameChange,
  playbookId,
  onPlaybookChange,
  importMode,
  isCreating,
  onSubmit,
  onImportSubmit,
}: CreateProjectModalProps) {
  const { t } = useI18n()
  // ESC closes the modal; keeps keyboard users unstuck.
  useEffect(() => {
    if (!isOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const handleAction = importMode ? onImportSubmit : onSubmit
  const Icon = importMode ? Upload : Plus

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-[#0a192f]/50 backdrop-blur-sm animate-in fade-in duration-300"
        onClick={onClose}
      />
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl shadow-blue-900/10 relative z-10 overflow-hidden animate-in zoom-in-95 duration-300 border border-white">
        <div className="p-8">
          <button
            onClick={onClose}
            aria-label="Close"
            className="absolute top-5 right-5 p-2 text-slate-400 hover:text-[#0a192f] hover:bg-slate-100 rounded-xl transition-all active:scale-95"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/30 shrink-0">
              <Icon className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-[#0a192f] tracking-tight">
                {importMode ? t('createProject.importTitle', 'Import a project brief') : t('createProject.newTitle', 'What are you planning?')}
              </h3>
              <p className="text-sm text-slate-500 mt-0.5">
                {importMode
                  ? t('createProject.importDescription', "Pick a file and we'll turn it into a planning workspace.")
                  : t('createProject.newDescription', "Give it a name. We'll figure out the rest together.")}
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <PlaybookSelect value={playbookId} onChange={onPlaybookChange} />
            <input
              type="text"
              placeholder={t('createProject.namePlaceholder', 'E.g. Spring wedding, Q2 product launch, 6-month SaaS MVP…')}
              autoFocus
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-[#0a192f] font-medium placeholder:text-slate-400 focus:border-blue-400 focus:bg-white outline-none transition-all"
              value={projectName}
              onChange={(e) => onProjectNameChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && projectName.trim()) handleAction()
              }}
            />
            <button
              onClick={handleAction}
              disabled={!projectName.trim() || isCreating}
              className={`w-full py-3 rounded-xl font-semibold text-sm text-white flex items-center justify-center gap-2 transition-all ${
                !projectName.trim() || isCreating
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  : 'bg-[#0a192f] hover:bg-blue-700 shadow-md hover:shadow-lg active:scale-[0.98]'
              }`}
            >
              {isCreating ? t('createProject.creating', 'Creating…') : importMode ? t('createProject.uploadAndStart', 'Upload & start') : t('createProject.startPlanning', 'Start planning')}
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="bg-slate-50 px-6 py-3 flex items-center justify-center border-t border-slate-100 text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em]">
          <Sparkles className="w-3 h-3 mr-2 text-blue-400" />
          {t('createProject.aiPlanning', 'AI-powered planning')}
        </div>
      </div>
    </div>
  )
}
