import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { GlassCard } from '@/components/shared/glass-components'
import { CreateProjectModal } from '@/components/shared/create-project-modal'
import { Plus, Trash2, Github, Loader2, FolderOpen, ExternalLink, Upload, CheckCircle } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { projectService } from '@/features/projects/project-service'
import { Project } from '@/types/project'
import apiClient from '@/lib/api-client'


function ProjectCard({ project, onDelete }: { project: Project; onDelete: (id: number) => void }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
    >
      <GlassCard className="group relative hover:border-primary/30 transition-colors">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-primary/10 rounded-xl border border-primary/20">
              <FolderOpen className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">{project.name}</h3>
              <p className="text-sm text-muted-foreground line-clamp-1">{project.description || 'No description'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {project.githubRepoUrl && (
              <a href={project.githubRepoUrl} target="_blank" rel="noopener noreferrer"
                className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-muted-foreground hover:text-foreground">
                <ExternalLink className="w-4 h-4" />
              </a>
            )}
            <button
              onClick={() => onDelete(project.id)}
              className="p-1.5 hover:bg-destructive/10 rounded-lg transition-colors text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
        {project.githubRepoUrl && (
          <div className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Github className="w-3 h-3" />
            <span className="truncate">{project.githubRepoUrl.replace('https://github.com/', '')}</span>
          </div>
        )}
        <p className="text-xs text-muted-foreground mt-2">
          Created {new Date(project.createdAt).toLocaleDateString()}
        </p>
      </GlassCard>
    </motion.div>
  )
}

export function ProjectsPage() {
  const [showModal, setShowModal] = useState(false)
  const [uploadState, setUploadState] = useState<'idle' | 'uploading' | 'done'>('idle')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const queryClient = useQueryClient()

  const handleZipUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadState('uploading')
    try {
      const formData = new FormData()
      formData.append('project', file)
      await apiClient.post('/ai/code-review-zip', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setUploadState('done')
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      setTimeout(() => setUploadState('idle'), 3000)
    } catch {
      setUploadState('idle')
    } finally {
      e.target.value = ''
    }
  }

  const { data: projects, isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: projectService.getMyProjects,
  })

  const deleteMutation = useMutation({
    mutationFn: projectService.deleteProject,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['projects'] })
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <>
      <AnimatePresence>
        {showModal && <CreateProjectModal onClose={() => setShowModal(false)} />}
      </AnimatePresence>

      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Projects</h1>
            <p className="text-muted-foreground mt-1">Manage and organize your AI-powered development projects.</p>
          </div>
          <div className="flex items-center gap-2">
            <input ref={fileInputRef} type="file" accept=".zip" onChange={handleZipUpload} className="hidden" />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadState === 'uploading'}
              className="glass px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-white/10 transition-colors disabled:opacity-50"
              title="Upload a project zip for AI code review"
            >
              {uploadState === 'uploading'
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : uploadState === 'done'
                ? <CheckCircle className="w-4 h-4 text-green-500" />
                : <Upload className="w-4 h-4" />}
              {uploadState === 'uploading' ? 'Uploading…' : uploadState === 'done' ? 'Uploaded!' : 'Upload ZIP'}
            </button>
            <button
              onClick={() => setShowModal(true)}
              className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 shadow-lg shadow-primary/25 hover:opacity-90 transition-opacity"
            >
              <Plus className="w-4 h-4" /> New Project
            </button>
          </div>
        </div>

        {projects && projects.length > 0 ? (
          <motion.div layout className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            <AnimatePresence>
              {projects.map((p) => (
                <ProjectCard key={p.id} project={p} onDelete={(id) => deleteMutation.mutate(id)} />
              ))}
            </AnimatePresence>
          </motion.div>
        ) : (
          <div className="flex flex-col items-center justify-center p-20 glass rounded-3xl border-dashed border-2 text-center space-y-4">
            <div className="p-4 rounded-full bg-primary/10">
              <FolderOpen className="w-10 h-10 text-primary" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-foreground">No Projects Yet</h3>
              <p className="text-muted-foreground max-w-xs mx-auto mt-1">
                Create your first project to connect your codebase to the AI execution system.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="glass px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-white/10 transition-colors"
              >
                <Upload className="w-4 h-4" /> Upload ZIP
              </button>
              <button
                onClick={() => setShowModal(true)}
                className="bg-primary text-primary-foreground px-6 py-2 rounded-lg font-medium shadow-lg shadow-primary/25 hover:opacity-90 transition-all active:scale-95"
              >
                Create First Project
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
