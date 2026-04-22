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

  if (!content && !isEditing) return null

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
    <div className="mx-4 mb-3 rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border-b border-gray-100">
        {/* Left: toggle expand */}
        <button
          onClick={() => !isEditing && setIsExpanded((v) => !v)}
          disabled={isEditing}
          aria-expanded={isExpanded}
          className="flex items-center gap-2 text-left group select-none"
        >
          <div className="w-5 h-5 rounded-lg bg-indigo-100 flex items-center justify-center shrink-0">
            <FileText className="w-3 h-3 text-indigo-500" />
          </div>
          <div>
            <span className="text-[11px] font-black text-gray-800 uppercase tracking-widest">
              {title ?? 'Your plan'}
            </span>
            {!isEditing && (
              <span className="ml-2 text-[10px] text-gray-400 font-medium">
                {versionCount > 0
                  ? `${versionCount} revision${versionCount > 1 ? 's' : ''}`
                  : 'Draft'}
                {' · '}
                <span className="text-indigo-400 group-hover:text-indigo-600 transition-colors">
                  {isExpanded ? 'click to close' : 'click to expand'}
                </span>
              </span>
            )}
          </div>
          {!isEditing && (
            <ChevronDown
              className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
            />
          )}
        </button>

        {/* Right: action buttons */}
        <div className="flex items-center gap-1">
          {!isEditing && panelActions && (
            <>
              {panelActions}
              <div className="w-px h-4 bg-gray-200 mx-1" />
            </>
          )}
          {!isEditing && versionCount > 0 && !readOnly && (
            <button
              onClick={onOpenHistory}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
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
                className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                title="Edit directly"
              >
                <Pencil className="w-3 h-3" />
                Edit
              </button>
              <button
                onClick={onAskAiFocus}
                className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold text-indigo-500 hover:text-indigo-700 hover:bg-indigo-50 transition-colors"
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
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold text-gray-500 hover:bg-gray-100 transition-colors"
              >
                <XCircle className="w-3 h-3" />
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
              >
                <Save className="w-3 h-3" />
                Save
              </button>
            </>
          )}
        </div>
      </div>

      {isEditing && hasUnsavedChanges && (
        <div className="px-4 py-2 bg-amber-50 border-b border-amber-100 text-[10px] font-semibold text-amber-700">
          ⚠️ You have unsaved edits. Save before sending a chat message.
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

      {(isExpanded || isEditing) && (
        <div className="px-5 py-5 max-h-[520px] overflow-y-auto scroll-smooth bg-[linear-gradient(180deg,#fcfcfd_0%,#f8fafc_100%)]">
          {isEditing ? (
            <div className="mx-auto max-w-4xl rounded-[1.75rem] border border-slate-200 bg-white shadow-sm overflow-hidden">
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
                className="w-full min-h-[260px] max-h-[600px] bg-white px-6 py-6 text-[14px] text-slate-800 font-mono resize-none focus:outline-none leading-7"
              />
            </div>
          ) : (
            <div className="mx-auto max-w-4xl rounded-[1.75rem] border border-slate-200/90 bg-white shadow-[0_18px_60px_rgba(15,23,42,0.06)] overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)]">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">
                      Current Revision
                    </p>
                    <h3 className="mt-1 text-sm font-bold text-[#0a192f]">
                      {title ?? 'Plan draft'}
                    </h3>
                  </div>
                  <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400 shrink-0">
                    Readable draft view
                  </div>
                </div>
              </div>
              <div className="px-7 py-7 md:px-9 md:py-8">
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
