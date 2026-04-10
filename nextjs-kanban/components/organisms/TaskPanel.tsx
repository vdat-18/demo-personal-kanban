'use client'

import { useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ListTodo, Sparkles, Plus, CheckCircle2, RefreshCw, Trash2 } from 'lucide-react'
import { useTasks, useCreateTask, useDeleteTask, useUpdateTask } from '@/lib/hooks/useTasks'
import type { Task } from '@/lib/hooks/useTasks'

interface TaskPanelProps {
  projectId: string
  projectName: string
  /** Conversation messages for the generate-tasks API */
  messages?: { role: string; content: string }[]
  /** Current planning phase — Generate Tasks only available in task_mapping */
  phase?: 'discovery' | 'blueprint' | 'task_mapping'
}

export function TaskPanel({ projectId, projectName, messages, phase = 'task_mapping' }: TaskPanelProps) {
  const router = useRouter()
  const { data: tasks = [], isLoading, refetch } = useTasks({ projectId })
  const createTask = useCreateTask()
  const deleteTask = useDeleteTask()
  const updateTask = useUpdateTask()

  const handleAddTask = useCallback(() => {
    const title = window.prompt('Task title:')
    if (title?.trim()) {
      createTask.mutate({ title: title.trim(), projectId })
    }
  }, [createTask, projectId])

  const handleGenerateTasks = useCallback(async () => {
    if (!messages || messages.length === 0) return
    try {
      const res = await fetch('/api/agents/generate-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, messages }),
      })
      if (res.ok) {
        refetch()
      }
    } catch (err) {
      console.error('Failed to generate tasks:', err)
    }
  }, [projectId, messages, refetch])

  const hasMessages = messages && messages.some((m) => m.role === 'user')

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="p-6">
        <div className="flex flex-col gap-4 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ListTodo className="w-5 h-5 text-blue-600" />
              <h2 className="font-black text-[#0a192f] text-lg">Tasks</h2>
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
              onClick={handleAddTask}
              className="flex items-center gap-2 px-3 py-1.5 bg-[#0a192f] text-white rounded-xl text-sm font-semibold hover:bg-blue-900 transition-colors shrink-0"
            >
              <Plus className="w-4 h-4" /> Add Task
            </button>
          </div>
          <div className="flex flex-col">
            <div className="text-[11px] text-gray-400 text-center mt-1.5 bg-gray-50 rounded-lg py-2 border border-dashed border-gray-200">
              Tasks approved in the chat will appear here.
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center">
            <span className="w-8 h-8 border-3 border-gray-200 border-t-blue-600 rounded-full animate-spin" />
            <p className="text-xs text-gray-400 mt-3">Loading tasks…</p>
          </div>
        ) : tasks.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center border-4 border-dashed border-slate-100 rounded-[40px] bg-white/50">
            <Sparkles className="w-10 h-10 text-slate-200 mb-4" />
            <p className="text-sm font-black text-slate-300 uppercase tracking-widest text-center">
              Chat with the AI to generate tasks
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {tasks.map((task: Task, idx: number) => (
              <div
                key={task.id}
                className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm flex items-start gap-4 group transition-shadow hover:shadow-md"
              >
                <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-xs font-black shrink-0">
                  {idx + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm text-[#0a192f] mb-1 pr-6">{task.title}</p>
                  {task.description && (
                    <p className="text-xs text-gray-500 pr-2">{task.description}</p>
                  )}
                  <div className="flex items-center gap-2 mt-3">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      task.status === 'DONE' ? 'bg-green-100 text-green-700' :
                      task.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-700' :
                      task.status === 'BLOCKED' ? 'bg-red-100 text-red-700' :
                      'bg-gray-100 text-gray-500'
                    }`}>
                      {task.status}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      task.priority === 'URGENT' ? 'bg-red-100 text-red-700' :
                      task.priority === 'HIGH' ? 'bg-orange-100 text-orange-700' :
                      task.priority === 'MEDIUM' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-gray-100 text-gray-500'
                    }`}>
                      {task.priority}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col items-center gap-2 shrink-0">
                  <CheckCircle2
                    className={`w-5 h-5 ${
                      task.status === 'DONE' ? 'text-green-500' : 'text-gray-200'
                    }`}
                  />
                  <button
                    onClick={() => {
                      if (window.confirm('Delete this task?')) {
                        deleteTask.mutate(task.id)
                      }
                    }}
                    disabled={deleteTask.isPending}
                    className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                    title="Delete task"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {tasks.length > 0 && (
          <div className="mt-8">
            <button
              onClick={() => router.push(`/mission-control/${projectId}`)}
              className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-3xl font-black text-sm uppercase tracking-widest hover:opacity-90 transition-opacity shadow-xl shadow-blue-500/20"
            >
              Start Execution →
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
