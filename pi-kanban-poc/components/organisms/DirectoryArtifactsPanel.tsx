'use client'

import { useMemo, useState } from 'react'
import {
  FileText,
  CheckCircle2,
  Sparkles,
  Download,
  Copy,
  Check,
  ChevronRight,
  ChevronDown,
  Search,
  FolderOpen,
  ScrollText,
} from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useKanbanStore } from '@/lib/storage/kanbanStore'

export function DirectoryArtifactsPanel() {
  const projects = useKanbanStore((s) => s.projects)
  const planningThreads = useKanbanStore((s) => s.planningThreads)
  const visionVersions = useKanbanStore((s) => s.visionVersions)
  const tasks = useKanbanStore((s) => s.tasks)
  const subtasks = useKanbanStore((s) => s.subtasks)

  const [openProjectIds, setOpenProjectIds] = useState<Set<string>>(() => new Set())
  const [artifactSearch, setArtifactSearch] = useState('')

  const projectReports = useMemo(
    () => projects.filter((p) => p.finalReport),
    [projects],
  )

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

  const expandAll = () => setOpenProjectIds(new Set(filteredTree.map((e) => e.project.id)))
  const collapseAll = () => setOpenProjectIds(new Set())
  const totalItems = filteredTree.reduce((acc, p) => acc + p.totalArtifacts, 0)

  if (tree.filter((e) => e.totalArtifacts > 0).length === 0 && projectReports.length === 0) {
    return (
      <section className="rounded-2xl bg-surface border border-line shadow-card p-10 text-center">
        <Sparkles className="w-7 h-7 mx-auto text-ink-subtle/40 mb-3" />
        <p className="text-sm font-semibold text-ink mb-1">No artifacts yet</p>
        <p className="text-xs text-ink-muted max-w-sm mx-auto leading-relaxed">
          As you plan projects and run tasks, the AI's outputs will collect here so you can find them later.
        </p>
      </section>
    )
  }

  return (
    <section className="space-y-3">
      {/* Toolbar */}
      <div className="flex items-center gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-subtle pointer-events-none" />
          <input
            type="text"
            value={artifactSearch}
            onChange={(e) => setArtifactSearch(e.target.value)}
            placeholder="Search artifacts by title or content..."
            className="w-full h-10 pl-9 pr-4 rounded-xl border border-line bg-surface text-sm text-ink placeholder:text-ink-subtle focus:outline-none focus:ring-2 focus:ring-brand/40"
          />
        </div>
        <div className="flex items-center gap-1.5 text-meta text-ink-muted">
          <span className="font-semibold text-ink">{totalItems}</span> items
          <span className="text-line-strong mx-1">·</span>
          <button onClick={expandAll} className="hover:text-ink transition-colors">Expand all</button>
          <span className="text-line-strong">·</span>
          <button onClick={collapseAll} className="hover:text-ink transition-colors">Collapse all</button>
        </div>
      </div>

      {/* Project Reports section */}
      {projectReports.length > 0 && !artifactSearch.trim() && (
        <div>
          <div className="flex items-center gap-2 mb-2.5">
            <ScrollText className="w-3.5 h-3.5 text-brand" />
            <span className="text-meta font-semibold text-ink-muted">Project Reports</span>
            <span className="text-meta text-ink-subtle">· {projectReports.length}</span>
          </div>
          <div className="space-y-1.5">
            {projectReports.map((p) => (
              <ArtifactItem
                key={p.id}
                title={`${p.name} — Final Report`}
                content={p.finalReport!}
                filename={`${slug(p.name)}-final-report.md`}
              />
            ))}
          </div>
        </div>
      )}

      {filteredTree.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-sm text-ink-subtle">No artifacts match your search.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {filteredTree.map(({ project, visions, deliverables }) => {
            const isOpen = openProjectIds.has(project.id) || artifactSearch.trim().length > 0
            const visCount = visions.length
            const delCount = deliverables.reduce((a, d) => a + d.subtasks.length, 0)
            const total = visCount + delCount

            return (
              <li key={project.id} className="rounded-2xl border border-line bg-surface shadow-card overflow-hidden">
                {/* Project header */}
                <button
                  onClick={() => toggle(project.id)}
                  className="w-full px-4 py-3.5 flex items-center gap-3 text-left hover:bg-surface-muted/70 transition-colors"
                >
                  <span className="text-ink-subtle shrink-0">
                    {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </span>
                  <FolderOpen className="w-4 h-4 text-brand shrink-0" />
                  <span className="text-sm font-semibold text-ink flex-1 truncate">
                    {project.name}
                  </span>
                  <span className="text-meta text-ink-subtle shrink-0">
                    {total} item{total === 1 ? '' : 's'}
                  </span>
                </button>

                {isOpen && (
                  <div className="border-t border-line px-4 py-4 space-y-5">
                    {/* Planning artifacts */}
                    {visions.length > 0 && (
                      <ArtifactGroup
                        label="Planning"
                        icon={<FileText className="w-3.5 h-3.5 text-brand/60" />}
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
                            <div key={task.id} className="space-y-1.5">
                              {/* Task sub-header */}
                              <div className="flex items-center gap-2 py-1">
                                <div className="h-px flex-1 bg-line" />
                                <span className="text-meta text-ink-muted shrink-0 px-1">
                                  {task.title}
                                </span>
                                <div className="h-px flex-1 bg-line" />
                              </div>
                              {subs.map((sub) => (
                                <ArtifactItem
                                  key={sub.id}
                                  title={sub.title}
                                  content={sub.doerResult?.artifact ?? sub.output ?? '(empty)'}
                                  filename={`${slug(project.name)}-${slug(task.title)}-${slug(sub.title)}.md`}
                                />
                              ))}
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
      <div className="flex items-center gap-2 mb-2.5">
        {icon}
        <span className="text-meta font-semibold text-ink-muted">{label}</span>
        <span className="text-meta text-ink-subtle">· {count}</span>
      </div>
      <div className="space-y-1.5">{children}</div>
    </div>
  )
}

interface ArtifactItemProps {
  title: string
  content: string
  filename: string
}

function ArtifactItem({ title, content, filename }: ArtifactItemProps) {
  const [expanded, setExpanded] = useState(false)
  const [copied, setCopied] = useState(false)

  // Preview: skip blank lines, show first 3 non-empty lines
  const meaningfulLines = content.split('\n').filter((l) => l.trim().length > 0)
  const previewText = meaningfulLines.slice(0, 3).join('\n')
  const isLong = meaningfulLines.length > 3

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
      // fallback
    }
  }

  return (
    <div className="rounded-xl border border-line bg-surface hover:border-line-strong hover:shadow-card transition-all overflow-hidden">
      {/* Title row — always visible */}
      <div className="flex items-center justify-between gap-2 px-4 py-3">
        <p className="text-sm font-semibold text-ink leading-snug flex-1 min-w-0">{title}</p>
        <div className="flex items-center gap-0.5 shrink-0">
          {isLong && (
            <button
              onClick={() => setExpanded((v) => !v)}
              className="text-micro font-semibold normal-case text-brand px-2 py-1 rounded-lg hover:bg-brand-subtle transition-colors"
            >
              {expanded ? 'Collapse' : 'View'}
            </button>
          )}
          <button
            onClick={handleCopy}
            title="Copy to clipboard"
            className="p-1.5 rounded-lg text-ink-subtle hover:text-success hover:bg-success-bg transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={handleDownload}
            title="Download as Markdown"
            className="p-1.5 rounded-lg text-ink-subtle hover:text-brand hover:bg-brand-subtle transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Content area — separated visually from title */}
      <div
        className={`border-t border-line bg-surface-muted/50 px-4 pt-3 pb-4 ${
          expanded ? 'max-h-[420px] overflow-y-auto' : ''
        }`}
      >
        <div className="prose prose-sm max-w-none
          [&_h1]:text-base [&_h1]:font-bold [&_h1]:text-ink [&_h1]:mt-0 [&_h1]:mb-2 [&_h1]:leading-snug
          [&_h2]:text-sm [&_h2]:font-semibold [&_h2]:text-ink [&_h2]:mt-4 [&_h2]:mb-1.5 [&_h2]:leading-snug
          [&_h3]:text-xs [&_h3]:font-semibold [&_h3]:text-ink-muted [&_h3]:mt-3 [&_h3]:mb-1 [&_h3]:uppercase [&_h3]:tracking-wide
          [&_p]:text-xs [&_p]:text-ink-muted [&_p]:leading-relaxed [&_p]:my-1
          [&_li]:text-xs [&_li]:text-ink-muted [&_li]:leading-relaxed [&_li]:my-0.5
          [&_ul]:my-1.5 [&_ol]:my-1.5
          [&_strong]:text-ink [&_strong]:font-semibold
        ">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {expanded ? content : previewText + (isLong ? '\n\n…' : '')}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  )
}

function slug(s: string): string {
  const normalized = s.normalize('NFD').replace(/[̀-ͯ]/g, '')
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
