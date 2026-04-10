'use client'

import { useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { HeroSection } from '@/components/organisms/HeroSection'
import { ProjectGrid } from '@/components/organisms/ProjectGrid'
import { CreateProjectModal } from '@/components/molecules/CreateProjectModal'
import type { ProjectDomain } from '@/types/domain'

interface Project {
  id: string
  name: string
  description?: string | null
  domain?: ProjectDomain
  status: string
  createdAt: string
  tasks: Array<{ id: string; status: string }>
}

export interface DashboardTemplateProps {
  initialProjects: Project[]
}

export function DashboardTemplate({ initialProjects }: DashboardTemplateProps) {
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
      <div className="flex-1 overflow-y-auto px-6 py-8 md:px-12 lg:px-20">
        <div className="max-w-7xl mx-auto space-y-10 pb-20">
          <HeroSection
            onNewProject={() => { setImportMode(false); setShowModal(true) }}
            onImportProject={() => { setImportMode(true); setShowModal(true) }}
          />

          <ProjectGrid
            projects={projects}
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
