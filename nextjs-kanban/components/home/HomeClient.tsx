'use client'

import { useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Plus,
  Upload,
  Clock,
  X,
  ArrowRight,
  Sparkles,
  Layout,
  Trash2,
  Code2,
  Megaphone,
  TrendingUp,
  Truck,
} from 'lucide-react'

type ProjectDomain = 'SOFTWARE_ENGINEERING' | 'MARKETING' | 'SALES' | 'LOGISTICS'

const DOMAIN_OPTIONS: Array<{
  value: ProjectDomain
  label: string
  icon: typeof Code2
  color: string
  bgColor: string
  borderColor: string
  placeholder: string
}> = [
  { value: 'SOFTWARE_ENGINEERING', label: 'Software', icon: Code2, color: 'text-blue-600', bgColor: 'bg-blue-50', borderColor: 'border-blue-200', placeholder: 'e.g., E-commerce Platform Rebuild' },
  { value: 'MARKETING', label: 'Marketing', icon: Megaphone, color: 'text-purple-600', bgColor: 'bg-purple-50', borderColor: 'border-purple-200', placeholder: 'e.g., Q3 Product Launch Campaign' },
  { value: 'SALES', label: 'Sales', icon: TrendingUp, color: 'text-green-600', bgColor: 'bg-green-50', borderColor: 'border-green-200', placeholder: 'e.g., Enterprise Pipeline Expansion' },
  { value: 'LOGISTICS', label: 'Logistics', icon: Truck, color: 'text-orange-600', bgColor: 'bg-orange-50', borderColor: 'border-orange-200', placeholder: 'e.g., Warehouse Fulfillment Optimization' },
]

interface Project {
  id: string
  name: string
  description?: string | null
  domain?: ProjectDomain
  status: string
  createdAt: string
  tasks: Array<{ id: string; status: string }>
}

interface HomeClientProps {
  initialProjects: Project[]
}

