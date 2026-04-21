import { cn } from '@/lib/utils'
import type { UITaskStatus, TaskStatus } from '@/types/domain'
import { STATUS_COLORS } from '@/constants/status'
import { formatTaskStatus } from '@/lib/display/format'

export interface StatusPillProps {
  status: UITaskStatus
  className?: string
}

export function StatusPill({ status, className }: StatusPillProps) {
  return (
    <span
      className={cn(
        'text-[9px] font-black px-2 py-0.5 rounded-md tracking-[0.2em] uppercase border w-fit',
        STATUS_COLORS[status],
        className
      )}
    >
      {formatTaskStatus(status as TaskStatus).label}
    </span>
  )
}
