'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft, CheckCircle2, Download, Sparkles, BookOpen, AlertCircle } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { UITaskStatus } from '@/types/domain'

interface Conversation {
  id: string
  messages: Array<{ role: string; content: string }>
  result: string | null
  tokenUsage: unknown
  createdAt: string
}

interface Task {
  id: string
  title: string
  description: string | null
  status: UITaskStatus
  priority: string
  projectId: string | null
  conversations: Conversation[]
}

export interface SummaryTemplateProps {
  task: Task
}

export function SummaryTemplate({ task }: SummaryTemplateProps) {
  const router = useRouter()

  const totalMessages = task.conversations.reduce((sum, c) => sum + (c.messages?.length || 0), 0)
  const completedConvs = task.conversations.filter((c) => c.result).length
  const lastResult = task.conversations.slice().reverse().find((c) => c.result)?.result

  return (
    <div className="flex flex-col h-full w-full bg-[#f8f9fa] overflow-y-auto font-sans">
      {/* Header */}
      <header className="h-20 px-10 border-b border-gray-100 bg-white flex items-center justify-between shrink-0 shadow-sm sticky top-0 z-10">
        <div className="flex items-center gap-6">
          <button
            onClick={() => task.projectId ? router.push(`/mission-control/${task.projectId}`) : router.push('/')}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500 hover:text-black"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="font-extrabold text-2xl text-[#0a192f] tracking-tight">Task Summary Report</h1>
            <div className="text-sm font-semibold text-gray-500 mt-1">&ldquo;{task.title}&rdquo;</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button className="text-sm font-semibold text-[#0a192f] bg-gray-100 hover:bg-gray-200 px-5 py-2.5 rounded-xl transition-colors flex items-center gap-2">
            <Download className="w-4 h-4" /> Download PDF
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto w-full p-10 py-12 flex flex-col gap-10">
        {/* Execution Summary */}
        <section className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-5">
            <CheckCircle2 className="w-40 h-40" />
          </div>
          <h2 className="text-sm font-bold tracking-widest text-green-600 mb-6 flex items-center gap-2 uppercase">
            <CheckCircle2 className="w-5 h-5" />
            {task.status === 'DONE' ? 'Execution Complete' : `Status: ${task.status}`}
          </h2>
          <div className="text-[#0a192f] text-lg font-medium leading-relaxed max-w-2xl relative z-10">
            {lastResult ? (
              <div className="prose prose-sm max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{lastResult}</ReactMarkdown>
              </div>
            ) : (
              <p className="text-gray-500">No AI-generated result yet. Complete the task chat to generate a summary.</p>
            )}
          </div>
        </section>

        {/* Stats */}
        <section className="grid grid-cols-3 gap-6">
          {[
            { label: 'Total Conversations', value: task.conversations.length, color: 'text-[#0a192f]' },
            { label: 'Messages Exchanged', value: totalMessages, color: 'text-blue-600' },
            { label: 'Completed Sessions', value: completedConvs, color: 'text-green-600' },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm text-center">
              <p className={`text-3xl font-black ${color} mb-1`}>{value}</p>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{label}</p>
            </div>
          ))}
        </section>

        {/* Conversation History */}
        {task.conversations.length > 0 && (
          <section>
            <h2 className="text-sm font-bold tracking-widest text-gray-400 mb-6 uppercase flex items-center gap-2">
              <BookOpen className="w-4 h-4" /> Conversation History
            </h2>
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
              {task.conversations.map((conv, i) => (
                <div key={conv.id} className="p-6 border-b border-gray-50 last:border-0">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Session {i + 1}</span>
                      {conv.result && <span className="w-2 h-2 rounded-full bg-green-400" />}
                    </div>
                    <span className="text-xs text-gray-400">{new Date(conv.createdAt).toLocaleString()}</span>
                  </div>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    {conv.messages.length} messages
                    {conv.result && ` — ${conv.result.slice(0, 120)}...`}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {task.conversations.length === 0 && (
          <div className="bg-white rounded-3xl p-10 border border-dashed border-gray-200 text-center">
            <AlertCircle className="w-10 h-10 text-gray-200 mx-auto mb-4" />
            <p className="text-sm font-bold text-gray-400">No conversations recorded yet.</p>
            <button
              onClick={() => router.push(`/chat/${task.id}`)}
              className="mt-4 px-6 py-3 bg-[#0a192f] text-white rounded-xl text-sm font-bold hover:bg-blue-900 transition-colors"
            >
              Start Task Chat
            </button>
          </div>
        )}

        {/* AI Insights placeholder */}
        <section className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl p-8 text-white relative overflow-hidden">
          <Sparkles className="absolute -top-4 -right-4 w-32 h-32 text-white/10 rotate-12" />
          <h2 className="font-black text-lg mb-2">AI Insights</h2>
          <p className="text-blue-100 text-sm leading-relaxed opacity-80">
            Task completed with {task.conversations.length} AI sessions. Priority: {task.priority}.
            {task.description && ` Original scope: ${task.description.slice(0, 100)}`}
          </p>
        </section>
      </main>
    </div>
  )
}
