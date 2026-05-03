import { ListTodo, Zap, Eye, CheckCircle2, XCircle } from 'lucide-react'
import type { UITaskStatus } from '@/types/domain'

export interface EmptyColumnPlaceholderProps {
  columnId: UITaskStatus
  isDropTarget?: boolean
}

const COLUMN_EMPTY: Record<
  UITaskStatus,
  { icon: React.ReactNode; hint: string; iconBg: string }
> = {
  TODO: {
    icon: <ListTodo className="w-6 h-6 text-ink-subtle" />,
    hint: 'No tasks yet',
    iconBg: 'bg-surface-muted',
  },
  IN_PROGRESS: {
    icon: <Zap className="w-6 h-6 text-info/40" />,
    hint: 'Nothing in progress',
    iconBg: 'bg-info-bg/60',
  },
  IN_REVIEW: {
    icon: <Eye className="w-6 h-6 text-warning/40" />,
    hint: 'Nothing to review',
    iconBg: 'bg-warning-bg/60',
  },
  DONE: {
    icon: <CheckCircle2 className="w-6 h-6 text-success/40" />,
    hint: 'Nothing done yet',
    iconBg: 'bg-success-bg/60',
  },
  BLOCKED: {
    icon: <XCircle className="w-6 h-6 text-danger/40" />,
    hint: 'Nothing blocked',
    iconBg: 'bg-danger-bg/60',
  },
}

export function EmptyColumnPlaceholder({
  columnId,
  isDropTarget = false,
}: EmptyColumnPlaceholderProps) {
  const cfg = COLUMN_EMPTY[columnId]
  return (
    <div
      className={`flex-1 flex flex-col items-center justify-center py-12 gap-3 border-2 border-dashed rounded-2xl transition-all ${
        isDropTarget
          ? 'border-brand bg-brand-subtle/40'
          : 'border-line bg-surface/30'
      }`}
    >
      <div className={`w-11 h-11 rounded-xl ${cfg.iconBg} flex items-center justify-center`}>
        {cfg.icon}
      </div>
      <span className="text-micro text-ink-subtle">
        {isDropTarget ? 'Drop here' : cfg.hint}
      </span>
    </div>
  )
}
