'use client'

import { Plus, X, ArrowRight, Sparkles } from 'lucide-react'
import { DomainSelector, getDomainPlaceholder } from './DomainSelector'
import type { ProjectDomain } from '@/types/domain'

export interface CreateProjectModalProps {
  isOpen: boolean
  onClose: () => void
  projectName: string
  onProjectNameChange: (name: string) => void
  selectedDomain: ProjectDomain
  onDomainChange: (domain: ProjectDomain) => void
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
  selectedDomain,
  onDomainChange,
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
        className="absolute inset-0 bg-[#0a192f]/80 backdrop-blur-md animate-in fade-in duration-500"
        onClick={onClose}
      />
      <div className="bg-white w-full max-w-xl rounded-[48px] shadow-2xl relative z-10 overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="p-12 flex flex-col items-center">
          <button
            onClick={onClose}
            className="absolute top-8 right-10 p-4 text-slate-300 hover:text-slate-900 hover:bg-slate-50 rounded-full transition-all"
          >
            <X className="w-6 h-6" />
          </button>
          <div className="w-20 h-20 rounded-[32px] bg-blue-50 text-blue-600 flex items-center justify-center mb-8 shadow-inner">
            <Plus className="w-10 h-10" />
          </div>
          <h3 className="text-3xl font-black text-slate-900 mb-3 tracking-tight">Project Identity</h3>
          <p className="text-slate-400 font-medium mb-8 text-center text-lg">
            Choose a domain and name your project.
          </p>

          {/* Domain Picker */}
          <div className="mb-8 w-full">
            <DomainSelector selected={selectedDomain} onSelect={onDomainChange} />
          </div>

          <div className="w-full space-y-6">
            <input
              type="text"
              placeholder={getDomainPlaceholder(selectedDomain)}
              autoFocus
              className="w-full bg-slate-50 border-4 border-slate-50 rounded-3xl px-8 py-6 text-xl text-slate-800 font-bold placeholder:text-slate-300 focus:border-blue-500/20 focus:bg-white outline-none transition-all shadow-inner"
              value={projectName}
              onChange={(e) => onProjectNameChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && projectName.trim()) handleAction()
              }}
            />
            <button
              onClick={handleAction}
              disabled={!projectName.trim() || isCreating}
              className={`w-full py-6 rounded-[30px] font-black text-lg uppercase tracking-widest text-white flex items-center justify-center gap-3 transition-all ${
                !projectName.trim() || isCreating
                  ? 'bg-slate-100 text-slate-300 cursor-not-allowed'
                  : 'bg-gradient-to-r from-blue-600 to-indigo-700 shadow-xl shadow-blue-500/20 hover:scale-[1.02] active:scale-95'
              }`}
            >
              {isCreating ? 'Creating...' : importMode ? 'Upload & Start' : 'Begin Journey'}
              <ArrowRight className="w-6 h-6" />
            </button>
          </div>
        </div>
        <div className="bg-slate-50 p-8 flex items-center justify-center border-t border-slate-100 italic text-[10px] text-slate-400 font-black uppercase tracking-[0.3em]">
          <Sparkles className="w-4 h-4 mr-3 text-blue-400" />
          AI-powered Planning Engine
        </div>
      </div>
    </div>
  )
}
