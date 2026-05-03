'use client'

import { useState } from 'react'
import { X, Loader2, Download, Copy, Check, RefreshCw } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface ReportHook {
  state: 'idle' | 'generating' | 'done' | 'error'
  error: string | null
  allDone: boolean
  existingReport: string | null
  generate: () => Promise<void>
  reset: () => void
}

interface ProjectReportModalProps {
  open: boolean
  onClose: () => void
  projectName: string
  report: ReportHook
}

export function ProjectReportModal({ open, onClose, projectName, report }: ProjectReportModalProps) {
  const [copied, setCopied] = useState(false)

  if (!open) return null

  const content = report.existingReport ?? ''
  const isGenerating = report.state === 'generating'

  const handleCopy = async () => {
    if (!content) return
    try {
      await navigator.clipboard.writeText(content)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch { /* ignore */ }
  }

  const handleDownload = () => {
    if (!content) return
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${projectName.toLowerCase().replace(/\s+/g, '-')}-final-report.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative z-10 w-full max-w-2xl max-h-[85vh] flex flex-col bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
          <div>
            <h2 className="text-sm font-semibold text-[#0a192f]">Project Final Report</h2>
            <p className="text-[11px] text-slate-400 mt-0.5 truncate max-w-sm">{projectName}</p>
          </div>
          <div className="flex items-center gap-1.5">
            {content && (
              <>
                <button
                  onClick={handleCopy}
                  title="Copy to clipboard"
                  className="p-2 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                </button>
                <button
                  onClick={handleDownload}
                  title="Download as Markdown"
                  className="p-2 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                >
                  <Download className="w-4 h-4" />
                </button>
                <button
                  onClick={() => { report.reset(); report.generate() }}
                  title="Regenerate report"
                  disabled={isGenerating}
                  className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-40"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </>
            )}
            <div className="w-px h-4 bg-slate-200 mx-0.5" />
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {/* No report yet — prompt to generate */}
          {!content && !isGenerating && report.state !== 'error' && (
            <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
              <p className="text-sm font-semibold text-[#0a192f]">All tasks are complete</p>
              <p className="text-xs text-slate-500 max-w-sm leading-relaxed">
                Generate a final report that synthesizes all task deliverables into a single cohesive document.
              </p>
              <button
                onClick={report.generate}
                className="flex items-center gap-2 px-5 py-2.5 bg-[#0a192f] text-white rounded-xl text-[11px] font-bold uppercase tracking-[0.12em] hover:bg-blue-700 transition-colors"
              >
                ✨ Generate Report
              </button>
            </div>
          )}

          {/* Generating */}
          {isGenerating && (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
              <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
              <p className="text-sm text-slate-500">Synthesizing project deliverables...</p>
            </div>
          )}

          {/* Error */}
          {report.state === 'error' && report.error && (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
              <p className="text-sm font-semibold text-red-600">Generation failed</p>
              <p className="text-xs text-slate-500">{report.error}</p>
              <button
                onClick={report.generate}
                className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Retry
              </button>
            </div>
          )}

          {/* Report content */}
          {content && !isGenerating && (
            <div className="prose prose-sm max-w-none text-slate-700 leading-relaxed">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
