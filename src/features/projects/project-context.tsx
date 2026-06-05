import React, { createContext, useContext, useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { projectService } from './project-service'
import { Project } from '../../types/project'

interface ProjectContextType {
  projects: Project[]
  selectedProject: Project | null
  setSelectedProject: (p: Project | null) => void
  isLoading: boolean
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined)

export const ProjectProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [selectedProject, setSelectedProjectState] = useState<Project | null>(null)

  const { data: projects = [], isLoading } = useQuery<Project[]>({
    queryKey: ['projects'],
    queryFn: projectService.getMyProjects,
  })

  // Sync selectedProject with localStorage and projects list
  useEffect(() => {
    if (projects && projects.length > 0) {
      const savedId = localStorage.getItem('selectedProjectId')
      const matched = savedId ? projects.find(p => p.id === parseInt(savedId)) : null
      if (matched) {
        setSelectedProjectState(matched)
      } else if (!selectedProject) {
        setSelectedProjectState(projects[0])
      }
    } else {
      setSelectedProjectState(null)
    }
  }, [projects])

  const setSelectedProject = (p: Project | null) => {
    setSelectedProjectState(p)
    if (p) {
      localStorage.setItem('selectedProjectId', p.id.toString())
    } else {
      localStorage.removeItem('selectedProjectId')
    }
  }

  return (
    <ProjectContext.Provider value={{
      projects,
      selectedProject,
      setSelectedProject,
      isLoading
    }}>
      {children}
    </ProjectContext.Provider>
  )
}

export const useProject = () => {
  const context = useContext(ProjectContext)
  if (context === undefined) {
    throw new Error('useProject must be used within a ProjectProvider')
  }
  return context
}
