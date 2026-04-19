'use client'

import { useEffect, useRef, useState } from 'react'
import {
  X,
  Upload,
  FileText,
  Image as ImageIcon,
  FileSpreadsheet,
  FileWarning,
  Loader2,
  ArrowRight,
  Sparkles,
  Trash2,
} from 'lucide-react'
import { ingestFile, type IngestedFile } from '@/lib/fileIngest'

/**
 * Dashboard "Import Data" multi-step flow (#1).
 *
 * Step 1 — Source picker: drop / pick files (PDF, DOCX, XLSX, CSV, TXT, MD,
 *          images). Plain-text paste fallback for users without a file.
 * Step 2 — Preview: each file shows the AI's extracted summary so the user
 *          can confirm we read it correctly before committing.
 * Step 3 — Naming: derive a default name from the first file but let the
 *          user override it. Submit creates the project and seeds the first
 *          planning thread with the extracted content as the kick-off
 *          message — so the AI can hit the ground running with real
 *          context instead of asking "what are you planning?".
 *
 * On submit the parent receives the project name + a single concatenated
 * import payload. Persistence and navigation are handled upstream so this
 * component stays focused on the file flow.
 */

export interface ImportProjectFlowProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (args: {
    projectName: string
    /** Concatenated extracted text + a leading instruction line that will be
     *  posted as the first user message in the new planning thread. */
    seedMessage: string
    files: IngestedFile[]
  }) => Promise<void> | void
}

type Step = 'pick' | 'review' | 'name'

const KIND_ICON: Record<IngestedFile['kind'], React.ComponentType<{ className?: string }>> = {
  text: FileText,
  pdf: FileText,
  docx: FileText,
  xlsx: FileSpreadsheet,
  csv: FileSpreadsheet,
  image: ImageIcon,
  unknown: FileWarning,
}

