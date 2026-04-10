'use client'

import { useRef, useEffect } from 'react'
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
  onPersistMutationAction: (threadId: string, messageId: string, mutationIndex: number, action: string) => Promise<void>
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
  const showWelcome = !messagesLoading && messages.length === 0

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  return (
    <div className="flex flex-col flex-1 min-w-0 border-r border-gray-100 bg-white">
      {/* Header */}
      <header className="h-16 px-6 border-b border-gray-100 flex items-center gap-4 shrink-0">
        <button
          onClick={onBack}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="font-bold text-sm text-[#0a192f]">{projectName}</h1>
          <p className="text-xs text-gray-400">AI Planning Session</p>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messagesLoading ? (
          <div className="flex justify-center py-12">
            <span className="w-6 h-6 border-2 border-gray-200 border-t-blue-600 rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {showWelcome && (
              <div className="flex justify-start">
                <AiAvatar className="mr-3 mt-1" />
                <div className="max-w-[80%] rounded-3xl rounded-bl-lg px-5 py-4 text-sm leading-relaxed bg-gray-50 text-[#0a192f]">
                  <div className="prose prose-sm max-w-none">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {`Welcome! I'm your AI Planning Agent for **${projectName}**.\n\nI can see all your project tasks and help you manage them. I can suggest adding new tasks, updating existing ones, or removing completed ones.\n\nWhat would you like to plan?`}
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
                <div className="bg-gray-50 rounded-3xl rounded-bl-lg px-5 py-4">
                  <TypingDots />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-100">
        {sendError && (
          <div className="mb-2 px-4 py-2 bg-red-50 border border-red-100 rounded-xl text-xs text-red-600">
            Failed to send message. Please try again.
          </div>
        )}
        <div className="flex gap-3 items-end bg-gray-50 rounded-3xl px-5 py-3">
          <textarea
            className="flex-1 bg-transparent text-sm text-[#0a192f] placeholder:text-gray-300 resize-none outline-none min-h-[20px] max-h-32"
            placeholder="Describe your project goals..."
            rows={1}
            value={input}
            onChange={(e) => onInputChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                onSend()
              }
            }}
            disabled={!activeThreadId}
          />
          <button
            onClick={onSend}
            disabled={!input.trim() || isSending || !activeThreadId}
            className="w-9 h-9 rounded-2xl bg-[#0a192f] text-white flex items-center justify-center hover:bg-blue-900 transition-colors disabled:opacity-30 shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
