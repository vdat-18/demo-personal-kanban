'use client'

import { useState, useCallback, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ChatPanel } from '@/components/organisms/ChatPanel'
import { TaskInfoSidebar } from '@/components/organisms/TaskInfoSidebar'
import { TodoStepPlannerPanel } from '@/components/task-chat/TodoStepPlannerPanel'
import { TaskActivityTimeline } from '@/components/molecules/TaskActivityTimeline'
import { AGENT_OPTIONS } from '@/components/molecules/AgentSelector'
import type { UITaskStatus, UIConversation, ChatMsg, Subtask } from '@/types/domain'
import { useAgentStream } from '@/lib/hooks/useAgentStream'
import type { StreamEvent } from '@/lib/hooks/useAgentStream'
import { useBreakdownAgent } from '@/lib/hooks/useBreakdownAgent'
import { useKanbanStore } from '@/lib/storage/kanbanStore'
import { validateTransition } from '@/lib/status-lifecycle'
import type { TaskStatusValue } from '@/lib/status-lifecycle'
import { getNextPendingSubtaskContext, useDoerAgent } from '@/lib/hooks/useDoerAgent'
import { useReviewerAgent } from '@/lib/hooks/useReviewerAgent'
import { deriveVerdict, verdictBadge } from '@/lib/reviewer-loop'
import type { NextAction } from '@/lib/reviewer-loop'
import type { ReviewerEnvelope } from '@/types/domain'
import { EtaIndicator } from '@/components/molecules/EtaIndicator'

interface Task {
  id: string
  title: string
  description: string | null
  status: UITaskStatus
  priority: string
  projectId: string | null
  conversations: UIConversation[]
}

export interface ChatTemplateProps {
  task: Task
}

function getDefaultAgentIndex(status: UITaskStatus): number {
  if (status === 'TODO') return 0
  if (status === 'IN_REVIEW') return 2
  return 1
}

