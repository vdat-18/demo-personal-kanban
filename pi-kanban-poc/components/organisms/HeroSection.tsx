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
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-subtle text-brand text-meta font-semibold mb-5 border border-brand-border shadow-card">
          <Sparkles className="w-3.5 h-3.5" />
          {t('dashboard.heroBadge', 'AI agents help you work')}
        </div>
        <h1 className="text-display text-ink mb-4">
          {t('dashboard.titlePrefix', 'Hi! What shall we')}{' '}
          <span className="text-brand">{t('dashboard.titleAccent', 'work on')}</span>{' '}
          {t('dashboard.titleSuffix', 'today?')}
        </h1>
        <p className="text-body text-ink-muted max-w-2xl">
          {t('dashboard.subtitle', 'Plan, do, and review your work with a friendly team of AI agents.')}
        </p>
      </header>

      <section className="grid grid-cols-1 lg:grid-cols-12 gap-5 animate-in fade-in slide-in-from-bottom-6 duration-700 delay-200 ease-out">
        {/* Left card — Start a project */}
        <div className="lg:col-span-8 bg-surface rounded-2xl border border-line shadow-card relative overflow-hidden">
          {/* Subtle brand gradient wash in top-right */}
          <div className="absolute top-0 right-0 w-2/3 h-full bg-gradient-to-l from-brand-subtle/60 via-brand-subtle/20 to-transparent pointer-events-none" />
          {/* Top brand strip */}
          <div className="h-[4px] w-full bg-gradient-to-r from-brand via-brand/80 to-brand/20" />

          <div className="relative z-10 p-8 md:p-10 flex flex-col h-full">
            <div className="mb-6">
              <div className="w-12 h-12 rounded-xl bg-brand text-white flex items-center justify-center mb-6 shadow-card">
                <Plus className="w-6 h-6" />
              </div>
              <h2 className="text-h1 text-ink mb-3">
                {t('dashboard.createJourney', 'Start a new project')}
              </h2>
              <p className="text-body text-ink-muted max-w-md">
                {t(
                  'dashboard.createJourneyDescription',
                  'Begin with a simple idea or upload your existing documents — AI will help turn them into an actionable plan.',
                )}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 mt-auto">
              <button
                onClick={onNewProject}
                className="flex-1 flex items-center justify-between px-5 py-4 rounded-xl bg-brand hover:bg-brand-hover transition-all text-white shadow-card hover:shadow-card-hover hover:-translate-y-0.5 active:scale-[0.98] group/btn"
              >
                <div className="flex flex-col items-start text-left">
                  <span className="text-micro text-white/60 mb-0.5">
                    {t('dashboard.method1', 'Option 01')}
                  </span>
                  <span className="text-body font-semibold">
                    {t('dashboard.newProject', 'New project')}
                  </span>
                </div>
                <ArrowRight className="w-5 h-5 text-white/70 group-hover/btn:translate-x-1 transition-transform" />
              </button>
              <button
                onClick={onImportProject}
                className="flex-1 flex items-center justify-between px-5 py-4 rounded-xl bg-surface border border-line hover:border-brand-border hover:bg-brand-subtle/40 transition-all text-ink shadow-card active:scale-[0.98] group/btn"
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

        {/* Right card — AI team (solid blue, inline style for gradient reliability in v4) */}
        <div
          className="lg:col-span-4 rounded-2xl p-8 text-white shadow-card relative overflow-hidden flex flex-col justify-between border border-brand/20 min-h-[240px]"
          style={{ background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 60%, #1e40af 100%)' }}
        >
          {/* Decorative background sparkle */}
          <Sparkles className="absolute -top-4 -right-4 w-28 h-28 text-white/10 rotate-12 pointer-events-none" />
          {/* Subtle inner glow */}
          <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-white/10 to-transparent pointer-events-none rounded-t-2xl" />

          <div className="relative z-10">
            <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center mb-5 border border-white/20">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-h2 text-white mb-3 font-bold">
              {t('dashboard.aiAgentsReady', 'Your AI team is ready')}
            </h3>
            <p className="text-body text-white/80 leading-relaxed">
              {t(
                'dashboard.aiAgentsReadyDescription',
                'A small team of AI agents is standing by to help plan, draft, and review your work — anytime.',
              )}
            </p>
          </div>

          <div className="relative z-10 flex items-center gap-2 bg-white/15 w-fit px-3 py-1.5 rounded-full border border-white/20 mt-6">
            <span className="w-2 h-2 bg-spark rounded-full animate-pulse shadow-[0_0_8px_rgba(245,158,11,0.8)]" />
            <span className="text-micro text-white font-semibold">
              {t('dashboard.systemsOnline', 'Online & ready')}
            </span>
          </div>
        </div>
      </section>
    </>
  )
}
