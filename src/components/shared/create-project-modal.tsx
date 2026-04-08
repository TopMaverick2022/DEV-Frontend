import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { GlassCard } from '@/components/shared/glass-components'
import { Plus, Github, Loader2, X, CheckCircle2, AlertCircle } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/api-client'

interface CreateProjectPayload {
  name: string
  description: string
  githubRepoUrl: string
}

interface GitHubRepoMeta {
  name: string
  description: string | null
  full_name: string
}

async function createProjectApi(payload: CreateProjectPayload) {
  const response = await apiClient.post('/projects', {
    name: payload.name,
    description: payload.description,
    githubRepoUrl: payload.githubRepoUrl,
  })
  return response.data
}

function parseGitHubUrl(url: string): { owner: string; repo: string } | null {
  try {
    const match = url.match(/github\.com\/([^/]+)\/([^/]+?)(?:\.git)?(?:\/|$)/)
    if (match) return { owner: match[1], repo: match[2] }
  } catch {}
  return null
}

const GLOBAL_TOKEN_KEY = 'gh_token_global'

export function CreateProjectModal({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [githubRepoUrl, setGithubRepoUrl] = useState('')

  // GitHub auto-fetch state
  const [repoFetchState, setRepoFetchState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [repoFetchMessage, setRepoFetchMessage] = useState('')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Determine if user entered a GitHub URL — if yes, name becomes optional (pre-filled from repo)
  const hasGithubUrl = githubRepoUrl.trim().length > 0
  const parsed = hasGithubUrl ? parseGitHubUrl(githubRepoUrl.trim()) : null

  // Debounced auto-fetch repo metadata when a valid GitHub URL is typed
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (!parsed) {
      if (githubRepoUrl.trim().length > 0) {
        setRepoFetchState('error')
        setRepoFetchMessage('Not a valid GitHub URL')
      } else {
        setRepoFetchState('idle')
        setRepoFetchMessage('')
      }
      return
    }

    setRepoFetchState('loading')
    setRepoFetchMessage('Fetching repo info…')

    debounceRef.current = setTimeout(async () => {
      const token = localStorage.getItem(GLOBAL_TOKEN_KEY) ?? ''
      const tokenParam = token ? `&token=${encodeURIComponent(token)}` : ''
      try {
        const res = await apiClient.get<GitHubRepoMeta>(
          `/github/repo?owner=${parsed.owner}&repo=${parsed.repo}${tokenParam}`
        )
        const meta = res.data
        // Pre-fill name and description only if user hasn't typed anything manually
        if (!name || name === '') setName(meta.name ?? parsed.repo)
        if (!description || description === '') setDescription(meta.description ?? '')
        setRepoFetchState('success')
        setRepoFetchMessage(`Repo found: ${meta.full_name}`)
      } catch {
        setRepoFetchState('error')
        setRepoFetchMessage('Could not fetch repo. Check URL or ensure token has repo scope.')
      }
    }, 600)

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [githubRepoUrl])

  const createMutation = useMutation({
    mutationFn: createProjectApi,
    onSuccess: (createdProject) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })

      // Auto-clone if GitHub URL was provided and token is stored
      if (githubRepoUrl.trim() && parsed) {
        const token = localStorage.getItem(GLOBAL_TOKEN_KEY) ?? ''
        if (token && createdProject?.id) {
          // Fire-and-forget — clone happens in background; commit graph will populate automatically
          apiClient.post('/git/sync', {
            repoUrl: githubRepoUrl.trim(),
            token,
            projectId: createdProject.id
          }).then(() => {
            // Invalidate commit activity query after clone completes
            queryClient.invalidateQueries({ queryKey: ['commitActivity', createdProject.id] })
          }).catch(() => {
            // Silently ignore — user can manually click Clone/Pull in the GitHub panel
          })
        }
      }

      onClose()
    }
  })

  const isNameRequired = !hasGithubUrl
  const canSubmit = hasGithubUrl
    ? (githubRepoUrl.trim().length > 0) // name will be auto-filled or optionally provided
    : name.trim().length > 0

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const finalName = name.trim() || (parsed ? parsed.repo : '')
    if (!finalName) return
    createMutation.mutate({
      name: finalName,
      description,
      githubRepoUrl: githubRepoUrl.trim()
    })
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
          <button onClick={onClose} disabled={createMutation.isPending} className="absolute top-4 right-4 p-1 hover:bg-white/10 rounded-full transition-colors disabled:opacity-50">
            <X className="w-4 h-4" />
          </button>
          <h2 className="text-xl font-bold mb-1 text-foreground">Create New Project</h2>
          <p className="text-sm text-muted-foreground mb-6">
            {hasGithubUrl
              ? 'Import from GitHub — name & description are auto-filled from the repo.'
              : 'Start from scratch or paste a GitHub repo URL to import.'}
          </p>

          {createMutation.isError && (
            <div className="mb-4 p-3 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-sm">
              {(createMutation.error as Error)?.message || 'Failed to create project. Make sure you are logged in.'}
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            {/* GitHub Repo URL — FIRST field so it can auto-fill name/description */}
            <div className="space-y-1">
              <label className="text-sm font-medium text-foreground flex items-center gap-2">
                <Github className="w-4 h-4" /> GitHub Repo URL
                <span className="ml-auto text-xs text-muted-foreground font-normal">Optional — imports name &amp; description</span>
              </label>
              <input
                type="url"
                placeholder="https://github.com/user/repo"
                value={githubRepoUrl}
                onChange={(e) => setGithubRepoUrl(e.target.value)}
                autoFocus
                className="w-full bg-muted dark:bg-background/50 border border-input rounded-lg px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary placeholder:text-muted-foreground"
              />
              {/* Repo fetch status indicator */}
              {repoFetchState !== 'idle' && (
                <div className={`flex items-center gap-1.5 text-xs mt-1 ${
                  repoFetchState === 'success' ? 'text-green-500' :
                  repoFetchState === 'error' ? 'text-destructive' :
                  'text-muted-foreground'
                }`}>
                  {repoFetchState === 'loading' && <Loader2 className="w-3 h-3 animate-spin" />}
                  {repoFetchState === 'success' && <CheckCircle2 className="w-3 h-3" />}
                  {repoFetchState === 'error' && <AlertCircle className="w-3 h-3" />}
                  {repoFetchMessage}
                </div>
              )}
            </div>

            {/* Project Name */}
            <div className="space-y-1">
              <label className="text-sm font-medium text-foreground flex items-center gap-1">
                Project Name
                {isNameRequired
                  ? <span className="text-destructive">*</span>
                  : <span className="text-xs text-muted-foreground font-normal ml-1">(auto-filled from repo)</span>
                }
              </label>
              <input
                type="text"
                placeholder={hasGithubUrl ? 'Auto-filled from GitHub repo…' : 'My Awesome Project'}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-muted dark:bg-background/50 border border-input rounded-lg px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary placeholder:text-muted-foreground"
                required={isNameRequired}
              />
            </div>

            {/* Description */}
            <div className="space-y-1">
              <label className="text-sm font-medium text-foreground flex items-center gap-1">
                Description
                {hasGithubUrl && <span className="text-xs text-muted-foreground font-normal ml-1">(auto-filled from repo)</span>}
              </label>
              <textarea
                placeholder={hasGithubUrl ? 'Auto-filled from GitHub repo…' : 'What does this project do?'}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full bg-muted dark:bg-background/50 border border-input rounded-lg px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary placeholder:text-muted-foreground resize-none"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={createMutation.isPending}
                className="flex-1 py-2 border border-border rounded-lg text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createMutation.isPending || !canSubmit}
                className="flex-1 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                {createMutation.isPending ? 'Creating…' : hasGithubUrl ? 'Import Project' : 'Create Project'}
              </button>
            </div>
          </form>
        </GlassCard>
      </motion.div>
    </div>
  )
}
