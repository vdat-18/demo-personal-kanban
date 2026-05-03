import { cn } from '@/lib/utils'

export interface ProgressBarProps {
  /** Percentage value from 0 to 100 */
  value: number
  className?: string
  trackClassName?: string
  barClassName?: string
}

export function ProgressBar({
  value,
  className,
  trackClassName,
  barClassName,
}: ProgressBarProps) {
  return (
    <div
      className={cn(
        'w-full h-2 bg-surface-muted rounded-full overflow-hidden',
        trackClassName,
        className,
      )}
    >
      <div
        className={cn('bg-brand h-full rounded-full transition-all duration-700', barClassName)}
        style={{ width: `${value}%` }}
      />
    </div>
  )
}
