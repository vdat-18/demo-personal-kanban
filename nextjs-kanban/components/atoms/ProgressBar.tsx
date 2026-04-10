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
        'w-full h-2.5 bg-slate-50 rounded-full overflow-hidden border border-slate-100/50',
        trackClassName,
        className
      )}
    >
      <div
        className={cn(
          'bg-gradient-to-r from-blue-600 to-indigo-600 h-full rounded-full transition-all duration-1000',
          barClassName
        )}
        style={{ width: `${value}%` }}
      />
    </div>
  )
}
