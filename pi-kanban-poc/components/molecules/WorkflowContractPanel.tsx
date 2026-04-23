'use client'

import type { WorkflowContract } from '@/types/domain'

export function WorkflowContractPanel({ contract }: { contract: WorkflowContract }) {
  return (
    <section className="rounded-[1.5rem] border border-slate-200/90 bg-white shadow-[0_10px_26px_rgba(15,23,42,0.04)] overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)]">
        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Workflow Contract</p>
        <h3 className="mt-1 text-sm font-bold text-[#0a192f]">Rules for planning and execution</h3>
      </div>
      <div className="px-6 py-5 space-y-4 text-sm">
        <Section label="Objective" items={[contract.objective]} />
        <Section label="Execution entry" items={contract.executionEntryCriteria} />
        <Section label="Acceptance" items={contract.acceptanceCriteria} />
        <Section label="Validation" items={contract.validationChecklist} />
        <Section label="Done criteria" items={contract.doneCriteria} />
        <Section label="Review gate" items={[contract.reviewGate]} />
      </div>
    </section>
  )
}

function Section({ label, items }: { label: string; items: string[] }) {
  return (
    <div>
      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400 mb-2">{label}</p>
      <div className="space-y-2">
        {items.map((item) => (
          <p key={item} className="text-sm text-slate-700 leading-relaxed">{item}</p>
        ))}
      </div>
    </div>
  )
}
