'use client'

import { useMemo, useState } from 'react'
import { HelpCircle, Send, X } from 'lucide-react'

/**
 * Clarification bubble (Tier 2.8). When the agent returns
 *   { needsHumanInput: { question: "..." } }
 * this renders a compact form inline on the task card so the user can answer
 * without leaving the board.
 *
 * Answer resolution:
 *   1. If the question text ends with "Options: A / B / C", we parse A/B/C as
 *      chip choices and render them as click-to-pick (no typing needed).
 *   2. Otherwise (or after clicking "Type my own"), we show a freeform textarea.
 *   3. "Skip — just guess" sends a sentinel so the agent proceeds without the
 *      missing info and flags the caveat in taskUnderstanding.
 */

export interface BreakdownNeedInputCardProps {
  question: string
  onAnswer: (answer: string) => void
  onSkip: () => void
  onDismiss: () => void
  disabled?: boolean
}

export function BreakdownNeedInputCard({
  question,
  onAnswer,
  onSkip,
  onDismiss,
  disabled,
}: BreakdownNeedInputCardProps) {
  const [freeformMode, setFreeformMode] = useState(false)
  const [text, setText] = useState('')

  const { prompt, options } = useMemo(() => parseQuestion(question), [question])
  const hasOptions = options.length > 0

  const submit = (answer: string) => {
    const trimmed = answer.trim()
    if (trimmed.length === 0) return
    onAnswer(trimmed)
  }

  return (
    <div className="mt-3 rounded-2xl bg-indigo-50/60 border border-indigo-100 overflow-hidden">
      <div className="px-4 py-2.5 bg-indigo-50/80 border-b border-indigo-100 flex items-center gap-2">
        <HelpCircle className="w-3.5 h-3.5 text-indigo-600" />
        <span className="text-[10px] font-black text-indigo-700 uppercase tracking-[0.15em]">
          AI needs one thing
        </span>
        <button
          onClick={(e) => {
            e.stopPropagation()
            onDismiss()
          }}
          className="ml-auto p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-white/60 transition-colors"
          title="Dismiss"
        >
          <X className="w-3 h-3" />
        </button>
      </div>
      <div className="px-4 py-3">
        <p className="text-xs text-indigo-900 leading-relaxed mb-3 font-semibold">
          {prompt}
        </p>

        {hasOptions && !freeformMode && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {options.map((opt) => (
              <button
                key={opt}
                onClick={(e) => {
                  e.stopPropagation()
                  if (disabled) return
                  submit(opt)
                }}
                disabled={disabled}
                className="px-2.5 py-1.5 rounded-xl bg-white border border-indigo-200 text-[11px] font-semibold text-indigo-700 hover:bg-indigo-100 transition-colors active:scale-95 disabled:opacity-40"
              >
                {opt}
              </button>
            ))}
            <button
              onClick={(e) => {
                e.stopPropagation()
                setFreeformMode(true)
              }}
              disabled={disabled}
              className="px-2.5 py-1.5 rounded-xl text-[11px] font-bold text-indigo-500 hover:bg-white/60 transition-colors disabled:opacity-40"
            >
              ✏️ Type my own
            </button>
          </div>
        )}

        {(!hasOptions || freeformMode) && (
          <div className="flex gap-1.5 items-stretch mb-2">
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                  e.preventDefault()
                  submit(text)
                }
              }}
              onClick={(e) => e.stopPropagation()}
              placeholder="Type your answer…"
              disabled={disabled}
              className="flex-1 min-w-0 bg-white border border-indigo-200 rounded-xl px-2.5 py-1.5 text-[11px] text-[#0a192f] placeholder:text-slate-400 focus:outline-none focus:border-indigo-400"
            />
            <button
              onClick={(e) => {
                e.stopPropagation()
                submit(text)
              }}
              disabled={disabled || text.trim().length === 0}
              className="shrink-0 p-1.5 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition-colors active:scale-95 disabled:opacity-40"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        <div className="flex items-center justify-end">
          <button
            onClick={(e) => {
              e.stopPropagation()
              onSkip()
            }}
            disabled={disabled}
            className="text-[10px] font-bold text-slate-500 hover:text-slate-700 underline disabled:opacity-40"
          >
            Skip — just guess
          </button>
        </div>
      </div>
    </div>
  )
}

/**
 * Parse "Question here? Options: A / B / C" → { prompt, options }.
 * When no "Options:" marker is present, returns the raw question with empty
 * options (triggers freeform input).
 */
function parseQuestion(question: string): { prompt: string; options: string[] } {
  const match = /Options:\s*(.+)$/i.exec(question)
  if (!match) return { prompt: question.trim(), options: [] }
  const prompt = question.slice(0, match.index).trim().replace(/[\s?:.]+$/, (m) => m.includes('?') ? '?' : '')
  // Split on "/" or "|" or newlines. Strip surrounding whitespace.
  const opts = match[1]
    .split(/\s*\/\s*|\s*\|\s*|\s*,\s*|\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
  return { prompt, options: opts }
}
