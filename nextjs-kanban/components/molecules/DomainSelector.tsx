'use client'

import { Code2, Megaphone, TrendingUp, Truck } from 'lucide-react'
import type { ProjectDomain } from '@/types/domain'

interface DomainOption {
  value: ProjectDomain
  label: string
  icon: typeof Code2
  color: string
  bgColor: string
  borderColor: string
}

const DOMAIN_OPTIONS: DomainOption[] = [
  { value: 'SOFTWARE_ENGINEERING', label: 'Software', icon: Code2, color: 'text-blue-600', bgColor: 'bg-blue-50', borderColor: 'border-blue-200' },
  { value: 'MARKETING', label: 'Marketing', icon: Megaphone, color: 'text-purple-600', bgColor: 'bg-purple-50', borderColor: 'border-purple-200' },
  { value: 'SALES', label: 'Sales', icon: TrendingUp, color: 'text-green-600', bgColor: 'bg-green-50', borderColor: 'border-green-200' },
  { value: 'LOGISTICS', label: 'Logistics', icon: Truck, color: 'text-orange-600', bgColor: 'bg-orange-50', borderColor: 'border-orange-200' },
]

export interface DomainSelectorProps {
  selected: ProjectDomain
  onSelect: (domain: ProjectDomain) => void
}

export function DomainSelector({ selected, onSelect }: DomainSelectorProps) {
  return (
    <div className="w-full grid grid-cols-4 gap-3">
      {DOMAIN_OPTIONS.map(({ value, label, icon: Icon, color, bgColor, borderColor }) => (
        <button
          key={value}
          type="button"
          onClick={() => onSelect(value)}
          className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all duration-200 ${
            selected === value
              ? `${bgColor} ${borderColor} ${color} scale-[1.02] shadow-md`
              : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200 hover:bg-slate-50'
          }`}
        >
          <Icon className="w-6 h-6" />
          <span className="text-[10px] font-black uppercase tracking-wider">{label}</span>
        </button>
      ))}
    </div>
  )
}

/** Get placeholder text for a domain */
export function getDomainPlaceholder(domain: ProjectDomain): string {
  const map: Record<ProjectDomain, string> = {
    SOFTWARE_ENGINEERING: 'e.g., E-commerce Platform Rebuild',
    MARKETING: 'e.g., Q3 Product Launch Campaign',
    SALES: 'e.g., Enterprise Pipeline Expansion',
    LOGISTICS: 'e.g., Warehouse Fulfillment Optimization',
  }
  return map[domain]
}
