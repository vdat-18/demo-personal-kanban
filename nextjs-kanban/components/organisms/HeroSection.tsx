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
      <header className="animate-in fade-in slide-in-from-top-4 duration-1000 ease-out">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 text-blue-600 text-[10px] font-black uppercase tracking-[0.2em] mb-8 border border-blue-100 shadow-sm">
          <Sparkles className="w-3.5 h-3.5" />
          Powered by Advanced Agents
        </div>
        <h1 className="text-6xl md:text-8xl font-black tracking-tighter text-[#0a192f] leading-[0.95] mb-10">
          Hi! What shall we<br />
          <span className="text-blue-600">create</span> today?
        </h1>
        <p className="text-xl md:text-2xl text-slate-400 font-medium max-w-2xl leading-relaxed">
          Let AgentForEveryone help you organize, plan, and execute your most ambitious projects with the power of collective AI intelligence.
        </p>
      </header>

      {/* Action Cards */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in slide-in-from-bottom-6 duration-1000 delay-300 ease-out">
        <div className="lg:col-span-8 bg-white rounded-[4rem] p-10 md:p-16 shadow-2xl shadow-blue-900/5 relative overflow-hidden group border border-white">
          <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-blue-50/20 to-transparent pointer-events-none" />
          <div className="relative z-10 h-full flex flex-col justify-between">
            <div>
              <div className="w-20 h-20 rounded-[2.5rem] bg-[#0a192f] text-white flex items-center justify-center mb-12 shadow-2xl shadow-blue-900/40 group-hover:scale-105 transition-all duration-700 ease-out">
                <Plus className="w-10 h-10" />
              </div>
              <h2 className="text-5xl md:text-7xl font-black text-[#0a192f] mb-8 tracking-tighter leading-tight">Initiate a new<br />project journey</h2>
              <p className="text-xl text-slate-400 font-medium max-w-md leading-relaxed mb-12">
                Start from a simple idea or import documents to let AI build your execution blueprint.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-6">
              <button
                onClick={onNewProject}
                className="flex-1 flex items-center justify-between px-10 py-8 rounded-[2.5rem] bg-[#0a192f] hover:bg-blue-600 transition-all duration-500 font-black text-white shadow-2xl shadow-blue-900/20 hover:-translate-y-1 active:scale-95 group/btn"
              >
                <div className="flex flex-col items-start text-left">
                  <span className="text-[10px] uppercase tracking-[0.25em] text-blue-400/80 mb-2 font-black">Method 01</span>
                  <span className="text-2xl">New Project</span>
                </div>
                <ArrowRight className="w-8 h-8 text-blue-400 group-hover/btn:translate-x-2 transition-transform" />
              </button>
              <button
                onClick={onImportProject}
                className="flex-1 flex items-center justify-between px-10 py-8 rounded-[2.5rem] bg-slate-50 hover:bg-white transition-all duration-500 font-black text-slate-700 shadow-sm hover:shadow-2xl hover:shadow-slate-200/50 hover:-translate-y-1 active:scale-95 border border-transparent hover:border-slate-100 group/btn"
              >
                <div className="flex flex-col items-start text-left">
                  <span className="text-[10px] uppercase tracking-[0.25em] text-slate-400 mb-2 font-black">Method 02</span>
                  <span className="text-2xl">Import Data</span>
                </div>
                <Upload className="w-8 h-8 text-slate-300 group-hover/btn:-translate-y-1 transition-transform" />
              </button>
            </div>
          </div>
        </div>

        <div className="lg:col-span-4">
          <div className="bg-gradient-to-br from-blue-600 to-indigo-800 rounded-[4rem] p-12 text-white shadow-2xl shadow-blue-500/30 relative overflow-hidden h-full flex flex-col justify-between border border-blue-400/20">
            <Sparkles className="absolute -top-6 -right-6 w-40 h-40 text-white/10 rotate-12" />
            <div>
              <h3 className="text-3xl font-black mb-6 tracking-tight">AI Agents<br />Ready</h3>
              <p className="text-blue-100 text-lg font-medium leading-relaxed opacity-80">
                Our collective of specialized agents is standing by to help you strategize and automate your workflow instantly.
              </p>
            </div>
            <div className="flex items-center gap-3 bg-white/10 w-fit px-5 py-3 rounded-2xl backdrop-blur-md">
              <span className="w-2.5 h-2.5 bg-green-400 rounded-full animate-pulse shadow-[0_0_12px_rgba(74,222,128,0.5)]" />
              <span className="text-[11px] font-black uppercase tracking-[0.2em] text-white">Systems Online</span>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
