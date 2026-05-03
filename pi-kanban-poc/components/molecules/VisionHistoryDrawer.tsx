'use client'

import { X, History, RotateCcw, User as UserIcon, Bot, GitCompareArrows } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useState, useEffect } from 'react'
import type { VisionVersion } from '@/types/domain'
import { diffLines, summarizeDiff } from '@/lib/diff'

interface VisionHistoryDrawerProps {
  open: boolean
  onClose: () => void
  versions: VisionVersion[]
  currentContent: string | null
  onRestore: (versionId: string) => void
  /**
   * Publish this version as the single canonical plan for the thread (#4).
   * Wired from PlanningClient to kanbanStore.publishVisionVersion.
   */
  onPublish?: (versionId: string) => void
}

const CHANGE_LABEL: Record<VisionVersion['changeType'], string> = {
  initial: 'Initial draft',
  ai_draft: 'AI revised the plan',
  user_direct_edit: 'You edited directly',
  ai_via_chat: 'AI revised via chat',
  phase_transition: 'Phase transition snapshot',
  restored: 'Restored from earlier version',
}

/**
 * Side-drawer for the vision version timeline (Tier 3.11).
 *
 * Two viewing modes:
 *   - "View" expands the version content inline (pure markdown).
 *   - "Compare" runs a line-by-line diff of the version against the version
 *     immediately newer than it. Added lines are green, removed lines are red,
 *     context lines are dimmed. This makes it obvious at a glance what
 *     changed in each revision.
 */
