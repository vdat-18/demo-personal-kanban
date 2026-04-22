'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Sparkles } from 'lucide-react'
import { HeroSection } from '@/components/organisms/HeroSection'
import { ProjectGrid } from '@/components/organisms/ProjectGrid'
import { CreateProjectModal } from '@/components/molecules/CreateProjectModal'
import { ImportProjectFlow } from '@/components/molecules/ImportProjectFlow'
import { useConfirm } from '@/components/molecules/ConfirmDialog'
import { useProjects, useCreateProject, useDeleteProject } from '@/lib/hooks/useProjects'
import { useSendPlanningMessage } from '@/lib/hooks/usePlanningMessages'
import { useKanbanStore } from '@/lib/storage/kanbanStore'
import type { IngestedFile } from '@/lib/fileIngest'
import {
  ensureOnboardingProject,
  isOnboardingSeen,
  markOnboardingSeen,
  ONBOARDING_PROJECT_NAME,
} from '@/lib/onboarding'

export function DashboardTemplate() {
  const router = useRouter()
  const { data: projects = [] } = useProjects()
  const { mutateAsync: createProject } = useCreateProject()
  const { mutateAsync: deleteProject } = useDeleteProject()
  const sendPlanningMessage = useSendPlanningMessage()
  const { confirm, element: confirmElement } = useConfirm()
  const createPlanningThread = useKanbanStore((s) => s.createPlanningThread)

  const [showModal, setShowModal] = useState(false)
  const [showImportFlow, setShowImportFlow] = useState(false)
  const [projectName, setProjectName] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [showOnboardingHint, setShowOnboardingHint] = useState(false)

  // ─── Onboarding example (Tier 4.16) ───────────────────────────────────────
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

  /**
   * Import flow handler — creates a project AND seeds the first planning
   * thread with the extracted content as the opening user message. This
   * lets the AI start discovery already informed by the brief, instead of
   * asking "what are you planning?" when the user just handed them a spec.
   */
  const handleImportSubmit = useCallback(
    async ({
      projectName: name,
      userContext,
      seedMessage,
      files,
    }: {
      projectName: string
      userContext: string
      seedMessage: string
      files: IngestedFile[]
    }) => {
      const project = await createProject({
        name,
        description: userContext
          ? `Imported from ${files.length} file${files.length === 1 ? '' : 's'} with additional user context`
          : `Imported from ${files.length} file${files.length === 1 ? '' : 's'}`,
        domain: 'GENERAL',
      })

      const thread = createPlanningThread({ projectId: project.id, title: `Imported: ${name}` })

      await sendPlanningMessage.mutateAsync({
        threadId: thread.id,
        content: seedMessage,
      })

      setShowImportFlow(false)
      router.push(`/planning/${project.id}`)
    },
    [createProject, createPlanningThread, sendPlanningMessage, router],
  )

  const handleDeleteProject = useCallback(
    async (e: React.MouseEvent, id: string) => {
      e.stopPropagation()
      const project = projects.find((p) => p.id === id)
      const ok = await confirm({
        title: 'Delete project?',
        message: (
          <>
            Deleting <strong>{project?.name ?? 'project'}</strong> will permanently remove all tasks,
            chat history, and artifacts inside. This action cannot be undone.
          </>
        ),
        variant: 'danger',
        confirmLabel: 'Delete project',
      })
      if (!ok) return
      try {
        await deleteProject(id)
      } catch (err) {
        console.error(err)
      }
    },
    [confirm, deleteProject, projects],
  )

  // Map projects to the shape ProjectGrid expects
  const gridProjects = projects.map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    domain: p.domain,
    status: p.status ?? 'planning',
    planningStatus: p.planningStatus ?? 'not_started',
    createdAt: p.createdAt,
    tasks: (p.tasks ?? []).map((t) => ({ id: t.id, status: t.status })),
  }))

  /**
   * Smart navigation based on planning lifecycle:
   * - not_started / in_progress → Planning screen (continue the conversation)
   * - completed → Mission Control (Kanban) — planning is locked in, user wants
   *   to execute and monitor tasks, not re-plan.
   */
  const handleProjectClick = useCallback(
    (id: string) => {
      const project = projects.find((p) => p.id === id)
      const status = project?.planningStatus ?? 'not_started'
      if (status === 'completed') {
        router.push(`/mission-control/${id}`)
      } else {
        router.push(`/planning/${id}`)
      }
    },
    [projects, router],
  )

  return (
    <div className="h-full w-full bg-transparent flex flex-col overflow-hidden font-sans text-slate-900">
      <div className="flex-1 overflow-y-auto px-5 py-8 md:px-8 lg:px-12">
        <div className="max-w-7xl mx-auto space-y-8 pb-12">
          <HeroSection
            onNewProject={() => {
              setShowModal(true)
            }}
            onImportProject={() => {
              setShowImportFlow(true)
            }}
          />

          {showOnboardingHint && (
            <div className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50/80 via-white to-blue-50/60 p-5 shadow-sm flex items-start gap-4 animate-in fade-in slide-in-from-top-4 duration-500">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-500 text-white flex items-center justify-center shadow-md shadow-indigo-500/30 shrink-0">
                <Sparkles className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-bold text-[#0a192f] mb-1">New here?</h3>
                <p className="text-sm text-slate-500 leading-relaxed mb-3">
                  See a complete walkthrough — discovery questions, drafted plan, and approved tasks — based on a real-life event:{' '}
                  <strong className="text-[#0a192f]">{ONBOARDING_PROJECT_NAME}</strong>.
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={openOnboardingExample}
                    className="px-4 py-2 rounded-xl bg-[#0a192f] text-white text-xs font-bold hover:bg-blue-700 transition-colors shadow-sm"
                  >
                    👀 Open example
                  </button>
                  <button
                    onClick={dismissOnboarding}
                    className="px-3 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                  >
                    Skip
                  </button>
                </div>
              </div>
            </div>
          )}

          <ProjectGrid
            projects={gridProjects}
            onProjectClick={handleProjectClick}
            onDeleteProject={handleDeleteProject}
          />
        </div>
      </div>

      <CreateProjectModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        projectName={projectName}
        onProjectNameChange={setProjectName}
        importMode={false}
        isCreating={isCreating}
        onSubmit={handleStartProject}
        onImportSubmit={() => setShowImportFlow(true)}
      />

      <ImportProjectFlow
        isOpen={showImportFlow}
        onClose={() => setShowImportFlow(false)}
        onSubmit={handleImportSubmit}
      />
      {confirmElement}
    </div>
  )
}
