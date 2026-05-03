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
      <section className="rounded-2xl bg-white border border-slate-100 p-10 text-center">
        <Sparkles className="w-7 h-7 mx-auto text-slate-300 mb-3" />
        <p className="text-sm font-semibold text-[#0a192f] mb-1">No artifacts yet</p>
        <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
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
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={artifactSearch}
            onChange={(e) => setArtifactSearch(e.target.value)}
            placeholder="Search artifacts by title or content..."
            className="w-full h-10 pl-9 pr-4 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
          <span className="font-semibold text-slate-700">{totalItems}</span> items
          <span className="text-slate-300 mx-1">·</span>
          <button onClick={expandAll} className="hover:text-slate-700 transition-colors">Expand all</button>
          <span className="text-slate-300">·</span>
          <button onClick={collapseAll} className="hover:text-slate-700 transition-colors">Collapse all</button>
        </div>
      </div>

      {/* Project Reports section */}
      {projectReports.length > 0 && !artifactSearch.trim() && (
        <div>
          <div className="flex items-center gap-2 mb-2.5">
            <ScrollText className="w-3.5 h-3.5 text-violet-500" />
            <span className="text-[11px] font-semibold text-slate-600">Project Reports</span>
            <span className="text-[10px] text-slate-400">· {projectReports.length}</span>
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
          <p className="text-sm text-slate-400">No artifacts match your search.</p>
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
                {/* Project header */}
                <button
                  onClick={() => toggle(project.id)}
                  className="w-full px-4 py-3.5 flex items-center gap-3 text-left hover:bg-slate-50/70 transition-colors"
                >
                  <span className="text-slate-400 shrink-0">
                    {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </span>
                  <FolderOpen className="w-4 h-4 text-blue-500 shrink-0" />
                  <span className="text-sm font-semibold text-[#0a192f] flex-1 truncate">
                    {project.name}
                  </span>
                  <span className="text-[11px] text-slate-400 shrink-0">
                    {total} item{total === 1 ? '' : 's'}
                  </span>
                </button>

                {isOpen && (
                  <div className="border-t border-slate-100 px-4 py-4 space-y-5">
                    {/* Planning artifacts */}
                    {visions.length > 0 && (
                      <ArtifactGroup
                        label="Planning"
                        icon={<FileText className="w-3.5 h-3.5 text-indigo-400" />}
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
                                <div className="h-px flex-1 bg-slate-100" />
                                <span className="text-[11px] font-medium text-slate-500 shrink-0 px-1">
                                  {task.title}
                                </span>
                                <div className="h-px flex-1 bg-slate-100" />
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
        <span className="text-[11px] font-semibold text-slate-600">{label}</span>
        <span className="text-[10px] text-slate-400">· {count}</span>
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
  const previewLines = content.split('\n').slice(0, 2).join('\n')
  const isLong = content.length > 160

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
    <div className="group rounded-xl border border-slate-100 bg-white hover:border-slate-200 hover:shadow-sm transition-all p-3">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[13px] font-medium text-[#0a192f] leading-snug flex-1 min-w-0">
          {title}
        </p>
        {/* Actions — only visible on hover */}
        <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          {isLong && (
            <button
              onClick={() => setExpanded((v) => !v)}
              className="text-[10px] font-medium text-blue-600 hover:underline px-1.5 py-1"
            >
              {expanded ? 'Collapse' : 'Expand'}
            </button>
          )}
          <button
            onClick={handleCopy}
            title="Copy to clipboard"
            className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={handleDownload}
            title="Download as Markdown"
            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      <div className="prose prose-xs max-w-none text-slate-500 text-[12px] leading-relaxed mt-1">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {expanded ? content : previewLines + (isLong && !expanded ? '\n…' : '')}
        </ReactMarkdown>
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
