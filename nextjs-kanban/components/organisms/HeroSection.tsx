'use client'

import { Plus, Upload, ArrowRight, Sparkles } from 'lucide-react'

export interface HeroSectionProps {
  onNewProject: () => void
  onImportProject: () => void
}

export function HeroSection({ onNewProject, onImportProject }: HeroSectionProps) {
  return (
    <>
      {/* Hero Header */}
      <header className="animate-in fade-in slide-in-from-top-4 duration-700">
        <h1 className="text-5xl md:text-6xl font-black tracking-tight text-[#0a192f] leading-[1.1] mb-6">
          Hi! What do you want to<br />work on today?
        </h1>
        <p className="text-lg md:text-xl text-slate-400 font-medium max-w-xl leading-relaxed">
          Let AgentForEveryone help you organize, plan, and execute your most ambitious projects in real-time.
        </p>
      </header>

      {/* Action Cards */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in slide-in-from-bottom-6 duration-1000 delay-150">
        <div className="lg:col-span-8 bg-white rounded-[40px] p-10 md:p-14 border border-white shadow-2xl shadow-blue-900/5 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-blue-50/40 to-transparent pointer-events-none" />
          <div className="relative z-10 h-full flex flex-col justify-between">
            <div>
              <div className="w-16 h-16 rounded-[24px] bg-[#0a192f] text-white flex items-center justify-center mb-10 shadow-xl shadow-blue-900/20 group-hover:scale-110 transition-transform duration-500">
                <Plus className="w-8 h-8" />
              </div>
              <h2 className="text-4xl md:text-5xl font-black text-[#0a192f] mb-6 tracking-tighter">Initiate a new journey</h2>
              <p className="text-lg md:text-xl text-slate-400 font-medium max-w-md leading-relaxed mb-8">
                Start from scratch or import documents to let AI build your execution plan.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={onNewProject}
                className="flex-1 flex items-center justify-between px-8 py-6 rounded-3xl bg-[#0a192f] hover:bg-blue-900 transition-all duration-300 font-black text-white shadow-xl shadow-blue-900/10 hover:-translate-y-1 active:scale-95"
              >
                <div className="flex flex-col items-start text-left">
                  <span className="text-lg uppercase tracking-wider text-xs opacity-60 mb-1">Method 01</span>
                  <span className="text-xl">New Project</span>
                </div>
                <ArrowRight className="w-6 h-6 text-blue-400" />
              </button>
              <button
                onClick={onImportProject}
                className="flex-1 flex items-center justify-between px-8 py-6 rounded-3xl bg-slate-50 border border-slate-100 hover:border-[#0a192f] hover:bg-white transition-all duration-300 font-black text-slate-700 hover:-translate-y-1 active:scale-95"
              >
                <div className="flex flex-col items-start text-left">
                  <span className="text-lg uppercase tracking-wider text-xs opacity-40 mb-1">Method 02</span>
                  <span className="text-xl">Import Data</span>
                </div>
                <Upload className="w-6 h-6 text-slate-300" />
              </button>
            </div>
          </div>
        </div>

        <div className="lg:col-span-4 space-y-6">
          <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-[40px] p-10 text-white shadow-2xl shadow-blue-500/20 relative overflow-hidden h-full flex flex-col justify-center">
            <Sparkles className="absolute -top-4 -right-4 w-32 h-32 text-white/10 rotate-12" />
            <h3 className="text-2xl font-black mb-4">AI Ready</h3>
            <p className="text-blue-100 text-sm font-medium leading-relaxed opacity-80">
              Our advanced agents are standing by to help you strategize and automate your workflow.
            </p>
            <div className="mt-8 flex items-center gap-2">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-widest text-white/60">System Operational</span>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