export function HomeClient({ initialProjects }: HomeClientProps) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [projects, setProjects] = useState<Project[]>(initialProjects)
  const [showModal, setShowModal] = useState(false)
  const [projectName, setProjectName] = useState('')
  const [selectedDomain, setSelectedDomain] = useState<ProjectDomain>('SOFTWARE_ENGINEERING')
  const [importMode, setImportMode] = useState(false)
  const [isCreating, setIsCreating] = useState(false)

  const handleStartProject = useCallback(async () => {
    if (!projectName.trim()) return
    setIsCreating(true)
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: projectName, description: `Drafting project vision for ${projectName}...`, domain: selectedDomain }),
      })
      if (!res.ok) throw new Error('Failed to create project')
      const newProject: Project = await res.json()
      setProjects((prev) => [newProject, ...prev])
      setShowModal(false)
      setProjectName('')
      router.push(`/planning/${newProject.id}`)
    } catch (err) {
      console.error(err)
    } finally {
      setIsCreating(false)
    }
  }, [projectName, selectedDomain, router])

  const handleDeleteProject = useCallback(async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    if (!window.confirm('Are you sure you want to delete this project?')) return
    try {
      await fetch(`/api/projects/${id}`, { method: 'DELETE' })
      setProjects((prev) => prev.filter((p) => p.id !== id))
    } catch (err) {
      console.error(err)
    }
  }, [])

  const triggerFileInput = () => fileInputRef.current?.click()
  const handleFileChange = () => handleStartProject()

  return (
    <div className="h-full w-full bg-[#f8fbfe] flex flex-col overflow-hidden font-sans text-slate-900">
      {/* Scrollable Container */}
      <div className="flex-1 overflow-y-auto px-6 py-8 md:px-12 lg:px-20">
        <div className="max-w-7xl mx-auto space-y-10 pb-20">

          {/* Hero Header */}
          <header className="animate-in fade-in slide-in-from-top-4 duration-700">
            <h1 className="text-5xl md:text-6xl font-black tracking-tight text-[#0a192f] leading-[1.1] mb-6">
              Hi! What do you want to<br />work on today?
            </h1>
            <p className="text-lg md:text-xl text-slate-400 font-medium max-w-xl leading-relaxed">
              Let AgentForEveryone help you organize, plan, and execute your most ambitious projects in real-time.
            </p>
          </header>

          {/* Action Cards */}
          <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in slide-in-from-bottom-6 duration-1000 delay-150">
            <div className="lg:col-span-8 bg-white rounded-[40px] p-10 md:p-14 border border-white shadow-2xl shadow-blue-900/5 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-blue-50/40 to-transparent pointer-events-none" />
              <div className="relative z-10 h-full flex flex-col justify-between">
                <div>
                  <div className="w-16 h-16 rounded-[24px] bg-[#0a192f] text-white flex items-center justify-center mb-10 shadow-xl shadow-blue-900/20 group-hover:scale-110 transition-transform duration-500">
                    <Plus className="w-8 h-8" />
                  </div>
                  <h2 className="text-4xl md:text-5xl font-black text-[#0a192f] mb-6 tracking-tighter">Initiate a new journey</h2>
                  <p className="text-lg md:text-xl text-slate-400 font-medium max-w-md leading-relaxed mb-8">
                    Start from scratch or import documents to let AI build your execution plan.
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-4">
                  <button
                    onClick={() => { setImportMode(false); setShowModal(true) }}
                    className="flex-1 flex items-center justify-between px-8 py-6 rounded-3xl bg-[#0a192f] hover:bg-blue-900 transition-all duration-300 font-black text-white shadow-xl shadow-blue-900/10 hover:-translate-y-1 active:scale-95"
                  >
                    <div className="flex flex-col items-start text-left">
                      <span className="text-lg uppercase tracking-wider text-xs opacity-60 mb-1">Method 01</span>
                      <span className="text-xl">New Project</span>
                    </div>
                    <ArrowRight className="w-6 h-6 text-blue-400" />
                  </button>
                  <button
                    onClick={() => { setImportMode(true); setShowModal(true) }}
                    className="flex-1 flex items-center justify-between px-8 py-6 rounded-3xl bg-slate-50 border border-slate-100 hover:border-[#0a192f] hover:bg-white transition-all duration-300 font-black text-slate-700 hover:-translate-y-1 active:scale-95"
                  >
                    <div className="flex flex-col items-start text-left">
                      <span className="text-lg uppercase tracking-wider text-xs opacity-40 mb-1">Method 02</span>
                      <span className="text-xl">Import Data</span>
                    </div>
                    <Upload className="w-6 h-6 text-slate-300" />
                  </button>
                  <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileChange} />
                </div>
              </div>
            </div>

            <div className="lg:col-span-4 space-y-6">
              <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-[40px] p-10 text-white shadow-2xl shadow-blue-500/20 relative overflow-hidden h-full flex flex-col justify-center">
                <Sparkles className="absolute -top-4 -right-4 w-32 h-32 text-white/10 rotate-12" />
                <h3 className="text-2xl font-black mb-4">AI Ready</h3>
                <p className="text-blue-100 text-sm font-medium leading-relaxed opacity-80">
                  Our advanced agents are standing by to help you strategize and automate your workflow.
                </p>
                <div className="mt-8 flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-white/60">System Operational</span>
                </div>
              </div>
            </div>
          </section>

          {/* Recent Projects */}
          <section className="animate-in fade-in slide-in-from-bottom-6 duration-1000 delay-300">
            <div className="flex justify-between items-end mb-8 px-2">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-4 h-4 text-blue-500" />
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">History</span>
                </div>
                <h2 className="text-3xl font-black text-slate-900 tracking-tight">Recent Projects</h2>
              </div>
              <span className="text-xs font-black text-blue-600 uppercase tracking-widest">
                {projects.length > 0 ? `${projects.length} total` : ''}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
              {projects.length === 0 ? (
                <div className="col-span-full py-24 flex flex-col items-center justify-center border-4 border-dashed border-slate-100 rounded-[50px] bg-white/50">
                  <div className="w-24 h-24 rounded-[40px] bg-slate-50 flex items-center justify-center text-slate-200 mb-6">
                    <Layout className="w-10 h-10" />
                  </div>
                  <p className="text-lg font-black text-slate-300 uppercase tracking-widest text-center max-w-xs">
                    Your journeys will appear here
                  </p>
                </div>
              ) : (
                projects.slice(0, 6).map((project) => {
                  const completedTasks = project.tasks?.filter((t) => t.status === 'DONE').length || 0
                  const totalTasks = project.tasks?.length || 0
                  const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

                  return (
                    <div
                      key={project.id}
                      onClick={() => router.push(`/planning/${project.id}`)}
                      className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-[0_10px_30px_-15px_rgba(0,0,0,0.05)] hover:shadow-2xl hover:shadow-blue-900/5 hover:-translate-y-2 transition-all duration-500 cursor-pointer group"
                    >
                      <div className="flex justify-between items-start mb-8">
                        <div className="px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border bg-blue-50 text-blue-600 border-blue-100">
                          {project.status || 'planning'}
                        </div>
                        <div className="flex -space-x-2">
                          <div className="w-7 h-7 rounded-full bg-slate-800 border-2 border-white" />
                          <div className="w-7 h-7 rounded-full bg-blue-500 border-2 border-white flex items-center justify-center text-[8px] font-black text-white">AI</div>
                        </div>
                        <button
                          onClick={(e) => handleDeleteProject(e, project.id)}
                          className="p-2 ml-2 rounded-xl text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <h3 className="text-2xl font-black mb-10 text-slate-800 line-clamp-2 leading-tight group-hover:text-blue-600 transition-colors">
                        {project.name}
                      </h3>

                      <div className="space-y-4">
                        <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          <span>Progress</span>
                          <span className="text-slate-900">{progress}%</span>
                        </div>
                        <div className="w-full h-2.5 bg-slate-50 rounded-full overflow-hidden border border-slate-100/50">
                          <div
                            className="bg-gradient-to-r from-blue-600 to-indigo-600 h-full rounded-full transition-all duration-1000"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </section>
        </div>
      </div>

      {/* Create Project Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 pb-20">
          <div
            className="absolute inset-0 bg-[#0a192f]/80 backdrop-blur-md animate-in fade-in duration-500"
            onClick={() => setShowModal(false)}
          />
          <div className="bg-white w-full max-w-xl rounded-[48px] shadow-2xl relative z-10 overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-12 flex flex-col items-center">
              <button
                onClick={() => setShowModal(false)}
                className="absolute top-8 right-10 p-4 text-slate-300 hover:text-slate-900 hover:bg-slate-50 rounded-full transition-all"
              >
                <X className="w-6 h-6" />
              </button>
              <div className="w-20 h-20 rounded-[32px] bg-blue-50 text-blue-600 flex items-center justify-center mb-8 shadow-inner">
                <Plus className="w-10 h-10" />
              </div>
              <h3 className="text-3xl font-black text-slate-900 mb-3 tracking-tight">Project Identity</h3>
              <p className="text-slate-400 font-medium mb-8 text-center text-lg">
                Choose a domain and name your project.
              </p>

              {/* Domain Picker */}
              <div className="w-full grid grid-cols-4 gap-3 mb-8">
                {DOMAIN_OPTIONS.map(({ value, label, icon: Icon, color, bgColor, borderColor }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setSelectedDomain(value)}
                    className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all duration-200 ${
                      selectedDomain === value
                        ? `${bgColor} ${borderColor} ${color} scale-[1.02] shadow-md`
                        : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <Icon className="w-6 h-6" />
                    <span className="text-[10px] font-black uppercase tracking-wider">{label}</span>
                  </button>
                ))}
              </div>

              <div className="w-full space-y-6">
                <input
                  type="text"
                  placeholder={DOMAIN_OPTIONS.find((d) => d.value === selectedDomain)?.placeholder}
                  autoFocus
                  className="w-full bg-slate-50 border-4 border-slate-50 rounded-3xl px-8 py-6 text-xl text-slate-800 font-bold placeholder:text-slate-300 focus:border-blue-500/20 focus:bg-white outline-none transition-all shadow-inner"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && projectName.trim()) {
                      importMode ? triggerFileInput() : handleStartProject()
                    }
                  }}
                />
                <button
                  onClick={importMode ? triggerFileInput : handleStartProject}
                  disabled={!projectName.trim() || isCreating}
                  className={`w-full py-6 rounded-[30px] font-black text-lg uppercase tracking-widest text-white flex items-center justify-center gap-3 transition-all ${
                    !projectName.trim() || isCreating
                      ? 'bg-slate-100 text-slate-300 cursor-not-allowed'
                      : 'bg-gradient-to-r from-blue-600 to-indigo-700 shadow-xl shadow-blue-500/20 hover:scale-[1.02] active:scale-95'
                  }`}
                >
                  {isCreating ? 'Creating…' : importMode ? 'Upload & Start' : 'Begin Journey'}
                  <ArrowRight className="w-6 h-6" />
                </button>
              </div>
            </div>
            <div className="bg-slate-50 p-8 flex items-center justify-center border-t border-slate-100 italic text-[10px] text-slate-400 font-black uppercase tracking-[0.3em]">
              <Sparkles className="w-4 h-4 mr-3 text-blue-400" />
              AI-powered Planning Engine
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
