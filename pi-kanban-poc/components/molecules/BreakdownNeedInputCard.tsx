'use client'

import { useMemo, useState } from 'react'
import { HelpCircle, Send, X } from 'lucide-react'

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
    <div className="mt-3 rounded-xl bg-warning-bg/60 border border-warning-border overflow-hidden">
      <div className="px-4 py-2.5 bg-warning-bg/80 border-b border-warning-border flex items-center gap-2">
        <HelpCircle className="w-3.5 h-3.5 text-warning" />
        <span className="text-meta font-semibold text-warning">AI needs one thing</span>
        <button
          onClick={(e) => {
            e.stopPropagation()
            onDismiss()
          }}
          className="ml-auto p-1 rounded-lg text-ink-subtle hover:text-ink-muted hover:bg-surface transition-colors"
          title="Dismiss"
        >
          <X className="w-3 h-3" />
        </button>
      </div>
      <div className="px-4 py-3">
        <p className="text-body text-warning leading-relaxed mb-3 font-semibold">{prompt}</p>

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
                className="px-2.5 py-1.5 rounded-lg bg-surface border border-warning-border text-meta font-semibold text-warning hover:bg-warning-bg transition-colors active:scale-95 disabled:opacity-40"
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
              className="px-2.5 py-1.5 rounded-lg text-meta font-semibold text-warning hover:bg-surface transition-colors disabled:opacity-40"
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
              className="flex-1 min-w-0 bg-surface border border-warning-border rounded-lg px-2.5 py-1.5 text-meta text-ink placeholder:text-ink-subtle focus:outline-none focus:border-warning"
            />
            <button
              onClick={(e) => {
                e.stopPropagation()
                submit(text)
              }}
              disabled={disabled || text.trim().length === 0}
              className="shrink-0 p-1.5 rounded-lg bg-warning text-white hover:opacity-90 transition-opacity active:scale-95 disabled:opacity-40"
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
            className="text-meta font-semibold text-ink-muted hover:text-ink underline disabled:opacity-40"
          >
            Skip — just guess
          </button>
        </div>
      </div>
    </div>
  )
}

function parseQuestion(question: string): { prompt: string; options: string[] } {
  const match = /Options:\s*(.+)$/i.exec(question)
  if (!match) return { prompt: question.trim(), options: [] }
  const prompt = question
    .slice(0, match.index)
    .trim()
    .replace(/[\s?:.]+$/, (m) => (m.includes('?') ? '?' : ''))
  const opts = match[1]
    .split(/\s*\/\s*|\s*\|\s*|\s*,\s*|\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
  return { prompt, options: opts }
}
