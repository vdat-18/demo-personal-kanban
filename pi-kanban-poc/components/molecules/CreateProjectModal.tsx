'use client'

import { Plus, X, ArrowRight, Sparkles } from 'lucide-react'

/**
 * Project creation modal (Tier 2.6).
 *
 * The domain selector was removed: the planning agent self-adapts to the
 * nature of whatever the user describes (wedding, product launch, learning,
 * team ops, etc.). Asking users to classify upfront felt forced for non-tech
 * audiences — the AI does it implicitly from the first message instead.
 */
export interface CreateProjectModalProps {
  isOpen: boolean
  onClose: () => void
  projectName: string
  onProjectNameChange: (name: string) => void
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
  importMode,
  isCreating,
  onSubmit,
  onImportSubmit,
}: CreateProjectModalProps) {
  if (!isOpen) return null

  const handleAction = importMode ? onImportSubmit : onSubmit

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 pb-20">
      <div
        className="absolute inset-0 bg-[#0a192f]/60 backdrop-blur-xl animate-in fade-in duration-700"
        onClick={onClose}
      />
      <div className="bg-white w-full max-w-xl rounded-[4rem] shadow-2xl shadow-blue-900/10 relative z-10 overflow-hidden animate-in zoom-in-95 duration-500 border border-white">
        <div className="p-16 flex flex-col items-center">
          <button
            onClick={onClose}
            className="absolute top-10 right-10 p-4 text-slate-300 hover:text-[#0a192f] hover:bg-slate-50 rounded-2xl transition-all active:scale-95"
          >
            <X className="w-6 h-6" />
          </button>
          <div className="w-24 h-24 rounded-[3rem] bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center mb-10 shadow-2xl shadow-blue-500/30">
            <Plus className="w-10 h-10" />
          </div>
          <h3 className="text-4xl font-black text-[#0a192f] mb-4 tracking-tighter">What are you planning?</h3>
          <p className="text-slate-400 font-medium mb-12 text-center text-xl leading-relaxed">
            Just give it a name.<br />We&apos;ll figure out the rest together.
          </p>

          <div className="w-full space-y-8">
            <input
              type="text"
              placeholder="E.g. Spring wedding, Q2 product launch, 6-month SaaS MVP…"
              autoFocus
              className="w-full bg-slate-50 border-4 border-slate-50 rounded-[2.5rem] px-10 py-8 text-2xl text-[#0a192f] font-black placeholder:text-slate-300 focus:border-blue-500/20 focus:bg-white outline-none transition-all shadow-inner tracking-tight"
              value={projectName}
              onChange={(e) => onProjectNameChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && projectName.trim()) handleAction()
              }}
            />
            <button
              onClick={handleAction}
              disabled={!projectName.trim() || isCreating}
              className={`w-full py-8 rounded-[2.5rem] font-black text-lg uppercase tracking-[0.2em] text-white flex items-center justify-center gap-3 transition-all ${
                !projectName.trim() || isCreating
                  ? 'bg-slate-100 text-slate-300 cursor-not-allowed border border-gray-200'
                  : 'bg-[#0a192f] hover:bg-blue-600 shadow-2xl shadow-blue-900/20 hover:scale-[1.01] active:scale-95'
              }`}
            >
              {isCreating ? 'Creating…' : importMode ? 'Upload & start' : 'Start planning'}
              <ArrowRight className="w-6 h-6" />
            </button>
          </div>
        </div>
        <div className="bg-slate-50/50 p-8 flex items-center justify-center border-t border-slate-100 italic text-[10px] text-slate-400 font-black uppercase tracking-[0.3em] backdrop-blur-sm">
          <Sparkles className="w-4 h-4 mr-3 text-blue-400" />
          AI-powered Planning Intelligence
        </div>
      </div>
    </div>
  )
}
