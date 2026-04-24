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
  /** Cumulative project token usage to show as a tiny chip in the header.
   *  PoC scope: count only, no $ amount. */
  tokenUsage?: { input: number; output: number } | null
  onBack: () => void
  onAddTask: () => void
  onPlanning?: () => void
}

export function KanbanHeader({ projectName, projectDescription, playbookId, importedSourceCount = 0, isProcessing = false, tokenUsage, onBack, onAddTask, onPlanning }: KanbanHeaderProps) {
  const playbook = getPlaybook(playbookId)
  const { t } = useI18n()
  return (
    <header className="h-28 px-12 border-b border-gray-100 bg-white/70 backdrop-blur-xl flex items-center justify-between shrink-0 sticky top-0 z-40 transition-all">
      <div className="flex items-center gap-8">
        <button 
          onClick={onBack} 
          className="p-3.5 hover:bg-gray-100 rounded-[1.25rem] transition-all text-gray-500 hover:text-black hover:shadow-sm active:scale-95"
          title="Back to Dashboard"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="font-black text-4xl text-[#0a192f] tracking-tighter leading-none mb-2">{projectName}</h1>
          <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">{projectDescription || 'MISSION CONTROL CENTER'}</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">
              {playbook.label}
            </span>
            {importedSourceCount > 0 && (
              <span className="px-2.5 py-1 rounded-lg bg-blue-50 border border-blue-100 text-[10px] font-bold uppercase tracking-[0.12em] text-blue-600">
                {importedSourceCount} {t('planning.sources', 'Sources')}
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-4">
        {tokenUsage && (
          <TokenCounter input={tokenUsage.input} output={tokenUsage.output} label="This project" />
        )}
        {onPlanning && (
          <button
            onClick={onPlanning}
            className="flex items-center gap-2 px-5 py-3 rounded-[1.25rem] border border-indigo-200 bg-indigo-50 text-indigo-700 text-[11px] font-black uppercase tracking-[0.12em] hover:bg-indigo-100 transition-all active:scale-95"
            title="Back to Planning"
          >
            <Sparkles className="w-4 h-4" />
            Planning
          </button>
        )}
        {isProcessing && (
          <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-[1rem] border border-blue-100">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-[11px] font-black uppercase tracking-[0.1em]">{t('mission.aiProcessing', 'AI Processing')}</span>
          </div>
        )}
        <button
          onClick={onAddTask}
          className="flex items-center gap-2.5 px-8 py-4 bg-[#0a192f] text-white rounded-[1.5rem] text-[13px] font-black uppercase tracking-[0.15em] hover:bg-blue-600 transition-all shadow-2xl shadow-blue-900/20 active:scale-95 group"
        >
          <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform duration-300" /> 
          {t('mission.newTask', 'New Task')}
        </button>
      </div>
    </header>
  )
}
