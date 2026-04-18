'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, CheckCircle2, Download, Sparkles, BookOpen, AlertCircle, XCircle, CheckSquare, FileText, File, Edit2, Save, X, Wand2, Loader2 } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { UITaskStatus, SubtaskApprovalStatus } from '@/types/domain'

interface Conversation {
  id: string
  messages: Array<{ role: string; content: string }>
  result: string | null
  tokenUsage: unknown
  createdAt: string
}

interface Subtask {
  id: string
  title: string
  description: string | null
  completed: boolean
  approvalStatus: SubtaskApprovalStatus | null
  doerResult?: {
    summary: string
    artifact: string
    nextAction: string | null
  } | null
  reviewResult?: {
    summary: string
    findings: string[]
    recommendation: string | null
  } | null
}

interface Task {
  id: string
  title: string
  description: string | null
  status: UITaskStatus
  priority: string
  projectId: string | null
  conversations: Conversation[]
  subtasks?: Subtask[]
}

export interface SummaryTemplateProps {
  task: Task
}

function generateMarkdownReport(task: Task, approvedSubtasks: Subtask[], deniedSubtasks: Subtask[], pendingSubtasks: Subtask[]): string {
  let md = `# Task Summary Report: ${task.title}\n\n`
  md += `**Status:** ${task.status}  \n`
  md += `**Priority:** ${task.priority}  \n`
  if (task.description) md += `**Description:** ${task.description}\n\n`
  md += `---\n\n`
  
  if (approvedSubtasks.length > 0) {
    md += `## ✅ Completed Steps (${approvedSubtasks.length})\n\n`
    approvedSubtasks.forEach((sub, i) => {
      md += `### ${i + 1}. ${sub.title}\n`
      if (sub.description) md += `${sub.description}\n\n`
      if (sub.doerResult) {
        md += `**AI Output:**\n${sub.doerResult.summary}\n\n`
        if (sub.doerResult.artifact) {
          md += `**Details:**\n\`\`\`\n${sub.doerResult.artifact.slice(0, 500)}${sub.doerResult.artifact.length > 500 ? '...' : ''}\n\`\`\`\n\n`
        }
      }
      if (sub.reviewResult) {
        md += `**Review:** ${sub.reviewResult.summary}\n`
        if (sub.reviewResult.findings.length > 0) {
          md += `**Findings:**\n${sub.reviewResult.findings.map(f => `- ${f}`).join('\n')}\n\n`
        }
      }
      md += `---\n\n`
    })
  }
  
  if (deniedSubtasks.length > 0) {
    md += `## ❌ Denied Steps (${deniedSubtasks.length})\n\n`
    deniedSubtasks.forEach((sub) => {
      md += `- ${sub.title}${sub.description ? `: ${sub.description}` : ''}\n`
    })
    md += `\n---\n\n`
  }
  
  if (pendingSubtasks.length > 0) {
    md += `## ⏳ Pending Steps (${pendingSubtasks.length})\n\n`
    pendingSubtasks.forEach((sub) => {
      md += `- ${sub.title}${sub.description ? `: ${sub.description}` : ''}\n`
    })
    md += `\n`
  }
  
  return md
}

