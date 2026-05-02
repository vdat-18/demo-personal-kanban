'use client'

import { useState, useCallback } from 'react'
import { useI18n } from '@/lib/i18n/context'
import { Check, Lightbulb, Pencil, Undo2 } from 'lucide-react'
import type {
  StructuredQuestion,
  QuestionAnswer,
  QuestionBatchSubmission,
} from '@/types/domain'

interface BatchQuestionCardProps {
  questions: StructuredQuestion[]
  /** Previously submitted answers if this card has already been answered. */
  previousSubmission?: QuestionBatchSubmission | null
  onSubmit: (submission: QuestionBatchSubmission) => void
  /**
   * Optional resubmit handler. When provided, the card exposes an "Edit
   * answers" button after submission so the user can revise and send an
   * updated batch. The parent is responsible for creating a new user
   * message that supersedes the previous one (see PlanningClient
   * handleResubmitBatch).
   */
  onResubmit?: (submission: QuestionBatchSubmission) => void
  disabled?: boolean
}

/**
 * Renders a batch of questions as a form-like card inside an assistant message.
 *
 * UX (Tier 1.2 + 1.3):
 *   - One card groups multiple questions so the user answers them all at once.
 *   - Each question renders the right input type (text, chips, chips+text).
 *   - "Skip all" sends skipped=true for every question; "Submit answers"
 *     sends only the ones the user filled.
 *   - After submission the card becomes read-only and shows what was sent,
 *     so the user can glance back at their answers later.
 *   - If the parent wires `onResubmit`, the user can click "Edit answers"
 *     to re-open the form with previous values pre-filled, tweak, and send
 *     an updated submission. We DO NOT try to rewrite message history — the
 *     parent posts a new user message with the updated batch so conversation
 *     chronology stays intact.
 */
