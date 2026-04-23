'use client'

import type { WorkpadEntry } from '@/types/domain'

export function WorkpadPanel({
  workpad,
  onUpdate,
}: {
  workpad: WorkpadEntry | null | undefined
  onUpdate: (patch: Partial<WorkpadEntry>) => void
}) {
  if (!workpad) return null

  return (
    <section className="rounded-[1.5rem] border border-slate-200/90 bg-white shadow-[0_10px_26px_rgba(15,23,42,0.04)] overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)]">
        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Project Workpad</p>
        <h3 className="mt-1 text-sm font-bold text-[#0a192f]">Single source of current project truth</h3>
      </div>
      <div className="px-6 py-5 space-y-4">
        <EditableList label="Assumptions" values={workpad.assumptions} onChange={(values) => onUpdate({ assumptions: values })} />
        <EditableList label="Blockers" values={workpad.blockers} onChange={(values) => onUpdate({ blockers: values })} />
        <EditableList label="Validation notes" values={workpad.validationNotes} onChange={(values) => onUpdate({ validationNotes: values })} />
        <EditableList label="Proof of work" values={workpad.proofOfWork} onChange={(values) => onUpdate({ proofOfWork: values })} />
      </div>
    </section>
  )
}

function EditableList({
  label,
  values,
  onChange,
}: {
  label: string
  values: string[]
  onChange: (values: string[]) => void
}) {
  return (
    <div>
      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400 mb-2">{label}</p>
      <textarea
        value={values.join('\n')}
        onChange={(e) => onChange(e.target.value.split(/\r?\n/).map((v) => v.trim()).filter(Boolean))}
        rows={4}
        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 leading-relaxed resize-y focus:outline-none focus:border-indigo-300"
        placeholder={`Add ${label.toLowerCase()}...`}
      />
    </div>
  )
}
