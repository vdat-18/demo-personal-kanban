'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Sparkles, Repeat } from 'lucide-react'
import { HeroSection } from '@/components/organisms/HeroSection'
import { ProjectGrid } from '@/components/organisms/ProjectGrid'
import { CreateProjectModal } from '@/components/molecules/CreateProjectModal'
import { ImportProjectFlow } from '@/components/molecules/ImportProjectFlow'
import { InboxPanel } from '@/components/molecules/InboxPanel'
import { useConfirm } from '@/components/molecules/ConfirmDialog'
import { useProjects, useCreateProject, useDeleteProject } from '@/lib/hooks/useProjects'
import { useSendPlanningMessage } from '@/lib/hooks/usePlanningMessages'
import { useKanbanStore } from '@/lib/storage/kanbanStore'
import type { IngestedFile } from '@/lib/fileIngest'
import type { ImportedSource, PlaybookId, RecurringTemplate } from '@/types/domain'
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
  const logPlanningEvent = useKanbanStore((s) => s.logPlanningEvent)
  const createAttentionItem = useKanbanStore((s) => s.createAttentionItem)
  const getOverdueRecurringTemplates = useKanbanStore((s) => s.getOverdueRecurringTemplates)
  const triggerRecurringTemplate = useKanbanStore((s) => s.triggerRecurringTemplate)
  const createTaskInStore = useKanbanStore((s) => s.createTask)

  const [showModal, setShowModal] = useState(false)
  const [showImportFlow, setShowImportFlow] = useState(false)
  const [projectName, setProjectName] = useState('')
  const [playbookId, setPlaybookId] = useState<PlaybookId>('general-planning')
  const [isCreating, setIsCreating] = useState(false)
  const [showOnboardingHint, setShowOnboardingHint] = useState(false)
  const [overdueTemplates, setOverdueTemplates] = useState<RecurringTemplate[]>([])

  // ─── Onboarding example (Tier 4.16) ───────────────────────────────────────
  useEffect(() => {
    if (typeof window === 'undefined') return
    setShowOnboardingHint(!isOnboardingSeen())
    setOverdueTemplates(getOverdueRecurringTemplates())
  }, [getOverdueRecurringTemplates])

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

  const handleCreateFromTemplate = useCallback(
    (template: RecurringTemplate) => {
      createTaskInStore({
        projectId: template.projectId,
        title: template.title,
        description: template.description || undefined,
        status: 'TODO',
        priority: 'MEDIUM',
      })
      triggerRecurringTemplate(template.id)
      setOverdueTemplates((prev) => prev.filter((t) => t.id !== template.id))
    },
    [createTaskInStore, triggerRecurringTemplate],
  )

  const handleDismissTemplate = useCallback(
    (templateId: string) => {
      triggerRecurringTemplate(templateId)
      setOverdueTemplates((prev) => prev.filter((t) => t.id !== templateId))
    },
    [triggerRecurringTemplate],
  )

  const handleStartProject = useCallback(async () => {
    if (!projectName.trim()) return
    setIsCreating(true)
    try {
      const project = await createProject({
        name: projectName,
        description: `Drafting plan for ${projectName}…`,
        domain: 'GENERAL',
        playbookId,
      })
      logPlanningEvent({
        projectId: project.id,
        type: 'project_created',
        actor: 'user',
        summary: `Started project “${project.name}”.`,
      })
      logPlanningEvent({
        projectId: project.id,
        type: 'playbook_selected',
        actor: 'system',
        summary: `Selected playbook: ${playbookId}.`,
        metadata: { playbookId },
      })
      setShowModal(false)
      setProjectName('')
      setPlaybookId('general-planning')
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
        playbookId,
        importedSources,
      }: {
        projectName: string
        userContext: string
        seedMessage: string
        files: IngestedFile[]
        playbookId: PlaybookId
        importedSources: ImportedSource[]
      }) => {
      const project = await createProject({
        name,
        description: userContext
          ? `Imported from ${files.length} file${files.length === 1 ? '' : 's'} with additional user context`
          : `Imported from ${files.length} file${files.length === 1 ? '' : 's'}`,
        domain: 'GENERAL',
        playbookId,
        importedSources,
        userContext,
      })

      const thread = createPlanningThread({ projectId: project.id, title: `Imported: ${name}` })

      logPlanningEvent({
        projectId: project.id,
        threadId: thread.id,
        type: 'project_created',
        actor: 'user',
        summary: `Created imported project “${project.name}”.`,
      })
      logPlanningEvent({
        projectId: project.id,
        threadId: thread.id,
        type: 'playbook_selected',
        actor: 'system',
        summary: `Selected playbook: ${playbookId}.`,
        metadata: { playbookId },
      })
      logPlanningEvent({
        projectId: project.id,
        threadId: thread.id,
        type: 'sources_imported',
        actor: 'user',
        summary: `Imported ${files.length} source file${files.length === 1 ? '' : 's'}.`,
        metadata: { sourceCount: files.length },
      })
      if (userContext.trim()) {
        logPlanningEvent({
          projectId: project.id,
          threadId: thread.id,
          type: 'user_context_saved',
          actor: 'user',
          summary: 'Added extra planning context to the imported brief.',
        })
      }
      useKanbanStore.getState().updateProject(project.id, {
        runtimeStatus: {
          state: 'planning',
          summary: 'Imported planning is underway.',
          lastAction: 'Imported sources and started AI readback',
          lastUpdatedAt: new Date().toISOString(),
          retryCount: 0,
          blockedReason: null,
        },
        workpad: project.workpad
          ? {
              ...project.workpad,
              assumptions: userContext.trim() ? [userContext.trim()] : [],
              validationNotes: ['Imported source review should happen before execution.'],
              proofOfWork: [`${files.length} source file${files.length === 1 ? '' : 's'} imported.`],
            }
          : project.workpad,
      })
      if (files.some((file) => file.error || (file.needsVisionModel && !file.text))) {
        createAttentionItem({
          projectId: project.id,
          threadId: thread.id,
          type: 'source_needs_review',
          title: 'Some imported sources need review',
          detail: 'One or more uploaded files had limited extraction quality. Review the source library before finalising the plan.',
        })
      }

      await sendPlanningMessage.mutateAsync({
        threadId: thread.id,
        content: seedMessage,
        importReadbackOnly: true,
      })

      useKanbanStore.getState().updateProject(project.id, {
        runtimeStatus: {
          state: 'planning',
          summary: 'AI finished the imported-document readback.',
          lastAction: 'Created first planning readback',
          lastUpdatedAt: new Date().toISOString(),
          retryCount: 0,
          blockedReason: null,
        },
      })

      setShowImportFlow(false)
      router.push(`/planning/${project.id}`)
    },
    [createProject, createPlanningThread, sendPlanningMessage, logPlanningEvent, createAttentionItem, router],
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
      playbookId: p.playbookId,
      importedSourceCount: p.importedSources?.length ?? 0,
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

          <InboxPanel onNavigate={handleProjectClick} />

          {overdueTemplates.length > 0 && (
            <div className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50/80 via-white to-purple-50/40 p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <Repeat className="w-4 h-4 text-indigo-500" />
                <h3 className="text-sm font-bold text-[#0a192f]">Recurring tasks to create</h3>
                <span className="ml-auto px-2 py-0.5 rounded-full bg-indigo-500 text-white text-[10px] font-black">
                  {overdueTemplates.length}
                </span>
              </div>
              <div className="space-y-2">
                {overdueTemplates.map((t) => {
                  const project = projects.find((p) => p.id === t.projectId)
                  return (
                    <div key={t.id} className="flex items-center gap-3 bg-white rounded-xl border border-indigo-100 px-3 py-2.5">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-[#0a192f] truncate">{t.title}</p>
                        {project && <p className="text-[10px] text-slate-400 mt-0.5">📁 {project.name}</p>}
                      </div>
                      <button
                        onClick={() => handleCreateFromTemplate(t)}
                        className="shrink-0 px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-[11px] font-bold hover:bg-indigo-700 transition-colors"
                      >
                        Create task
                      </button>
                      <button
                        onClick={() => handleDismissTemplate(t.id)}
                        className="shrink-0 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                        title="Skip this time"
                      >
                        ✕
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

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

          {/* Quick chat entry — chat with AI before creating a project */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => router.push('/chat')}
            onKeyDown={(e) => e.key === 'Enter' && router.push('/chat')}
            className="rounded-2xl border border-dashed border-blue-200 bg-blue-50/40 hover:bg-blue-50 hover:border-blue-300 transition-all cursor-pointer p-5 flex items-center gap-4 group"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-100 group-hover:bg-blue-500 transition-colors flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5 text-blue-500 group-hover:text-white transition-colors" />
            </div>
            <div>
              <p className="text-sm font-bold text-[#0a192f]">Ask AI before getting started</p>
              <p className="text-xs text-slate-500 mt-0.5">
                Not sure what to do? Chat with AI to brainstorm ideas, no project needed.
              </p>
            </div>
          </div>

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
        playbookId={playbookId}
        onPlaybookChange={setPlaybookId}
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
