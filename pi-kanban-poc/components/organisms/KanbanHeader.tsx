'use client'

import { ArrowLeft, Plus, Loader2, Sparkles } from 'lucide-react'
import { TokenCounter } from '@/components/molecules/TokenCounter'
import { getPlaybook } from '@/lib/planning/playbooks'
import type { PlaybookId } from '@/types/domain'
import { useI18n } from '@/lib/i18n/context'

export interface KanbanHeaderProps {
  projectName: string
  projectDescription: string | null
  playbookId?: PlaybookId
  importedSourceCount?: number
  isProcessing?: boolean
  tokenUsage?: { input: number; output: number } | null
  onBack: () => void
  onAddTask: () => void
  onPlanning?: () => void
  /** Extra buttons rendered right of the processing indicator, left of action buttons */
  rightExtras?: React.ReactNode
}

export function KanbanHeader({ projectName, projectDescription, playbookId, importedSourceCount = 0, isProcessing = false, tokenUsage, onBack, onAddTask, onPlanning, rightExtras }: KanbanHeaderProps) {
  const playbook = getPlaybook(playbookId)
  const { t } = useI18n()
  return (
    <header className="h-16 px-8 border-b border-gray-100 bg-white/80 backdrop-blur-xl flex items-center justify-between shrink-0 sticky top-0 z-40 gap-4">
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onBack}
          className="p-2 hover:bg-gray-100 rounded-xl transition-all text-gray-400 hover:text-black active:scale-95 shrink-0"
          title="Back to Dashboard"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="w-px h-5 bg-gray-200 shrink-0" />
        <div className="min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <h1 className="font-black text-[17px] text-[#0a192f] tracking-tight leading-none truncate">{projectName}</h1>
            <span className="px-2 py-0.5 rounded-md bg-slate-50 border border-slate-200 text-[9px] font-bold uppercase tracking-[0.12em] text-slate-500 shrink-0">
              {playbook.label}
            </span>
            {importedSourceCount > 0 && (
              <span className="px-2 py-0.5 rounded-md bg-blue-50 border border-blue-100 text-[9px] font-bold uppercase tracking-[0.12em] text-blue-600 shrink-0">
                {importedSourceCount} {t('planning.sources', 'Sources')}
              </span>
            )}
            {onPlanning && (
              <button
                onClick={onPlanning}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-indigo-200 bg-indigo-50 text-indigo-700 text-[10px] font-black uppercase tracking-[0.12em] hover:bg-indigo-100 transition-all active:scale-95 shrink-0"
              >
                <Sparkles className="w-3 h-3" />
                Back to Planning
              </button>
            )}
          </div>
          {projectDescription && (
            <p className="text-[10px] text-slate-400 font-medium mt-0.5 truncate max-w-sm">{projectDescription}</p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2.5 shrink-0">
        {tokenUsage && (
          <TokenCounter input={tokenUsage.input} output={tokenUsage.output} label="This project" />
        )}
        {rightExtras}
        {isProcessing && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg border border-blue-100">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span className="text-[10px] font-black uppercase tracking-[0.1em]">{t('mission.aiProcessing', 'AI Processing')}</span>
          </div>
        )}
        <button
          onClick={onAddTask}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#0a192f] text-white rounded-xl text-[11px] font-black uppercase tracking-[0.15em] hover:bg-blue-600 transition-all shadow-lg shadow-blue-900/15 active:scale-95 group"
        >
          <Plus className="w-3.5 h-3.5 group-hover:rotate-90 transition-transform duration-300" />
          {t('mission.newTask', 'New Task')}
        </button>
      </div>
    </header>
  )
}
