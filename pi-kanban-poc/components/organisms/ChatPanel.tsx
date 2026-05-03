'use client'

import { useRef, useEffect } from 'react'
import { ArrowLeft, FileText, AlertCircle, StopCircle } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { AgentBadge } from '@/components/molecules/AgentBadge'
import { AgentSelector, AGENT_OPTIONS } from '@/components/molecules/AgentSelector'
import { ChatMessageBubble } from '@/components/molecules/ChatMessageBubble'
import { StreamEventPill } from '@/components/molecules/StreamEventPill'
import { AiAvatar } from '@/components/atoms/AiAvatar'
import { TypingDots } from '@/components/atoms/TypingDots'
import type { UITaskStatus, ChatMsg } from '@/types/domain'
import { STATUS_COLORS_COMPACT } from '@/constants/status'
import type { StreamEvent } from '@/lib/hooks/useAgentStream'

export interface ChatPanelProps {
  taskTitle: string
  taskStatus: UITaskStatus
  taskProjectId: string | null
  scrollToPanelSignal?: number
  topPanel?: React.ReactNode
  messages: ChatMsg[]
  input: string
  onInputChange: (value: string) => void
  onSend: () => void
  activeAgentIdx: number
  onAgentChange: (idx: number) => void
  allowedAgentIndices?: number[]
  isStreaming: boolean
  streamingContent: string
  streamError: string | null
  progressEvents: StreamEvent[]
  onAbort: () => void
  onBack: () => void
  onViewSummary?: () => void
  isDone: boolean
}

export function ChatPanel({
  taskTitle,
  taskStatus,
  topPanel,
  messages,
  input,
  onInputChange,
  onSend,
  activeAgentIdx,
  onAgentChange,
  allowedAgentIndices,
  isStreaming,
  streamingContent,
  streamError,
  progressEvents,
  onAbort,
  onBack,
  onViewSummary,
  isDone,
  scrollToPanelSignal,
}: ChatPanelProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const activeOption = AGENT_OPTIONS[activeAgentIdx]

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isStreaming])

  useEffect(() => {
    if (scrollToPanelSignal == null || scrollToPanelSignal === 0) return
    scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
  }, [scrollToPanelSignal])

  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    const maxHeight = 128
    el.style.height = `${Math.min(el.scrollHeight, maxHeight)}px`
    el.style.overflowY = el.scrollHeight > maxHeight ? 'auto' : 'hidden'
  }, [input])

  return (
    <div className="flex flex-col flex-1 border-r border-line bg-surface min-w-0">
      <header className="h-16 px-6 border-b border-line flex items-center gap-4 shrink-0">
        <button
          onClick={onBack}
          className="p-2 hover:bg-surface-muted rounded-xl transition-colors text-ink-muted"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-h2 text-ink truncate">{taskTitle}</h1>
          <div className="flex items-center gap-2 mt-0.5">
            <span
              className={`text-micro normal-case px-2 py-0.5 rounded-full ${STATUS_COLORS_COMPACT[taskStatus]}`}
            >
              {taskStatus.replace('_', ' ')}
            </span>
            <AgentBadge agentType={activeOption.label} size="sm" />
            {isStreaming && (
              <span className="text-micro normal-case text-brand animate-pulse">streaming…</span>
            )}
          </div>
        </div>
        {isDone && onViewSummary && (
          <button
            onClick={onViewSummary}
            className="flex items-center gap-2 px-4 py-2 bg-success text-white rounded-xl text-meta font-semibold hover:opacity-90 transition-opacity shrink-0"
          >
            <FileText className="w-4 h-4" /> Summary
          </button>
        )}
      </header>

      <AgentSelector
        activeIndex={activeAgentIdx}
        onSelect={onAgentChange}
        disabled={isStreaming}
        allowedIndices={allowedAgentIndices}
      />

      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto bg-canvas">
        {topPanel && <div className="px-6 pt-6">{topPanel}</div>}

        <div className="p-6 space-y-4">
          {messages.map((msg, i) => (
            <ChatMessageBubble key={i} role={msg.role} content={msg.content} />
          ))}

          {isStreaming && (
            <div className="flex justify-start">
              <AiAvatar className="mr-3 mt-1" />
              <div className="bg-surface border border-line rounded-2xl rounded-bl-md px-5 py-4 flex flex-col gap-2 max-w-[90%] shadow-card">
                {streamingContent ? (
                  <div className="ai-prose max-w-none">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{streamingContent}</ReactMarkdown>
                  </div>
                ) : (
                  <TypingDots />
                )}
                {progressEvents.length > 0 && (
                  <div className="flex flex-col gap-1 mt-1">
                    {progressEvents.map((ev, i) => (
                      <StreamEventPill key={i} event={ev} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {streamError && !isStreaming && (
            <div className="flex items-center gap-2 px-4 py-3 bg-danger-bg border border-danger-border rounded-xl text-meta text-danger">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{streamError}</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="p-4 border-t border-line shrink-0 bg-surface">
        <div className="flex gap-3 items-end bg-surface-muted rounded-2xl px-4 py-3 border border-line focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/15 transition-colors">
          <textarea
            ref={textareaRef}
            className="flex-1 bg-transparent text-body text-ink placeholder:text-ink-subtle resize-none outline-none min-h-[20px]"
            style={{ overflowY: 'hidden' }}
            placeholder={`Ask ${activeOption.label}…`}
            rows={1}
            value={input}
            onChange={(e) => onInputChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                onSend()
              }
            }}
            disabled={isStreaming}
          />
          {isStreaming ? (
            <button
              onClick={onAbort}
              className="w-9 h-9 rounded-xl bg-danger text-white flex items-center justify-center hover:opacity-90 transition-opacity shrink-0"
              title="Stop streaming"
            >
              <StopCircle className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={onSend}
              disabled={!input.trim()}
              className="w-9 h-9 rounded-xl bg-brand text-white flex items-center justify-center hover:bg-brand-hover transition-colors disabled:opacity-30 shrink-0 shadow-sm"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z" />
                <path d="m21.854 2.147-10.94 10.939" />
              </svg>
            </button>
          )}
        </div>
        <p className="text-meta text-ink-subtle mt-2 px-2">
          Press Enter to send · Shift+Enter for new line
        </p>
      </div>
    </div>
  )
}
