'use client'

import { useCallback, useState } from 'react'
import { useKanbanStore } from '@/lib/storage/kanbanStore'

interface UseProjectReportAgentArgs {
  projectId: string
}

type ReportState = 'idle' | 'generating' | 'done' | 'error'

export function useProjectReportAgent({ projectId }: UseProjectReportAgentArgs) {
  const tasks = useKanbanStore((s) => s.tasks)
  const projects = useKanbanStore((s) => s.projects)
  const updateProject = useKanbanStore((s) => s.updateProject)
  const addTokenUsage = useKanbanStore((s) => s.addTokenUsage)

  const [state, setState] = useState<ReportState>('idle')
  const [error, setError] = useState<string | null>(null)

  const project = projects.find((p) => p.id === projectId)
  const projectTasks = tasks.filter((t) => t.projectId === projectId && !t.deletedAt)
  const allDone = projectTasks.length > 0 && projectTasks.every((t) => t.status === 'DONE')

  const generate = useCallback(async () => {
    if (!project) return
    const doneTasks = projectTasks.filter((t) => t.status === 'DONE' && t.finalDraft)
    if (doneTasks.length === 0) return

    setState('generating')
    setError(null)

    const taskSummaries = doneTasks
      .map((t, i) => `### Task ${i + 1}: ${t.title}\n\n${t.finalDraft}`)
      .join('\n\n---\n\n')

    const systemPrompt = `You are a senior project summarizer. Given the completed deliverables from every task in a project, write a single cohesive **Project Final Report** in Markdown.

Structure:
1. **Executive Summary** — 2–3 sentences on what was accomplished.
2. **Key Deliverables** — bullet list, one line per task output.
3. **Highlights & Insights** — notable decisions, patterns, or findings across tasks.
4. **Next Steps / Recommendations** — optional forward-looking suggestions.

Rules:
- Be specific; cite actual content from the task drafts.
- Keep total length under 600 words.
- Return only the Markdown report — no preamble or meta-commentary.`

    const userMessage = `Project: **${project.name}**
${project.description ? `Description: ${project.description}\n` : ''}
Here are the completed task deliverables:

${taskSummaries}

Write the Project Final Report now.`

    try {
      const res = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'chat',
          systemPromptOverride: systemPrompt,
          messages: [{ role: 'user', content: userMessage }],
        }),
      })

      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`)

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let report = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        for (const line of chunk.split('\n')) {
          if (!line.startsWith('data: ')) continue
          const raw = line.slice(6).trim()
          if (raw === '[DONE]') break
          try {
            const parsed = JSON.parse(raw)
            if (parsed.type === 'delta' && parsed.text) {
              report += parsed.text
            } else if (parsed.type === 'complete') {
              if (parsed.text) report = parsed.text
              if (parsed.usage) {
                addTokenUsage(projectId, {
                  input: parsed.usage.inputTokens ?? 0,
                  output: parsed.usage.outputTokens ?? 0,
                })
              }
            }
          } catch {
            // non-JSON line — skip
          }
        }
      }

      if (!report.trim()) throw new Error('Empty report from AI')
      updateProject(projectId, { finalReport: report.trim() })
      setState('done')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error')
      setState('error')
    }
  }, [project, projectTasks, projectId, updateProject, addTokenUsage])

  return {
    state,
    error,
    allDone,
    existingReport: project?.finalReport ?? null,
    generate,
    reset: () => { setState('idle'); setError(null) },
  }
}
