'use client'

import { FileText, Image as ImageIcon, FileSpreadsheet, AlertCircle } from 'lucide-react'

import type { ImportedSource } from '@/types/domain'

const ICONS: Record<ImportedSource['kind'], React.ComponentType<{ className?: string }>> = {
  text: FileText,
  pdf: FileText,
  docx: FileText,
  doc: FileText,
  xlsx: FileSpreadsheet,
  csv: FileSpreadsheet,
  image: ImageIcon,
  unknown: AlertCircle,
  note: FileText,
}

export function ImportedSourcesPanel({
  sources,
  onUpdateSource,
}: {
  sources: ImportedSource[]
  onUpdateSource?: (sourceId: string, patch: Partial<ImportedSource>) => void
}) {
  return (
    <section className="rounded-[1.5rem] border border-slate-200/90 bg-white shadow-[0_10px_26px_rgba(15,23,42,0.04)] overflow-hidden h-fit">
      <div className="px-6 py-4 border-b border-slate-100 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)]">
        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Imported Sources</p>
        <h3 className="mt-1 text-sm font-bold text-[#0a192f]">Project context library</h3>
      </div>
      <div className="px-6 py-5 space-y-3">
        {sources.length === 0 ? (
          <p className="text-sm text-slate-500">No imported source documents are linked to this project yet.</p>
        ) : (
          sources.map((source) => {
            const Icon = ICONS[source.kind] ?? FileText
            return (
              <div key={source.id} className="rounded-[1.25rem] border border-slate-100 bg-slate-50/55 px-4 py-3 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center border border-slate-100 shrink-0">
                    <Icon className="w-4 h-4 text-slate-500" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-bold text-[#0a192f] truncate">{source.title}</p>
                      <div className="flex items-center gap-2 shrink-0">
                        {source.usedInPlanning && (
                          <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-600">
                            used
                          </span>
                        )}
                        <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400 shrink-0">
                          {source.status.replace('_', ' ')}
                        </span>
                      </div>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <Badge>{source.category ?? 'other'}</Badge>
                      <Badge>{source.parseQuality ?? 'medium'} quality</Badge>
                      {onUpdateSource && (
                        <button
                          onClick={() => onUpdateSource(source.id, { usedInPlanning: !source.usedInPlanning })}
                          className="text-[10px] font-bold uppercase tracking-[0.14em] text-blue-600 hover:text-blue-700"
                        >
                          {source.usedInPlanning ? 'Mark unused' : 'Mark used'}
                        </button>
                      )}
                    </div>
                    {source.summary && (
                      <p className="mt-1 text-xs text-slate-500 leading-relaxed">{source.summary}</p>
                    )}
                    {source.extractedText && (
                      <details className="mt-2">
                        <summary className="text-xs text-blue-600 cursor-pointer font-semibold hover:underline">
                          View source extract
                        </summary>
                        <pre className="mt-2 text-[11px] text-slate-700 bg-white p-3 rounded-xl max-h-32 overflow-y-auto whitespace-pre-wrap font-mono border border-slate-100">
                          {source.extractedText.slice(0, 800)}
                          {source.extractedText.length > 800 ? '\n…' : ''}
                        </pre>
                      </details>
                    )}
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </section>
  )
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="px-2 py-1 rounded-lg bg-white border border-slate-200 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">
      {children}
    </span>
  )
}