export function VisionHistoryDrawer({
  open,
  onClose,
  versions,
  currentContent: _currentContent,
  onRestore,
  onPublish,
}: VisionHistoryDrawerProps) {
  const [openVersionId, setOpenVersionId] = useState<string | null>(null)
  const [openMode, setOpenMode] = useState<'view' | 'compare'>('view')

  // Close the drawer on ESC so keyboard users aren't trapped — matches the
  // backdrop-click affordance already in place.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <aside className="relative w-full max-w-2xl bg-white shadow-2xl flex flex-col h-full animate-in slide-in-from-right duration-300">
        <header className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-2xl bg-blue-100 flex items-center justify-center">
              <History className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <h3 className="font-black text-sm text-ink">Plan history</h3>
              <p className="text-meta text-slate-400 font-semibold">{versions.length} version{versions.length !== 1 ? 's' : ''}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close history drawer"
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {versions.length === 0 && (
            <div className="text-center py-12 text-sm text-slate-400">
              No revisions yet. Edits to your plan will appear here.
            </div>
          )}
          {versions.map((v, idx) => {
            const isExpanded = openVersionId === v.id
            const isCurrent = idx === 0
            const Icon = v.createdBy === 'user' ? UserIcon : Bot

            // The "newer" reference is whichever version sits ABOVE this one
            // in the chronologically-newest-first list. For the current
            // version itself there is no newer one — fall back to "previous".
            const newerVersion = idx > 0 ? versions[idx - 1] : null
            const previousVersion = idx < versions.length - 1 ? versions[idx + 1] : null
            const compareTarget = newerVersion ?? previousVersion
            const compareLabel = newerVersion
              ? `Compare with newer (${CHANGE_LABEL[newerVersion.changeType]})`
              : previousVersion
              ? `Compare with previous`
              : null

            return (
              <div
                key={v.id}
                className={`rounded-2xl border overflow-hidden transition-all ${
                  isCurrent ? 'border-blue-200 bg-blue-50/30' : 'border-slate-100 bg-white'
                }`}
              >
                <div className="px-4 py-3 flex items-start gap-3">
                  <div className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center ${
                    v.createdBy === 'user' ? 'bg-blue-100' : 'bg-brand-subtle'
                  }`}>
                    <Icon className={`w-3.5 h-3.5 ${
                      v.createdBy === 'user' ? 'text-blue-600' : 'text-brand'
                    }`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-meta font-black text-ink">
                        {CHANGE_LABEL[v.changeType]}
                      </span>
                      {isCurrent && (
                        <span className="text-micro font-bold text-green-600 uppercase tracking-wider">
                          • current
                        </span>
                      )}
                    </div>
                    <p className="text-meta text-slate-500">
                      {formatRelative(v.createdAt)}
                    </p>
                    {v.summary && (
                      <p className="text-xs text-slate-600 mt-1 italic">&quot;{v.summary}&quot;</p>
                    )}
                    {v.diffFromPrevious && v.diffFromPrevious.length > 0 && (
                      <ul className="text-meta text-slate-500 mt-1.5 list-disc list-inside">
                        {v.diffFromPrevious.slice(0, 3).map((c, i) => (
                          <li key={i}>{c}</li>
                        ))}
                      </ul>
                    )}
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <button
                        onClick={() => {
                          if (isExpanded && openMode === 'view') {
                            setOpenVersionId(null)
                          } else {
                            setOpenVersionId(v.id)
                            setOpenMode('view')
                          }
                        }}
                        className={`text-meta font-bold transition-colors ${
                          isExpanded && openMode === 'view'
                            ? 'text-blue-700'
                            : 'text-blue-600 hover:text-blue-700'
                        }`}
                      >
                        {isExpanded && openMode === 'view' ? 'Hide' : 'View'}
                      </button>
                      {compareTarget && (
                        <button
                          onClick={() => {
                            if (isExpanded && openMode === 'compare') {
                              setOpenVersionId(null)
                            } else {
                              setOpenVersionId(v.id)
                              setOpenMode('compare')
                            }
                          }}
                          title={compareLabel ?? undefined}
                          className={`flex items-center gap-1 text-meta font-bold transition-colors ${
                            isExpanded && openMode === 'compare'
                              ? 'text-emerald-700'
                              : 'text-emerald-600 hover:text-emerald-700'
                          }`}
                        >
                          <GitCompareArrows className="w-2.5 h-2.5" />
                          {isExpanded && openMode === 'compare' ? 'Hide diff' : 'Diff'}
                        </button>
                      )}
                      {!isCurrent && (
                        <button
                          onClick={() => {
                            if (window.confirm('Restore this version? Your current plan will be saved as a new version in history.')) {
                              onRestore(v.id)
                              onClose()
                            }
                          }}
                          className="flex items-center gap-1 text-meta font-bold text-amber-600 hover:text-amber-700"
                        >
                          <RotateCcw className="w-2.5 h-2.5" />
                          Restore
                        </button>
                      )}
                      {/* Publish action (#4) — only for the current draft.
                          Already-published versions show a passive badge
                          so the user can still tell which one is canonical. */}
                      {onPublish && isCurrent && v.status !== 'published' && (
                        <button
                          onClick={() => onPublish(v.id)}
                          className="flex items-center gap-1 text-meta font-bold text-blue-600 hover:text-blue-700"
                          title="Publish this version as the official plan for this thread"
                        >
                          ✓ Publish
                        </button>
                      )}
                      {v.status === 'published' && !v.supersededAt && (
                        <span className="flex items-center gap-1 text-micro text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded-full">
                          ★ Published
                        </span>
                      )}
                      {v.status === 'published' && v.supersededAt && (
                        <span
                          className="flex items-center gap-1 text-micro text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-full"
                          title="This version was published but has been superseded by a newer one"
                        >
                          Superseded
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                {isExpanded && openMode === 'view' && (
                  <div className="px-4 pb-4 pt-4 border-t border-slate-100 bg-[linear-gradient(180deg,#fcfcfd_0%,#f8fafc_100%)]">
                    <div className="rounded-[1.5rem] border border-slate-200/90 bg-white shadow-sm overflow-hidden">
                      <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/80 flex items-center justify-between gap-3">
                        <div>
                          <p className="text-micro text-slate-400">
                            Revision View
                          </p>
                          <p className="text-xs font-semibold text-ink mt-1">
                            {CHANGE_LABEL[v.changeType]}
                          </p>
                        </div>
                        <span className="text-micro text-slate-400 shrink-0">
                          Readable draft
                        </span>
                      </div>
                      <div className="px-6 py-6 md:px-7 md:py-7">
                        <div className="plan-prose max-w-none">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>{v.content}</ReactMarkdown>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                {isExpanded && openMode === 'compare' && compareTarget && (
                  <DiffView
                    /* "from" is the OLDER text → "to" is what we're inspecting.
                       The chronologically-newer (compareTarget) sits above,
                       so to show "what this version changed" we diff
                       compareTarget → v when compareTarget is older
                       (idx === last) or v → compareTarget otherwise. */
                    from={newerVersion ? v.content : (previousVersion?.content ?? '')}
                    to={newerVersion ? newerVersion.content : v.content}
                    fromLabel={newerVersion ? `This version` : `Previous`}
                    toLabel={newerVersion ? CHANGE_LABEL[newerVersion.changeType] : CHANGE_LABEL[v.changeType]}
                  />
                )}
              </div>
            )
          })}
        </div>
      </aside>
    </div>
  )
}

interface DiffViewProps {
  from: string
  to: string
  fromLabel: string
  toLabel: string
}

/**
 * Inline unified-style diff view. Lines that exist only in `from` are shown
 * red (with a leading "−"); lines only in `to` are green ("+"); lines that
 * survived in both are dimmed context.
 */
function DiffView({ from, to, fromLabel, toLabel }: DiffViewProps) {
  const diff = diffLines(from, to)
  const summary = summarizeDiff(diff)
  return (
    <div className="border-t border-slate-100">
      <div className="px-4 py-2 flex items-center justify-between bg-slate-50/60">
        <div className="text-meta font-bold text-slate-500">
          <span className="text-danger">−{fromLabel}</span>
          <span className="mx-1.5 text-slate-300">vs</span>
          <span className="text-emerald-600">+{toLabel}</span>
        </div>
        <div className="text-meta font-bold flex items-center gap-2">
          <span className="text-emerald-600">+{summary.added}</span>
          <span className="text-danger">−{summary.removed}</span>
        </div>
      </div>
      <div className="px-1 py-2 bg-white max-h-[280px] overflow-y-auto font-mono text-meta leading-snug">
        {diff.map((line, i) => {
          const base = 'px-3 py-0.5 whitespace-pre-wrap break-words'
          if (line.kind === 'added') {
            return (
              <div key={i} className={`${base} bg-emerald-50 text-emerald-900 border-l-2 border-emerald-400`}>
                <span className="text-emerald-500 mr-2">+</span>
                {line.text || ' '}
              </div>
            )
          }
          if (line.kind === 'removed') {
            return (
              <div key={i} className={`${base} bg-danger-bg text-danger border-l-2 border-rose-400`}>
                <span className="text-danger mr-2">−</span>
                {line.text || ' '}
              </div>
            )
          }
          return (
            <div key={i} className={`${base} text-slate-500`}>
              <span className="text-slate-300 mr-2"> </span>
              {line.text || ' '}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function formatRelative(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime()
  if (ms < 60_000) return 'just now'
  const mins = Math.floor(ms / 60_000)
  if (mins < 60) return `${mins} min ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}