export function BatchQuestionCard({
  questions,
  previousSubmission,
  onSubmit,
  onResubmit,
  disabled,
}: BatchQuestionCardProps) {
  const submitted = previousSubmission != null
  const { t } = useI18n()
  // editingMode lets the user unlock a submitted card, change answers, and
  // send them again. Defaults to false so the existing read-only UX is
  // preserved for anyone who hasn't wired `onResubmit`.
  const [editingMode, setEditingMode] = useState(false)

  const initial = useCallback(
    (q: StructuredQuestion): { selections: string[]; text: string } => {
      const prev = previousSubmission?.answers.find((a) => a.questionId === q.id)
      if (!prev || prev.skipped) return { selections: [], text: '' }
      const ans = prev.answer ?? ''
      if (q.inputType === 'chip_multi') {
        return { selections: ans.split(' | '), text: '' }
      }
      if (q.inputType === 'chip_single' && q.suggestions?.includes(ans)) {
        return { selections: [ans], text: '' }
      }
      if (q.inputType === 'chip_plus_text') {
        const [head, ...rest] = ans.split(' — ')
        if (q.suggestions?.includes(head)) {
          return { selections: [head], text: rest.join(' — ') }
        }
      }
      return { selections: [], text: ans }
    },
    [previousSubmission],
  )

  const [state, setState] = useState<Record<string, { selections: string[]; text: string }>>(
    () => Object.fromEntries(questions.map((q) => [q.id, initial(q)])),
  )

  const setForQuestion = (
    id: string,
    patch: Partial<{ selections: string[]; text: string }>,
  ) => {
    setState((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }))
  }

  const buildAnswer = (q: StructuredQuestion): QuestionAnswer => {
    const s = state[q.id] ?? { selections: [], text: '' }
    const hasSelections = s.selections.length > 0
    const hasText = s.text.trim().length > 0
    if (!hasSelections && !hasText) {
      return { questionId: q.id, answer: null, skipped: true }
    }
    let answer: string
    if (q.inputType === 'chip_multi') {
      answer = s.selections.join(' | ')
      if (hasText) answer = answer.length > 0 ? `${answer} | ${s.text.trim()}` : s.text.trim()
    } else if (q.inputType === 'chip_plus_text' && hasSelections && hasText) {
      answer = `${s.selections[0]} — ${s.text.trim()}`
    } else if (hasSelections) {
      answer = s.selections[0]
    } else {
      answer = s.text.trim()
    }
    return { questionId: q.id, answer, skipped: false }
  }

  const handleSubmit = (skipAll: boolean) => {
    const answers = skipAll
      ? questions.map((q) => ({ questionId: q.id, answer: null, skipped: true }))
      : questions.map(buildAnswer)
    const submission: QuestionBatchSubmission = {
      questions,
      answers,
      submittedAt: new Date().toISOString(),
    }
    // If we're editing an already-submitted batch, route through onResubmit
    // so the parent can create a NEW "revised answers" user message instead
    // of silently mutating history.
    if (editingMode && submitted && onResubmit) {
      onResubmit(submission)
      setEditingMode(false)
    } else {
      onSubmit(submission)
    }
  }

  const handleCancelEdit = () => {
    // Revert to the last persisted values and exit editing.
    setState(Object.fromEntries(questions.map((q) => [q.id, initial(q)])))
    setEditingMode(false)
  }

  const isReadOnly = submitted && !editingMode
  const inputsDisabled = isReadOnly || disabled

  return (
    <div className="mt-3 rounded-3xl border border-blue-100 bg-blue-50/30 overflow-hidden">
      <div className="px-5 py-3 bg-blue-50/60 border-b border-blue-100 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Lightbulb className="w-3.5 h-3.5 text-blue-500" />
          <span className="text-[10px] font-black text-blue-700 uppercase tracking-[0.15em]">
            {isReadOnly
              ? t('batchQuestion.yourAnswers', 'Your answers')
              : editingMode
              ? t('batchQuestion.editingAnswers', 'Editing answers')
              : t('batchQuestion.fillBlanks', `Fill in ${questions.length} quick blanks`).replace('{n}', String(questions.length))}
          </span>
        </div>
        {isReadOnly && onResubmit && (
          <button
            type="button"
            onClick={() => setEditingMode(true)}
            disabled={disabled}
            title="Edit and resubmit"
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/70 hover:bg-white text-blue-700 text-[10px] font-bold uppercase tracking-wider border border-blue-100 transition-colors disabled:opacity-40"
          >
            <Pencil className="w-3 h-3" />
            {t('batchQuestion.edit', 'Edit')}
          </button>
        )}
      </div>
      <div className="p-5 space-y-4">
        {questions.map((q, idx) => {
          const s = state[q.id] ?? { selections: [], text: '' }
          return (
            <QuestionRow
              key={q.id}
              idx={idx}
              question={q}
              selections={s.selections}
              text={s.text}
              disabled={inputsDisabled}
              onSelectionsChange={(sel) => setForQuestion(q.id, { selections: sel })}
              onTextChange={(txt) => setForQuestion(q.id, { text: txt })}
            />
          )
        })}
      </div>
      {!isReadOnly && (
        <div className="px-5 pb-4 flex items-center justify-between gap-3">
          {editingMode ? (
            <button
              type="button"
              onClick={handleCancelEdit}
              disabled={disabled}
              className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 font-semibold px-3 py-2 rounded-xl hover:bg-white/60 transition-colors disabled:opacity-40"
            >
              <Undo2 className="w-3 h-3" />
              {t('batchQuestion.cancel', 'Cancel')}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => handleSubmit(true)}
              disabled={disabled}
              className="text-xs text-slate-500 hover:text-slate-700 font-semibold px-3 py-2 rounded-xl hover:bg-white/60 transition-colors disabled:opacity-40"
            >
              {t('batchQuestion.skipAll', 'Skip all')}
            </button>
          )}
          <button
            type="button"
            onClick={() => handleSubmit(false)}
            disabled={disabled}
            className="flex items-center gap-1.5 px-5 py-2.5 rounded-2xl bg-blue-600 text-white text-xs font-black uppercase tracking-wider hover:bg-blue-700 transition-colors disabled:opacity-40 shadow-md shadow-blue-500/20"
          >
            {editingMode ? t('batchQuestion.resubmit', 'Resubmit') : t('batchQuestion.submitAnswers', 'Submit answers')}
            <Check className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Row ─────────────────────────────────────────────────────────────────────

interface QuestionRowProps {
  idx: number
  question: StructuredQuestion
  selections: string[]
  text: string
  disabled?: boolean
  onSelectionsChange: (sel: string[]) => void
  onTextChange: (txt: string) => void
}

function QuestionRow({
  idx,
  question,
  selections,
  text,
  disabled,
  onSelectionsChange,
  onTextChange,
}: QuestionRowProps) {
  const showChips =
    (question.inputType === 'chip_single'
      || question.inputType === 'chip_multi'
      || question.inputType === 'chip_plus_text')
    && Array.isArray(question.suggestions)
    && question.suggestions.length > 0

  const showText =
    question.inputType === 'text'
    || question.inputType === 'chip_plus_text'
    || (showChips && selections.length === 0)

  const toggleChip = (chip: string) => {
    if (disabled) return
    if (question.inputType === 'chip_multi') {
      if (selections.includes(chip)) {
        onSelectionsChange(selections.filter((s) => s !== chip))
      } else {
        onSelectionsChange([...selections, chip])
      }
    } else {
      // single / plus_text
      onSelectionsChange(selections.includes(chip) ? [] : [chip])
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-100 px-4 py-3 shadow-sm">
      <div className="flex items-start gap-2.5 mb-2">
        <span className="shrink-0 w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-black flex items-center justify-center mt-0.5">
          {idx + 1}
        </span>
        <span className="text-sm font-semibold text-[#0a192f] leading-snug">
          {question.text}
          {question.required && <span className="text-rose-500 ml-1">*</span>}
        </span>
      </div>

      {showChips && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {question.suggestions!.map((chip) => {
            const selected = selections.includes(chip)
            return (
              <button
                key={chip}
                type="button"
                onClick={() => toggleChip(chip)}
                disabled={disabled}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all active:scale-95 disabled:cursor-not-allowed ${
                  selected
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-100'
                }`}
              >
                {selected && <Check className="inline w-3 h-3 mr-1 -mt-0.5" />}
                {chip}
              </button>
            )
          })}
        </div>
      )}

      {showText && (
        <input
          type="text"
          value={text}
          onChange={(e) => onTextChange(e.target.value)}
          placeholder={question.hint ?? 'Enter your answer…'}
          disabled={disabled}
          className="mt-2 w-full bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-sm text-[#0a192f] placeholder:text-slate-400 focus:outline-none focus:border-blue-300 focus:bg-white transition-colors disabled:opacity-60"
        />
      )}

      {question.hint && !showText && (
        <p className="mt-1.5 text-[11px] text-slate-400 italic">💡 {question.hint}</p>
      )}
    </div>
  )
}
