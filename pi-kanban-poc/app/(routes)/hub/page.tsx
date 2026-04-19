'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import {
  ArrowLeft,
  BookOpen,
  Calendar,
  CheckCircle2,
  FileText,
  Search,
  Sparkles,
} from 'lucide-react'
import { useKanbanStore } from '@/lib/storage/kanbanStore'

/**
 * Knowledge Hub (#8).
 *
 * The hub aggregates the user's "published" plan documents into a
 * cross-project library. Drafts intentionally don't appear here — the
 * draft/publish boundary (#4) is what makes this useful: only documents
 * the user has explicitly endorsed are treated as canonical knowledge.
 *
 * Design notes:
 *  - This is a read-only surface. Edits still happen in Planning.
 *  - We index by project + thread so the user can scan the entire library
 *    of "approved plans" they've shipped, even after the project has moved
 *    on to execution.
 *  - A simple substring search covers project name / thread title / body.
 *    Full-text indexing would be overkill for the current data volume.
 *  - Empty state explains the publish workflow so users discover #4
 *    without reading a manual.
 */
export default function KnowledgeHubPage() {
  const projects = useKanbanStore((s) => s.projects)
  const threads = useKanbanStore((s) => s.planningThreads)
  const versions = useKanbanStore((s) => s.visionVersions)

  const [query, setQuery] = useState('')

  const documents = useMemo(() => {
    const projectIndex = new Map(projects.map((p) => [p.id, p]))
    const threadIndex = new Map(threads.map((t) => [t.id, t]))
    const published = versions
      .filter((v) => v.status === 'published')
      .map((v) => {
        const thread = threadIndex.get(v.threadId)
        const project = thread ? projectIndex.get(thread.projectId) : undefined
        return { version: v, thread, project }
      })
      .filter((row) => row.thread && row.project)
      .sort((a, b) => {
        const aTime = a.version.publishedAt ?? a.version.createdAt
        const bTime = b.version.publishedAt ?? b.version.createdAt
        return bTime.localeCompare(aTime)
      })
    if (!query.trim()) return published
    const q = query.trim().toLowerCase()
    return published.filter((row) => {
      return (
        row.project?.name.toLowerCase().includes(q) ||
        row.thread?.title.toLowerCase().includes(q) ||
        row.version.content.toLowerCase().includes(q)
      )
    })
  }, [projects, threads, versions, query])

  const grouped = useMemo(() => {
    const map = new Map<string, typeof documents>()
    for (const row of documents) {
      const key = row.project!.id
      const arr = map.get(key) ?? []
      arr.push(row)
      map.set(key, arr)
    }
    return Array.from(map.entries()).map(([projectId, rows]) => ({
      project: rows[0].project!,
      rows,
    }))
  }, [documents])

  return (
    <div className="min-h-screen bg-[#f0f2f5]">
      <header className="bg-white border-b border-slate-100 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/" className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 hover:text-slate-900">
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <BookOpen className="w-5 h-5 text-blue-600" />
            <div>
              <h1 className="font-black text-base text-[#0a192f]">Knowledge Hub</h1>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Your published plans, in one place
              </p>
            </div>
          </div>
          <div className="relative w-72 max-w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search projects, threads, content…"
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm text-[#0a192f] placeholder:text-slate-400 focus:outline-none focus:border-blue-300 focus:bg-white"
            />
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {documents.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="space-y-8">
            {grouped.map((group) => (
              <ProjectGroup key={group.project.id} project={group.project} rows={group.rows} />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="bg-white rounded-3xl border border-slate-100 p-16 text-center">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-blue-50 text-blue-500 mb-4">
        <Sparkles className="w-7 h-7" />
      </div>
      <h2 className="font-bold text-lg text-[#0a192f]">No published plans yet</h2>
      <p className="text-sm text-slate-500 mt-2 max-w-md mx-auto leading-relaxed">
        Inside any project, open the plan history drawer and click <strong>Publish</strong> on the
        version you're happy with. Published versions show up here so you can browse, search, and
        reuse them across projects.
      </p>
    </div>
  )
}

interface ProjectGroupProps {
  project: { id: string; name: string }
  rows: Array<{
    version: { id: string; content: string; publishedAt?: string; createdAt: string }
    thread?: { id: string; title: string; projectId: string }
  }>
}

function ProjectGroup({ project, rows }: ProjectGroupProps) {
  return (
    <section>
      <div className="flex items-baseline justify-between mb-3 px-1">
        <h2 className="font-bold text-base text-[#0a192f]">{project.name}</h2>
        <Link
          href={`/mission-control/${project.id}`}
          className="text-[11px] font-bold text-blue-600 hover:text-blue-700"
        >
          Open project →
        </Link>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {rows.map((row) => (
          <DocumentCard key={row.version.id} row={row} projectId={project.id} />
        ))}
      </div>
    </section>
  )
}

interface DocumentCardProps {
  row: {
    version: { id: string; content: string; publishedAt?: string; createdAt: string }
    thread?: { id: string; title: string; projectId: string }
  }
  projectId: string
}

function DocumentCard({ row, projectId }: DocumentCardProps) {
  const [expanded, setExpanded] = useState(false)
  const stamp = row.version.publishedAt ?? row.version.createdAt
  const preview = row.version.content.slice(0, 280)
  const isLong = row.version.content.length > 280

  return (
    <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden hover:shadow-md transition-shadow">
      <div className="px-4 py-3 border-b border-slate-100 flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700">
            <CheckCircle2 className="w-3 h-3" />
            Published plan
          </div>
          <h3 className="text-sm font-bold text-[#0a192f] mt-1 truncate">
            {row.thread?.title ?? 'Untitled thread'}
          </h3>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <span className="text-[10px] text-slate-500 inline-flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {formatDate(stamp)}
          </span>
          <Link
            href={`/planning/${projectId}`}
            className="text-[10px] font-bold text-blue-600 hover:text-blue-700"
          >
            Open in planning
          </Link>
        </div>
      </div>
      <div className="px-4 py-3">
        <div className="prose prose-sm max-w-none text-slate-700 prose-headings:text-[#0a192f] prose-h2:text-sm prose-h3:text-xs text-xs">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {expanded ? row.version.content : preview + (isLong ? '…' : '')}
          </ReactMarkdown>
        </div>
        {isLong && (
          <button
            onClick={() => setExpanded((v) => !v)}
            className="mt-2 text-[11px] font-bold text-blue-600 hover:text-blue-700 inline-flex items-center gap-1"
          >
            <FileText className="w-3 h-3" />
            {expanded ? 'Collapse' : 'Read full plan'}
          </button>
        )}
      </div>
    </div>
  )
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}