export function ChatTemplate({ task: initialTask }: ChatTemplateProps) {
  const router = useRouter()
  const [task, setTask] = useState(initialTask)
  const createConversationInStore = useKanbanStore((s) => s.createConversation)
  const updateTaskInStore = useKanbanStore((s) => s.updateTask)
  const allSubtasks = useKanbanStore((s) => s.subtasks)
  const allTasks = useKanbanStore((s) => s.tasks)
  const getNextPendingSubtask = useKanbanStore((s) => s.getNextPendingSubtask)
  const [messages, setMessages] = useState<ChatMsg[]>(() => {
    const last = initialTask.conversations[initialTask.conversations.length - 1]
    if (last?.messages?.length) {
      return last.messages.map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }))
    }
    if (initialTask.status === 'IN_PROGRESS') {
      return [
        {
          role: 'assistant',
          content: `You're now in **Doer mode** for task: **${initialTask.title}**.\n\nI'll work through one step at a time and draft the actual output for the current step. When you're happy with it, accept the step and I'll move on.`,
        },
      ]
    }
    return [
      {
        role: 'assistant',
        content: `I'm your AI agent for task: **${initialTask.title}**.\n\nStatus: \`${initialTask.status}\`\n\nHow can I help? I can:\n- Break it down into subtasks\n- Research and analyse\n- Generate implementation plans\n- Review and provide feedback`,
      },
    ]
  })
  const [input, setInput] = useState('')
  const [scrollToPanelSignal, setScrollToPanelSignal] = useState(0)
  const [sidebarWidth, setSidebarWidth] = useState(384) // 96 * 4 = w-96
  const startResize = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    const startX = e.clientX
    const startW = sidebarWidth
    const onMove = (ev: MouseEvent) => {
      const delta = startX - ev.clientX
      setSidebarWidth(Math.max(280, Math.min(600, startW + delta)))
    }
    const onUp = () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [sidebarWidth])
  const [activeAgentIdx, setActiveAgentIdx] = useState(() => getDefaultAgentIndex(initialTask.status))
  const [progressEvents, setProgressEvents] = useState<StreamEvent[]>([])

  const activeOption = AGENT_OPTIONS[activeAgentIdx]

  // Keep the selected agent aligned with the task status even when the status
  // changes after mount (e.g. TODO -> IN_PROGRESS after the user clicks
  // "Start working"). Without this the selector would stay on Step Planner.
  useEffect(() => {
    setActiveAgentIdx(getDefaultAgentIndex(task.status))
  }, [task.status])

  const { startStream, abort, isStreaming, streamingContent, error: streamError } = useAgentStream({
    onProgress: (ev) => {
      setProgressEvents((prev) => [...prev.slice(-4), ev])
    },
    onComplete: async (result, tokenUsage) => {
      // Append final assistant message
      const newAssistant: ChatMsg = { role: 'assistant', content: result }
      setMessages((prev) => [...prev, newAssistant])
      setProgressEvents([])

      // Persist the full transcript as a Conversation in the local store
      const transcript = [...messages, newAssistant].map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }))
      const conv = createConversationInStore({
        taskId: task.id,
        messages: transcript,
        result,
        tokenUsage: tokenUsage ?? null,
      })
      setTask((prev) => ({
        ...prev,
        conversations: [
          ...prev.conversations,
          {
            id: conv.id,
            messages: conv.messages,
            result: conv.result,
            tokenUsage: conv.tokenUsage,
            createdAt: conv.createdAt,
          },
        ],
      }))
    },
    onError: (msg) => {
      setProgressEvents([])
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `⚠️ Stream error: ${msg}. Please try again or check your API configuration.`,
        },
      ])
    },
  })

  const updateTaskStatus = useCallback(
    async (status: UITaskStatus) => {
      const result = validateTransition(task.status as TaskStatusValue, status as TaskStatusValue)
      if (!result.valid && task.status !== status) {
        console.warn(result.message)
        return
      }
      const updated = updateTaskInStore(task.id, { status })
      if (updated) setTask((prev) => ({ ...prev, status: updated.status }))
    },
    [task.id, task.status, updateTaskInStore],
  )

  const taskSubtasks = useMemo(
    () => allSubtasks.filter((sub) => sub.taskId === task.id && !sub.deletedAt),
    [allSubtasks, task.id],
  )

  const liveTask = useMemo(
    () => allTasks.find((t) => t.id === task.id) ?? null,
    [allTasks, task.id],
  )

  const allProjects = useKanbanStore((s) => s.projects)
  const liveProject = useMemo(
    () => allProjects.find((p) => p.id === task.projectId) ?? null,
    [allProjects, task.projectId],
  )

  const breakdown = useBreakdownAgent(task.id)

  const sendMessage = useCallback(async () => {
    if (!input.trim() || isStreaming) return
    const userContent = input.trim()
    setInput('')

    // When Step Planner agent + existing subtasks: route to breakdown.refine()
    // so the subtask list is actually updated, not just streamed as plain chat.
    if (activeOption.role === 'breakdown' && taskSubtasks.length > 0) {
      setMessages((prev) => [...prev, { role: 'user', content: userContent }])
      const existingSubtasks = taskSubtasks.map((s) => ({
        id: s.id,
        title: s.title,
        description: s.description ?? null,
        estimatedEffort: null,
        type: (s.type ?? 'custom') as 'research' | 'create' | 'communicate' | 'decide' | 'custom',
      }))
      await breakdown.refine({ userRefineRequest: userContent, existingSubtasks })
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `✅ I've updated the subtasks based on your request: *"${userContent}"*\n\nScroll up to see the revised steps.`,
        },
      ])
      setScrollToPanelSignal((n) => n + 1)
      return
    }

    setMessages((prev) => [...prev, { role: 'user', content: userContent }])
    setProgressEvents([])
    await startStream(activeOption.role, userContent, task.id, messages)
  }, [input, isStreaming, task.id, activeOption.role, startStream, messages, taskSubtasks, breakdown])

  const doer = useDoerAgent({
    taskId: task.id,
    taskTitle: task.title,
    taskDescription: task.description,
    taskStatus: task.status,
  })

  const nextPendingSubtask = useMemo(
    () => getNextPendingSubtask(task.id),
    [getNextPendingSubtask, task.id, taskSubtasks],
  )

  const reviewer = useReviewerAgent({
    taskId: task.id,
    taskTitle: task.title,
    taskDescription: task.description,
    taskStatus: task.status,
  })

