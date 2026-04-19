'use client'

import { Plus, Upload, ArrowRight, Sparkles } from 'lucide-react'

export interface HeroSectionProps {
  onNewProject: () => void
  onImportProject: () => void
}

/**
 * Dashboard hero (#9 UI standardization).
 *
 * Previous version used display sizes (text-8xl, p-16, rounded-[4rem]) that
 * worked great for marketing screenshots but blew through 90% of the
 * viewport on a 1366px laptop and dwarfed the more functional content
 * below. This revision keeps the welcoming feel but pulls the scale back to:
 *  - heading: text-4xl/5xl (was 6xl/8xl)
 *  - cards: rounded-3xl, p-8/p-10 (was rounded-[4rem], p-16)
 *  - buttons: text-base font-bold, py-4 (was text-2xl font-black, py-8)
 * Result: hero now occupies ~one viewport height and the project grid is
 * visible above the fold without aggressive scrolling.
 */
export function HeroSection({ onNewProject, onImportProject }: HeroSectionProps) {
  return (
    <>
      {/* Hero Header */}
      <header className="animate-in fade-in slide-in-from-top-4 duration-700 ease-out">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 text-blue-600 text-[10px] font-bold uppercase tracking-[0.18em] mb-5 border border-blue-100">
          <Sparkles className="w-3 h-3" />
          Powered by AI agents
        </div>
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-[#0a192f] leading-tight mb-4">
          Hi! What shall we <span className="text-blue-600">create</span> today?
        </h1>
        <p className="text-base md:text-lg text-slate-500 font-normal max-w-2xl leading-relaxed">
          Organize, plan, and execute your projects with a team of specialized AI agents.
        </p>
      </header>

      {/* Action Cards */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in slide-in-from-bottom-6 duration-700 delay-200 ease-out">
        <div className="lg:col-span-8 bg-white rounded-3xl p-8 md:p-10 shadow-md shadow-slate-200/40 relative overflow-hidden border border-slate-100">
          <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-blue-50/30 to-transparent pointer-events-none" />
          <div className="relative z-10 h-full flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-[#0a192f] text-white flex items-center justify-center mb-6 shadow-lg shadow-blue-900/30">
                <Plus className="w-6 h-6" />
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-[#0a192f] mb-3 tracking-tight leading-snug">
                Initiate a new project journey
              </h2>
              <p className="text-sm text-slate-500 max-w-md leading-relaxed mb-6">
                Start from a simple idea or import documents to let AI build your execution blueprint.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={onNewProject}
                className="flex-1 flex items-center justify-between px-5 py-4 rounded-2xl bg-[#0a192f] hover:bg-blue-700 transition-all duration-300 text-white shadow-md hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.98] group/btn"
              >
                <div className="flex flex-col items-start text-left">
                  <span className="text-[10px] uppercase tracking-[0.18em] text-blue-300 mb-0.5 font-bold">
                    Method 01
                  </span>
                  <span className="text-base font-bold">New Project</span>
                </div>
                <ArrowRight className="w-5 h-5 text-blue-300 group-hover/btn:translate-x-1 transition-transform" />
              </button>
              <button
                onClick={onImportProject}
                className="flex-1 flex items-center justify-between px-5 py-4 rounded-2xl bg-slate-50 hover:bg-slate-100 transition-all duration-300 text-slate-700 border border-slate-200 hover:-translate-y-0.5 active:scale-[0.98] group/btn"
              >
                <div className="flex flex-col items-start text-left">
                  <span className="text-[10px] uppercase tracking-[0.18em] text-slate-400 mb-0.5 font-bold">
                    Method 02
                  </span>
                  <span className="text-base font-bold">Import Data</span>
                </div>
                <Upload className="w-5 h-5 text-slate-400 group-hover/btn:-translate-y-0.5 transition-transform" />
              </button>
            </div>
          </div>
        </div>

        <div className="lg:col-span-4">
          <div className="bg-gradient-to-br from-blue-600 to-indigo-800 rounded-3xl p-8 text-white shadow-md shadow-blue-500/20 relative overflow-hidden h-full flex flex-col justify-between border border-blue-400/20">
            <Sparkles className="absolute -top-4 -right-4 w-24 h-24 text-white/10 rotate-12" />
            <div>
              <h3 className="text-xl font-bold mb-3 tracking-tight">AI Agents Ready</h3>
              <p className="text-blue-100 text-sm font-normal leading-relaxed opacity-90">
                Our collective of specialized agents is standing by to help you strategize and automate your workflow instantly.
              </p>
            </div>
            <div className="flex items-center gap-2 bg-white/10 w-fit px-3 py-1.5 rounded-full backdrop-blur-md mt-6">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse shadow-[0_0_8px_rgba(74,222,128,0.6)]" />
              <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-white">
                Systems online
              </span>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
