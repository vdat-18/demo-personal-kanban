'use client'

import { Bell, X, ChevronRight } from 'lucide-react'
import { useKanbanStore } from '@/lib/storage/kanbanStore'
import type { AttentionType } from '@/types/domain'

const TYPE_LABELS: Record<AttentionType, string> = {
  clarification_needed: 'Cần làm rõ',
  task_approval_pending: 'Chờ duyệt',
  plan_unpublished: 'Kế hoạch chưa xuất bản',
  source_needs_review: 'Nguồn cần kiểm tra',
  execution_blocked: 'Bị chặn',
  validation_required: 'Cần xác nhận',
}

const TYPE_COLORS: Record<AttentionType, string> = {
  clarification_needed: 'text-amber-700 bg-amber-100',
  task_approval_pending: 'text-blue-700 bg-blue-100',
  plan_unpublished: 'text-purple-700 bg-purple-100',
  source_needs_review: 'text-orange-700 bg-orange-100',
  execution_blocked: 'text-red-700 bg-red-100',
  validation_required: 'text-green-700 bg-green-100',
}

interface Props {
  onNavigate?: (projectId: string) => void
}

export function InboxPanel({ onNavigate }: Props) {
  const attentionItems = useKanbanStore((s) => s.attentionItems)
  const projects = useKanbanStore((s) => s.projects)
  const resolveAttentionItem = useKanbanStore((s) => s.resolveAttentionItem)

  const openItems = attentionItems
    .filter((item) => item.status === 'open')
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  if (openItems.length === 0) return null

  return (
    <div className="rounded-2xl border border-amber-100 bg-gradient-to-br from-amber-50/80 via-white to-orange-50/40 p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <Bell className="w-4 h-4 text-amber-600" />
        <h3 className="text-sm font-bold text-[#0a192f]">Cần xử lý</h3>
        <span className="ml-auto px-2 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-black">
          {openItems.length}
        </span>
      </div>
      <div className="space-y-2">
        {openItems.map((item) => {
          const project = projects.find((p) => p.id === item.projectId)
          return (
            <div
              key={item.id}
              className="flex items-start gap-3 bg-white rounded-xl border border-amber-100 px-3 py-2.5"
            >
              <span
                className={`mt-0.5 shrink-0 px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest ${TYPE_COLORS[item.type]}`}
              >
                {TYPE_LABELS[item.type]}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-[#0a192f] truncate">{item.title}</p>
                <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">{item.detail}</p>
                {project && (
                  <p className="text-[10px] text-slate-400 mt-1">📁 {project.name}</p>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {onNavigate && project && (
                  <button
                    onClick={() => onNavigate(item.projectId)}
                    title="Mở project"
                    className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  onClick={() => resolveAttentionItem(item.id)}
                  title="Đánh dấu đã xử lý"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
