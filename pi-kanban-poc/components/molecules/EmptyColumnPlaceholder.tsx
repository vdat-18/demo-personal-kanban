import { ListTodo, Zap, Eye, CheckCircle2, XCircle } from 'lucide-react'
import type { UITaskStatus } from '@/types/domain'

export interface EmptyColumnPlaceholderProps {
  columnId: UITaskStatus
  isDropTarget?: boolean
}

const COLUMN_EMPTY: Record<UITaskStatus, {
  icon: React.ReactNode
  hint: string
  border: string
  iconBg: string
}> = {
  TODO:        { icon: <ListTodo className="w-6 h-6 text-slate-300" />,   hint: 'No tasks yet',         border: 'border-slate-100',  iconBg: 'bg-slate-50' },
  IN_PROGRESS: { icon: <Zap className="w-6 h-6 text-blue-200" />,         hint: 'Nothing in progress',  border: 'border-blue-100',   iconBg: 'bg-blue-50/50' },
  IN_REVIEW:   { icon: <Eye className="w-6 h-6 text-amber-200" />,        hint: 'Nothing to review',    border: 'border-amber-100',  iconBg: 'bg-amber-50/50' },
  DONE:        { icon: <CheckCircle2 className="w-6 h-6 text-green-200" />, hint: 'Nothing done yet',   border: 'border-green-100',  iconBg: 'bg-green-50/50' },
  BLOCKED:     { icon: <XCircle className="w-6 h-6 text-red-200" />,      hint: 'Nothing blocked',      border: 'border-red-100',    iconBg: 'bg-red-50/30' },
}

export function EmptyColumnPlaceholder({ columnId, isDropTarget = false }: EmptyColumnPlaceholderProps) {
  const cfg = COLUMN_EMPTY[columnId]
  return (
    <div className={`flex-1 flex flex-col items-center justify-center py-12 gap-3 border-2 border-dashed rounded-[2rem] transition-all ${
      isDropTarget ? 'border-blue-300 bg-blue-50/40' : `${cfg.border} bg-white/20`
    }`}>
      <div className={`w-11 h-11 rounded-2xl ${cfg.iconBg} flex items-center justify-center`}>
        {cfg.icon}
      </div>
      <span className="text-[10px] font-bold text-slate-300 tracking-[0.2em] uppercase">
        {isDropTarget ? 'Drop here' : cfg.hint}
      </span>
    </div>
  )
}
