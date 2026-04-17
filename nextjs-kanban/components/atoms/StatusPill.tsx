import { cn } from '@/lib/utils'
import type { UITaskStatus } from '@/types/domain'
import { STATUS_COLORS } from '@/constants/status'

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
      {status}
    </span>
  )
}
