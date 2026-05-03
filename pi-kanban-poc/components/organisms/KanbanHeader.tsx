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
  rightExtras?: React.ReactNode
}

export function KanbanHeader({
  projectName,
  projectDescription,
  playbookId,
  importedSourceCount = 0,
  isProcessing = false,
  tokenUsage,
  onBack,
  onAddTask,
  onPlanning,
  rightExtras,
}: KanbanHeaderProps) {
  const playbook = getPlaybook(playbookId)
  const { t } = useI18n()
  return (
    <header className="h-16 px-6 border-b border-line/60 bg-surface/90 backdrop-blur-xl flex items-center justify-between shrink-0 sticky top-0 z-40 gap-4 shadow-nav">
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onBack}
          className="p-2 hover:bg-surface-muted rounded-xl transition-colors text-ink-subtle hover:text-ink active:scale-95 shrink-0"
          title="Back to projects"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="w-px h-5 bg-line shrink-0" />
        <div className="min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <h1 className="text-h2 text-ink truncate">{projectName}</h1>
            <span className="text-micro normal-case px-2 py-0.5 rounded-md bg-surface-muted border border-line text-ink-muted shrink-0">
              {playbook.label}
            </span>
            {importedSourceCount > 0 && (
              <span className="text-micro normal-case px-2 py-0.5 rounded-md bg-brand-subtle border border-brand-border text-brand shrink-0">
                {importedSourceCount} {t('planning.sources', 'sources')}
              </span>
            )}
            {onPlanning && (
              <button
                onClick={onPlanning}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-brand-border bg-brand-subtle text-brand text-micro normal-case hover:bg-brand hover:text-white transition-colors active:scale-95 shrink-0 font-semibold"
              >
                <Sparkles className="w-3 h-3" />
                Back to planning
              </button>
            )}
          </div>
          {projectDescription && (
            <p className="text-meta text-ink-subtle truncate max-w-sm mt-0.5">
              {projectDescription}
            </p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {tokenUsage && (
          <TokenCounter input={tokenUsage.input} output={tokenUsage.output} label="This project" />
        )}
        {rightExtras}
        {isProcessing && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-subtle text-brand rounded-lg border border-brand-border">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span className="text-micro">{t('mission.aiProcessing', 'AI working')}</span>
          </div>
        )}
        <button
          onClick={onAddTask}
          className="flex items-center gap-2 px-4 py-2 bg-brand text-white rounded-xl text-meta font-semibold hover:bg-brand-hover transition-colors shadow-sm active:scale-95 group"
        >
          <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform duration-200" />
          {t('mission.newTask', 'New task')}
        </button>
      </div>
    </header>
  )
}
