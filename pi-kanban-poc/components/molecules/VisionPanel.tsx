'use client'

import { useState, useEffect, useRef } from 'react'
import {
  FileText,
  Pencil,
  MessageCircle,
  Save,
  XCircle,
  Clock,
  Download,
  Copy,
  Check,
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
}

/**
 * Dual-mode vision document (Tier 1.4).
 *
 * - View mode: render markdown, with buttons to switch to direct-edit or to
 *   focus the chat input for AI-assisted revision.
 * - Edit mode: inline textarea. Saving creates a user_direct_edit version and
 *   sends a system note to the agent so the next turn is aware of the change.
 *
 * Conflict resolution (user edits AND chats simultaneously) is handled upstream
 * in PlanningClient — we just surface an "unsaved edits" hint here.
 */
export function VisionPanel({
  content,
  onSaveEdit,
  onAskAiFocus,
  onOpenHistory,
  versionCount,
  title,
  readOnly,
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
    <div className="mx-4 mb-3 rounded-3xl border border-blue-100 bg-blue-50/30 overflow-hidden shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 bg-blue-50/40 border-b border-blue-100">
        <button
          onClick={() => !isEditing && setIsExpanded((v) => !v)}
          disabled={isEditing}
          className="flex items-center gap-2.5 text-left hover:bg-white/40 p-1 -m-1 rounded-xl transition-all"
        >
          <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center">
            <FileText className="w-3.5 h-3.5 text-blue-600" />
          </div>
          <div className="flex items-center gap-2">
            <div>
              <div className="text-[10px] font-black text-blue-700 uppercase tracking-[0.15em]">
                {title ?? 'Your plan'}
              </div>
              {!isEditing && (
                <div className="text-[9px] text-blue-400 font-semibold">
                  {versionCount > 0 ? `${versionCount} revision${versionCount > 1 ? 's' : ''}` : 'Draft'}
                </div>
              )}
            </div>
            {!isEditing && (
              <div className="text-blue-300">
                {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </div>
            )}
          </div>
        </button>

        <div className="flex items-center gap-1">
          {!isEditing && versionCount > 0 && !readOnly && (
            <button
              onClick={onOpenHistory}
              className="p-1.5 rounded-lg text-blue-500 hover:text-blue-700 hover:bg-white/50 transition-colors"
              title="Version history"
            >
              <Clock className="w-3.5 h-3.5" />
            </button>
          )}
          {!isEditing && content && (
            <ExportMenu
              content={content}
              title={title ?? 'Plan'}
            />
          )}
          {!isEditing && !readOnly && (
            <>
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold text-blue-600 hover:text-blue-700 hover:bg-white/50 transition-colors"
                title="Edit directly"
              >
                <Pencil className="w-3 h-3" />
                Edit directly
              </button>
              <button
                onClick={onAskAiFocus}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold text-indigo-600 hover:text-indigo-700 hover:bg-white/50 transition-colors"
                title="Ask AI to revise"
              >
                <MessageCircle className="w-3 h-3" />
                Ask AI to revise
              </button>
            </>
          )}
          {isEditing && (
            <>
              <button
                onClick={handleCancel}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold text-slate-500 hover:bg-slate-100 transition-colors"
              >
                <XCircle className="w-3 h-3" />
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold bg-blue-600 text-white hover:bg-blue-700 transition-colors"
              >
                <Save className="w-3 h-3" />
                Save
              </button>
            </>
          )}
        </div>
      </div>

      {isEditing && hasUnsavedChanges && (
        <div className="px-5 py-2 bg-amber-50/80 border-b border-amber-100 text-[10px] font-semibold text-amber-700">
          ⚠️ You have unsaved edits. Save before sending a chat message.
        </div>
      )}

      {/* Content */}
      {(isExpanded || isEditing) && (
        <div 
          className="px-6 py-5 border-t border-blue-100 max-h-[450px] overflow-y-auto scroll-smooth"
        >
          {isEditing ? (
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
              className="w-full min-h-[200px] max-h-[600px] bg-white border border-blue-200 rounded-2xl p-4 text-sm text-[#0a192f] font-mono resize-none focus:outline-none focus:border-blue-400 leading-relaxed"
            />
          ) : (
            <div className="prose prose-sm max-w-none text-blue-900 prose-headings:text-blue-800 prose-strong:text-blue-900 text-justify">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{content ?? ''}</ReactMarkdown>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
