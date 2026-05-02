'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { KanbanBoard } from '@/components/organisms/KanbanBoard'
import { KanbanHeader } from '@/components/organisms/KanbanHeader'
import { KanbanFooter } from '@/components/organisms/KanbanFooter'
import { CancelTaskDialog } from '@/components/organisms/CancelTaskDialog'
import { TaskFormDialog, type TaskFormValues } from '@/components/molecules/TaskFormDialog'
import { TodoBreakdownAutoRunner } from '@/components/mission-control/TodoBreakdownAutoRunner'
import { StatusPanel } from '@/components/molecules/StatusPanel'
import { WorkflowNotesPanel } from '@/components/molecules/WorkflowNotesPanel'
import { ImportedSourcesPanel } from '@/components/molecules/ImportedSourcesPanel'
import { SkillsPanel } from '@/components/molecules/SkillsPanel'
import { TokenDashboard } from '@/components/molecules/TokenDashboard'
import { RecurringTemplateDialog } from '@/components/molecules/RecurringTemplateDialog'
import type { UITaskStatus, TaskStatus } from '@/types/domain'
import { getAllowedTransitions, validateTransition } from '@/lib/status-lifecycle'
import type { TaskStatusValue } from '@/lib/status-lifecycle'
import { useColumnAutoMode } from '@/lib/hooks/useColumnAutoMode'
import { useBreakdownConcurrency } from '@/lib/hooks/useBreakdownConcurrency'
import { useKanbanStore } from '@/lib/storage/kanbanStore'

interface Task {
  id: string
  title: string
  description: string | null
  status: UITaskStatus
  priority: string
  createdAt: string
  updatedAt: string
}

interface Project {
  id: string
  name: string
  description: string | null
  planningStatus?: import('@/types/domain').PlanningStatus
  playbookId?: import('@/types/domain').PlaybookId
  importedSources?: import('@/types/domain').ImportedSource[]
  workflowContract?: import('@/types/domain').WorkflowContract
  workpad?: import('@/types/domain').WorkpadEntry | null
  runtimeStatus?: import('@/types/domain').RuntimeStatus | null
  tasks: Task[]
}

function getNextStatus(current: UITaskStatus): UITaskStatus | null {
  const allowed = getAllowedTransitions(current as TaskStatusValue)
  const nonBlocked = allowed.filter((s) => s !== 'BLOCKED')
  return nonBlocked.length > 0 ? (nonBlocked[0] as UITaskStatus) : null
}

function isValidDropTarget(fromStatus: UITaskStatus, toStatus: UITaskStatus): boolean {
  if (fromStatus === toStatus) return true
  const allowed = getAllowedTransitions(fromStatus as TaskStatusValue)
  return allowed.includes(toStatus as TaskStatusValue)
}

export interface MissionControlTemplateProps {
  project: Project
}

