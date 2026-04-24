'use client'

import { useState } from 'react'
import { StopCircle, ChevronDown } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { ConversationHistoryPanel } from '@/components/molecules/ConversationHistoryPanel'
import { TokenCounter } from '@/components/molecules/TokenCounter'
import { ImportedSourcesPanel } from '@/components/molecules/ImportedSourcesPanel'
import { WorkflowNotesPanel } from '@/components/molecules/WorkflowNotesPanel'
import type { UITaskStatus, UIConversation, SubtaskApprovalStatus, TaskStatus, TaskPriority, ImportedSource, WorkflowContract, WorkpadEntry } from '@/types/domain'
import { getAllowedTransitions } from '@/lib/status-lifecycle'
import type { TaskStatusValue } from '@/lib/status-lifecycle'
import { formatTaskStatus, formatPriority } from '@/lib/display/format'

export interface TaskInfoSidebarProps {
  taskTitle: string
  taskDescription: string | null
  taskStatus: UITaskStatus
  taskPriority: string
  dependsOnTaskIds?: string[]
  blockedByTaskIds?: string[]
  runtimeState?: string | null
  runtimeLastAction?: string | null
  runtimeNextAction?: string | null
  runtimeRetryCount?: number
  runtimeBlockedReason?: string | null
  validationChecklist?: string[]
  acceptanceCriteria?: string[]
  proofOfWork?: string[]
subtasks?: Array<{
    id: string
    title: string
    completed: boolean
    description?: string | null
    output?: string | null
    approvalStatus?: SubtaskApprovalStatus | null
    doerResult?: {
      summary: string
      artifact: string
      nextAction: string | null
    } | null
  }>
  currentStep?: {
    id: string
    title: string
    description?: string | null
  } | null
  conversations: UIConversation[]
  isStreaming: boolean
  activeAgentLabel: string
  onUpdateStatus: (status: UITaskStatus) => void
  onAbort: () => void
  activityTimeline?: React.ReactNode
  importedSources?: ImportedSource[]
  workflowContract?: WorkflowContract | null
  workpad?: WorkpadEntry | null
}

