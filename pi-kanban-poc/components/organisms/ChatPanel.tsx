'use client'

import { useState, useRef, useEffect } from 'react'
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
  topPanel?: React.ReactNode
  messages: ChatMsg[]
  input: string
  onInputChange: (value: string) => void
  onSend: () => void
  activeAgentIdx: number
  onAgentChange: (idx: number) => void
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
  taskProjectId,
  topPanel,
  messages,
  input,
  onInputChange,
  onSend,
  activeAgentIdx,
  onAgentChange,
  isStreaming,
  streamingContent,
  streamError,
  progressEvents,
  onAbort,
  onBack,
  onViewSummary,
  isDone,
}: ChatPanelProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const activeOption = AGENT_OPTIONS[activeAgentIdx]

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isStreaming])

  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    const maxHeight = 128 // max-h-32 = 8rem = 128px
    el.style.height = `${Math.min(el.scrollHeight, maxHeight)}px`
    el.style.overflowY = el.scrollHeight > maxHeight ? 'auto' : 'hidden'
  }, [input])

  return (
    <div className="flex flex-col flex-1 border-r border-gray-100 bg-white min-w-0">
      {/* Header */}
      <header className="h-16 px-6 border-b border-gray-100 flex items-center gap-4 shrink-0">
        <button
          onClick={onBack}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="font-bold text-sm text-[#0a192f] truncate">{taskTitle}</h1>
          <div className="flex items-center gap-2 mt-0.5">
            <span
              className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest ${STATUS_COLORS_COMPACT[taskStatus]}`}
            >
              {taskStatus}
            </span>
            <AgentBadge agentType={activeOption.label} size="sm" />
            {isStreaming && (
              <span className="text-[9px] font-black text-blue-500 uppercase tracking-widest animate-pulse">
                streaming...
              </span>
            )}
          </div>
        </div>
        {isDone && onViewSummary && (
          <button
            onClick={onViewSummary}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-xl text-xs font-bold hover:bg-green-700 transition-colors shrink-0"
          >
            <FileText className="w-4 h-4" /> Summary
          </button>
        )}
      </header>

      {/* Agent selector */}
      <AgentSelector
        activeIndex={activeAgentIdx}
        onSelect={onAgentChange}
        disabled={isStreaming}
      />

      {/* Optional task-specific panel (e.g. TODO step planning) */}
      {topPanel && <div className="px-6 pt-4 shrink-0">{topPanel}</div>}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.map((msg, i) => (
          <ChatMessageBubble key={i} role={msg.role} content={msg.content} />
        ))}

        {/* Live streaming bubble */}
        {isStreaming && (
          <div className="flex justify-start">
            <AiAvatar className="mr-3 mt-1" />
            <div className="bg-gray-50 rounded-3xl rounded-bl-lg px-5 py-4 flex flex-col gap-2 max-w-[80%]">
              {streamingContent ? (
                <div className="prose prose-sm max-w-none text-[#0a192f]">
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

        {/* Stream error banner */}
        {streamError && !isStreaming && (
          <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-100 rounded-2xl text-xs text-red-600 font-medium">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{streamError}</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input bar */}
      <div className="p-4 border-t border-gray-100 shrink-0">
        <div className="flex gap-3 items-end bg-gray-50 rounded-3xl px-5 py-3">
          <textarea
            ref={textareaRef}
            className="flex-1 bg-transparent text-sm text-[#0a192f] placeholder:text-gray-300 resize-none outline-none min-h-[20px]"
            style={{ overflowY: 'hidden' }}
            placeholder={`Ask ${activeOption.label}...`}
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
              className="w-9 h-9 rounded-2xl bg-red-500 text-white flex items-center justify-center hover:bg-red-600 transition-colors shrink-0"
              title="Stop streaming"
            >
              <StopCircle className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={onSend}
              disabled={!input.trim()}
              className="w-9 h-9 rounded-2xl bg-[#0a192f] text-white flex items-center justify-center hover:bg-blue-900 transition-colors disabled:opacity-30 shrink-0"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z"/><path d="m21.854 2.147-10.94 10.939"/></svg>
            </button>
          )}
        </div>
        <p className="text-[10px] text-gray-300 mt-2 px-2 font-medium">
          Press Enter to send · Shift+Enter for new line
        </p>
      </div>
    </div>
  )
}