export function ImportProjectFlow({ isOpen, onClose, onSubmit }: ImportProjectFlowProps) {
  const [step, setStep] = useState<Step>('pick')
  const [files, setFiles] = useState<IngestedFile[]>([])
  const [pasteText, setPasteText] = useState('')
  const [projectName, setProjectName] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)

  // Reset everything when the modal closes — avoid stale state next time.
  useEffect(() => {
    if (!isOpen) {
      setStep('pick')
      setFiles([])
      setPasteText('')
      setProjectName('')
      setIsProcessing(false)
      setIsSubmitting(false)
      setIsDragging(false)
    }
  }, [isOpen])

  // ESC closes
  useEffect(() => {
    if (!isOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen, onClose])

  if (!isOpen) return null

  // ─── File handlers ────────────────────────────────────────────────────────
  const ingestFiles = async (incoming: File[]) => {
    if (incoming.length === 0) return
    setIsProcessing(true)
    try {
      // Cap at 5 to keep prompts manageable. UI tells the user why.
      const capped = incoming.slice(0, 5)
      const ingested = await Promise.all(capped.map(ingestFile))
      setFiles((prev) => [...prev, ...ingested].slice(0, 5))

      // Auto-derive a name from the first file (without its extension).
      if (!projectName && ingested[0]) {
        const stem = ingested[0].filename.replace(/\.[^.]+$/, '').slice(0, 60)
        setProjectName(stem)
      }
      setStep('review')
    } finally {
      setIsProcessing(false)
    }
  }

  const handlePickFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = Array.from(e.target.files ?? [])
    e.target.value = ''
    await ingestFiles(list)
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const list = Array.from(e.dataTransfer.files ?? [])
    await ingestFiles(list)
  }

  const handlePastePromote = () => {
    if (!pasteText.trim()) return
    const synthetic: IngestedFile = {
      filename: 'pasted-text.txt',
      mimeType: 'text/plain',
      kind: 'text',
      text: pasteText.slice(0, 50_000),
      charCount: Math.min(pasteText.length, 50_000),
      summary: `${pasteText.length.toLocaleString()} characters of pasted text.`,
    }
    setFiles((prev) => [...prev, synthetic].slice(0, 5))
    setPasteText('')
    if (!projectName) {
      // First sentence of pasted text → reasonable default name
      const firstLine = pasteText.trim().split(/\r?\n/)[0].slice(0, 60)
      setProjectName(firstLine || 'Imported brief')
    }
    setStep('review')
  }

  const handleRemoveFile = (idx: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== idx))
  }

  // ─── Submit ───────────────────────────────────────────────────────────────
  const handleConfirm = async () => {
    if (!projectName.trim()) return
    setIsSubmitting(true)
    try {
      const fileBlocks = files.map((f) => {
        if (f.error) return `--- ${f.filename} ---\n[Failed to read: ${f.error}]`
        if (f.needsVisionModel && !f.text) {
          return `--- ${f.filename} ---\n[${f.summary ?? 'Binary attachment — needs vision model.'}]`
        }
        return `--- ${f.filename} ---\n${f.text}`
      })
      const seedMessage = [
        `I'm starting a project from the following imported material. Please read it carefully, summarise what you understand, and ask clarifying questions for anything ambiguous before drafting a plan.`,
        '',
        ...fileBlocks,
      ].join('\n\n')
      await onSubmit({ projectName: projectName.trim(), seedMessage, files })
    } finally {
      setIsSubmitting(false)
    }
  }

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[#0a192f]/50 backdrop-blur-sm" onClick={onClose} />
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl shadow-blue-900/10 relative z-10 overflow-hidden border border-white animate-in zoom-in-95 duration-300">
        <header className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center shadow-md">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#0a192f] tracking-tight">Import a project brief</h3>
              <p className="text-xs text-slate-500">
                Step {step === 'pick' ? 1 : step === 'review' ? 2 : 3} of 3 ·{' '}
                {step === 'pick' ? 'Pick source' : step === 'review' ? 'Review extraction' : 'Name & start'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="p-2 rounded-xl text-slate-400 hover:text-[#0a192f] hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </header>

        {/* Step 1 — pick */}
        {step === 'pick' && (
          <div className="p-6 space-y-5">
            <div
              onDragOver={(e) => {
                e.preventDefault()
                setIsDragging(true)
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`rounded-2xl border-2 border-dashed p-8 text-center cursor-pointer transition-colors ${
                isDragging
                  ? 'border-blue-400 bg-blue-50'
                  : 'border-slate-200 bg-slate-50/50 hover:border-blue-300 hover:bg-blue-50/40'
              }`}
            >
              {isProcessing ? (
                <div className="flex flex-col items-center gap-3 text-slate-500">
                  <Loader2 className="w-7 h-7 animate-spin text-blue-500" />
                  <span className="text-sm font-semibold">Reading your files…</span>
                </div>
              ) : (
                <>
                  <div className="w-12 h-12 mx-auto rounded-2xl bg-white shadow flex items-center justify-center mb-3">
                    <Upload className="w-6 h-6 text-blue-500" />
                  </div>
                  <p className="text-sm font-bold text-[#0a192f] mb-1">
                    Drop files here or click to browse
                  </p>
                  <p className="text-xs text-slate-500">
                    PDF, Word, Excel, CSV, text, images · up to 5 files
                  </p>
                </>
              )}
              <input
                ref={fileInputRef}
                type="file"
                multiple
                hidden
                accept=".pdf,.docx,.xlsx,.xls,.csv,.txt,.md,.json,.yaml,.yml,.xml,.html,.log,image/*"
                onChange={handlePickFiles}
              />
            </div>

            <div className="relative flex items-center gap-3">
              <div className="flex-1 h-px bg-slate-200" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Or paste text
              </span>
              <div className="flex-1 h-px bg-slate-200" />
            </div>

            <div className="space-y-2">
              <textarea
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                placeholder="Paste the project brief, an email, meeting notes, or any starting context…"
                className="w-full min-h-[120px] rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-[#0a192f] placeholder:text-slate-400 focus:outline-none focus:border-blue-400 resize-y"
              />
              <button
                onClick={handlePastePromote}
                disabled={!pasteText.trim()}
                className="px-4 py-2 rounded-xl bg-[#0a192f] text-white text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Use pasted text
              </button>
            </div>
          </div>
        )}

        {/* Step 2 — review */}
        {step === 'review' && (
          <div className="p-6 space-y-4">
            <div className="text-sm text-slate-600">
              <Sparkles className="w-3.5 h-3.5 inline -mt-0.5 mr-1 text-blue-500" />
              We extracted the following from your import. Verify before continuing.
            </div>
            <ul className="space-y-2 max-h-[320px] overflow-y-auto">
              {files.map((f, i) => {
                const Icon = KIND_ICON[f.kind] ?? FileText
                const tone = f.error
                  ? 'border-rose-200 bg-rose-50/50'
                  : f.needsVisionModel
                  ? 'border-amber-200 bg-amber-50/50'
                  : 'border-slate-200 bg-white'
                return (
                  <li key={i} className={`rounded-xl border p-3 flex items-start gap-3 ${tone}`}>
                    <Icon className="w-4 h-4 mt-0.5 shrink-0 text-slate-500" />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-[#0a192f] truncate">{f.filename}</div>
                      <div className="text-xs text-slate-500 mt-0.5">{f.summary ?? `${f.charCount} chars`}</div>
                      {f.error && (
                        <div className="text-xs text-rose-600 mt-1 font-semibold">⚠ {f.error}</div>
                      )}
                      {f.needsVisionModel && !f.text && (
                        <div className="text-xs text-amber-700 mt-1">
                          ℹ This file needs a vision-capable AI model to be interpreted. It will still be attached as a reference.
                        </div>
                      )}
                      {f.text && (
                        <details className="mt-2">
                          <summary className="text-xs text-blue-600 cursor-pointer font-semibold hover:underline">
                            Preview extracted text
                          </summary>
                          <pre className="mt-2 text-[11px] text-slate-700 bg-slate-50 p-2 rounded-lg max-h-32 overflow-y-auto whitespace-pre-wrap font-mono">
                            {f.text.slice(0, 800)}
                            {f.text.length > 800 ? '\n…' : ''}
                          </pre>
                        </details>
                      )}
                    </div>
                    <button
                      onClick={() => handleRemoveFile(i)}
                      aria-label="Remove file"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-colors shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </li>
                )
              })}
            </ul>
            <div className="flex items-center justify-between gap-3 pt-2">
              <button
                onClick={() => setStep('pick')}
                className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
              >
                ← Add more
              </button>
              <button
                onClick={() => setStep('name')}
                disabled={files.length === 0}
                className="px-5 py-2.5 rounded-xl bg-[#0a192f] text-white text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-40 inline-flex items-center gap-2"
              >
                Continue
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 3 — name */}
        {step === 'name' && (
          <div className="p-6 space-y-5">
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Project name
              </label>
              <input
                type="text"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                autoFocus
                placeholder="What should we call this?"
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-[#0a192f] placeholder:text-slate-400 focus:outline-none focus:border-blue-400"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && projectName.trim()) handleConfirm()
                }}
              />
            </div>
            <div className="rounded-xl bg-blue-50/60 border border-blue-100 p-4 text-xs text-slate-600 leading-relaxed">
              <strong className="text-[#0a192f]">What happens next:</strong> we'll create the project,
              attach your {files.length} file{files.length === 1 ? '' : 's'} as context, and ask the AI
              to read everything and start the discovery conversation with informed clarifying questions
              — instead of starting from a blank slate.
            </div>
            <div className="flex items-center justify-between gap-3">
              <button
                onClick={() => setStep('review')}
                className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
              >
                ← Back
              </button>
              <button
                onClick={handleConfirm}
                disabled={!projectName.trim() || isSubmitting}
                className="px-5 py-2.5 rounded-xl bg-[#0a192f] text-white text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-40 inline-flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creating…
                  </>
                ) : (
                  <>
                    Create project
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
