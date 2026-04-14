'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Archive,
  Plus,
  MoreHorizontal,
  ArrowLeft,
  ArrowRight,
  XCircle,
  Rocket,
  RotateCcw,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  CheckSquare,
  Square,
} from 'lucide-react'
import { getAllowedTransitions } from '@/lib/status-lifecycle'
import type { TaskStatusValue } from '@/lib/status-lifecycle'
import { useColumnAutoMode } from '@/lib/hooks/useColumnAutoMode'
import { AUTO_MODE_COLUMNS } from '@/lib/auto-mode/constants'
import { AutoModeToggle } from '@/components/mission-control/AutoModeToggle'
import { AutoModeStatusBar } from '@/components/mission-control/AutoModeStatusBar'

type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE' | 'BLOCKED'
type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'

interface Subtask {
  id: string
  title: string
  completed: boolean
}

interface Task {
  id: string
  title: string
  description: string | null
  status: TaskStatus
  priority: TaskPriority
  createdAt: string
  updatedAt: string
  subtasks?: Subtask[]
}

interface Project {
  id: string
  name: string
  description: string | null
  tasks: Task[]
}

const KANBAN_COLUMNS: Array<{ id: TaskStatus; label: string }> = [
  { id: 'TODO', label: 'To Do' },
  { id: 'IN_PROGRESS', label: 'In Progress' },
  { id: 'IN_REVIEW', label: 'In Review' },
  { id: 'DONE', label: 'Done' },
  { id: 'BLOCKED', label: 'Blocked' },
]

const STATUS_COLORS: Record<TaskStatus, string> = {
  TODO: 'bg-slate-50 text-slate-500 border-slate-200',
  IN_PROGRESS: 'bg-blue-50 text-blue-600 border-blue-200',
  IN_REVIEW: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  DONE: 'bg-green-50 text-green-600 border-green-200',
  BLOCKED: 'bg-red-50 text-red-400 border-red-200',
}

function getNextStatus(current: TaskStatus): TaskStatus | null {
  // Use lifecycle-aware transitions: pick the first non-BLOCKED allowed status
  const allowed = getAllowedTransitions(current as TaskStatusValue)
  const nonBlocked = allowed.filter((s) => s !== 'BLOCKED')
  return nonBlocked.length > 0 ? (nonBlocked[0] as TaskStatus) : null
}

function isValidDropTarget(fromStatus: TaskStatus, toStatus: TaskStatus): boolean {
  if (fromStatus === toStatus) return true // same column is always fine (no-op)
  const allowed = getAllowedTransitions(fromStatus as TaskStatusValue)
  return allowed.includes(toStatus as TaskStatusValue)
}

