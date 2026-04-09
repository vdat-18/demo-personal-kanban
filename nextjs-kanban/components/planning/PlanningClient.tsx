'use client'

import { useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Send, Sparkles, CheckCircle2, ListTodo, Plus } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface Task {
  id: string
  title: string
  description: string | null
  status: string
  priority: string
}

interface Project {
  id: string
  name: string
  description: string | null
  tasks: Task[]
}

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export function PlanningClient({ project: initialProject }: { project: Project }) {
  const router = useRouter()
  const [project, setProject] = useState(initialProject)
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: `Welcome! I'm your AI Planning Agent for **${initialProject.name}**.\n\nTell me about your project goals and I'll help you break them down into actionable tasks. What would you like to accomplish?`,
    },
  ])
  const [input, setInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [report, setReport] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })

  const sendMessage = useCallback(async () => {
    if (!input.trim() || isStreaming) return
    const userMessage: ChatMessage = { role: 'user', content: input.trim() }
    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setIsStreaming(true)

    try {
      const res = await fetch('/api/agents/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: project.id,
          userMessage: userMessage.content,
        }),
      })

      const data = await res.json()
      const assistantContent = data.result || data.message || 'I received your message. Let me help you plan this out.'

      // Check for task suggestions in the response
      const taskMatches = assistantContent.match(/\d+\.\s+\*\*([^*]+)\*\*/g)
      if (taskMatches && taskMatches.length > 0) {
        setReport(assistantContent)
      }

      setMessages((prev) => [...prev, { role: 'assistant', content: assistantContent }])
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: "I'm having trouble connecting to the AI service. Please check your API configuration." },
      ])
    } finally {
      setIsStreaming(false)
      setTimeout(scrollToBottom, 100)
    }
  }, [input, isStreaming, project.id])

  const createTask = useCallback(async (title: string, description?: string) => {
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description, projectId: project.id }),
      })
      if (res.ok) {
        const task = await res.json()
        setProject((prev) => ({ ...prev, tasks: [...prev.tasks, task] }))
      }
    } catch (err) {
      console.error(err)
    }
  }, [project.id])

  return (
    <div className="flex h-full w-full bg-[#f8f9fa] font-sans">
      {/* Left: Chat Panel */}
      <div className="flex flex-col w-1/2 border-r border-gray-100 bg-white">
        {/* Header */}
        <header className="h-16 px-6 border-b border-gray-100 flex items-center gap-4 shrink-0">
          <button onClick={() => router.push('/')} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="font-bold text-sm text-[#0a192f]">{project.name}</h1>
            <p className="text-xs text-gray-400">AI Planning Session</p>
          </div>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'assistant' && (
                <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-black mr-3 shrink-0 mt-1">
                  AI
                </div>
              )}
              <div
                className={`max-w-[80%] rounded-3xl px-5 py-4 text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-[#0a192f] text-white rounded-br-lg'
                    : 'bg-gray-50 text-[#0a192f] rounded-bl-lg'
                }`}
              >
                {msg.role === 'assistant' ? (
                  <div className="prose prose-sm max-w-none">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                  </div>
                ) : (
                  msg.content
                )}
              </div>
            </div>
          ))}
          {isStreaming && (
            <div className="flex justify-start">
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-black mr-3 shrink-0">AI</div>
              <div className="bg-gray-50 rounded-3xl rounded-bl-lg px-5 py-4">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t border-gray-100">
          <div className="flex gap-3 items-end bg-gray-50 rounded-3xl px-5 py-3">
            <textarea
              className="flex-1 bg-transparent text-sm text-[#0a192f] placeholder:text-gray-300 resize-none outline-none min-h-[20px] max-h-32"
              placeholder="Describe your project goals..."
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
              }}
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || isStreaming}
              className="w-9 h-9 rounded-2xl bg-[#0a192f] text-white flex items-center justify-center hover:bg-blue-900 transition-colors disabled:opacity-30 shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Right: Tasks Panel */}
      <div className="flex flex-col w-1/2 overflow-y-auto">
        <div className="p-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <ListTodo className="w-5 h-5 text-blue-600" />
              <h2 className="font-black text-[#0a192f] text-lg">Tasks</h2>
              <span className="text-xs font-black text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full">{project.tasks.length}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  const title = window.prompt('Task title:')
                  if (title?.trim()) createTask(title)
                }}
                className="flex items-center gap-2 px-4 py-2 bg-[#0a192f] text-white rounded-xl text-sm font-semibold hover:bg-blue-900 transition-colors"
              >
                <Plus className="w-4 h-4" /> Add Task
              </button>
            </div>
          </div>

          {project.tasks.length === 0 ? (
            <div className="py-20 flex flex-col items-center justify-center border-4 border-dashed border-slate-100 rounded-[40px] bg-white/50">
              <Sparkles className="w-10 h-10 text-slate-200 mb-4" />
              <p className="text-sm font-black text-slate-300 uppercase tracking-widest text-center">
                Chat with the AI to generate tasks
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {project.tasks.map((task, idx) => (
                <div key={task.id} className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm flex items-start gap-4">
                  <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-xs font-black shrink-0">
                    {idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-[#0a192f] mb-1">{task.title}</p>
                    {task.description && <p className="text-xs text-gray-500">{task.description}</p>}
                  </div>
                  <CheckCircle2 className="w-5 h-5 text-gray-200 shrink-0" />
                </div>
              ))}
            </div>
          )}

          {project.tasks.length > 0 && (
            <div className="mt-8">
              <button
                onClick={() => router.push(`/mission-control/${project.id}`)}
                className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-3xl font-black text-sm uppercase tracking-widest hover:opacity-90 transition-opacity shadow-xl shadow-blue-500/20"
              >
                Start Execution →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