const topPanel =
    task.status === 'TODO' ? (
      <TodoStepPlannerPanel
        taskId={task.id}
        taskTitle={task.title}
        taskStatus={task.status}
        onMoveToInProgress={() => updateTaskStatus('IN_PROGRESS')}
        onMoveToDenied={() => updateTaskStatus('BLOCKED')}
      />
    ) : task.status === 'IN_PROGRESS' ? (
      <DoerExecutionPanel
        taskId={task.id}
        taskTitle={task.title}
        subtasks={taskSubtasks}
        nextPendingSubtask={nextPendingSubtask}
        doer={doer}
        onMoveToReview={() => updateTaskStatus('IN_REVIEW')}
      />
    ) : task.status === 'IN_REVIEW' ? (
      <ReviewerWorkspacePanel
        taskId={task.id}
        taskTitle={task.title}
        subtasks={taskSubtasks}
        reviewer={reviewer}
        onApproveDone={() => updateTaskStatus('DONE')}
        onRequestChanges={() => updateTaskStatus('IN_PROGRESS')}
      />
    ) : null

  return (
    <div className="flex h-full w-full bg-white font-sans overflow-hidden">
      <ChatPanel
        taskTitle={task.title}
        taskStatus={task.status}
        taskProjectId={task.projectId}
        topPanel={topPanel}
        messages={messages}
        input={input}
        onInputChange={setInput}
        scrollToPanelSignal={scrollToPanelSignal}
        onSend={sendMessage}
        activeAgentIdx={activeAgentIdx}
        onAgentChange={setActiveAgentIdx}
        isStreaming={isStreaming}
        streamingContent={streamingContent}
        streamError={streamError}
        progressEvents={progressEvents}
        onAbort={abort}
        onBack={() =>
          task.projectId
            ? router.push(`/mission-control/${task.projectId}`)
            : router.push('/')
        }
        onViewSummary={() => router.push(`/summary/${task.id}`)}
        isDone={task.status === 'DONE'}
      />

      <div
        className="w-1.5 shrink-0 cursor-col-resize flex items-center justify-center group relative z-10 hover:bg-indigo-100/60 transition-colors"
        onMouseDown={startResize}
      >
        <div className="w-0.5 h-10 rounded-full bg-gray-200 group-hover:bg-indigo-400 transition-colors" />
      </div>
      <div className="border-l border-gray-100 bg-[#f8f9fa] overflow-hidden flex flex-col shrink-0" style={{ width: sidebarWidth }}>
        <TaskInfoSidebar
          taskTitle={task.title}
          taskDescription={task.description}
          taskStatus={task.status}
          taskPriority={task.priority}
          dependsOnTaskIds={liveTask?.dependsOnTaskIds}
          blockedByTaskIds={liveTask?.blockedByTaskIds}
          runtimeState={liveTask?.runtimeState}
          runtimeLastAction={liveTask?.runtimeLastAction}
          runtimeNextAction={liveTask?.runtimeNextAction}
          runtimeRetryCount={liveTask?.runtimeRetryCount}
          runtimeBlockedReason={liveTask?.runtimeBlockedReason}
          validationChecklist={liveTask?.validationChecklist}
          acceptanceCriteria={liveTask?.acceptanceCriteria}
          proofOfWork={liveTask?.proofOfWork}
          subtasks={taskSubtasks}
          currentStep={nextPendingSubtask}
          conversations={task.conversations}
          isStreaming={isStreaming}
          activeAgentLabel={activeOption.label}
          onUpdateStatus={updateTaskStatus}
          onAbort={abort}
          activityTimeline={<TaskActivityTimeline taskId={task.id} />}
          importedSources={liveProject?.importedSources ?? []}
          workflowContract={liveProject?.workflowContract ?? null}
          workpad={liveProject?.workpad ?? null}
        />
      </div>
    </div>
  )
}

interface ReviewerWorkspacePanelProps {
  taskId: string
  taskTitle: string
  subtasks: Subtask[]
  reviewer: ReturnType<typeof useReviewerAgent>
  onApproveDone: () => void
  onRequestChanges: () => void
}

