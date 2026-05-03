'use client'

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { AiAvatar } from '@/components/atoms/AiAvatar'
import { TaskMutationCard } from './TaskMutationCard'
import type { MutationCardStatus } from './TaskMutationCard'
import { parseTaskMutations } from '@/lib/utils/parseTaskMutations'
import type { TaskMutation } from '@/lib/utils/parseTaskMutations'

export interface PlanningMessageBubbleProps {
  id: string
  threadId: string
  role: 'user' | 'assistant'
  content: string
  mutationActions?: Array<{ mutationIndex: number; action: string }>
  onApproveMutation: (mutation: TaskMutation) => Promise<void>
  onPersistMutationAction: (threadId: string, messageId: string, mutationIndex: number, action: string) => Promise<void>
}

export function PlanningMessageBubble({
  id,
  threadId,
  role,
  content,
  mutationActions,
  onApproveMutation,
  onPersistMutationAction,
}: PlanningMessageBubbleProps) {
  const parsed = role === 'assistant' ? parseTaskMutations(content) : null
  const displayContent = parsed?.cleanContent ?? content
  const mutations = parsed?.mutations ?? []

  return (
    <div className={`flex ${role === 'user' ? 'justify-end' : 'justify-start'}`}>
      {role === 'assistant' && <AiAvatar className="mr-3 mt-1" />}
      <div
        className={`max-w-[80%] rounded-2xl px-5 py-4 text-body leading-relaxed ${
          role === 'user'
            ? 'bg-brand text-white rounded-br-md'
            : 'bg-surface-muted text-ink rounded-bl-md border border-line'
        }`}
      >
        {role === 'assistant' ? (
          <>
            <div className="prose prose-sm max-w-none">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{displayContent}</ReactMarkdown>
            </div>
            {mutations.length > 0 && (
              <div className="mt-3 space-y-2">
                {mutations.map((mutation, idx) => {
                  const savedAction = mutationActions?.find((a) => a.mutationIndex === idx)
                  const initialStatus: MutationCardStatus = savedAction
                    ? (savedAction.action as MutationCardStatus)
                    : 'pending'

                  return (
                    <TaskMutationCard
                      key={idx}
                      mutation={mutation}
                      initialStatus={initialStatus}
                      onApprove={onApproveMutation}
                      onDismiss={() => {}}
                      onPersistAction={async (action) => {
                        await onPersistMutationAction(threadId, id, idx, action)
                      }}
                    />
                  )
                })}
              </div>
            )}
          </>
        ) : (
          content
        )}
      </div>
    </div>
  )
}
