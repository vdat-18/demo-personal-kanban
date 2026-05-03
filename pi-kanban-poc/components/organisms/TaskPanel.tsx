'use client'

import { useCallback, useMemo, useState } from 'react'
import { useI18n } from '@/lib/i18n/context'
import { useRouter } from 'next/navigation'
import {
  ListTodo,
  Sparkles,
  Plus,
  CheckCircle2,
  RefreshCw,
  Trash2,
  Rocket,
  Pencil,
  GripVertical,
  Play,
  Clock,
} from 'lucide-react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { toast } from 'sonner'
import { formatTaskStatus, formatPriority, toneClass } from '@/lib/display/format'
import { useKanbanStore } from '@/lib/storage/kanbanStore'
import { useTasks, useCreateTask, useDeleteTask, useUpdateTask } from '@/lib/hooks/useTasks'
import type { Task } from '@/lib/hooks/useTasks'
import { TaskFormDialog, type TaskFormValues } from '@/components/molecules/TaskFormDialog'

interface TaskPanelProps {
  projectId: string
  projectName: string
  messages?: { role: string; content: string }[]
  phase?: 'discovery' | 'blueprint' | 'task_mapping'
}

export function TaskPanel({ projectId }: TaskPanelProps) {
  const router = useRouter()
  const { t } = useI18n()
  const { data: tasks = [], isLoading, refetch } = useTasks({ projectId })
  const createTask = useCreateTask()
  const deleteTask = useDeleteTask()
  const updateTask = useUpdateTask()
  const restoreTaskInStore = useKanbanStore((s) => s.restoreTask)
  const reorderTasks = useKanbanStore((s) => s.reorderTasks)
  const updateProjectFn = useKanbanStore((s) => s.updateProject)

  // ─── CRUD dialog state ────────────────────────────────────────────────────
  const [formOpen, setFormOpen] = useState(false)
  const [formMode, setFormMode] = useState<'add' | 'edit'>('add')
  const [editingTask, setEditingTask] = useState<Task | null>(null)

  const openAdd = useCallback(() => {
    setFormMode('add')
    setEditingTask(null)
    setFormOpen(true)
  }, [])

  const openEdit = useCallback((task: Task) => {
    setFormMode('edit')
    setEditingTask(task)
    setFormOpen(true)
  }, [])

  const handleSubmitForm = useCallback(
    async (values: TaskFormValues) => {
      if (formMode === 'add') {
        await createTask.mutateAsync({
          projectId,
          title: values.title,
          description: values.description || undefined,
          priority: values.priority,
        })
      } else if (editingTask) {
        await updateTask.mutateAsync({
          id: editingTask.id,
          title: values.title,
          description: values.description || null,
          priority: values.priority,
        })
      }
      setFormOpen(false)
    },
    [formMode, editingTask, createTask, updateTask, projectId],
  )

  // ─── Sorting — stable order per `order` field with createdAt fallback ─────
  const sorted = useMemo(() => {
    return [...tasks].sort((a, b) => {
      const ao = a.order ?? Number.POSITIVE_INFINITY
      const bo = b.order ?? Number.POSITIVE_INFINITY
      if (ao !== bo) return ao - bo
      return a.createdAt.localeCompare(b.createdAt)
    })
  }, [tasks])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event
      if (!over || active.id === over.id) return
      const oldIndex = sorted.findIndex((t) => t.id === active.id)
      const newIndex = sorted.findIndex((t) => t.id === over.id)
      if (oldIndex < 0 || newIndex < 0) return
      const next = arrayMove(sorted, oldIndex, newIndex)
      reorderTasks(projectId, next.map((t) => t.id))
    },
    [sorted, reorderTasks, projectId],
  )

  const handleStartExecution = useCallback(() => {
    updateProjectFn(projectId, { planningStatus: 'completed' })
    router.push(`/mission-control/${projectId}`)
  }, [router, projectId, updateProjectFn])

  // ─── Active task summary for the top banner (#6) ──────────────────────────
  const activeTask = useMemo(() => sorted.find((t) => t.status === 'IN_PROGRESS'), [sorted])
  const activeElapsed = activeTask
    ? elapsedLabel(activeTask.statusChangedAt ?? activeTask.updatedAt)
    : null

  return (
    <div className="flex flex-col h-full overflow-hidden relative bg-canvas">
      <div className="flex-1 overflow-y-auto p-6 pb-32">
        <div className="flex flex-col gap-4 mb-4">
          <div className="flex items-center justify-between rounded-[1.75rem] border border-slate-200/80 bg-white px-4 py-4 shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
            <div className="flex items-center gap-3">
              <ListTodo className="w-5 h-5 text-blue-600" />
              <h2 className="font-black text-ink text-lg">{t('taskPanel.tasks', 'Tasks')}</h2>
              <span className="text-xs font-black text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full">
                {tasks.length}
              </span>
              <button
                onClick={() => refetch()}
                className="p-1 hover:bg-gray-100 rounded-lg transition-colors text-gray-300 hover:text-gray-500"
                title="Refresh tasks"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
            <button
              onClick={openAdd}
              className="flex items-center gap-2 px-3.5 py-2 bg-ink text-white rounded-2xl text-sm font-semibold hover:bg-blue-900 transition-colors shrink-0 shadow-lg shadow-blue-900/15"
            >
              <Plus className="w-4 h-4" /> {t('taskPanel.addTask', 'Add Task')}
            </button>
          </div>

          {/* Active task banner (#6) — only shown when at least one task is IN_PROGRESS */}
          {activeTask ? (
            <div className="flex items-start gap-2 px-4 py-3 rounded-[1.25rem] bg-gradient-to-r from-blue-50 to-brand-subtle/50 border border-blue-200 animate-in slide-in-from-top-1 duration-300 shadow-[0_10px_25px_rgba(59,130,246,0.08)]">
              <div className="relative shrink-0 mt-0.5">
                <span className="absolute inset-0 rounded-full bg-blue-400 animate-ping opacity-50" />
                <Play className="w-3.5 h-3.5 text-blue-600 relative" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-micro text-blue-600">
                  {t('taskPanel.workingNow', 'Working now')}
                </div>
                <div className="text-xs font-semibold text-ink truncate mt-0.5">
                  {activeTask.title}
                </div>
              </div>
              {activeElapsed && (
                <div className="text-meta font-bold text-blue-600 inline-flex items-center gap-1 shrink-0">
                  <Clock className="w-3 h-3" />
                  {activeElapsed}
                </div>
              )}
            </div>
          ) : (
            <div className="text-meta text-slate-400 text-center mt-1.5 bg-white rounded-2xl py-3 border border-dashed border-slate-200 shadow-sm">
              {t('taskPanel.dragHint', 'Drag to reorder · hover for details · click edit to change')}
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center">
            <span className="w-8 h-8 border-3 border-gray-200 border-t-blue-600 rounded-full animate-spin" />
            <p className="text-xs text-gray-400 mt-3">{t('taskPanel.loadingTasks', 'Loading tasks…')}</p>
          </div>
        ) : sorted.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center bg-slate-50/50 rounded-[48px] border border-slate-100 shadow-inner">
            <div className="w-20 h-20 rounded-[32px] bg-white shadow-xl shadow-slate-200/50 flex items-center justify-center mb-6">
              <Sparkles className="w-10 h-10 text-blue-400" />
            </div>
            <p className="text-sm font-black text-slate-400 uppercase tracking-[0.2em] text-center mb-2">
              {t('taskPanel.emptyTitle', 'Your task list is empty')}
            </p>
            <p className="text-xs text-slate-400 text-center max-w-[200px] leading-relaxed">
              {t('taskPanel.emptyDesc', 'Chat with the AI to draft your task list.')}
            </p>
          </div>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={sorted.map((t) => t.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-3">
                {sorted.map((task, idx) => (
                  <SortableTaskRow
                    key={task.id}
                    task={task}
                    idx={idx}
                    onEdit={() => openEdit(task)}
                    onDelete={() => {
                      deleteTask.mutate(task.id)
                      toast.success(`Deleted "${task.title}"`, {
                        action: {
                          label: 'Undo',
                          onClick: () => restoreTaskInStore(task.id),
                        },
                      })
                    }}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>

      {sorted.length > 0 && (
        <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-white via-white to-white/85 backdrop-blur border-t border-slate-100 shadow-[0_-8px_24px_rgba(15,23,42,0.04)]">
          <button
            onClick={handleStartExecution}
            className="group w-full py-3.5 bg-gradient-to-r from-brand to-brand-hover text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:opacity-90 transition-all shadow-xl shadow-blue-500/30 hover:shadow-2xl hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2"
          >
            <Rocket className="w-4 h-4 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-transform" />
            Start Execution
            <span className="ml-1 text-xs opacity-80">({sorted.length} task{sorted.length === 1 ? '' : 's'})</span>
          </button>
          <p className="text-meta text-slate-400 text-center mt-2 font-medium">
            You can still add or remove tasks later in Kanban.
          </p>
        </div>
      )}

      <TaskFormDialog
        open={formOpen}
        mode={formMode}
        initial={
          editingTask
            ? {
                title: editingTask.title,
                description: editingTask.description ?? '',
                priority: editingTask.priority,
              }
            : undefined
        }
        onClose={() => setFormOpen(false)}
        onSubmit={handleSubmitForm}
      />
    </div>
  )
}

// ─── Sortable row ────────────────────────────────────────────────────────────

interface SortableTaskRowProps {
  task: Task
  idx: number
  onEdit: () => void
  onDelete: () => void
}

function SortableTaskRow({ task, idx, onEdit, onDelete }: SortableTaskRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: task.id })
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
  }

  const isActive = task.status === 'IN_PROGRESS'

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-white rounded-[1.75rem] p-5 border ${
        isActive ? 'border-blue-300 ring-2 ring-blue-100' : 'border-slate-200/80'
      } shadow-[0_10px_30px_rgba(15,23,42,0.05)] flex items-start gap-3 group transition-all hover:shadow-[0_16px_36px_rgba(15,23,42,0.08)] ${
        isDragging ? 'shadow-xl opacity-80 scale-[1.01]' : ''
      }`}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        aria-label="Drag to reorder"
        className="self-stretch px-0.5 -ml-1.5 text-slate-300 hover:text-slate-500 cursor-grab active:cursor-grabbing touch-none"
        title="Drag to reorder"
      >
        <GripVertical className="w-4 h-4" />
      </button>
      <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-xs font-black shrink-0 relative">
        {idx + 1}
        {isActive && (
          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-blue-500 ring-2 ring-white animate-pulse" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-bold text-sm text-ink mb-1 leading-snug">{task.title}</p>
        {task.description && (
          <p className="text-xs text-slate-500 pr-2 leading-relaxed max-h-0 overflow-hidden group-hover:max-h-40 transition-all duration-300 ease-in-out">
            {task.description}
          </p>
        )}
         <div className="flex items-center gap-2 mt-3 flex-wrap">
          <span className={`text-meta font-bold px-2 py-0.5 rounded-full border ${toneClass(formatTaskStatus(task.status).tone)}`}>
            {formatTaskStatus(task.status).label}
          </span>
          <span className={`text-meta font-bold px-2 py-0.5 rounded-full border ${toneClass(formatPriority(task.priority).tone)}`}>
            {formatPriority(task.priority).label}
          </span>
          {isActive && task.statusChangedAt && (
            <span className="text-meta font-semibold text-blue-600 inline-flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {elapsedLabel(task.statusChangedAt)}
            </span>
          )}
        </div>
      </div>
      <div className="flex flex-col items-center gap-2 shrink-0">
        <CheckCircle2
          className={`w-5 h-5 ${task.status === 'DONE' ? 'text-green-500' : 'text-gray-200'}`}
        />
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={onEdit}
            className="p-1.5 text-gray-300 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all"
            title="Edit task"
          >
            <Pencil className="w-4 h-4" />
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
            title="Delete task"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

/** Format how long a task has been in its current status. */
function elapsedLabel(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime()
  if (ms < 60_000) return 'just now'
  const mins = Math.floor(ms / 60_000)
  if (mins < 60) return `${mins}m`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ${mins % 60}m`
  const days = Math.floor(hours / 24)
  return `${days}d ${hours % 24}h`
}
