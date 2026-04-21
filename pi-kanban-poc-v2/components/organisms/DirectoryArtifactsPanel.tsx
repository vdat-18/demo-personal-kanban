'use client'

import { useMemo, useState } from 'react'
import {
  Folder,
  FolderOpen,
  FileText,
  CheckCircle2,
  Sparkles,
  Download,
  Copy,
  Check,
  ChevronRight,
  ChevronDown,
  Search,
} from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useKanbanStore } from '@/lib/storage/kanbanStore'

/**
 * Directory artifacts panel.
 *
 * Surfaces every artifact produced during a project:
 *   - Planning vision documents (current + revisions)
 *   - Subtask doer results (Deliverables)
 *   - Subtask reviewer feedback
 *
 * Features:
 *   - Search across all artifact content + titles
 *   - Expand/collapse per project (auto-expands on search)
 *   - Copy to clipboard + Download as .md
 *   - Fix slug for non-latin filenames (Vietnamese etc.)
 */
export function DirectoryArtifactsPanel() {
  const projects = useKanbanStore((s) => s.projects)
  const planningThreads = useKanbanStore((s) => s.planningThreads)
  const visionVersions = useKanbanStore((s) => s.visionVersions)
  const tasks = useKanbanStore((s) => s.tasks)
  const subtasks = useKanbanStore((s) => s.subtasks)

  const [openProjectIds, setOpenProjectIds] = useState<Set<string>>(() => new Set())
  const [artifactSearch, setArtifactSearch] = useState('')

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

  const filteredTree = useMemo(() => {
    const all = tree.filter((entry) => entry.totalArtifacts > 0)
    if (!artifactSearch.trim()) return all
    const q = artifactSearch.toLowerCase()
    return all
      .map((entry) => ({
        ...entry,
        visions: entry.visions.filter(
          (v) =>
            v.content.toLowerCase().includes(q) ||
            entry.project.name.toLowerCase().includes(q),
        ),
        deliverables: entry.deliverables.map((d) => ({
          ...d,
          subtasks: d.subtasks.filter(
            (s) =>
              s.title.toLowerCase().includes(q) ||
              (s.doerResult?.artifact ?? s.output ?? '').toLowerCase().includes(q) ||
              d.task.title.toLowerCase().includes(q),
          ),
        })),
      }))
      .filter(
        (entry) =>
          entry.visions.length > 0 ||
          entry.deliverables.some((d) => d.subtasks.length > 0),
      )
  }, [tree, artifactSearch])

  const toggle = (id: string) => {
    setOpenProjectIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const expandAll = () => {
    setOpenProjectIds(new Set(filteredTree.map((e) => e.project.id)))
  }

  const collapseAll = () => {
    setOpenProjectIds(new Set())
  }

  const totalItems = filteredTree.reduce((acc, p) => acc + p.totalArtifacts, 0)

  if (tree.filter((e) => e.totalArtifacts > 0).length === 0) {
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
    <section className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={artifactSearch}
            onChange={(e) => setArtifactSearch(e.target.value)}
            placeholder="Search artifacts by title or content..."
            className="w-full h-10 pl-9 pr-4 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider bg-blue-50 px-2 py-1 rounded-full border border-blue-100">
            {totalItems} items
          </span>
          <button
            onClick={expandAll}
            className="text-xs font-semibold text-slate-500 hover:text-slate-700 px-2 py-1 rounded-lg hover:bg-slate-100 transition-colors"
          >
            Expand all
          </button>
          <button
            onClick={collapseAll}
            className="text-xs font-semibold text-slate-500 hover:text-slate-700 px-2 py-1 rounded-lg hover:bg-slate-100 transition-colors"
          >
            Collapse all
          </button>
        </div>
      </div>

      {filteredTree.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-sm font-bold text-gray-300">No artifacts match your search.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {filteredTree.map(({ project, visions, deliverables }) => {
            const isOpen = openProjectIds.has(project.id) || artifactSearch.trim().length > 0
            const visCount = visions.length
            const delCount = deliverables.reduce((a, d) => a + d.subtasks.length, 0)
            const total = visCount + delCount

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
                    {total} item{total === 1 ? '' : 's'}
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
                              <div className="text-[11px] font-bold text-slate-600 tracking-wide border-b border-slate-200 pb-1.5 mb-2">
                                📋 {task.title}
                              </div>
                              {subs.map((sub) => {
                                const body = sub.doerResult?.artifact ?? sub.output ?? '(empty)'
                                const review = sub.reviewResult
                                const reviewerNotes = review
                                  ? [
                                      review.summary,
                                      review.findings.length > 0
                                        ? `\nFindings:\n- ${review.findings.join('\n- ')}`
                                        : '',
                                      review.recommendation
                                        ? `\nRecommendation: ${review.recommendation}`
                                        : '',
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
      )}
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
  const [copied, setCopied] = useState(false)
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

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // fallback: select text
    }
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
              className="text-[10px] font-bold text-blue-600 hover:underline px-1"
            >
              {expanded ? 'Collapse' : 'Expand'}
            </button>
          )}
          <button
            onClick={handleCopy}
            title="Copy to clipboard"
            className="p-1 rounded-md text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
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
        <div className="mt-2">
          <ReviewerNotesPanel notes={reviewerNotes} />
        </div>
      )}
    </div>
  )
}

function ReviewerNotesPanel({ notes }: { notes: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-amber-700 hover:bg-amber-100 transition-colors"
      >
        <span>Reviewer notes</span>
        {open ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
      </button>
      {open && (
        <div className="px-3 pb-2 text-xs text-amber-900 leading-relaxed whitespace-pre-wrap">
          {notes}
        </div>
      )}
    </div>
  )
}

/** Converts any string (including Vietnamese) to a safe filename slug */
function slug(s: string): string {
  const normalized = s.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  return normalized
    .toLowerCase()
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40) || 'item'
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
