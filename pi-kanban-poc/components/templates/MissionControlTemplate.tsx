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
import { ContextDrawer } from '@/components/molecules/ContextDrawer'
import { ProjectReportModal } from '@/components/molecules/ProjectReportModal'
import { useProjectReportAgent } from '@/lib/hooks/useProjectReportAgent'
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
  const storeSubtasks = useKanbanStore((s) => s.subtasks)
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
  const [showReportModal, setShowReportModal] = useState(false)
  const report = useProjectReportAgent({ projectId: project.id })
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
      // Guard: can only move TODO → IN_PROGRESS from the chat (Step Planner).
      // Dragging on the Kanban is blocked unless there's at least one approved subtask.
      if (current.status === 'TODO' && status === 'IN_PROGRESS') {
        const taskSubtasks = storeSubtasks.filter((s) => s.taskId === taskId && !s.deletedAt)
        const hasApproved = taskSubtasks.some((s) => s.approvalStatus === 'approved')
        if (!hasApproved) {
          console.warn(`Task "${current.title}": open the task chat and approve at least one step before starting execution.`)
          return
        }
      }
      updateTaskInStore(taskId, { status })
    },
    [storeTasks, storeSubtasks, updateTaskInStore],
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
        rightExtras={
          <div className="flex items-center gap-0.5">
            {(
              [
                { key: 'status' as const,  label: 'Status' },
                ...((liveProject?.importedSources?.length ?? project.importedSources?.length ?? 0) > 0
                  ? [{ key: 'sources' as const, label: 'Sources' }] : []),
                ...(effectiveWorkflowContract
                  ? [{ key: 'notes' as const, label: 'Workflow Notes' }] : []),
                { key: 'skills' as const,  label: 'Skills' },
                { key: 'tokens' as const,  label: 'Tokens' },
              ]
            ).map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setContextDrawerTab(contextDrawerTab === key ? null : key)}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-[0.15em] transition-colors ${
                  contextDrawerTab === key
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
                }`}
              >
                {label}
              </button>
            ))}
            <div className="w-px h-4 bg-gray-200 mx-1" />
            <button
              onClick={() => setShowRecurringDialog(true)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors"
            >
              ↺ Recurring
            </button>
            {(report.allDone || report.existingReport) && (
              <>
                <div className="w-px h-4 bg-gray-200 mx-1" />
                <button
                  onClick={() => setShowReportModal(true)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-[0.15em] text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 transition-colors"
                >
                  {report.existingReport ? '📄 Final Report' : '✨ Generate Report'}
                </button>
              </>
            )}
          </div>
        }
      />

      {/* Context Drawer — slides from right */}
      <ContextDrawer
        open={contextDrawerTab !== null}
        onClose={() => setContextDrawerTab(null)}
        title={
          contextDrawerTab === 'status'  ? 'Status'
          : contextDrawerTab === 'sources' ? 'Sources'
          : contextDrawerTab === 'notes'   ? 'Workflow Notes'
          : contextDrawerTab === 'skills'  ? 'Skills'
          : contextDrawerTab === 'tokens'  ? 'Tokens'
          : ''
        }
      >
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
      </ContextDrawer>

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

      <ProjectReportModal
        open={showReportModal}
        onClose={() => setShowReportModal(false)}
        projectName={project.name}
        report={report}
      />
    </div>
  )
}