function generateHtmlReport(task: Task, approvedSubtasks: Subtask[], deniedSubtasks: Subtask[], pendingSubtasks: Subtask[]): string {
  const md = generateMarkdownReport(task, approvedSubtasks, deniedSubtasks, pendingSubtasks)
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Task Report: ${task.title}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 800px; margin: 40px auto; padding: 20px; line-height: 1.6; color: #333; }
    h1 { color: #0a192f; border-bottom: 2px solid #0a192f; padding-bottom: 10px; }
    h2 { color: #1a365d; margin-top: 30px; }
    h3 { color: #2c5282; }
    .status { display: inline-block; background: #c6f6d5; padding: 4px 12px; border-radius: 12px; font-size: 14px; font-weight: bold; }
    .approved { background: #c6f6d5; color: #22543d; }
    .denied { background: #fed7d7; color: #742a2a; }
    .pending { background: #e2e8f0; color: #4a5568; }
    code { background: #f7fafc; padding: 2px 6px; border-radius: 4px; }
    pre { background: #f7fafc; padding: 16px; border-radius: 8px; overflow-x: auto; }
    .meta { color: #718096; font-size: 14px; }
    hr { border: none; border-top: 1px solid #e2e8f0; margin: 30px 0; }
  </style>
</head>
<body>
  ${md.replace(/^### /gm, '<h3>').replace(/^## /gm, '<h2>').replace(/^# /gm, '<h1>').replace(/\n/g, '<br>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/^- /gm, '<li>').replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')}
</body>
</html>`
}

export function SummaryTemplate({ task }: SummaryTemplateProps) {
  const router = useRouter()
  const [isEditing, setIsEditing] = useState(false)
  const [editedTitle, setEditedTitle] = useState(task.title)
  const [editedDescription, setEditedDescription] = useState(task.description || '')
  const [isAILoading, setIsAILoading] = useState(false)
  const [aiPrompt, setAiPrompt] = useState('')
  const [showAIPanel, setShowAIPanel] = useState(false)

  const totalMessages = task.conversations.reduce((sum, c) => sum + (c.messages?.length || 0), 0)
  const lastResult = task.conversations.slice().reverse().find((c) => c.result)?.result

  const approvedSubtasks = task.subtasks?.filter(s => s.approvalStatus === 'approved') || []
  const deniedSubtasks = task.subtasks?.filter(s => s.approvalStatus === 'denied') || []
  const pendingSubtasks = task.subtasks?.filter(s => s.approvalStatus === 'pending') || []

  const handleDownloadPDF = () => {
    const html = generateHtmlReport(task, approvedSubtasks, deniedSubtasks, pendingSubtasks)
    const blob = new Blob([html], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${task.title.replace(/[^a-z0-9]/gi, '_')}_report.html`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleDownloadMarkdown = () => {
    const md = generateMarkdownReport(task, approvedSubtasks, deniedSubtasks, pendingSubtasks)
    const blob = new Blob([md], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${task.title.replace(/[^a-z0-9]/gi, '_')}_report.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleSaveEdit = () => {
    setIsEditing(false)
  }

  const handleAIEdit = async () => {
    if (!aiPrompt.trim()) return
    setIsAILoading(true)
    
    try {
      const response = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: 'general',
          message: `Based on the task "${task.title}", please ${aiPrompt}. Here is the current summary:\n\n${generateMarkdownReport(task, approvedSubtasks, deniedSubtasks, pendingSubtasks)}`,
          taskId: task.id,
        }),
      })
      
      const data = await response.json()
      if (data.result) {
        setEditedDescription(prev => prev + '\n\n---\n\n**AI Suggestion:**\n' + data.result)
      }
    } catch (error) {
      console.error('AI edit failed:', error)
    } finally {
      setIsAILoading(false)
      setAiPrompt('')
    }
  }

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
            {isEditing ? (
              <input
                type="text"
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target.value)}
                className="font-extrabold text-2xl text-[#0a192f] tracking-tight border-b-2 border-blue-500 focus:outline-none bg-transparent"
              />
            ) : (
              <h1 className="font-extrabold text-2xl text-[#0a192f] tracking-tight">{task.title}</h1>
            )}
            <div className="text-sm font-semibold text-gray-500 mt-1">
              {isEditing ? (
                <textarea
                  value={editedDescription}
                  onChange={(e) => setEditedDescription(e.target.value)}
                  className="w-full text-sm text-gray-500 mt-1 border rounded p-1"
                  rows={2}
                />
              ) : (
                <>"{task.description || 'No description'}"</>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {isEditing ? (
            <>
              <button
                onClick={handleSaveEdit}
                className="text-sm font-semibold text-white bg-green-600 hover:bg-green-700 px-5 py-2.5 rounded-xl transition-colors flex items-center gap-2"
              >
                <Save className="w-4 h-4" /> Save
              </button>
              <button
                onClick={() => setIsEditing(false)}
                className="text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 px-5 py-2.5 rounded-xl transition-colors flex items-center gap-2"
              >
                <X className="w-4 h-4" /> Cancel
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setIsEditing(true)}
                className="text-sm font-semibold text-[#0a192f] bg-gray-100 hover:bg-gray-200 px-5 py-2.5 rounded-xl transition-colors flex items-center gap-2"
              >
                <Edit2 className="w-4 h-4" /> Edit
              </button>
              <button
                onClick={() => setShowAIPanel(!showAIPanel)}
                className="text-sm font-semibold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 px-5 py-2.5 rounded-xl transition-colors flex items-center gap-2"
              >
                <Wand2 className="w-4 h-4" /> AI Assist
              </button>
              <div className="relative group">
                <button className="text-sm font-semibold text-[#0a192f] bg-gray-100 hover:bg-gray-200 px-5 py-2.5 rounded-xl transition-colors flex items-center gap-2">
                  <Download className="w-4 h-4" /> Download
                </button>
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-100 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-20">
                  <button
                    onClick={handleDownloadPDF}
                    className="w-full px-4 py-3 text-left text-sm hover:bg-gray-50 flex items-center gap-2 rounded-t-xl"
                  >
                    <FileText className="w-4 h-4" /> Download as HTML
                  </button>
                  <button
                    onClick={handleDownloadMarkdown}
                    className="w-full px-4 py-3 text-left text-sm hover:bg-gray-50 flex items-center gap-2 rounded-b-xl"
                  >
                    <File className="w-4 h-4" /> Download as Markdown
                  </button>
                </div>
              </div>
</>
          )}
        </div>
      </header>

      {/* AI Assist Panel */}
      {showAIPanel && (
        <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border-b border-purple-100 p-4">
          <div className="max-w-4xl mx-auto flex items-center gap-3">
            <Wand2 className="w-5 h-5 text-purple-600 shrink-0" />
            <input
              type="text"
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              placeholder="Ask AI to improve, shorten, expand, or reformat this report..."
              className="flex-1 px-4 py-2 rounded-xl border border-purple-200 focus:outline-none focus:border-purple-400 text-sm"
              onKeyDown={(e) => e.key === 'Enter' && handleAIEdit()}
            />
            <button
              onClick={handleAIEdit}
              disabled={isAILoading || !aiPrompt.trim()}
              className="px-4 py-2 bg-purple-600 text-white rounded-xl text-sm font-semibold hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isAILoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
              Generate
            </button>
          </div>
        </div>
      )}

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

        {/* Subtasks Report */}
        {task.subtasks && task.subtasks.length > 0 && (
          <section>
            <h2 className="text-sm font-bold tracking-widest text-gray-400 mb-6 uppercase flex items-center gap-2">
              <CheckSquare className="w-4 h-4" /> Subtasks Report
            </h2>
            
            {/* Approved Subtasks */}
            {approvedSubtasks.length > 0 && (
              <div className="bg-white rounded-3xl border border-green-100 shadow-sm overflow-hidden mb-6">
                <div className="px-6 py-4 bg-green-50 border-b border-green-100 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  <span className="text-xs font-black uppercase tracking-widest text-green-700">
                    Completed Steps ({approvedSubtasks.length})
                  </span>
                </div>
                <div className="divide-y divide-green-50">
                  {approvedSubtasks.map((sub) => (
                    <div key={sub.id} className="p-6">
                      <div className="flex items-start gap-3">
                        <span className="mt-0.5 text-green-600">✓</span>
                        <div className="flex-1">
                          <h4 className="text-sm font-bold text-[#0a192f]">{sub.title}</h4>
                          {sub.description && (
                            <p className="text-xs text-gray-500 mt-1">{sub.description}</p>
                          )}
                          {sub.doerResult && (
                            <div className="mt-3 p-3 bg-blue-50 rounded-xl border border-blue-100">
                              <div className="text-[10px] font-black uppercase tracking-wider text-blue-600 mb-1">
                                AI Output
                              </div>
                              <p className="text-xs text-blue-900 leading-relaxed">{sub.doerResult.summary}</p>
                              {sub.doerResult.artifact && (
                                <div className="mt-2 pt-2 border-t border-blue-100">
                                  <p className="text-[10px] text-blue-800 leading-relaxed whitespace-pre-wrap">{sub.doerResult.artifact.slice(0, 500)}{sub.doerResult.artifact.length > 500 ? '...' : ''}</p>
                                </div>
                              )}
                            </div>
                          )}
                          {sub.reviewResult && (
                            <div className="mt-3 p-3 bg-amber-50 rounded-xl border border-amber-100">
                              <div className="text-[10px] font-black uppercase tracking-wider text-amber-600 mb-1">
                                Review Result
                              </div>
                              <p className="text-xs text-amber-900 leading-relaxed">{sub.reviewResult.summary}</p>
                              {sub.reviewResult.findings.length > 0 && (
                                <ul className="mt-2 text-xs text-amber-800 space-y-1">
                                  {sub.reviewResult.findings.map((f, i) => (
                                    <li key={i}>• {f}</li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          )}
                        </div>
                        <span className="text-xs font-bold text-green-600 bg-green-100 px-2 py-1 rounded-lg">
                          DONE
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Denied Subtasks */}
            {deniedSubtasks.length > 0 && (
              <div className="bg-white rounded-3xl border border-red-100 shadow-sm overflow-hidden mb-6">
                <div className="px-6 py-4 bg-red-50 border-b border-red-100 flex items-center gap-2">
                  <XCircle className="w-4 h-4 text-red-600" />
                  <span className="text-xs font-black uppercase tracking-widest text-red-700">
                    Denied Steps ({deniedSubtasks.length})
                  </span>
                </div>
                <div className="divide-y divide-red-50">
                  {deniedSubtasks.map((sub) => (
                    <div key={sub.id} className="p-6">
                      <div className="flex items-start gap-3">
                        <span className="mt-0.5 text-red-600">✗</span>
                        <div className="flex-1">
                          <h4 className="text-sm font-bold text-[#0a192f]">{sub.title}</h4>
                          {sub.description && (
                            <p className="text-xs text-gray-500 mt-1">{sub.description}</p>
                          )}
                        </div>
                        <span className="text-xs font-bold text-red-600 bg-red-100 px-2 py-1 rounded-lg">
                          DENIED
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Pending Subtasks */}
            {pendingSubtasks.length > 0 && (
              <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-6 py-4 bg-gray-50 border-b border-gray-100 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-gray-400" />
                  <span className="text-xs font-black uppercase tracking-widest text-gray-500">
                    Pending Steps ({pendingSubtasks.length})
                  </span>
                </div>
                <div className="divide-y divide-gray-50">
                  {pendingSubtasks.map((sub) => (
                    <div key={sub.id} className="p-6">
                      <div className="flex items-start gap-3">
                        <span className="mt-0.5 text-gray-400">☐</span>
                        <div className="flex-1">
                          <h4 className="text-sm font-bold text-[#0a192f]">{sub.title}</h4>
                          {sub.description && (
                            <p className="text-xs text-gray-500 mt-1">{sub.description}</p>
                          )}
                        </div>
                        <span className="text-xs font-bold text-gray-500 bg-gray-100 px-2 py-1 rounded-lg">
                          PENDING
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        {/* Stats */}
        <section className="grid grid-cols-4 gap-6">
          {[
            { label: 'Total Steps', value: task.subtasks?.length || 0, color: 'text-[#0a192f]' },
            { label: 'Approved', value: approvedSubtasks.length, color: 'text-green-600' },
            { label: 'Denied', value: deniedSubtasks.length, color: 'text-red-600' },
            { label: 'Messages', value: totalMessages, color: 'text-blue-600' },
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
