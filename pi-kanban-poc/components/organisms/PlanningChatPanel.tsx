'use client'

import React, { useRef, useEffect, useCallback } from 'react'
import { ArrowLeft, Send } from 'lucide-react'
import { AiAvatar } from '@/components/atoms/AiAvatar'
import { TypingDots } from '@/components/atoms/TypingDots'
import { PlanningMessageBubble } from '@/components/molecules/PlanningMessageBubble'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { PlanningMessage } from '@/lib/hooks/usePlanningMessages'
import type { TaskMutation } from '@/lib/utils/parseTaskMutations'

export interface PlanningChatPanelProps {
  projectName: string
  messages: PlanningMessage[]
  messagesLoading: boolean
  input: string
  onInputChange: (value: string) => void
  onSend: () => void
  isSending: boolean
  sendError: boolean
  activeThreadId: string | null
  onBack: () => void
  onApproveMutation: (mutation: TaskMutation) => Promise<void>
  onPersistMutationAction: (
    threadId: string,
    messageId: string,
    mutationIndex: number,
    action: string,
  ) => Promise<void>
}

export function PlanningChatPanel({
  projectName,
  messages,
  messagesLoading,
  input,
  onInputChange,
  onSend,
  isSending,
  sendError,
  activeThreadId,
  onBack,
  onApproveMutation,
  onPersistMutationAction,
}: PlanningChatPanelProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const showWelcome = !messagesLoading && messages.length === 0

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    const maxHeight = 192
    el.style.height = `${Math.min(el.scrollHeight, maxHeight)}px`
    el.style.overflowY = el.scrollHeight > maxHeight ? 'auto' : 'hidden'
  }, [input])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        onSend()
      }
    },
    [onSend],
  )

  return (
    <div className="flex flex-col flex-1 min-w-0 border-r border-line bg-surface">
      <header className="h-16 px-6 border-b border-line flex items-center gap-4 shrink-0">
        <button
          onClick={onBack}
          className="p-2 hover:bg-surface-muted rounded-xl transition-colors text-ink-muted hover:text-ink"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-h2 text-ink">{projectName}</h1>
          <p className="text-meta text-ink-subtle">AI planning session</p>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messagesLoading ? (
          <div className="flex justify-center py-12">
            <span className="w-6 h-6 border-2 border-line border-t-brand rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {showWelcome && (
              <div className="flex justify-start">
                <AiAvatar className="mr-3 mt-1" />
                <div className="max-w-[80%] rounded-2xl rounded-bl-sm px-5 py-4 text-body bg-surface-muted text-ink">
                  <div className="ai-prose max-w-none">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {`Welcome! I'm your AI planner for **${projectName}**.\n\nI can see all your project tasks. I'll suggest things to add, update, or remove as we chat.\n\nWhat would you like to plan?`}
                    </ReactMarkdown>
                  </div>
                </div>
              </div>
            )}

            {messages.map((msg: PlanningMessage) => (
              <PlanningMessageBubble
                key={msg.id}
                id={msg.id}
                threadId={msg.threadId}
                role={msg.role as 'user' | 'assistant'}
                content={msg.content}
                mutationActions={msg.mutationActions}
                onApproveMutation={onApproveMutation}
                onPersistMutationAction={onPersistMutationAction}
              />
            ))}

            {isSending && (
              <div className="flex justify-start">
                <AiAvatar className="mr-3" />
                <div className="bg-surface-muted rounded-2xl rounded-bl-sm px-5 py-4">
                  <TypingDots />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      <div className="p-4 border-t border-line">
        {sendError && (
          <div className="mb-2 px-4 py-2 bg-danger-bg border border-danger-border rounded-xl text-meta text-danger">
            Couldn&apos;t send your message. Please try again.
          </div>
        )}
        <div className="flex gap-3 items-end bg-surface-muted rounded-2xl px-5 py-3 border border-line focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/15 transition-colors">
          <textarea
            ref={textareaRef}
            className="flex-1 bg-transparent text-body text-ink placeholder:text-ink-subtle resize-none outline-none min-h-[20px]"
            style={{ overflowY: 'hidden' }}
            placeholder="Tell me about your project…"
            rows={1}
            value={input}
            onChange={(e) => onInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={!activeThreadId}
          />
          <button
            onClick={onSend}
            disabled={!input.trim() || isSending || !activeThreadId}
            className="w-9 h-9 rounded-xl bg-brand text-white flex items-center justify-center hover:bg-brand-hover transition-colors disabled:opacity-30 shrink-0 shadow-sm"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
