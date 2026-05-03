'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Send, Square, Sparkles, Trash2 } from 'lucide-react'
import { useAgentStream } from '@/lib/hooks/useAgentStream'
import { useStoreHydrated } from '@/lib/storage/kanbanStore'

const STORAGE_KEY = '__home_chat_messages__'

interface ChatMsg {
  role: 'user' | 'assistant'
  content: string
}

const WELCOME: ChatMsg = {
  role: 'assistant',
  content:
    'Hi! I\'m your AI assistant.\n\nYou can ask me anything related to your work — planning, breaking down projects, writing content, analyzing problems, or just thinking out loud. I\'ll help you get clarity before you dive in.',
}

function loadMessages(): ChatMsg[] {
  if (typeof window === 'undefined') return [WELCOME]
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return [WELCOME]
    const parsed = JSON.parse(raw) as ChatMsg[]
    return parsed.length > 0 ? parsed : [WELCOME]
  } catch {
    return [WELCOME]
  }
}

function saveMessages(msgs: ChatMsg[]) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(msgs))
  } catch {
    // localStorage quota exceeded — silently drop
  }
}

export default function HomeChatPage() {
  const router = useRouter()
  const hydrated = useStoreHydrated()
  const [messages, setMessages] = useState<ChatMsg[]>([WELCOME])
  const [input, setInput] = useState('')
  const [loaded, setLoaded] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Load from localStorage after hydration
  useEffect(() => {
    if (!hydrated || loaded) return
    setMessages(loadMessages())
    setLoaded(true)
  }, [hydrated, loaded])

  // Persist whenever messages change
  useEffect(() => {
    if (!loaded) return
    saveMessages(messages)
  }, [messages, loaded])

  // Auto-scroll to bottom on new message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const { startStream, abort, isStreaming, streamingContent } = useAgentStream({
    onComplete: (result) => {
      setMessages((prev) => [...prev, { role: 'assistant', content: result }])
    },
    onError: (err) => {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: `⚠️ ${err}` },
      ])
    },
  })

  const send = useCallback(async () => {
    const text = input.trim()
    if (!text || isStreaming) return
    setInput('')
    const userMsg: ChatMsg = { role: 'user', content: text }
    setMessages((prev) => [...prev, userMsg])
    const history = [...messages, userMsg].map((m) => ({ role: m.role, content: m.content }))
    // Pass __home__ as taskId — the hook will find no task, sending no task context, which is correct here
    await startStream('chat', text, '__home__', history.slice(0, -1))
  }, [input, isStreaming, messages, startStream])

  const clearChat = useCallback(() => {
    setMessages([WELCOME])
  }, [])

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`
  }, [input])

  if (!hydrated || !loaded) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-slate-400">
        Loading…
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-3 border-b border-slate-100 shrink-0">
        <button
          onClick={() => router.push('/')}
          className="p-2 rounded-xl text-slate-400 hover:text-ink hover:bg-slate-100 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Sparkles className="w-4 h-4 text-blue-500 shrink-0" />
          <span className="text-sm font-bold text-ink truncate">AI Assistant</span>
          <span className="text-meta text-slate-400 font-medium ml-1">· No project needed</span>
        </div>
        <button
          onClick={clearChat}
          className="p-2 rounded-xl text-slate-400 hover:text-danger hover:bg-danger-bg transition-colors"
          title="Clear chat history"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        {messages.map((msg, i) => (
          <MessageBubble key={i} msg={msg} />
        ))}

        {/* Streaming bubble */}
        {isStreaming && streamingContent && (
          <MessageBubble msg={{ role: 'assistant', content: streamingContent }} streaming />
        )}
        {isStreaming && !streamingContent && (
          <div className="flex gap-3">
            <div className="w-7 h-7 rounded-xl bg-blue-500 flex items-center justify-center shrink-0 mt-0.5">
              <Sparkles className="w-3.5 h-3.5 text-white" />
            </div>
            <div className="flex items-center gap-1.5 px-4 py-3 bg-slate-50 rounded-2xl rounded-tl-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:0ms]" />
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:150ms]" />
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:300ms]" />
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="shrink-0 px-5 py-4 border-t border-slate-100 bg-white">
        <div className="flex items-end gap-3 bg-slate-50 rounded-2xl px-4 py-3 border border-slate-200 focus-within:border-blue-400 transition-colors">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                void send()
              }
            }}
            placeholder="Ask anything about your work…"
            rows={1}
            className="flex-1 bg-transparent text-sm text-ink placeholder:text-slate-400 focus:outline-none resize-none leading-relaxed"
          />
          {isStreaming ? (
            <button
              onClick={abort}
              className="shrink-0 w-8 h-8 rounded-xl bg-danger-bg0 text-white flex items-center justify-center hover:bg-danger transition-colors"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
            </button>
          ) : (
            <button
              onClick={() => void send()}
              disabled={!input.trim()}
              className="shrink-0 w-8 h-8 rounded-xl bg-ink text-white flex items-center justify-center hover:bg-blue-700 transition-colors disabled:opacity-30"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <p className="text-meta text-slate-400 mt-2 text-center">
          Enter to send · Shift+Enter for new line
        </p>
      </div>
    </div>
  )
}

function MessageBubble({ msg, streaming }: { msg: ChatMsg; streaming?: boolean }) {
  const isUser = msg.role === 'user'
  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      {!isUser && (
        <div className="w-7 h-7 rounded-xl bg-blue-500 flex items-center justify-center shrink-0 mt-0.5">
          <Sparkles className="w-3.5 h-3.5 text-white" />
        </div>
      )}
      <div
        className={`max-w-[78%] px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
          isUser
            ? 'bg-ink text-white rounded-tr-sm'
            : `bg-slate-50 text-ink rounded-tl-sm border border-slate-100 ${streaming ? 'animate-pulse' : ''}`
        }`}
      >
        {msg.content}
      </div>
    </div>
  )
}