export function MissionControlClient({ project: initialProject }: { project: Project }) {
  const router = useRouter()
  const [project, setProject] = useState(initialProject)
  const [dragOverColumn, setDragOverColumn] = useState<TaskStatus | null>(null)
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null)
  const [draggingTaskStatus, setDraggingTaskStatus] = useState<TaskStatus | null>(null)
  const [cancelTarget, setCancelTarget] = useState<Task | null>(null)
  const [cancelReason, setCancelReason] = useState('')
  const [expandedTaskIds, setExpandedTaskIds] = useState<Set<string>>(new Set())
  const [isAutoBreakingDown, setIsAutoBreakingDown] = useState(false)

  useEffect(() => {
    const nakedTodos = project.tasks.filter(t => t.status === 'TODO' && (!t.subtasks || t.subtasks.length === 0))
    if (nakedTodos.length > 0 && !isAutoBreakingDown) {
      setIsAutoBreakingDown(true)
      fetch('/api/tasks/auto-breakdown', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: project.id })
      })
      .then(res => res.json())
      .then(data => {
        if (data.success && data.count > 0) {
          // Fetch updated tasks to reflect new subtasks
          return fetch(`/api/tasks?projectId=${project.id}`)
            .then(res => res.json())
            .then(tasks => {
              if (Array.isArray(tasks)) {
                setProject(p => ({ ...p, tasks }))
              }
            })
        }
      })
      .catch(err => console.error("Auto breakdown failed:", err))
      .finally(() => setIsAutoBreakingDown(false))
    }
  }, [project.tasks, project.id]) // deliberately exclude isAutoBreakingDown to avoid infinite loops if it fails

  const toggleTaskExpansion = (e: React.MouseEvent, taskId: string) => {
    e.stopPropagation()
    setExpandedTaskIds((prev) => {
      const next = new Set(prev)
      if (next.has(taskId)) next.delete(taskId)
      else next.add(taskId)
      return next
    })
  }

  const tasks = project.tasks

  const getTasksByStatus = (status: TaskStatus) => tasks.filter((t) => t.status === status)

  const updateTaskStatus = useCallback(async (taskId: string, status: TaskStatus) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) {
        if (res.status === 422) {
          const body = await res.json().catch(() => ({}))
          console.warn(`Invalid transition: ${body.from} → ${body.to}. Allowed: ${body.allowed?.join(', ')}`)
        }
        return
      }
      const updated = await res.json()
      setProject((prev) => ({
        ...prev,
        tasks: prev.tasks.map((t) => (t.id === taskId ? { ...t, ...updated } : t)),
      }))
    } catch (err) {
      console.error(err)
    }
  }, [])

  // ── Auto-mode hook ──────────────────────────────────────────────────────────
  const {
    columnStates: autoModeStates,
    toggle: toggleAutoMode,
    dismissError: dismissAutoModeError,
    autoProcessingTaskIds,
  } = useColumnAutoMode({ tasks, updateTaskStatus })

  const handleDragStart = (e: React.DragEvent, taskId: string, taskStatus: TaskStatus) => {
    e.dataTransfer.setData('taskId', taskId)
    e.dataTransfer.setData('taskStatus', taskStatus)
    setDraggingTaskId(taskId)
    setDraggingTaskStatus(taskStatus)
  }

  const handleDrop = (e: React.DragEvent, status: TaskStatus) => {
    const taskId = e.dataTransfer.getData('taskId')
    const fromStatus = e.dataTransfer.getData('taskStatus') as TaskStatus
    if (taskId && isValidDropTarget(fromStatus, status)) {
      updateTaskStatus(taskId, status)
    }
    setDragOverColumn(null)
    setDraggingTaskId(null)
    setDraggingTaskStatus(null)
  }

  const handleCancelConfirm = async () => {
    if (!cancelTarget) return
    await updateTaskStatus(cancelTarget.id, 'BLOCKED')
    setCancelTarget(null)
    setCancelReason('')
  }

  return (
    <div className="flex flex-col h-full w-full bg-[#f8f9fa] overflow-hidden font-sans">
      {/* Header */}
      <header className="h-20 px-10 border-b border-gray-100 bg-white flex items-center justify-between shrink-0 shadow-sm relative z-10">
        <div className="flex items-center gap-6">
          <button onClick={() => router.push('/')} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500 hover:text-black">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-4">
            <div>
              <h1 className="font-extrabold text-2xl text-[#0a192f] tracking-tight">{project.name}</h1>
              <p className="text-sm font-semibold text-gray-400">{project.description}</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={async () => {
              const title = window.prompt('Task title:')
              if (!title?.trim()) return
              const res = await fetch('/api/tasks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title, projectId: project.id }),
              })
              if (res.ok) {
                const task = await res.json()
                setProject((prev) => ({ ...prev, tasks: [...prev.tasks, task] }))
              }
            }}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#0a192f] text-white rounded-xl text-sm font-semibold hover:bg-blue-900 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" /> Add Task
          </button>
        </div>
      </header>

      {/* Kanban Board */}
      <main className="flex-1 overflow-x-auto overflow-y-hidden px-6 py-6">
        <div className="flex gap-6 h-full" style={{ minWidth: `${KANBAN_COLUMNS.length * 320 + 100}px` }}>
          {KANBAN_COLUMNS.map((column) => {
            const isValid = draggingTaskStatus
              ? isValidDropTarget(draggingTaskStatus, column.id)
              : true
            const isDragging = draggingTaskId !== null
            const isHovering = dragOverColumn === column.id
            const isAutoModeColumn = AUTO_MODE_COLUMNS.includes(column.id as any)
            const colAutoState = autoModeStates[column.id]

            return (
            <div
              key={column.id}
              className={`w-80 flex flex-col rounded-[2.5rem] border transition-all duration-200 shrink-0 ${
                isHovering && isValid
                  ? 'border-blue-300 bg-blue-50/50'
                  : isDragging && !isValid
                  ? 'border-gray-200 bg-gray-50/30 opacity-50 cursor-not-allowed'
                  : 'border-gray-100 bg-white/80'
              }`}
              onDragOver={(e) => {
                if (isValid) {
                  e.preventDefault()
                  setDragOverColumn(column.id)
                }
              }}
              onDragLeave={() => setDragOverColumn(null)}
              onDrop={(e) => { if (isValid) handleDrop(e, column.id) }}
            >
              {/* Column Header */}
              <div className="px-6 pt-6 pb-4 flex flex-col gap-3 shrink-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <h2 className="font-black text-sm text-[#0a192f] uppercase tracking-widest">{column.label}</h2>
                    <span className="text-[10px] font-black text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full">
                      {getTasksByStatus(column.id).length}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {isAutoModeColumn && colAutoState && (
                      <AutoModeToggle
                        enabled={colAutoState.enabled}
                        status={colAutoState.status}
                        onToggle={() => toggleAutoMode(column.id)}
                      />
                    )}
                    <button className="text-gray-300 hover:text-black transition-colors p-2 hover:bg-white rounded-xl shadow-sm">
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                {column.id === 'TODO' && isAutoBreakingDown && (
                  <div className="flex items-center justify-center gap-2 mt-1 px-3 py-2 rounded-xl bg-blue-50 border border-blue-100 shadow-sm animate-pulse w-full">
                    <span className="w-3.5 h-3.5 text-blue-500 animate-spin border-2 border-blue-500 border-t-transparent rounded-full" />
                    <span className="text-[10px] font-bold text-blue-700 tracking-wider">AI IS BREAKING DOWN TASKS...</span>
                  </div>
                )}
              </div>

              {/* Auto-mode status bar */}
              {isAutoModeColumn && colAutoState && colAutoState.enabled && (
                <AutoModeStatusBar
                  status={colAutoState.status}
                  activeTaskTitle={
                    colAutoState.activeTaskId
                      ? tasks.find((t) => t.id === colAutoState.activeTaskId)?.title ?? null
                      : null
                  }
                  error={colAutoState.error}
                  onDismissError={() => dismissAutoModeError(column.id)}
                />
              )}
              {/* Also show error bar when auto mode errored (it disables itself) */}
              {isAutoModeColumn && colAutoState && colAutoState.status === 'error' && !colAutoState.enabled && (
                <AutoModeStatusBar
                  status={colAutoState.status}
                  activeTaskTitle={null}
                  error={colAutoState.error}
                  onDismissError={() => dismissAutoModeError(column.id)}
                />
              )}

              <div className="p-4 overflow-y-auto flex flex-col gap-4 flex-1">
                {getTasksByStatus(column.id).map((task) => {
                  const isAutoProcessing = autoProcessingTaskIds.has(task.id)

                  return (
                  <div
                    key={task.id}
                    draggable={!isAutoProcessing}
                    onDragStart={(e) => {
                      if (isAutoProcessing) { e.preventDefault(); return }
                      handleDragStart(e, task.id, task.status)
                    }}
                    onClick={() => {
                      if (isAutoProcessing) return
                      if (task.status !== 'BLOCKED') router.push(`/chat/${task.id}`)
                    }}
                    className={`bg-white p-6 rounded-3xl shadow-sm border border-gray-100 border-b-4 transition-all group relative select-none ${
                      isAutoProcessing
                        ? 'ring-2 ring-violet-300 border-violet-200 shadow-lg shadow-violet-100/50 cursor-default'
                        : task.status === 'BLOCKED'
                        ? 'opacity-60 cursor-default border-red-100'
                        : 'hover:border-blue-400 hover:shadow-xl hover:shadow-blue-900/5 cursor-pointer'
                    } ${!isAutoProcessing && task.status === 'IN_PROGRESS' ? 'ring-2 ring-blue-100 border-blue-200 shadow-lg' : ''}`}
                  >
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center gap-2">
                        <span className={`text-[9px] font-black px-2 py-0.5 rounded-md tracking-[0.2em] uppercase border w-fit ${STATUS_COLORS[task.status]}`}>
                          {task.status}
                        </span>
                        {isAutoProcessing && (
                          <span className="text-[9px] font-black px-2 py-0.5 rounded-md tracking-[0.15em] uppercase bg-violet-50 text-violet-600 border border-violet-200 animate-pulse">
                            Auto-processing
                          </span>
                        )}
                      </div>
                      <h3 className={`font-bold text-sm leading-snug pr-4 ${
                        isAutoProcessing
                          ? 'text-violet-700'
                          : task.status === 'BLOCKED' ? 'text-gray-400 line-through' : 'text-[#0a192f] group-hover:text-blue-600 transition-colors'
                      }`}>
                        {task.title}
                      </h3>

                      {/* Hover actions */}
                      <div className="absolute top-4 right-4 flex items-center gap-1.5 translate-x-2 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 transition-all duration-300">
                        {task.status === 'BLOCKED' && getAllowedTransitions(task.status as TaskStatusValue).includes('TODO') && (
                          <button
                            onClick={(e) => { e.stopPropagation(); updateTaskStatus(task.id, 'TODO') }}
                            className="w-8 h-8 rounded-full bg-green-50 hover:bg-green-600 text-green-500 hover:text-white flex items-center justify-center transition-all shadow-md"
                            title="Restore task"
                          >
                            <RotateCcw className="w-4 h-4" />
                          </button>
                        )}
                        {getAllowedTransitions(task.status as TaskStatusValue).includes('BLOCKED') && (
                          <button
                            onClick={(e) => { e.stopPropagation(); setCancelTarget(task) }}
                            className="w-8 h-8 rounded-full bg-red-50 hover:bg-red-500 text-red-300 hover:text-white flex items-center justify-center transition-all shadow-md"
                            title="Cancel task"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        )}
                        {getNextStatus(task.status) && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              const next = getNextStatus(task.status)
                              if (next) updateTaskStatus(task.id, next)
                            }}
                            className="w-8 h-8 rounded-full bg-slate-50 hover:bg-[#0a192f] text-slate-400 hover:text-white flex items-center justify-center transition-all shadow-md"
                            title="Move forward"
                          >
                            <ArrowRight className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    {task.description && task.status !== 'BLOCKED' && (
                      <p className="text-[11px] text-gray-500 leading-relaxed font-medium mt-3 line-clamp-2">
                        {task.description}
                      </p>
                    )}

                    {/* Subtasks Block */}
                    {task.subtasks && task.subtasks.length > 0 && task.status !== 'BLOCKED' && (
                      <div className="mt-4 pt-4 border-t border-gray-50">
                        <div 
                          className="flex items-center justify-between cursor-pointer group/sub"
                          onClick={(e) => toggleTaskExpansion(e, task.id)}
                        >
                          <div className="flex items-center gap-2 flex-1">
                            {/* Progress bar visual */}
                            <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden flex">
                              {task.subtasks.map((st, i) => (
                                <div 
                                  key={st.id} 
                                  className={`h-full border-r border-white/50 last:border-none ${st.completed ? 'bg-green-500' : 'bg-gray-200'}`}
                                  style={{ width: `${100 / task.subtasks!.length}%` }}
                                />
                              ))}
                            </div>
                            <span className="text-[10px] font-black text-gray-400 w-8 text-right shrink-0">
                              {task.subtasks.filter(s => s.completed).length}/{task.subtasks.length}
                            </span>
                          </div>
                          <div className="ml-2 text-gray-300 group-hover/sub:text-gray-600 transition-colors">
                            {expandedTaskIds.has(task.id) ? (
                              <ChevronUp className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                          </div>
                        </div>

                        {/* Expanded subtasks preview list */}
                        {expandedTaskIds.has(task.id) && (
                          <div className="mt-3 flex flex-col gap-2">
                            {task.subtasks.map((st) => (
                              <div key={st.id} className="flex items-start gap-2">
                                <div className="mt-0.5 shrink-0">
                                  {st.completed ? (
                                    <CheckSquare className="w-3.5 h-3.5 text-green-500" />
                                  ) : (
                                    <Square className="w-3.5 h-3.5 text-gray-300" />
                                  )}
                                </div>
                                <span className={`text-[11px] leading-tight flex-1 ${st.completed ? 'text-gray-400 line-through' : 'text-gray-600'}`}>
                                  {st.title}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  )
                })}

                {getTasksByStatus(column.id).length === 0 && (
                  <div className={`flex-1 flex flex-col items-center justify-center py-16 border-2 border-dashed rounded-[2.5rem] bg-white/30 ${
                    isHovering && isValid ? 'border-blue-300' : column.id === 'BLOCKED' ? 'border-red-100' : 'border-gray-100'
                  }`}>
                    <Archive className={`w-12 h-12 mb-4 ${column.id === 'BLOCKED' ? 'text-red-100' : 'text-gray-100'}`} />
                    <span className="text-[10px] font-black text-gray-300 uppercase tracking-[0.3em]">
                      {isHovering && isValid ? 'Drop here' : 'Empty'}
                    </span>
                  </div>
                )}
              </div>
            </div>
            )
          })}

          {/* Add Column Ghost */}
          <div className="w-80 h-full border-2 border-dashed border-gray-100 rounded-[2.5rem] flex items-center justify-center hover:bg-white hover:border-[#0a192f]/20 transition-all cursor-pointer group shrink-0">
            <div className="flex flex-col items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gray-50 text-gray-300 border border-gray-100 flex items-center justify-center group-hover:bg-[#0a192f] group-hover:text-white group-hover:scale-110 group-hover:rotate-90 transition-all shadow-sm">
                <Plus className="w-6 h-6" />
              </div>
              <span className="text-[10px] font-black text-gray-300 uppercase tracking-[0.3em] group-hover:text-[#0a192f] transition-colors">Add Column</span>
            </div>
          </div>
        </div>
      </main>

      {/* Footer Stats */}
      <footer className="h-20 px-10 flex items-center justify-between bg-white border-t border-gray-100 shrink-0 shadow-[0_-4px_20px_rgba(0,0,0,0.02)]">
        <div className="flex items-center gap-10">
          {[
            { label: 'Total', value: tasks.length, color: 'text-[#0a192f]' },
            { label: 'In Progress', value: tasks.filter((t) => t.status !== 'DONE' && t.status !== 'BLOCKED').length, color: 'text-blue-600' },
            { label: 'Done', value: tasks.filter((t) => t.status === 'DONE').length, color: 'text-green-600' },
            { label: 'Cancelled', value: tasks.filter((t) => t.status === 'BLOCKED').length, color: 'text-red-500' },
          ].map(({ label, value, color }) => (
            <div key={label} className="flex flex-col gap-1">
              <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{label}</span>
              <span className={`font-bold text-base ${color}`}>{value}</span>
            </div>
          ))}
          {/* Auto-mode indicator */}
          {(() => {
            const enabledCount = AUTO_MODE_COLUMNS.filter((col) => autoModeStates[col]?.enabled).length
            if (enabledCount === 0) return null
            return (
              <div className="flex flex-col gap-1">
                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Auto</span>
                <span className="font-bold text-base text-violet-600">{enabledCount}/{AUTO_MODE_COLUMNS.length}</span>
              </div>
            )
          })()}
        </div>
        <button
          onClick={() => router.push(`/summary/${project.id}`)}
          disabled={tasks.some((t) => t.status !== 'DONE' && t.status !== 'BLOCKED')}
          className={`px-10 py-3.5 rounded-2xl font-black text-sm transition-all flex items-center gap-3 uppercase tracking-widest border-b-4 ${
            tasks.some((t) => t.status !== 'DONE' && t.status !== 'BLOCKED')
              ? 'bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed'
              : 'bg-[#0a192f] text-white border-blue-950 hover:bg-blue-900 shadow-xl shadow-blue-900/20'
          }`}
        >
          Close Project <Rocket className="w-4 h-4" />
        </button>
      </footer>

      {/* Cancel Dialog */}
      {cancelTarget && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] p-10 w-full max-w-md shadow-2xl">
            <div className="flex items-center gap-3 mb-3">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              <h2 className="text-xl font-black text-[#0a192f]">Cancel Task</h2>
            </div>
            <p className="text-sm text-gray-400 mb-6 font-medium">"{cancelTarget.title}"</p>
            <textarea
              className="w-full border border-gray-200 rounded-2xl p-4 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-100 text-[#0a192f] placeholder:text-gray-300"
              rows={3}
              placeholder="Reason for cancelling… (optional)"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
            />
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => { setCancelTarget(null); setCancelReason('') }}
                className="flex-1 py-3 rounded-2xl border border-gray-100 text-sm font-black text-gray-500 hover:bg-gray-50 transition-colors"
              >
                Keep Task
              </button>
              <button
                onClick={handleCancelConfirm}
                className="flex-1 py-3 rounded-2xl bg-red-500 text-white text-sm font-black hover:bg-red-600 transition-colors"
              >
                Cancel Task
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
