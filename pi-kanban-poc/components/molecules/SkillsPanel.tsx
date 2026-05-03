'use client'

import { useState } from 'react'
import { Plus, Trash2, BookOpen } from 'lucide-react'
import { useKanbanStore } from '@/lib/storage/kanbanStore'

interface Props {
  projectId: string
}

export function SkillsPanel({ projectId }: Props) {
  const allSkills = useKanbanStore((s) => s.skills)
  const skills = allSkills.filter((sk) => sk.projectId === projectId)
  const createSkill = useKanbanStore((s) => s.createSkill)
  const deleteSkill = useKanbanStore((s) => s.deleteSkill)

  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')
  const [content, setContent] = useState('')

  const handleAdd = () => {
    if (!name.trim() || !content.trim()) return
    createSkill({ projectId, name: name.trim(), content: content.trim() })
    setName('')
    setContent('')
    setAdding(false)
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-indigo-500" />
          <h4 className="text-xs font-black uppercase tracking-widest text-slate-500">Skills</h4>
        </div>
        {!adding && (
          <button
            onClick={() => setAdding(true)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 text-[11px] font-bold hover:bg-indigo-100 transition-colors"
          >
            <Plus className="w-3 h-3" /> Add skill
          </button>
        )}
      </div>

      {skills.length === 0 && !adding && (
        <p className="text-[11px] text-slate-400 italic">
          No skills yet. Skills are reusable context — e.g. brand voice, technical constraints — injected into every AI agent in this project.
        </p>
      )}

      {skills.map((sk) => (
        <div key={sk.id} className="rounded-xl border border-slate-200 bg-white p-3">
          <div className="flex items-start gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-[#0a192f]">{sk.name}</p>
              <p className="text-[11px] text-slate-500 mt-1 whitespace-pre-wrap leading-relaxed">{sk.content}</p>
            </div>
            <button
              onClick={() => deleteSkill(sk.id)}
              className="p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors shrink-0"
              title="Delete skill"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ))}

      {adding && (
        <div className="rounded-xl border border-indigo-200 bg-indigo-50/40 p-3 space-y-2">
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Skill name (e.g. Brand voice)"
            className="w-full text-xs bg-white border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-400"
          />
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Skill content — injected into AI agents on every task execution in this project..."
            rows={4}
            className="w-full text-xs bg-white border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-400 resize-none leading-relaxed"
          />
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => { setAdding(false); setName(''); setContent('') }}
              className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleAdd}
              disabled={!name.trim() || !content.trim()}
              className="px-3 py-1.5 text-xs bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-40 transition-colors font-bold"
            >
              Add
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