export function TaskInfoSidebar({
  taskTitle,
  taskDescription,
  taskStatus,
  taskPriority,
  dependsOnTaskIds = [],
  blockedByTaskIds = [],
  runtimeState,
  runtimeLastAction,
  runtimeNextAction,
  runtimeRetryCount = 0,
  runtimeBlockedReason,
  validationChecklist = [],
  acceptanceCriteria = [],
  proofOfWork = [],
  subtasks = [],
  currentStep,
  conversations,
  importedSources = [],
  workflowContract,
  workpad,
  isStreaming,
  activeAgentLabel,
  onUpdateStatus,
  onAbort,
  activityTimeline,
}: TaskInfoSidebarProps) {
  const [expandedStepId, setExpandedStepId] = useState<string | null>(null)
  const [projectContextTab, setProjectContextTab] = useState<'sources' | 'notes' | null>(null)

  const taskTokenUsage = conversations.reduce(
    (acc, c) => ({
      input: acc.input + (c.tokenUsage?.input ?? 0),
      output: acc.output + (c.tokenUsage?.output ?? 0),
    }),
    { input: 0, output: 0 },
  )

  return (
    <div className="w-full h-full overflow-y-auto p-6 flex flex-col gap-6 shrink-0">
      {/* Status Controls */}
      <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm">
        <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">
          Update Status
        </h3>
        <div className="flex flex-col gap-2">
          <div className="py-2 px-3 rounded-xl text-xs font-black uppercase tracking-wider text-center bg-[#0a192f] text-white">
            {formatTaskStatus(taskStatus as TaskStatus).label}
          </div>
          {getAllowedTransitions(taskStatus as TaskStatusValue).length > 0 ? (
            <div className="grid grid-cols-2 gap-2">
              {getAllowedTransitions(taskStatus as TaskStatusValue).map((s) => (
                <button
                  key={s}
                  onClick={() => onUpdateStatus(s as UITaskStatus)}
                  className="py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-colors bg-gray-50 text-gray-500 hover:bg-gray-100"
                >
                  → {formatTaskStatus(s as TaskStatus).label}
                </button>
              ))}
            </div>
          ) : (
            <p className="text-[10px] text-gray-400 text-center font-medium py-1">
              No transitions available (terminal state)
            </p>
          )}
        </div>
      </div>

      {/* Task Details */}
      <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm">
        <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">
          Task Details
        </h3>
        <p className="font-bold text-sm text-[#0a192f] mb-2">{taskTitle}</p>
        {taskDescription && (
          <p className="text-xs text-gray-500 leading-relaxed">{taskDescription}</p>
        )}
        <div className="mt-3 pt-3 border-t border-gray-50 flex items-center justify-between">
          <span className="text-xs font-bold text-gray-400">Priority</span>
          <span className="text-xs font-bold text-[#0a192f]">{formatPriority(taskPriority as TaskPriority).label}</span>
        </div>
        {(taskTokenUsage.input > 0 || taskTokenUsage.output > 0) && (
          <div className="mt-2 pt-2 border-t border-gray-50 flex items-center justify-between">
            <span className="text-xs font-bold text-gray-400">Tokens</span>
            <TokenCounter input={taskTokenUsage.input} output={taskTokenUsage.output} />
          </div>
        )}
        {(dependsOnTaskIds.length > 0 || blockedByTaskIds.length > 0 || runtimeState) && (
          <div className="mt-3 pt-3 border-t border-gray-50 space-y-2">
            {dependsOnTaskIds.length > 0 && (
              <div className="text-xs text-slate-500">Depends on {dependsOnTaskIds.length} task{dependsOnTaskIds.length === 1 ? '' : 's'}</div>
            )}
            {blockedByTaskIds.length > 0 && (
              <div className="text-xs text-amber-600 font-semibold">Blocked by {blockedByTaskIds.length} task{blockedByTaskIds.length === 1 ? '' : 's'}</div>
            )}
            {runtimeState && runtimeState.toLowerCase() !== 'idle' && (
              <div className="text-xs text-blue-600 font-semibold uppercase tracking-[0.12em]">{runtimeState}</div>
            )}
            {runtimeLastAction && <div className="text-xs text-slate-500">Last action: {runtimeLastAction}</div>}
            {runtimeNextAction && <div className="text-xs text-slate-700 font-medium">Next action: {runtimeNextAction}</div>}
            {runtimeRetryCount > 0 && <div className="text-xs text-slate-500">Retries: {runtimeRetryCount}</div>}
            {runtimeBlockedReason && <div className="text-xs text-rose-600">Blocked reason: {runtimeBlockedReason}</div>}
          </div>
        )}
      </div>

      {(validationChecklist.length > 0 || acceptanceCriteria.length > 0 || proofOfWork.length > 0) && (
        <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm">
          <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">
            Validation
          </h3>
          {acceptanceCriteria.length > 0 && (
            <div className="mb-4">
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-[0.12em] mb-2">Acceptance criteria</p>
              <div className="space-y-1">
                {acceptanceCriteria.map((item) => (
                  <p key={item} className="text-xs text-slate-600 leading-relaxed">{item}</p>
                ))}
              </div>
            </div>
          )}
          {validationChecklist.length > 0 && (
            <div className="mb-4">
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-[0.12em] mb-2">Validation checklist</p>
              <div className="space-y-1">
                {validationChecklist.map((item) => (
                  <p key={item} className="text-xs text-slate-600 leading-relaxed">{item}</p>
                ))}
              </div>
            </div>
          )}
          {proofOfWork.length > 0 && (
            <div>
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-[0.12em] mb-2">Proof of work</p>
              <div className="space-y-1">
                {proofOfWork.map((item) => (
                  <p key={item} className="text-xs text-slate-600 leading-relaxed">{item}</p>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Current step */}
      {currentStep && (
        <div className="bg-white rounded-3xl p-5 border border-blue-100 shadow-sm">
          <h3 className="text-xs font-black text-blue-500 uppercase tracking-widest mb-3">
            Current Step
          </h3>
          <p className="font-bold text-sm text-[#0a192f] mb-1">{currentStep.title}</p>
          {currentStep.description && (
            <p className="text-xs text-slate-500 leading-relaxed">{currentStep.description}</p>
          )}
        </div>
      )}

{/* Subtasks - Steps (approved) */}
      {subtasks.filter(s => s.approvalStatus === 'approved').length > 0 && (
        <div className="bg-white rounded-3xl p-5 border border-green-100 shadow-sm">
          <h3 className="text-xs font-black text-green-600 uppercase tracking-widest mb-3">
            Steps
          </h3>
          <div className="space-y-2">
            {subtasks.filter(s => s.approvalStatus === 'approved').map((sub) => {
              const isExpanded = expandedStepId === sub.id
              const hasOutput = !!(sub.doerResult?.artifact || sub.doerResult?.summary || sub.output)
              return (
                <div key={sub.id} className={`rounded-xl border ${sub.completed ? 'border-slate-100 bg-slate-50' : 'border-green-100 bg-green-50/30'}`}>
                  {/* Step header row */}
                  <div className="flex items-center gap-2 px-3 py-2">
                    <span className="text-[11px] text-green-600 shrink-0">{sub.completed ? '☑' : '☐'}</span>
                    <div className="flex-1 min-w-0">
                      <div className={`text-xs font-semibold leading-snug ${sub.completed ? 'line-through text-slate-400' : 'text-[#0a192f]'}`}>
                        {sub.title}
                      </div>
                      {sub.description && !isExpanded && (
                        <div className="text-[10px] text-slate-400 mt-0.5 truncate">{sub.description}</div>
                      )}
                    </div>
                    {hasOutput && (
                      <button
                        onClick={() => setExpandedStepId(isExpanded ? null : sub.id)}
                        className="shrink-0 flex items-center gap-0.5 text-[10px] font-bold text-blue-500 hover:text-blue-700 transition-colors"
                        title={isExpanded ? 'Collapse output' : 'View output'}
                      >
                        <span>{isExpanded ? 'Hide' : 'Output'}</span>
                        <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                      </button>
                    )}
                  </div>

                  {/* Expanded output */}
                  {isExpanded && (
                    <div className="px-3 pb-3 border-t border-blue-50">
                      {sub.description && (
                        <p className="text-[11px] text-slate-500 mt-2 mb-2 leading-relaxed">{sub.description}</p>
                      )}
                      <div className="mt-2 rounded-lg bg-white border border-blue-100 px-3 py-2.5">
                        <div className="text-[9px] font-black uppercase tracking-wider text-blue-500 mb-1.5">
                          AI Draft Output
                        </div>
                        <div className="prose prose-xs max-w-none text-slate-700 prose-p:my-1 prose-p:leading-relaxed prose-li:my-0.5 prose-headings:text-[#0a192f] prose-headings:font-bold prose-headings:text-xs prose-strong:font-semibold prose-code:text-[10px] prose-code:bg-slate-100 prose-code:px-1 prose-code:rounded">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {sub.doerResult?.artifact || sub.doerResult?.summary || sub.output || ''}
                          </ReactMarkdown>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Subtasks - Denied */}
      {subtasks.filter(s => s.approvalStatus === 'denied').length > 0 && (
        <div className="bg-white rounded-3xl p-5 border border-red-100 shadow-sm">
          <h3 className="text-xs font-black text-red-500 uppercase tracking-widest mb-3">
            Denied
          </h3>
          <div className="space-y-1.5">
            {subtasks.filter(s => s.approvalStatus === 'denied').map((sub) => (
              <div key={sub.id} className="flex items-start gap-2 rounded-xl px-2 py-1 bg-red-50/40">
                <span className="mt-0.5 text-[11px] text-red-500">✗</span>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-semibold leading-snug text-[#0a192f]">
                    {sub.title}
                  </div>
                  {sub.description && (
                    <div className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">{sub.description}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Conversation History */}
      {conversations.length > 0 && (
        <ConversationHistoryPanel conversations={conversations} />
      )}

      {/* Project Context: Sources + Workflow Notes */}
      {(importedSources.length > 0 || workflowContract) && (
        <div className="bg-white rounded-3xl border border-indigo-100 shadow-sm overflow-hidden">
          <div className="flex border-b border-indigo-50">
            {importedSources.length > 0 && (
              <button
                onClick={() => setProjectContextTab(projectContextTab === 'sources' ? null : 'sources')}
                className={`flex-1 py-2.5 text-[10px] font-black uppercase tracking-widest transition-colors ${projectContextTab === 'sources' ? 'text-indigo-700 bg-indigo-50' : 'text-gray-400 hover:bg-gray-50'}`}
              >
                Sources
              </button>
            )}
            {workflowContract && (
              <button
                onClick={() => setProjectContextTab(projectContextTab === 'notes' ? null : 'notes')}
                className={`flex-1 py-2.5 text-[10px] font-black uppercase tracking-widest transition-colors ${projectContextTab === 'notes' ? 'text-indigo-700 bg-indigo-50' : 'text-gray-400 hover:bg-gray-50'}`}
              >
                Workflow Notes
              </button>
            )}
          </div>
          {projectContextTab === 'sources' && importedSources.length > 0 && (
            <div className="p-2 [&_section>div:first-child]:hidden">
              <ImportedSourcesPanel sources={importedSources} />
            </div>
          )}
          {projectContextTab === 'notes' && workflowContract && (
            <div className="p-2 [&_section>div:first-child]:hidden">
              <WorkflowNotesPanel contract={workflowContract} workpad={workpad} onUpdateWorkpad={() => {}} />
            </div>
          )}
        </div>
      )}

      {/* Activity timeline */}
      {activityTimeline && (
        <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm">
          <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">
            Activity
          </h3>
          {activityTimeline}
        </div>
      )}

      {/* Streaming status card */}
      {isStreaming && (
        <div className="bg-blue-50 rounded-3xl p-5 border border-blue-100">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            <h3 className="text-xs font-black text-blue-600 uppercase tracking-widest">
              Live Stream
            </h3>
          </div>
          <p className="text-xs text-blue-500 font-medium">
            {activeAgentLabel} is processing your request in real-time...
          </p>
          <button
            onClick={onAbort}
            className="mt-3 w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold text-red-500 bg-white border border-red-100 hover:bg-red-50 transition-colors"
          >
            <StopCircle className="w-3 h-3" /> Stop
          </button>
        </div>
      )}
    </div>
  )
}
