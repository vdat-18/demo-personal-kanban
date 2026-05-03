'use client'

import type { WorkflowContract, WorkpadEntry } from '@/types/domain'
import { useI18n } from '@/lib/i18n/context'

export function WorkflowNotesPanel({
  contract,
  workpad,
  onUpdateWorkpad,
}: {
  contract: WorkflowContract
  workpad: WorkpadEntry | null | undefined
  onUpdateWorkpad: (patch: Partial<WorkpadEntry>) => void
}) {
  const { t } = useI18n()
  return (
    <section className="rounded-[1.5rem] border border-slate-200/90 bg-white shadow-[0_10px_26px_rgba(15,23,42,0.04)] overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)]">
        <p className="text-micro text-slate-400">{t('planning.workflowNotes', 'Workflow Notes')}</p>
        <h3 className="mt-1 text-sm font-bold text-ink">{t('planning.workflowNotesDescription', 'Rules, validation, and live project notes')}</h3>
      </div>

      <div className="px-6 py-5 space-y-5">
        <div className="space-y-4 text-sm">
          <Section label="Objective" items={[contract.objective]} />
          <Section label="Execution entry" items={contract.executionEntryCriteria} />
          <Section label="Acceptance" items={contract.acceptanceCriteria} />
          <Section label="Validation" items={contract.validationChecklist} />
          <Section label="Done criteria" items={contract.doneCriteria} />
          <Section label="Review gate" items={[contract.reviewGate]} />
        </div>

        {workpad && (
          <div className="rounded-[1.25rem] border border-slate-200 bg-slate-50/60 px-4 py-4">
            <p className="text-micro text-slate-400 mb-3">Live notes</p>
            <div className="space-y-4">
              <EditableList label="Assumptions" values={workpad.assumptions} onChange={(values) => onUpdateWorkpad({ assumptions: values })} />
              <EditableList label="Blockers" values={workpad.blockers} onChange={(values) => onUpdateWorkpad({ blockers: values })} />
              <EditableList label="Validation notes" values={workpad.validationNotes} onChange={(values) => onUpdateWorkpad({ validationNotes: values })} />
              <EditableList label="Proof of work" values={workpad.proofOfWork} onChange={(values) => onUpdateWorkpad({ proofOfWork: values })} />
            </div>
          </div>
        )}
      </div>
    </section>
  )
}

function Section({ label, items }: { label: string; items: string[] }) {
  return (
    <div>
      <p className="text-micro text-slate-400 mb-2">{label}</p>
      <div className="space-y-2">
        {items.map((item) => (
          <p key={item} className="text-sm text-slate-700 leading-relaxed">{item}</p>
        ))}
      </div>
    </div>
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
      <p className="text-micro text-slate-400 mb-2">{label}</p>
      <textarea
        value={values.join('\n')}
        onChange={(e) => onChange(e.target.value.split(/\r?\n/).map((v) => v.trim()).filter(Boolean))}
        rows={4}
        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 leading-relaxed resize-y focus:outline-none focus:border-brand-border"
        placeholder={`Add ${label.toLowerCase()}...`}
      />
    </div>
  )
}
