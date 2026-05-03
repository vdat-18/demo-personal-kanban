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
    <div className="mt-3 rounded-2xl border border-brand-border bg-surface overflow-hidden shadow-card">
      <div className="px-5 py-4 bg-brand-subtle border-b border-brand-border flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-surface border border-brand-border flex items-center justify-center shadow-sm shrink-0">
            <Lightbulb className="w-4 h-4 text-brand" />
          </div>
          <div>
            <p className="text-meta font-semibold text-brand leading-none">
              {isReadOnly
                ? t('batchQuestion.yourAnswers', 'Your answers')
                : editingMode
                ? t('batchQuestion.editingAnswers', 'Editing answers')
                : t('batchQuestion.quickQuestions', 'A few quick questions')}
            </p>
            {!isReadOnly && (
              <p className="text-meta text-ink-subtle mt-1 leading-none">
                {questions.length} questions — pick or type your answer
              </p>
            )}
          </div>
        </div>
        {isReadOnly && onResubmit && (
          <button
            type="button"
            onClick={() => setEditingMode(true)}
            disabled={disabled}
            title="Edit and resubmit"
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-surface hover:bg-brand-subtle text-brand text-micro normal-case border border-brand-border transition-colors disabled:opacity-40 shadow-sm font-semibold"
          >
            <Pencil className="w-3 h-3" />
            {t('batchQuestion.edit', 'Edit')}
          </button>
        )}
      </div>
      <div className="p-5 space-y-3">
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
              className="inline-flex items-center gap-1 text-meta text-ink-muted hover:text-ink font-semibold px-3 py-2 rounded-xl hover:bg-surface-muted transition-colors disabled:opacity-40"
            >
              <Undo2 className="w-3 h-3" />
              {t('batchQuestion.cancel', 'Cancel')}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => handleSubmit(true)}
              disabled={disabled}
              className="text-meta text-ink-muted hover:text-ink font-semibold px-3 py-2 rounded-xl hover:bg-surface-muted transition-colors disabled:opacity-40"
            >
              {t('batchQuestion.skipAll', 'Skip all')}
            </button>
          )}
          <button
            type="button"
            onClick={() => handleSubmit(false)}
            disabled={disabled}
            className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-brand text-white text-meta font-semibold hover:bg-brand-hover transition-colors disabled:opacity-40 shadow-card"
          >
            {editingMode
              ? t('batchQuestion.resubmit', 'Send updated answers')
              : t('batchQuestion.submitAnswers', 'Submit answers')}
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
    <div className="bg-surface rounded-xl border border-line px-4 py-3 shadow-card">
      <div className="flex items-start gap-2.5 mb-2">
        <span className="shrink-0 w-5 h-5 rounded-full bg-brand text-white text-micro font-bold flex items-center justify-center mt-0.5">
          {idx + 1}
        </span>
        <span className="text-body font-semibold text-ink leading-snug">
          {question.text}
          {question.required && <span className="text-danger ml-1">*</span>}
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
                className={`px-3 py-1.5 rounded-xl text-meta font-semibold transition-all active:scale-95 disabled:cursor-not-allowed ${
                  selected
                    ? 'bg-brand text-white shadow-card'
                    : 'bg-brand-subtle text-brand border border-brand-border hover:bg-brand hover:text-white'
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
          className="mt-2 w-full bg-surface border border-line-strong rounded-xl px-3 py-2 text-body text-ink placeholder:text-ink-subtle focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/10 transition-colors disabled:opacity-60"
        />
      )}

      {question.hint && !showText && (
        <p className="mt-1.5 text-meta text-ink-subtle italic">💡 {question.hint}</p>
      )}
    </div>
  )
}
