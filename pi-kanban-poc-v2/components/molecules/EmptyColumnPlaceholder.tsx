import { Archive } from 'lucide-react'
import type { UITaskStatus } from '@/types/domain'

export interface EmptyColumnPlaceholderProps {
  columnId: UITaskStatus
  isDropTarget?: boolean
}

export function EmptyColumnPlaceholder({ columnId, isDropTarget = false }: EmptyColumnPlaceholderProps) {
  return (
    <div className={`flex-1 flex flex-col items-center justify-center py-16 border-2 border-dashed rounded-[2.5rem] bg-white/30 ${
      isDropTarget ? 'border-blue-300' : columnId === 'BLOCKED' ? 'border-red-100' : 'border-gray-100'
    }`}>
      <Archive className={`w-12 h-12 mb-4 ${columnId === 'BLOCKED' ? 'text-red-100' : 'text-gray-100'}`} />
      <span className="text-[10px] font-black text-gray-300 uppercase tracking-[0.3em]">
        {isDropTarget ? 'Drop here' : 'Empty'}
      </span>
    </div>
  )
}
