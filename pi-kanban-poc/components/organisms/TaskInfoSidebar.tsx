'use client'

import { StopCircle } from 'lucide-react'
import { ConversationHistoryPanel } from '@/components/molecules/ConversationHistoryPanel'
import type { UITaskStatus, UIConversation } from '@/types/domain'
import { getAllowedTransitions } from '@/lib/status-lifecycle'
import type { TaskStatusValue } from '@/lib/status-lifecycle'

export interface TaskInfoSidebarProps {
  taskTitle: string
  taskDescription: string | null
  taskStatus: UITaskStatus
  taskPriority: string
  conversations: UIConversation[]
  isStreaming: boolean
  activeAgentLabel: string
  onUpdateStatus: (status: UITaskStatus) => void
  onAbort: () => void
}

export function TaskInfoSidebar({
  taskTitle,
  taskDescription,
  taskStatus,
  taskPriority,
  conversations,
  isStreaming,
  activeAgentLabel,
  onUpdateStatus,
  onAbort,
}: TaskInfoSidebarProps) {
  return (
    <div className="w-80 overflow-y-auto p-6 flex flex-col gap-6 shrink-0">
      {/* Status Controls */}
      <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm">
        <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">
          Update Status
        </h3>
        <div className="flex flex-col gap-2">
          <div className="py-2 px-3 rounded-xl text-xs font-black uppercase tracking-wider text-center bg-[#0a192f] text-white">
            {taskStatus}
          </div>
          {getAllowedTransitions(taskStatus as TaskStatusValue).length > 0 ? (
            <div className="grid grid-cols-2 gap-2">
              {getAllowedTransitions(taskStatus as TaskStatusValue).map((s) => (
                <button
                  key={s}
                  onClick={() => onUpdateStatus(s as UITaskStatus)}
                  className="py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-colors bg-gray-50 text-gray-500 hover:bg-gray-100"
                >
                  {s === 'BLOCKED' ? '⛔ BLOCK' : s === 'TODO' ? '↩ RESTORE' : `→ ${s}`}
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
          <span className="text-xs font-bold text-[#0a192f]">{taskPriority}</span>
        </div>
      </div>

      {/* Conversation History */}
      {conversations.length > 0 && (
        <ConversationHistoryPanel conversations={conversations} />
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
