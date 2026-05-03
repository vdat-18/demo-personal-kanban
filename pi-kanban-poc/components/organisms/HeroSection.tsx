'use client'

import { Plus, Upload, ArrowRight, Sparkles } from 'lucide-react'
import { useI18n } from '@/lib/i18n/context'

export interface HeroSectionProps {
  onNewProject: () => void
  onImportProject: () => void
}

export function HeroSection({ onNewProject, onImportProject }: HeroSectionProps) {
  const { t } = useI18n()
  return (
    <>
      <header className="animate-in fade-in slide-in-from-top-4 duration-700 ease-out">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-subtle text-brand text-meta font-semibold mb-5 border border-brand-border">
          <Sparkles className="w-3.5 h-3.5" />
          {t('dashboard.heroBadge', 'AI agents help you work')}
        </div>
        <h1 className="text-display text-ink mb-4">
          {t('dashboard.titlePrefix', 'Hi! What shall we')}{' '}
          <span className="text-brand">{t('dashboard.titleAccent', 'create')}</span>{' '}
          {t('dashboard.titleSuffix', 'today?')}
        </h1>
        <p className="text-body text-ink-muted max-w-2xl">
          {t(
            'dashboard.subtitle',
            'Plan, do, and review your work with a friendly team of AI agents.',
          )}
        </p>
      </header>

      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in slide-in-from-bottom-6 duration-700 delay-200 ease-out">
        <div className="lg:col-span-8 bg-surface rounded-2xl p-8 md:p-10 shadow-sm relative overflow-hidden border border-line">
          <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-brand-subtle/40 to-transparent pointer-events-none" />
          <div className="relative z-10 h-full flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-xl bg-brand text-white flex items-center justify-center mb-6 shadow-sm">
                <Plus className="w-6 h-6" />
              </div>
              <h2 className="text-h1 text-ink mb-3">
                {t('dashboard.createJourney', 'Start a new project')}
              </h2>
              <p className="text-body text-ink-muted max-w-md mb-6">
                {t(
                  'dashboard.createJourneyDescription',
                  'Begin with a simple idea or upload your existing documents — AI will help you turn them into an actionable plan.',
                )}
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={onNewProject}
                className="flex-1 flex items-center justify-between px-5 py-4 rounded-xl bg-brand hover:bg-brand-hover transition-colors text-white shadow-sm active:scale-[0.98] group/btn"
              >
                <div className="flex flex-col items-start text-left">
                  <span className="text-micro text-brand-subtle/80 mb-0.5">
                    {t('dashboard.method1', 'Option 01')}
                  </span>
                  <span className="text-body font-semibold">
                    {t('dashboard.newProject', 'New project')}
                  </span>
                </div>
                <ArrowRight className="w-5 h-5 text-brand-subtle group-hover/btn:translate-x-1 transition-transform" />
              </button>
              <button
                onClick={onImportProject}
                className="flex-1 flex items-center justify-between px-5 py-4 rounded-xl bg-surface-muted hover:bg-line transition-colors text-ink border border-line active:scale-[0.98] group/btn"
              >
                <div className="flex flex-col items-start text-left">
                  <span className="text-micro text-ink-subtle mb-0.5">
                    {t('dashboard.method2', 'Option 02')}
                  </span>
                  <span className="text-body font-semibold">
                    {t('dashboard.startFromDocuments', 'Start from documents')}
                  </span>
                </div>
                <Upload className="w-5 h-5 text-ink-subtle group-hover/btn:-translate-y-0.5 transition-transform" />
              </button>
            </div>
          </div>
        </div>

        <div className="lg:col-span-4">
          <div className="bg-gradient-to-br from-brand to-brand-hover rounded-2xl p-8 text-white shadow-sm relative overflow-hidden h-full flex flex-col justify-between border border-brand-border/40">
            <Sparkles className="absolute -top-4 -right-4 w-24 h-24 text-white/10 rotate-12" />
            <div>
              <h3 className="text-h2 text-white mb-3">
                {t('dashboard.aiAgentsReady', 'Your AI team is ready')}
              </h3>
              <p className="text-body text-white/85 leading-relaxed">
                {t(
                  'dashboard.aiAgentsReadyDescription',
                  'A small team of AI agents is standing by to help plan, draft, and review your work — anytime.',
                )}
              </p>
            </div>
            <div className="flex items-center gap-2 bg-white/15 w-fit px-3 py-1.5 rounded-full backdrop-blur-md mt-6">
              <span className="w-2 h-2 bg-spark rounded-full animate-pulse shadow-[0_0_8px_rgba(245,158,11,0.7)]" />
              <span className="text-micro text-white">
                {t('dashboard.systemsOnline', 'Online & ready')}
              </span>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