function ReviewerWorkspacePanel({
  taskId,
  taskTitle,
  subtasks,
  reviewer,
  onApproveDone,
  onRequestChanges,
}: ReviewerWorkspacePanelProps) {
  const [clarifyAnswer, setClarifyAnswer] = useState('')

  return (
    <div className="rounded-3xl border border-amber-100 bg-gradient-to-br from-amber-50/60 via-white to-orange-50/40 shadow-sm overflow-hidden mb-6">
      <div className="px-6 py-5 border-b border-amber-100 bg-white/50 flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-700 mb-1">
            Reviewer Workspace
          </div>
          <h3 className="text-base font-bold text-[#0a192f] leading-snug">
            Check the quality before marking this task done.
          </h3>
          <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
            The reviewer looks at the work already produced, surfaces issues, and suggests whether the task is ready for done. A human still decides.
          </p>
        </div>
        {reviewer.state === 'idle' && (
          <button
            onClick={() => reviewer.start()}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#0a192f] text-white text-[10px] font-black uppercase tracking-wider hover:bg-amber-700 transition-colors active:scale-95 shadow-sm"
          >
            🔎 Review task
          </button>
        )}
      </div>

      <div className="p-5 space-y-4">
        <div className="rounded-2xl bg-white border border-slate-100 p-4">
          <div className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 mb-1">
            Review scope
          </div>
          <div className="text-sm font-semibold text-[#0a192f] leading-snug">
            {subtasks.length} step{subtasks.length === 1 ? '' : 's'} to review
          </div>
          <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
            The reviewer checks AI outputs, completed steps, and any missing work before you approve the task.
          </p>
        </div>

        {reviewer.state === 'reviewing' && (
          <div className="rounded-2xl bg-amber-50/60 border border-amber-100 px-4 py-3">
            <div className="flex items-center gap-3 mb-1">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse shrink-0" />
              <div className="text-[10px] font-black uppercase tracking-wider text-amber-700 flex-1">
                AI reviewing
              </div>
            </div>
            <EtaIndicator
              mode="reviewer"
              running={true}
              label="Finding gaps and quality issues"
              onAbort={() => reviewer.abort()}
            />
          </div>
        )}

        {reviewer.state === 'needs-input' && reviewer.envelope?.needsHumanInput && (
          <div className="rounded-2xl bg-amber-50/70 border border-amber-100 p-4 space-y-3">
            <div>
              <div className="text-[10px] font-black uppercase tracking-wider text-amber-700 mb-1">
                The Reviewer needs one thing
              </div>
              <p className="text-[11px] text-amber-900 leading-relaxed">
                {reviewer.envelope.needsHumanInput.question}
              </p>
            </div>
            <div className="flex gap-2">
              <input
                value={clarifyAnswer}
                onChange={(e) => setClarifyAnswer(e.target.value)}
                placeholder="Type your answer…"
                className="flex-1 min-w-0 bg-white border border-amber-200 rounded-xl px-3 py-2 text-sm text-[#0a192f] placeholder:text-slate-400 focus:outline-none focus:border-amber-400"
              />
              <button
                onClick={() => {
                  if (!clarifyAnswer.trim()) return
                  void reviewer.answerClarification(clarifyAnswer.trim())
                  setClarifyAnswer('')
                }}
                className="px-3 py-2 rounded-xl bg-amber-600 text-white text-xs font-black uppercase tracking-wider hover:bg-amber-700 transition-colors"
              >
                Send
              </button>
            </div>
          </div>
        )}

        {reviewer.state === 'result' && reviewer.envelope && (
          <div className="rounded-2xl bg-white border border-amber-100 overflow-hidden">
            <div className="px-4 py-2.5 border-b border-amber-100 bg-amber-50/50 flex items-center justify-between gap-2">
              <div className="text-[10px] font-black uppercase tracking-wider text-amber-700">
                Review result
              </div>
              <ReviewerVerdictBadge envelope={reviewer.envelope} />
            </div>

            {/* Iteration progress banner — only shows once ≥ 1 iteration has
                completed so the user can see how close we are to the human
                gate. Keeps #9's auto-loop transparent instead of hidden. */}
            <div className="px-4 pt-3">
              <div className="flex items-center justify-between text-[10px] font-bold text-slate-500">
                <span>
                  Iteration {reviewer.iterationCount} of {reviewer.maxIterations}
                </span>
                {reviewer.iterationCount >= reviewer.maxIterations && (
                  <span className="text-rose-600 inline-flex items-center gap-1">
                    ⚠ Human gate reached
                  </span>
                )}
              </div>
              <div className="mt-1 h-1 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={`h-full ${
                    reviewer.iterationCount >= reviewer.maxIterations ? 'bg-rose-500' : 'bg-amber-500'
                  }`}
                  style={{
                    width: `${Math.min(100, (reviewer.iterationCount / reviewer.maxIterations) * 100)}%`,
                  }}
                />
              </div>
            </div>

            <div className="px-4 py-4 space-y-4">
              <p className="text-[11px] italic text-slate-600 leading-relaxed">
                “{reviewer.envelope.reviewUnderstanding}”
              </p>

              {reviewer.envelope.taskReview && (
                <div className="rounded-xl bg-slate-50 border border-slate-100 p-3">
                  <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                    Task summary
                  </div>
                  <p className="text-[11px] text-[#0a192f] leading-relaxed">
                    {reviewer.envelope.taskReview.summary}
                  </p>
                  {reviewer.envelope.taskReview.findings.length > 0 && (
                    <ul className="mt-2 space-y-1 text-[11px] text-rose-700 leading-relaxed">
                      {reviewer.envelope.taskReview.findings.map((f, i) => (
                        <li key={i}>• {f}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {reviewer.envelope.stepReviews.length > 0 && (
                <div className="space-y-2">
                  {reviewer.envelope.stepReviews.map((sr) => {
                    const step = subtasks.find((s) => s.id === sr.subtaskId)
                    return (
                      <div key={sr.subtaskId} className="rounded-xl border border-slate-100 bg-slate-50/60 p-3">
                        <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                          {step?.title ?? sr.subtaskId}
                        </div>
                        <p className="text-[11px] text-[#0a192f] leading-relaxed">{sr.summary}</p>
                        {sr.findings.length > 0 && (
                          <ul className="mt-2 space-y-1 text-[11px] text-rose-700 leading-relaxed">
                            {sr.findings.map((f, i) => (
                              <li key={i}>• {f}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}

              {reviewer.envelope.changeRequest && (
                <div className="rounded-xl bg-rose-50 border border-rose-100 p-3">
                  <div className="text-[10px] font-black uppercase tracking-wider text-rose-600 mb-1">
                    Recommended changes
                  </div>
                  <p className="text-[11px] text-rose-900 leading-relaxed">{reviewer.envelope.changeRequest}</p>
                </div>
              )}

              {/*
                Verdict-based action bar (#9).

                We render action buttons according to `nextAction` so the
                UI reflects what will actually happen (auto-retry vs human
                gate vs replan) rather than a hard-coded approve/deny pair.
                The Doer auto-retry still requires a click — we do NOT fire
                LLM calls without explicit consent. That keeps cost &
                surprise both low.
              */}
              <ReviewerActionBar
                nextAction={reviewer.nextAction}
                onApprove={onApproveDone}
                onSendBackToDoer={onRequestChanges}
                onReviewAgain={() => reviewer.reset()}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Doer execution panel ───────────────────────────────────────────────────
// Lives in the chat workspace for IN_PROGRESS tasks. This is the primary UI
// for non-tech users to let the Doer work through the next pending step.

interface DoerExecutionPanelProps {
  taskId: string
  taskTitle: string
  subtasks: Subtask[]
  nextPendingSubtask: Subtask | null
  doer: ReturnType<typeof useDoerAgent>
  onMoveToReview: () => void
}

function DoerExecutionPanel({
  taskId,
  taskTitle,
  subtasks,
  nextPendingSubtask,
  doer,
  onMoveToReview,
}: DoerExecutionPanelProps) {
  const [clarifyAnswer, setClarifyAnswer] = useState('')
  const [refinePrompt, setRefinePrompt] = useState('')

  const allDone = subtasks.length > 0 && subtasks.every((s) => s.completed)

  return (
    <div className="rounded-3xl border border-blue-100 bg-gradient-to-br from-blue-50/60 via-white to-indigo-50/40 shadow-sm overflow-hidden mb-6">
      <div className="px-6 py-5 border-b border-blue-100 bg-white/50 flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="text-[10px] font-black uppercase tracking-[0.18em] text-blue-700 mb-1">
            Doer Workspace
          </div>
          <h3 className="text-base font-bold text-[#0a192f] leading-snug">
            Work through this task one step at a time.
          </h3>
          <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
            The Doer focuses on the next unfinished step, drafts the actual output, and you decide when it is done.
          </p>
        </div>
        {nextPendingSubtask && doer.state === 'idle' && (
          <button
            onClick={() => doer.start(nextPendingSubtask.id)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0a192f] text-white text-[10px] font-black uppercase tracking-wider hover:bg-blue-700 transition-colors active:scale-95 shadow-sm"
            title="Estimated ~8k tokens for this call"
          >
            🤖 Do next step
            <span className="text-[9px] font-mono opacity-70">≈ 8k</span>
          </button>
        )}
      </div>

      <div className="p-5 space-y-4">
        {nextPendingSubtask ? (
          <div className="rounded-2xl bg-white border border-slate-100 p-4">
            <div className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 mb-1">
              Current step
            </div>
            <div className="text-sm font-semibold text-[#0a192f] leading-snug">
              {nextPendingSubtask.title}
            </div>
            {nextPendingSubtask.description && (
              <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                {nextPendingSubtask.description}
              </p>
            )}
            {nextPendingSubtask.doerResult?.summary && (
              <div className="mt-3 rounded-xl bg-blue-50/60 border border-blue-100 px-3 py-2">
                <div className="text-[10px] font-black uppercase tracking-wider text-blue-600 mb-1">
                  Latest AI output
                </div>
                <p className="text-[11px] text-blue-900 leading-relaxed">
                  {nextPendingSubtask.doerResult.summary}
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-2xl bg-green-50/60 border border-green-100 px-4 py-4 flex items-center justify-between gap-4">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.15em] text-green-700 mb-1">
                All steps complete
              </div>
              <div className="text-sm font-semibold text-[#0a192f] leading-snug">
                This task is ready to send to review.
              </div>
            </div>
            <button
              onClick={onMoveToReview}
              className="shrink-0 px-4 py-2 rounded-xl bg-green-600 hover:bg-green-700 text-white text-[11px] font-black uppercase tracking-wider transition-all active:scale-95 shadow-sm shadow-green-500/20 flex items-center gap-1.5"
            >
              Send to Review →
            </button>
          </div>
        )}

        {doer.state === 'working' && (
          <div className="rounded-2xl bg-violet-50/60 border border-violet-100 px-4 py-3">
            <div className="flex items-center gap-3 mb-1">
              <span className="w-2.5 h-2.5 rounded-full bg-violet-500 animate-pulse shrink-0" />
              <div className="text-[10px] font-black uppercase tracking-wider text-violet-700 flex-1">
                AI working
              </div>
            </div>
            <EtaIndicator
              mode="doer"
              running={true}
              label="Generating content"
              onAbort={() => doer.abort()}
            />
          </div>
        )}

        {doer.state === 'needs-input' && doer.envelope?.needsHumanInput && (
          <div className="rounded-2xl bg-amber-50/70 border border-amber-100 p-4 space-y-3">
            <div>
              <div className="text-[10px] font-black uppercase tracking-wider text-amber-700 mb-1">
                The Doer needs one thing
              </div>
              <p className="text-[11px] text-amber-900 leading-relaxed">
                {doer.envelope.needsHumanInput.question}
              </p>
            </div>
            <div className="flex gap-2">
              <input
                value={clarifyAnswer}
                onChange={(e) => setClarifyAnswer(e.target.value)}
                placeholder="Type your answer…"
                className="flex-1 min-w-0 bg-white border border-amber-200 rounded-xl px-3 py-2 text-sm text-[#0a192f] placeholder:text-slate-400 focus:outline-none focus:border-amber-400"
              />
              <button
                onClick={() => {
                  if (!clarifyAnswer.trim()) return
                  void doer.answerClarification(clarifyAnswer.trim())
                  setClarifyAnswer('')
                }}
                className="px-3 py-2 rounded-xl bg-amber-600 text-white text-xs font-black uppercase tracking-wider hover:bg-amber-700 transition-colors"
              >
                Send
              </button>
            </div>
          </div>
        )}

        {doer.state === 'result' && doer.envelope?.result && nextPendingSubtask && (
          <div className="rounded-2xl bg-white border border-blue-100 overflow-hidden">
            <div className="px-4 py-2.5 border-b border-blue-100 bg-blue-50/50">
              <div className="text-[10px] font-black uppercase tracking-wider text-blue-700">
                Draft output for this step
              </div>
            </div>
            <div className="px-4 py-4 space-y-3">
              <p className="text-[11px] italic text-slate-600 leading-relaxed">
                “{doer.envelope.stepUnderstanding}”
              </p>
              <div className="rounded-xl bg-slate-50 border border-slate-100 p-3">
                <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                  Summary
                </div>
                <p className="text-[11px] text-[#0a192f] leading-relaxed">
                  {doer.envelope.result.summary}
                </p>
              </div>
              <div className="rounded-xl bg-slate-50 border border-slate-100 p-3">
                <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                  Deliverable
                </div>
                <div className="prose prose-sm max-w-none text-[#0a192f] whitespace-pre-wrap">
                  {doer.envelope.result.artifact}
                </div>
              </div>
              {doer.envelope.result.nextAction && (
                <div className="text-[11px] text-blue-700 font-medium">
                  Next: {doer.envelope.result.nextAction}
                </div>
              )}
              <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-3 space-y-2">
                <div className="text-[10px] font-black uppercase tracking-wider text-indigo-700">
                  Refine with prompt
                </div>
                <div className="flex gap-2">
                  <input
                    value={refinePrompt}
                    onChange={(e) => setRefinePrompt(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey && refinePrompt.trim()) {
                        e.preventDefault()
                        void doer.refineOutput(refinePrompt.trim())
                        setRefinePrompt('')
                      }
                    }}
                    placeholder="e.g. make it shorter, use formal tone…"
                    className="flex-1 min-w-0 bg-white border border-indigo-200 rounded-xl px-3 py-2 text-sm text-[#0a192f] placeholder:text-slate-400 focus:outline-none focus:border-indigo-400"
                  />
                  <button
                    onClick={() => {
                      if (!refinePrompt.trim()) return
                      void doer.refineOutput(refinePrompt.trim())
                      setRefinePrompt('')
                    }}
                    className="px-3 py-2 rounded-xl bg-indigo-600 text-white text-xs font-black uppercase tracking-wider hover:bg-indigo-700 transition-colors"
                  >
                    Refine
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => doer.acceptCurrentStep()}
                  className="px-3 py-1.5 rounded-xl bg-green-600 text-white text-[10px] font-black uppercase tracking-wider hover:bg-green-700 transition-colors"
                >
                  Accept step
                </button>
                <button
                  onClick={() => doer.retryCurrentStep()}
                  className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 text-[10px] font-bold uppercase tracking-wider hover:bg-slate-100 transition-colors"
                >
                  Try again
                </button>
              </div>
            </div>
          </div>
        )}

        {allDone && (
          <div className="flex items-center justify-end">
            <button
              onClick={onMoveToReview}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-indigo-600 text-white text-[10px] font-black uppercase tracking-wider hover:bg-indigo-700 transition-colors active:scale-95 shadow-sm"
            >
              Send to review
            </button>
          </div>
        )}
      </div>
    </div>
  )
}


// ___ Reviewer verdict + action sub-components (#9) _________________________

function ReviewerVerdictBadge({ envelope }: { envelope: ReviewerEnvelope }) {
  const verdict = deriveVerdict(envelope)
  const meta = verdictBadge(verdict)
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${meta.tone}`}>
      {meta.label}
    </span>
  )
}

