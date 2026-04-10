'use client'

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { AiAvatar } from '@/components/atoms/AiAvatar'

export interface ChatMessageBubbleProps {
  role: 'user' | 'assistant'
  content: string
  className?: string
}

export function ChatMessageBubble({ role, content, className }: ChatMessageBubbleProps) {
  return (
    <div className={`flex ${role === 'user' ? 'justify-end' : 'justify-start'} ${className || ''}`}>
      {role === 'assistant' && <AiAvatar className="mr-3 mt-1" />}
      <div
        className={`max-w-[80%] rounded-3xl px-5 py-4 text-sm leading-relaxed ${
          role === 'user'
            ? 'bg-[#0a192f] text-white rounded-br-lg'
            : 'bg-gray-50 text-[#0a192f] rounded-bl-lg'
        }`}
      >
        {role === 'assistant' ? (
          <div className="prose prose-sm max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
          </div>
        ) : (
          content
        )}
      </div>
    </div>
  )
}
