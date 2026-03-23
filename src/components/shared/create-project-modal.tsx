import { useState } from 'react'
import { motion } from 'framer-motion'
import { GlassCard } from '@/components/shared/glass-components'
import { Plus, Github, Loader2, X } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { projectService } from '@/features/projects/project-service'

export function CreateProjectModal({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [githubRepoUrl, setGithubRepoUrl] = useState('')

  const createMutation = useMutation({
    mutationFn: projectService.createProject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      onClose()
    }
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    createMutation.mutate({ name, description, githubRepoUrl })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="w-full max-w-md"
      >
        <GlassCard className="relative">
          <button onClick={onClose} className="absolute top-4 right-4 p-1 hover:bg-white/10 rounded-full transition-colors">
            <X className="w-4 h-4" />
          </button>
          <h2 className="text-xl font-bold mb-1 text-foreground">Create New Project</h2>
          <p className="text-sm text-muted-foreground mb-6">Connect your codebase to the AI execution system.</p>

          {createMutation.isError && (
            <div className="mb-4 p-3 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-sm">
              Failed to create project. Please try again.
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-1">
              <label className="text-sm font-medium text-foreground">Project Name *</label>
              <input
                type="text"
                placeholder="My Awesome Project"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-muted dark:bg-background/50 border border-input rounded-lg px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary placeholder:text-muted-foreground"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-foreground">Description</label>
              <textarea
                placeholder="What does this project do?"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full bg-muted dark:bg-background/50 border border-input rounded-lg px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary placeholder:text-muted-foreground resize-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-foreground flex items-center gap-2">
                <Github className="w-4 h-4" /> GitHub Repo URL
              </label>
              <input
                type="url"
                placeholder="https://github.com/user/repo"
                value={githubRepoUrl}
                onChange={(e) => setGithubRepoUrl(e.target.value)}
                className="w-full bg-muted dark:bg-background/50 border border-input rounded-lg px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary placeholder:text-muted-foreground"
              />
            </div>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={onClose} className="flex-1 py-2 border border-border rounded-lg text-sm font-medium hover:bg-muted transition-colors">
                Cancel
              </button>
              <button
                type="submit"
                disabled={createMutation.isPending || !name.trim()}
                className="flex-1 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Create Project
              </button>
            </div>
          </form>
        </GlassCard>
      </motion.div>
    </div>
  )
}
