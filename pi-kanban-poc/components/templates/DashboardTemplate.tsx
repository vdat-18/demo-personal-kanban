'use client'

import { useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { HeroSection } from '@/components/organisms/HeroSection'
import { ProjectGrid } from '@/components/organisms/ProjectGrid'
import { CreateProjectModal } from '@/components/molecules/CreateProjectModal'
import { useProjects, useCreateProject, useDeleteProject } from '@/lib/hooks/useProjects'
import type { ProjectDomain } from '@/types/domain'

export function DashboardTemplate() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { data: projects = [] } = useProjects()
  const { mutateAsync: createProject } = useCreateProject()
  const { mutateAsync: deleteProject } = useDeleteProject()

  const [showModal, setShowModal] = useState(false)
  const [projectName, setProjectName] = useState('')
  const [selectedDomain, setSelectedDomain] = useState<ProjectDomain>('SOFTWARE_ENGINEERING')
  const [importMode, setImportMode] = useState(false)
  const [isCreating, setIsCreating] = useState(false)

  const handleStartProject = useCallback(async () => {
    if (!projectName.trim()) return
    setIsCreating(true)
    try {
      const project = await createProject({
        name: projectName,
        description: `Drafting project vision for ${projectName}...`,
        domain: selectedDomain,
      })
      setShowModal(false)
      setProjectName('')
      router.push(`/planning/${project.id}`)
    } catch (err) {
      console.error(err)
    } finally {
      setIsCreating(false)
    }
  }, [projectName, selectedDomain, router, createProject])

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
        selectedDomain={selectedDomain}
        onDomainChange={setSelectedDomain}
        importMode={importMode}
        isCreating={isCreating}
        onSubmit={handleStartProject}
        onImportSubmit={triggerFileInput}
      />

      <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileChange} />
    </div>
  )
}
