'use client'

import { useState, useEffect, useRef } from 'react'
import {
  FileText,
  Pencil,
  MessageCircle,
  Save,
  XCircle,
  Clock,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { VisionVersion } from '@/types/domain'
import { ExportMenu } from './ExportMenu'

interface VisionPanelProps {
  content: string | null
  /** Called when the user saves a direct edit (markdown content). */
  onSaveEdit: (newContent: string, previousContent: string | null) => void
  /** Called when the user focuses the chat input to ask the AI for a revision. */
  onAskAiFocus: () => void
  /** Called when the user opens the version history drawer. */
  onOpenHistory: () => void
  versionCount: number
  title?: string
  /** Optional readonly mode (used in the onboarding example thread). */
  readOnly?: boolean
  /** True when there is a newer draft version after the currently-published
   *  one — used to show a "Plan updated, publish again?" banner (#1). */
  publishedIsStale?: boolean
  /** Optional callback to publish the latest draft directly from the banner. */
  onPublishLatest?: () => void
  /** Extra actions (e.g. panel toggle buttons) rendered left of History/Edit/Ask AI. */
  panelActions?: React.ReactNode
  /** Content rendered absolutely centered in the header row (e.g. PhaseStepper). */
  centerContent?: React.ReactNode
}

export function VisionPanel({
  content,
  onSaveEdit,
  onAskAiFocus,
  onOpenHistory,
  versionCount,
  title,
  readOnly,
  publishedIsStale,
  onPublishLatest,
  panelActions,
  centerContent,
}: VisionPanelProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [draft, setDraft] = useState(content ?? '')
  const [isExpanded, setIsExpanded] = useState(true)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    setDraft(content ?? '')
  }, [content])

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      const el = textareaRef.current
      el.style.height = 'auto'
      el.style.height = `${Math.min(el.scrollHeight, 600)}px`
      el.focus()
    }
  }, [isEditing])

  const hasUnsavedChanges = isEditing && draft !== (content ?? '')

  const handleSave = () => {
    if (draft.trim() === (content ?? '').trim()) {
      setIsEditing(false)
      return
    }
    onSaveEdit(draft, content)
    setIsEditing(false)
  }

  const handleCancel = () => {
    setDraft(content ?? '')
    setIsEditing(false)
  }

  return (
    <div className="mx-4 mb-4 rounded-[1.75rem] border border-slate-200/90 bg-white shadow-[0_18px_60px_rgba(15,23,42,0.05)]">
      {/* Header */}
      <div className="flex flex-col gap-3 px-5 py-4 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] border-b border-slate-100 md:flex-row md:items-center">
        {/* Left: toggle expand */}
        <button
          onClick={() => !isEditing && setIsExpanded((v) => !v)}
          disabled={isEditing}
          aria-expanded={isExpanded}
          className="flex items-start gap-3 text-left group select-none shrink-0"
        >
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 flex items-center justify-center shrink-0 border border-indigo-100">
            <FileText className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.22em]">
              Planning Document
            </p>
            <h3 className="mt-1 text-sm font-bold text-[#0a192f] tracking-tight">
              {title ?? 'Your plan'}
            </h3>
            {!isEditing && (
              <p className="mt-1 text-[11px] text-slate-500 leading-relaxed">
                {versionCount > 0
                  ? `${versionCount} revision${versionCount > 1 ? 's' : ''}`
                  : 'Draft'}
                {' · '}
                <span className="text-indigo-500 group-hover:text-indigo-700 transition-colors font-semibold">
                  {isExpanded ? 'click to close' : 'click to expand'}
                </span>
              </p>
            )}
          </div>
          {!isEditing && (
            <div className="mt-1 w-7 h-7 rounded-xl border border-slate-200 bg-white flex items-center justify-center">
              <ChevronDown
                className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
              />
            </div>
          )}
        </button>

        {/* Center: optional centered content */}
        {centerContent && (
          <div className="hidden md:flex flex-1 justify-center pointer-events-auto min-w-0">
            {centerContent}
          </div>
        )}

        {/* Right: action buttons */}
        <div className={`flex flex-wrap items-center gap-2 shrink-0 ${centerContent ? '' : 'md:ml-auto'}`}>
          {!isEditing && panelActions && (
            <>
              {panelActions}
              <div className="hidden md:block w-px h-5 bg-slate-200 mx-1" />
            </>
          )}
          {!isEditing && versionCount > 0 && !readOnly && (
            <button
              onClick={onOpenHistory}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-semibold text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors border border-transparent"
              title="Compare versions and restore older drafts"
            >
              <Clock className="w-3 h-3" />
              History
              <span className="ml-0.5 px-1 bg-gray-200 rounded text-[9px] font-black text-gray-600">{versionCount}</span>
            </button>
          )}
          {!isEditing && content && (
            <ExportMenu content={content} title={title ?? 'Plan'} />
          )}
          {!isEditing && !readOnly && (
            <>
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-semibold text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors border border-transparent"
                title="Edit directly"
              >
                <Pencil className="w-3 h-3" />
                Edit
              </button>
              <button
                onClick={onAskAiFocus}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-semibold text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 transition-colors border border-transparent"
                title="Ask AI to revise"
              >
                <MessageCircle className="w-3 h-3" />
                Ask AI
              </button>
            </>
          )}
          {isEditing && (
            <>
              <button
                onClick={handleCancel}
                className="flex items-center gap-1 px-3 py-2 rounded-xl text-[10px] font-semibold text-slate-500 hover:bg-slate-100 transition-colors"
              >
                <XCircle className="w-3 h-3" />
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="flex items-center gap-1 px-3 py-2 rounded-xl text-[10px] font-bold bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
              >
                <Save className="w-3 h-3" />
                Save
              </button>
            </>
          )}
        </div>
      </div>

      {isEditing && hasUnsavedChanges && (
        <div className="px-5 py-3 bg-amber-50 border-b border-amber-100 text-[11px] font-semibold text-amber-800 leading-relaxed">
          You have unsaved edits. Save them before sending a chat message if you want the next AI reply to use the updated draft.
        </div>
      )}

      {publishedIsStale && !readOnly && (
        <div className="px-5 py-3 border-t border-amber-100 bg-amber-50/60 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <Clock className="w-4 h-4 text-amber-600 shrink-0" />
            <p className="text-xs text-amber-800 leading-snug">
              A newer draft is available. Publish it to keep your team up to date.
            </p>
          </div>
          {onPublishLatest && (
            <button
              onClick={onPublishLatest}
              className="px-3 py-1.5 rounded-xl bg-amber-600 text-white text-[11px] font-bold uppercase tracking-wider hover:bg-amber-700 transition-colors active:scale-95 shrink-0"
            >
              Publish latest
            </button>
          )}
        </div>
      )}

      {(isExpanded || isEditing) && content && (
        <div className="max-h-[60vh] overflow-y-auto scroll-smooth bg-[linear-gradient(180deg,#fcfcfd_0%,#f8fafc_100%)]">
          {isEditing ? (
            <div className="rounded-[1.75rem] border border-slate-200 bg-white shadow-[0_12px_40px_rgba(15,23,42,0.05)] overflow-hidden">
              <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-slate-100 bg-slate-50/80">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">
                    Revision Draft
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Edit the markdown directly. Keep clear headings, short sections, and readable bullets.
                  </p>
                </div>
                <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400 shrink-0">
                  Markdown editor
                </div>
              </div>
              <textarea
                ref={textareaRef}
                value={draft}
                onChange={(e) => {
                  setDraft(e.target.value)
                  const el = e.currentTarget
                  el.style.height = 'auto'
                  el.style.height = `${Math.min(el.scrollHeight, 600)}px`
                }}
                placeholder="# Your plan"
                className="w-full min-h-[280px] max-h-[600px] bg-white px-6 py-6 text-[14px] text-slate-800 font-mono resize-none focus:outline-none leading-7"
              />
            </div>
          ) : (
            <div className="rounded-[1.75rem] border border-slate-200/90 bg-white shadow-[0_18px_60px_rgba(15,23,42,0.06)]">
              <div className="px-6 py-4 bg-[radial-gradient(circle_at_top,#ffffff_0%,#ffffff_60%,#fafcff_100%)]">
                <div className="plan-prose max-w-none">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{content ?? ''}</ReactMarkdown>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