export function MissionControlTemplate({ project: initialProject }: MissionControlTemplateProps) {
  const router = useRouter()
  const storeTasks = useKanbanStore((s) => s.tasks)
  const storeProjects = useKanbanStore((s) => s.projects)
  const updateTaskInStore = useKanbanStore((s) => s.updateTask)
  const createTaskInStore = useKanbanStore((s) => s.createTask)
  const createTasksBatchInStore = useKanbanStore((s) => s.createTasksBatch)
  const createAttentionItem = useKanbanStore((s) => s.createAttentionItem)
  const logPlanningEvent = useKanbanStore((s) => s.logPlanningEvent)
  const getPlanningEventsForProject = useKanbanStore((s) => s.getPlanningEventsForProject)
  const getAttentionItemsForProject = useKanbanStore((s) => s.getAttentionItemsForProject)
  const resolveAttentionItem = useKanbanStore((s) => s.resolveAttentionItem)

  const liveProject = storeProjects.find((p) => p.id === initialProject.id) ?? null
  const projectTokenUsage = liveProject?.totalTokenUsage ?? null

  const concurrency = useBreakdownConcurrency()
  const isProcessing = concurrency.active.length > 0 || concurrency.queue.length > 0

  // Live tasks for this project (always reflect store state)
  const tasks = storeTasks
    .filter((t) => t.projectId === initialProject.id && !t.deletedAt)
    .map((t) => ({
      id: t.id,
      title: t.title,
      description: t.description,
      status: t.status as UITaskStatus,
      priority: t.priority,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
      dependsOnTaskIds: t.dependsOnTaskIds,
      blockedByTaskIds: t.blockedByTaskIds,
      runtimeState: t.runtimeState,
      runtimeLastAction: t.runtimeLastAction,
      runtimeNextAction: t.runtimeNextAction,
    })) as Task[]

  const project = { ...initialProject, tasks }
  const effectiveWorkflowContract = liveProject?.workflowContract ?? project.workflowContract

  const [contextDrawerTab, setContextDrawerTab] = useState<'status' | 'sources' | 'notes' | 'skills' | 'tokens' | null>(null)
  const [showRecurringDialog, setShowRecurringDialog] = useState(false)
  const [dragOverColumn, setDragOverColumn] = useState<UITaskStatus | null>(null)
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null)
  const [draggingTaskStatus, setDraggingTaskStatus] = useState<UITaskStatus | null>(null)
  const [cancelTarget, setCancelTarget] = useState<Task | null>(null)
  const [cancelReason, setCancelReason] = useState('')
  const [addDialog, setAddDialog] = useState<{ open: boolean; status: TaskStatus }>({
    open: false,
    status: 'TODO',
  })

  const updateTaskStatus = useCallback(
    async (taskId: string, status: UITaskStatus) => {
      const current = storeTasks.find((t) => t.id === taskId)
      if (!current) return
      if (current.status !== status) {
        const result = validateTransition(current.status as TaskStatusValue, status as TaskStatusValue)
        if (!result.valid) {
          console.warn(result.message)
          return
        }
      }
      updateTaskInStore(taskId, { status })
    },
    [storeTasks, updateTaskInStore],
  )

  const {
    columnStates: autoModeStates,
    toggle: toggleAutoMode,
    dismissError: dismissAutoModeError,
  } = useColumnAutoMode({ tasks, updateTaskStatus })

  const handleDragStart = (e: React.DragEvent, taskId: string, taskStatus: UITaskStatus) => {
    e.dataTransfer.setData('taskId', taskId)
    e.dataTransfer.setData('taskStatus', taskStatus)
    setDraggingTaskId(taskId)
    setDraggingTaskStatus(taskStatus)
  }

  const handleDrop = (e: React.DragEvent, status: UITaskStatus) => {
    const taskId = e.dataTransfer.getData('taskId')
    const fromStatus = e.dataTransfer.getData('taskStatus') as UITaskStatus
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
    createAttentionItem({
      projectId: project.id,
      type: 'execution_blocked',
      title: 'A task is blocked during execution',
      detail: `"${cancelTarget.title}" was marked blocked and may need replanning or clarification.`,
    })
    setCancelTarget(null)
    setCancelReason('')
  }

  const executionLoggedRef = useRef(false)

  useEffect(() => {
    if (executionLoggedRef.current) return
    executionLoggedRef.current = true
    logPlanningEvent({
      projectId: initialProject.id,
      type: 'execution_started',
      actor: 'user',
      summary: 'Started execution in Mission Control.',
    })
  }, [initialProject.id, logPlanningEvent])

  return (
    <div className="flex flex-col h-full w-full bg-[#f0f2f5] overflow-hidden font-sans">
      <TodoBreakdownAutoRunner projectId={project.id} tasks={tasks} />

      <KanbanHeader
        projectName={project.name}
        projectDescription={project.description}
        playbookId={liveProject?.playbookId ?? project.playbookId}
        importedSourceCount={liveProject?.importedSources?.length ?? project.importedSources?.length ?? 0}
        isProcessing={isProcessing}
        tokenUsage={projectTokenUsage}
        onBack={() => router.push('/')}
        onAddTask={() => setAddDialog({ open: true, status: 'TODO' })}
        onPlanning={() => router.push(`/planning/${project.id}`)}
      />

      {/* Context tab bar */}
      <div className="flex items-center gap-0.5 px-8 border-b border-gray-100 bg-white shrink-0">
        {(['status', 'sources', 'notes', 'skills', 'tokens'] as const).filter((tab) => {
          if (tab === 'sources') return (liveProject?.importedSources?.length ?? project.importedSources?.length ?? 0) > 0
          if (tab === 'notes') return !!effectiveWorkflowContract
          return true
        }).map((tab) => (
          <button
            key={tab}
            onClick={() => setContextDrawerTab(contextDrawerTab === tab ? null : tab)}
            className={`px-4 py-2.5 text-[10px] font-black uppercase tracking-[0.18em] border-b-2 transition-colors ${
              contextDrawerTab === tab
                ? 'border-indigo-500 text-indigo-700'
                : 'border-transparent text-gray-400 hover:text-gray-600'
            }`}
          >
            {tab === 'status' ? 'Status'
              : tab === 'sources' ? 'Sources'
              : tab === 'notes' ? 'Workflow Notes'
              : tab === 'skills' ? 'Skills'
              : 'Tokens'}
          </button>
        ))}
        <button
          onClick={() => setShowRecurringDialog(true)}
          className="ml-auto px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-gray-400 hover:text-indigo-600 transition-colors"
          title="Recurring tasks"
        >
          ↺ Recurring
        </button>
      </div>

      {/* Context Drawer */}
      {contextDrawerTab && (
        <div className="bg-white border-b border-gray-100 px-8 py-4 overflow-y-auto max-h-80 animate-in slide-in-from-top duration-200">
          {contextDrawerTab === 'status' && (
            <StatusPanel
              phase={'discovery'}
              latestEvent={null}
              pendingApprovals={0}
              attentionItems={getAttentionItemsForProject(initialProject.id)}
              runtimeStatus={liveProject?.runtimeStatus ?? null}
              userContext={null}
              onResolveAttention={resolveAttentionItem}
            />
          )}
          {contextDrawerTab === 'sources' && (
            <ImportedSourcesPanel sources={liveProject?.importedSources ?? project.importedSources ?? []} />
          )}
          {contextDrawerTab === 'notes' && effectiveWorkflowContract && (
            <WorkflowNotesPanel
              contract={effectiveWorkflowContract}
              workpad={liveProject?.workpad ?? null}
              onUpdateWorkpad={() => {}}
            />
          )}
          {contextDrawerTab === 'skills' && (
            <SkillsPanel projectId={project.id} />
          )}
          {contextDrawerTab === 'tokens' && (
            <TokenDashboard tokenUsage={projectTokenUsage} />
          )}
        </div>
      )}

      <KanbanBoard
        tasks={tasks}
        autoModeStates={autoModeStates}
        dragOverColumn={dragOverColumn}
        draggingTaskId={draggingTaskId}
        draggingTaskStatus={draggingTaskStatus}
        onDragStart={handleDragStart}
        onDragOver={(e, columnId) => setDragOverColumn(columnId)}
        onDragLeave={() => setDragOverColumn(null)}
        onDrop={handleDrop}
        onTaskClick={(taskId, status) => {
          if (status !== 'BLOCKED') router.push(`/chat/${taskId}`)
        }}
        onUpdateStatus={updateTaskStatus}
        onCancelRequest={(task) => setCancelTarget(task)}
        onToggleAutoMode={toggleAutoMode}
        onDismissAutoModeError={dismissAutoModeError}
        getNextStatus={getNextStatus}
        isValidDropTarget={isValidDropTarget}
      />

      <KanbanFooter
        tasks={tasks}
        autoModeStates={autoModeStates}
        runtimeStatus={liveProject?.runtimeStatus ?? project.runtimeStatus}
        onCloseProject={() => router.push(`/summary/${project.id}`)}
      />

      <CancelTaskDialog
        isOpen={!!cancelTarget}
        taskTitle={cancelTarget?.title ?? ''}
        cancelReason={cancelReason}
        onReasonChange={setCancelReason}
        onConfirm={handleCancelConfirm}
        onCancel={() => { setCancelTarget(null); setCancelReason('') }}
      />

      <TaskFormDialog
        open={addDialog.open}
        mode="add"
        defaultStatus={addDialog.status}
        onClose={() => setAddDialog({ open: false, status: 'TODO' })}
        onSubmit={(values: TaskFormValues) => {
          createTaskInStore({
            projectId: project.id,
            title: values.title,
            description: values.description || undefined,
            status: addDialog.status,
            priority: values.priority,
          })
          setAddDialog({ open: false, status: 'TODO' })
        }}
        onBatchSubmit={(items) => {
          createTasksBatchInStore(
            project.id,
            items.map((v) => ({
              title: v.title,
              description: v.description || undefined,
              status: addDialog.status,
              priority: v.priority,
            })),
          )
          setAddDialog({ open: false, status: 'TODO' })
        }}
      />

      {showRecurringDialog && (
        <RecurringTemplateDialog
          projectId={project.id}
          onClose={() => setShowRecurringDialog(false)}
        />
      )}
    </div>
  )
}