interface ReviewerActionBarProps {
  nextAction: NextAction | null
  onApprove: () => void
  onSendBackToDoer: () => void
  onReviewAgain: () => void
}

function ReviewerActionBar({
  nextAction,
  onApprove,
  onSendBackToDoer,
  onReviewAgain,
}: ReviewerActionBarProps) {
  if (!nextAction) {
    return (
      <button
        onClick={onReviewAgain}
        className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 text-[10px] font-bold uppercase tracking-wider hover:bg-slate-100 transition-colors"
      >
        Review again
      </button>
    )
  }

  if (nextAction.kind === 'approve_done') {
    return (
      <div className="flex items-center gap-2 flex-wrap">
        <button onClick={onApprove} className="px-3 py-1.5 rounded-xl bg-green-600 text-white text-[10px] font-black uppercase tracking-wider hover:bg-green-700 transition-colors">
          Approve task (DONE)
        </button>
        <button onClick={onReviewAgain} className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 text-[10px] font-bold uppercase tracking-wider hover:bg-slate-100 transition-colors">
          Review again
        </button>
      </div>
    )
  }

  if (nextAction.kind === 'auto_retry') {
    return (
      <div className="flex items-center gap-2 flex-wrap">
        <button onClick={onSendBackToDoer} className="px-3 py-1.5 rounded-xl bg-amber-600 text-white text-[10px] font-black uppercase tracking-wider hover:bg-amber-700 transition-colors" title="Returns the task to IN_PROGRESS so the Doer can address the findings">
          Send back to Doer (iteration {nextAction.iteration})
        </button>
        <button onClick={onApprove} className="px-3 py-1.5 rounded-xl bg-white border border-green-200 text-green-700 text-[10px] font-bold uppercase tracking-wider hover:bg-green-50 transition-colors" title="Approve anyway despite reviewer findings">
          Approve anyway
        </button>
      </div>
    )
  }

  if (nextAction.kind === 'escalate_replan') {
    return (
      <div className="space-y-2">
        <div className="rounded-xl bg-rose-50 border border-rose-100 p-3 text-[11px] text-rose-900 leading-relaxed">
          <strong>Reviewer thinks the underlying plan is wrong.</strong> Open this task in Mission Control and use "Re-plan task" instead of running the Doer again.
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={onSendBackToDoer} className="px-3 py-1.5 rounded-xl bg-rose-600 text-white text-[10px] font-black uppercase tracking-wider hover:bg-rose-700 transition-colors">
            Send back (planner-aware)
          </button>
          <button onClick={onApprove} className="px-3 py-1.5 rounded-xl bg-white border border-green-200 text-green-700 text-[10px] font-bold uppercase tracking-wider hover:bg-green-50 transition-colors">
            Approve anyway
          </button>
        </div>
      </div>
    )
  }

  if (nextAction.kind === 'await_human_clarification') {
    // Shouldn't normally appear in the result pathway (the hook pins it to
    // state='needs-input'), but guard anyway to keep type-narrowing happy.
    return (
      <button
        onClick={onReviewAgain}
        className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 text-[10px] font-bold uppercase tracking-wider hover:bg-slate-100 transition-colors"
      >
        Review again
      </button>
    )
  }

  // human_gate — exhaustive fallthrough
  return (
    <div className="space-y-2">
      <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-[11px] text-rose-900 leading-relaxed">
        <strong>Stuck on this task.</strong> {nextAction.reason} Choose a path below.
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <button onClick={onApprove} className="px-3 py-1.5 rounded-xl bg-green-600 text-white text-[10px] font-black uppercase tracking-wider hover:bg-green-700 transition-colors">
          Mark as DONE anyway
        </button>
        <button onClick={onSendBackToDoer} className="px-3 py-1.5 rounded-xl bg-slate-700 text-white text-[10px] font-bold uppercase tracking-wider hover:bg-slate-800 transition-colors">
          Retry once more (manual)
        </button>
        <button onClick={onReviewAgain} className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 text-[10px] font-bold uppercase tracking-wider hover:bg-slate-100 transition-colors">
          Review again
        </button>
      </div>
    </div>
  )
}
