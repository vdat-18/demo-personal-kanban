'use client'

import { useMemo, useState } from 'react'
import {
  Folder,
  FolderOpen,
  FileText,
  CheckCircle2,
  Sparkles,
  Download,
  ChevronRight,
  ChevronDown,
} from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useKanbanStore } from '@/lib/storage/kanbanStore'

/**
 * Directory artifacts panel (#7).
 *
 * Reframes Directory from "another view of projects+tasks" to a true
 * Knowledge Hub by surfacing every artifact produced during a project:
 *   - Planning vision documents (current + revisions)
 *   - Subtask doer results (Deliverables)
 *   - Subtask reviewer feedback
 *
 * Structure:
 *   📁 Project
 *     📋 Planning
 *        - Vision Document (current)
 *        - {N} historical revisions
 *     📦 Deliverables (per task)
 *        - artifact + reviewer notes
 *
 * Items are click-to-expand so the panel stays scannable for users with
 * many projects. Each artifact has a Download button (.md) so the user can
 * take their work elsewhere.
 */
export function DirectoryArtifactsPanel() {
  const projects = useKanbanStore((s) => s.projects)
  const planningThreads = useKanbanStore((s) => s.planningThreads)
  const visionVersions = useKanbanStore((s) => s.visionVersions)
  const tasks = useKanbanStore((s) => s.tasks)
  const subtasks = useKanbanStore((s) => s.subtasks)

  const [openProjectIds, setOpenProjectIds] = useState<Set<string>>(() => new Set())

  /**
   * For each project, gather the artifacts we know how to surface. Done as a
   * memo because the kanban store fires a lot of small updates and we don't
   * want to recompute on every keystroke elsewhere.
   */
  const tree = useMemo(() => {
    return projects.map((p) => {
      const projThreads = planningThreads.filter((t) => t.projectId === p.id)
      const projVisions = projThreads.flatMap((t) =>
        visionVersions.filter((v) => v.threadId === t.id),
      )
      const projTasks = tasks.filter((t) => t.projectId === p.id)
      const deliverables = projTasks.map((t) => {
        const taskSubs = subtasks.filter((s) => s.taskId === t.id)
        const finished = taskSubs.filter((s) => s.doerResult || s.output)
        return { task: t, subtasks: finished }
      })
      const totalArtifacts =
        projVisions.length + deliverables.reduce((acc, d) => acc + d.subtasks.length, 0)
      return { project: p, threads: projThreads, visions: projVisions, deliverables, totalArtifacts }
    })
  }, [projects, planningThreads, visionVersions, tasks, subtasks])

  const toggle = (id: string) => {
    setOpenProjectIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const projectsWithArtifacts = tree.filter((entry) => entry.totalArtifacts > 0)

  if (projectsWithArtifacts.length === 0) {
    return (
      <section className="rounded-2xl bg-white border border-slate-100 p-8 text-center">
        <Sparkles className="w-8 h-8 mx-auto text-slate-300 mb-2" />
        <p className="text-sm font-bold text-[#0a192f] mb-1">No artifacts yet</p>
        <p className="text-xs text-slate-500 max-w-sm mx-auto">
          As you plan projects and run tasks, the AI's outputs (plans, drafts, reports) will
          collect here so you can find them later.
        </p>
      </section>
    )
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FolderOpen className="w-4 h-4 text-blue-500" />
          <h2 className="text-base font-bold text-[#0a192f] tracking-tight">Artifacts</h2>
          <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
            {projectsWithArtifacts.reduce((acc, p) => acc + p.totalArtifacts, 0)} items
          </span>
        </div>
        <p className="text-[11px] text-slate-400">Plans, deliverables and review notes per project.</p>
      </div>

      <ul className="space-y-2">
        {projectsWithArtifacts.map(({ project, visions, deliverables, totalArtifacts }) => {
          const isOpen = openProjectIds.has(project.id)
          return (
            <li key={project.id} className="rounded-2xl border border-slate-100 bg-white overflow-hidden">
              <button
                onClick={() => toggle(project.id)}
                className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-slate-50 transition-colors"
              >
                <span className="text-slate-400">
                  {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </span>
                <Folder className="w-4 h-4 text-blue-500" />
                <span className="text-sm font-semibold text-[#0a192f] flex-1 truncate">
                  {project.name}
                </span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  {totalArtifacts} item{totalArtifacts === 1 ? '' : 's'}
                </span>
              </button>

              {isOpen && (
                <div className="border-t border-slate-100 p-4 space-y-4">
                  {/* Planning artifacts */}
                  {visions.length > 0 && (
                    <ArtifactGroup
                      label="Planning"
                      icon={<FileText className="w-3.5 h-3.5 text-indigo-500" />}
                      count={visions.length}
                    >
                      {visions
                        .slice()
                        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
                        .map((v, i) => (
                          <ArtifactItem
                            key={v.id}
                            title={i === 0 ? 'Vision Document (current)' : `Revision · ${formatDate(v.createdAt)}`}
                            content={v.content}
                            filename={`${slug(project.name)}-vision-v${visions.length - i}.md`}
                          />
                        ))}
                    </ArtifactGroup>
                  )}

                  {/* Deliverable artifacts */}
                  {deliverables.some((d) => d.subtasks.length > 0) && (
                    <ArtifactGroup
                      label="Deliverables"
                      icon={<CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
                      count={deliverables.reduce((a, d) => a + d.subtasks.length, 0)}
                    >
                      {deliverables.map(({ task, subtasks: subs }) =>
                        subs.length === 0 ? null : (
                          <div key={task.id} className="rounded-xl bg-slate-50/60 p-3 space-y-2">
                            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                              {task.title}
                            </div>
                            {subs.map((sub) => {
                              const body =
                                sub.doerResult?.artifact ?? sub.output ?? '(empty)'
                              const review = sub.reviewResult
                              const reviewerNotes = review
                                ? [
                                    review.summary,
                                    review.findings.length > 0 ? `\nFindings:\n- ${review.findings.join('\n- ')}` : '',
                                    review.recommendation ? `\nRecommendation: ${review.recommendation}` : '',
                                  ].join('')
                                : null
                              return (
                                <ArtifactItem
                                  key={sub.id}
                                  title={sub.title}
                                  content={body}
                                  filename={`${slug(project.name)}-${slug(task.title)}-${slug(sub.title)}.md`}
                                  reviewerNotes={reviewerNotes}
                                />
                              )
                            })}
                          </div>
                        ),
                      )}
                    </ArtifactGroup>
                  )}
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}

interface ArtifactGroupProps {
  label: string
  icon: React.ReactNode
  count: number
  children: React.ReactNode
}

function ArtifactGroup({ label, icon, count, children }: ArtifactGroupProps) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
          {label} · {count}
        </span>
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  )
}

interface ArtifactItemProps {
  title: string
  content: string
  filename: string
  reviewerNotes?: string | null
}

function ArtifactItem({ title, content, filename, reviewerNotes }: ArtifactItemProps) {
  const [expanded, setExpanded] = useState(false)
  const previewLines = content.split('\n').slice(0, 3).join('\n')
  const isLong = content.length > 200

  const handleDownload = () => {
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <div className="flex items-start justify-between gap-2 mb-1">
        <p className="text-sm font-semibold text-[#0a192f] leading-snug flex-1 min-w-0 truncate">
          {title}
        </p>
        <div className="flex items-center gap-1 shrink-0">
          {isLong && (
            <button
              onClick={() => setExpanded((v) => !v)}
              className="text-[10px] font-bold text-blue-600 hover:underline"
            >
              {expanded ? 'Collapse' : 'Expand'}
            </button>
          )}
          <button
            onClick={handleDownload}
            title="Download as Markdown"
            className="p-1 rounded-md text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      <div className="prose prose-xs max-w-none text-slate-700 text-xs leading-relaxed">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {expanded ? content : previewLines + (isLong && !expanded ? '\n…' : '')}
        </ReactMarkdown>
      </div>
      {reviewerNotes && (
        <details className="mt-2 text-xs">
          <summary className="cursor-pointer text-[10px] font-bold uppercase tracking-wider text-amber-600">
            Reviewer notes
          </summary>
          <div className="mt-1 p-2 rounded-lg bg-amber-50 text-amber-900 text-xs leading-relaxed">
            {reviewerNotes}
          </div>
        </details>
      )}
    </div>
  )
}

function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'item'
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}
