'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Sparkles } from 'lucide-react'
import { HeroSection } from '@/components/organisms/HeroSection'
import { ProjectGrid } from '@/components/organisms/ProjectGrid'
import { CreateProjectModal } from '@/components/molecules/CreateProjectModal'
import { useProjects, useCreateProject, useDeleteProject } from '@/lib/hooks/useProjects'
import {
  ensureOnboardingProject,
  isOnboardingSeen,
  markOnboardingSeen,
  ONBOARDING_PROJECT_NAME,
} from '@/lib/onboarding'

export function DashboardTemplate() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { data: projects = [] } = useProjects()
  const { mutateAsync: createProject } = useCreateProject()
  const { mutateAsync: deleteProject } = useDeleteProject()

  const [showModal, setShowModal] = useState(false)
  const [projectName, setProjectName] = useState('')
  const [importMode, setImportMode] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [showOnboardingHint, setShowOnboardingHint] = useState(false)

  // ─── Onboarding example (Tier 4.16) ───────────────────────────────────────
  // Surface the example as a dismissible hint card on first visit. We do not
  // auto-create the project — the user opts in by clicking the card.
  useEffect(() => {
    if (typeof window === 'undefined') return
    setShowOnboardingHint(!isOnboardingSeen())
  }, [])

  const openOnboardingExample = () => {
    const id = ensureOnboardingProject()
    markOnboardingSeen()
    setShowOnboardingHint(false)
    router.push(`/planning/${id}`)
  }

  const dismissOnboarding = () => {
    markOnboardingSeen()
    setShowOnboardingHint(false)
  }

  const handleStartProject = useCallback(async () => {
    if (!projectName.trim()) return
    setIsCreating(true)
    try {
      const project = await createProject({
        name: projectName,
        description: `Drafting plan for ${projectName}…`,
        domain: 'GENERAL',
      })
      setShowModal(false)
      setProjectName('')
      router.push(`/planning/${project.id}`)
    } catch (err) {
      console.error(err)
    } finally {
      setIsCreating(false)
    }
  }, [projectName, router, createProject])

  const handleDeleteProject = useCallback(
    async (e: React.MouseEvent, id: string) => {
      e.stopPropagation()
      if (!window.confirm('Are you sure you want to delete this project?')) return
      try {
        await deleteProject(id)
      } catch (err) {
        console.error(err)
      }
    },
    [deleteProject],
  )

  const triggerFileInput = () => fileInputRef.current?.click()
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return
    if (!projectName.trim()) {
      setImportMode(true)
      setShowModal(true)
      return
    }
    handleStartProject()
  }

  // Map projects to the shape ProjectGrid expects
  const gridProjects = projects.map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    domain: p.domain,
    status: p.status ?? 'planning',
    createdAt: p.createdAt,
    tasks: (p.tasks ?? []).map((t) => ({ id: t.id, status: t.status })),
  }))

  return (
    <div className="h-full w-full bg-transparent flex flex-col overflow-hidden font-sans text-slate-900">
      <div className="flex-1 overflow-y-auto px-6 py-10 md:px-10 lg:px-16">
        <div className="max-w-7xl mx-auto space-y-10 pb-20">
          <HeroSection
            onNewProject={() => {
              setImportMode(false)
              setShowModal(true)
            }}
            onImportProject={() => {
              setImportMode(true)
              setShowModal(true)
            }}
          />

          {showOnboardingHint && (
            <div className="rounded-[3rem] border border-indigo-100 bg-gradient-to-br from-indigo-50/80 via-white to-blue-50/60 p-8 shadow-md shadow-indigo-100/40 flex items-start gap-5 animate-in fade-in slide-in-from-top-4 duration-700">
              <div className="w-14 h-14 rounded-3xl bg-gradient-to-br from-indigo-500 to-blue-500 text-white flex items-center justify-center shadow-lg shadow-indigo-500/30 shrink-0">
                <Sparkles className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-black text-[#0a192f] mb-1">New here?</h3>
                <p className="text-sm text-slate-500 leading-relaxed mb-4">
                  See a complete walkthrough — discovery questions, drafted plan,
                  and approved tasks — based on a real-life event:{' '}
                  <strong className="text-[#0a192f]">{ONBOARDING_PROJECT_NAME}</strong>.
                </p>
                <div className="flex items-center gap-3">
                  <button
                    onClick={openOnboardingExample}
                    className="px-5 py-2.5 rounded-2xl bg-[#0a192f] text-white text-xs font-black uppercase tracking-wider hover:bg-blue-700 transition-colors shadow-md shadow-blue-900/20"
                  >
                    👀 Open example
                  </button>
                  <button
                    onClick={dismissOnboarding}
                    className="px-3 py-2 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                  >
                    Skip
                  </button>
                </div>
              </div>
            </div>
          )}

          <ProjectGrid
            projects={gridProjects}
            onProjectClick={(id) => router.push(`/planning/${id}`)}
            onDeleteProject={handleDeleteProject}
          />
        </div>
      </div>

      <CreateProjectModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        projectName={projectName}
        onProjectNameChange={setProjectName}
        importMode={importMode}
        isCreating={isCreating}
        onSubmit={handleStartProject}
        onImportSubmit={triggerFileInput}
      />

      <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileChange} />
    </div>
  )
}
