'use client'

import { Send, StopCircle } from 'lucide-react'

export interface ChatInputProps {
  value: string
  onChange: (value: string) => void
  onSend: () => void
  placeholder?: string
  disabled?: boolean
  isStreaming?: boolean
  onAbort?: () => void
}

export function ChatInput({
  value,
  onChange,
  onSend,
  placeholder = 'Type a message...',
  disabled = false,
  isStreaming = false,
  onAbort,
}: ChatInputProps) {
  return (
    <div className="p-4 border-t border-gray-100 shrink-0">
      <div className="flex gap-3 items-end bg-gray-50 rounded-3xl px-5 py-3">
        <textarea
          className="flex-1 bg-transparent text-sm text-[#0a192f] placeholder:text-gray-300 resize-none outline-none min-h-[20px] max-h-32"
          placeholder={placeholder}
          rows={1}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              onSend()
            }
          }}
          disabled={disabled || isStreaming}
        />
        {isStreaming ? (
          <button
            onClick={onAbort}
            className="w-9 h-9 rounded-2xl bg-red-500 text-white flex items-center justify-center hover:bg-red-600 transition-colors shrink-0"
            title="Stop streaming"
          >
            <StopCircle className="w-4 h-4" />
          </button>
        ) : (
          <button
            onClick={onSend}
            disabled={!value.trim()}
            className="w-9 h-9 rounded-2xl bg-[#0a192f] text-white flex items-center justify-center hover:bg-blue-900 transition-colors disabled:opacity-30 shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        )}
      </div>
      {isStreaming && (
        <p className="text-[10px] text-gray-300 mt-2 px-2 font-medium">
          Press Enter to send · Shift+Enter for new line
        </p>
      )}
    </div>
  )
}
