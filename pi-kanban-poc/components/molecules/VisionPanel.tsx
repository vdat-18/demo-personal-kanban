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
    <div className="mx-4 mb-4 rounded-2xl border border-line bg-surface shadow-sm">
      {/* Header */}
      <div className="flex flex-col gap-3 px-5 py-4 bg-surface-muted/40 border-b border-line md:flex-row md:items-center">
        {/* Left: toggle expand */}
        <button
          onClick={() => !isEditing && setIsExpanded((v) => !v)}
          disabled={isEditing}
          aria-expanded={isExpanded}
          className="flex items-start gap-3 text-left group select-none shrink-0"
        >
          <div className="w-10 h-10 rounded-xl bg-brand-subtle flex items-center justify-center shrink-0 border border-brand-border">
            <FileText className="w-4 h-4 text-brand" />
          </div>
          <div className="min-w-0">
            <p className="text-micro text-ink-muted">Planning document</p>
            <h3 className="mt-1 text-h2 text-ink">{title ?? 'Your plan'}</h3>
            {!isEditing && (
              <p className="mt-1 text-meta text-ink-muted leading-relaxed">
                {versionCount > 0
                  ? `${versionCount} revision${versionCount > 1 ? 's' : ''}`
                  : 'Draft'}
                {' · '}
                <span className="text-brand group-hover:text-brand-hover transition-colors font-semibold">
                  {isExpanded ? 'click to close' : 'click to expand'}
                </span>
              </p>
            )}
          </div>
          {!isEditing && (
            <div className="mt-1 w-7 h-7 rounded-lg border border-line bg-surface flex items-center justify-center">
              <ChevronDown
                className={`w-3.5 h-3.5 text-ink-subtle transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
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
              <div className="hidden md:block w-px h-5 bg-line mx-1" />
            </>
          )}
          {!isEditing && versionCount > 0 && !readOnly && (
            <button
              onClick={onOpenHistory}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-meta font-semibold text-ink-muted hover:text-ink hover:bg-surface-muted transition-colors border border-transparent"
              title="Compare versions and restore older drafts"
            >
              <Clock className="w-3 h-3" />
              History
              <span className="ml-0.5 px-1 bg-surface-muted rounded text-micro normal-case text-ink-muted">
                {versionCount}
              </span>
            </button>
          )}
          {!isEditing && content && <ExportMenu content={content} title={title ?? 'Plan'} />}
          {!isEditing && !readOnly && (
            <>
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-meta font-semibold text-ink-muted hover:text-ink hover:bg-surface-muted transition-colors border border-transparent"
                title="Edit directly"
              >
                <Pencil className="w-3 h-3" />
                Edit
              </button>
              <button
                onClick={onAskAiFocus}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-meta font-semibold text-brand hover:text-brand-hover hover:bg-brand-subtle transition-colors border border-transparent"
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
                className="flex items-center gap-1 px-3 py-2 rounded-xl text-meta font-semibold text-ink-muted hover:bg-surface-muted transition-colors"
              >
                <XCircle className="w-3 h-3" />
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="flex items-center gap-1 px-3 py-2 rounded-xl text-meta font-semibold bg-brand text-white hover:bg-brand-hover transition-colors"
              >
                <Save className="w-3 h-3" />
                Save
              </button>
            </>
          )}
        </div>
      </div>

      {isEditing && hasUnsavedChanges && (
        <div className="px-5 py-3 bg-warning-bg border-b border-warning-border text-meta font-semibold text-warning leading-relaxed">
          You have unsaved edits. Save them before sending a chat message if you want the next AI reply to use the updated draft.
        </div>
      )}

      {publishedIsStale && !readOnly && (
        <div className="px-5 py-3 border-t border-warning-border bg-warning-bg/60 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <Clock className="w-4 h-4 text-warning shrink-0" />
            <p className="text-meta text-warning leading-snug">
              A newer draft is available. Publish it to keep your team up to date.
            </p>
          </div>
          {onPublishLatest && (
            <button
              onClick={onPublishLatest}
              className="px-3 py-1.5 rounded-lg bg-warning text-white text-meta font-semibold hover:opacity-90 transition-opacity active:scale-95 shrink-0"
            >
              Publish latest
            </button>
          )}
        </div>
      )}

      {(isExpanded || isEditing) && content && (
        <div className="max-h-[60vh] overflow-y-auto scroll-smooth bg-canvas">
          {isEditing ? (
            <div className="rounded-2xl border border-line bg-surface shadow-sm overflow-hidden">
              <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-line bg-surface-muted/60">
                <div>
                  <p className="text-micro text-ink-muted">Revision draft</p>
                  <p className="text-meta text-ink-muted mt-1">
                    Edit the markdown directly. Use clear headings, short sections, and readable bullets.
                  </p>
                </div>
                <div className="text-micro text-ink-subtle shrink-0">Markdown editor</div>
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
                className="w-full min-h-[280px] max-h-[600px] bg-surface px-6 py-6 text-body text-ink font-mono resize-none focus:outline-none leading-7"
              />
            </div>
          ) : (
            <div className="rounded-2xl border border-line bg-surface shadow-sm">
              <div className="px-6 py-4">
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
