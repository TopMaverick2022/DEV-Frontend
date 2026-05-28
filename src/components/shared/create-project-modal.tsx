import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { GlassCard } from '@/components/shared/glass-components'
import { Plus, Github, Gitlab, Loader2, X, CheckCircle2, AlertCircle, Key, Eye, EyeOff } from 'lucide-react'
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

function parseGitUrl(urlStr: string): { provider: 'github' | 'gitlab'; owner: string; repo: string; fullPath: string; host: string; protocol: string } | null {
  try {
    const cleaned = urlStr.trim()
    const url = new URL(cleaned.startsWith('http') ? cleaned : `https://${cleaned}`)
    const hostname = url.hostname
    const pathname = url.pathname.replace(/^\//, '').replace(/\.git$/, '')
    
    const parts = pathname.split('/')
    if (parts.length < 2) return null
    
    const repo = parts[parts.length - 1]
    const owner = parts.slice(0, parts.length - 1).join('/')
    
    const isGitLab = hostname.includes('gitlab')
    const isGitHub = hostname.includes('github')
    
    if (isGitLab) {
      return {
        provider: 'gitlab',
        host: hostname,
        owner: owner,
        repo: repo,
        fullPath: pathname,
        protocol: url.protocol
      }
    } else if (isGitHub) {
      return {
        provider: 'github',
        host: hostname,
        owner: owner,
        repo: repo,
        fullPath: pathname,
        protocol: url.protocol
      }
    }
  } catch {}
  return null
}

export function CreateProjectModal({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [githubRepoUrl, setGithubRepoUrl] = useState('')

  // Access Token - loaded dynamically based on detected Git provider
  const [token, setToken] = useState('')
  const [showToken, setShowToken] = useState(false)

  // Auto-fetch repo metadata states
  const [repoFetchState, setRepoFetchState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [repoFetchMessage, setRepoFetchMessage] = useState('')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const hasRepoUrl = githubRepoUrl.trim().length > 0
  const parsed = hasRepoUrl ? parseGitUrl(githubRepoUrl.trim()) : null

  // Auto-fill token from localStorage when git provider is detected
  useEffect(() => {
    if (parsed) {
      const key = parsed.provider === 'gitlab' ? 'gl_token_global' : 'gh_token_global'
      setToken(localStorage.getItem(key) ?? '')
    } else {
      setToken('')
    }
  }, [parsed?.provider])

  // Debounced auto-fetch repo metadata when a valid URL is typed
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (!parsed) {
      if (githubRepoUrl.trim().length > 0) {
        setRepoFetchState('error')
        setRepoFetchMessage('Not a valid GitHub or GitLab URL')
      } else {
        setRepoFetchState('idle')
        setRepoFetchMessage('')
      }
      return
    }

    setRepoFetchState('loading')
    setRepoFetchMessage('Fetching repo info…')

    debounceRef.current = setTimeout(async () => {
      const storedToken = token.trim()
      const tokenParam = storedToken ? `&token=${encodeURIComponent(storedToken)}` : ''
      try {
        const url = parsed.provider === 'gitlab'
          ? `/gitlab/repo?projectPath=${encodeURIComponent(parsed.fullPath)}&host=${encodeURIComponent(parsed.host)}&protocol=${encodeURIComponent(parsed.protocol)}${tokenParam}`
          : `/github/repo?owner=${parsed.owner}&repo=${parsed.repo}${tokenParam}`

        const res = await apiClient.get<GitHubRepoMeta>(url)
        const meta = res.data
        if (!name || name === '') setName(meta.name ?? parsed.repo)
        if (!description || description === '') setDescription(meta.description ?? '')
        setRepoFetchState('success')
        setRepoFetchMessage(`Repo found: ${meta.full_name}`)
      } catch (err: any) {
        const status = err?.response?.status
        if (status === 401 || status === 403) {
          setRepoFetchState('error')
          setRepoFetchMessage(`Access denied — enter a valid ${parsed.provider === 'gitlab' ? 'GitLab' : 'GitHub'} PAT below.`)
        } else if (status === 404) {
          setRepoFetchState('error')
          setRepoFetchMessage('Repository not found. Check the URL and token permissions.')
        } else {
          setRepoFetchState('error')
          setRepoFetchMessage('Could not fetch repo. Check URL or token scope.')
        }
      }
    }, 600)

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [githubRepoUrl, token])

  const createMutation = useMutation({
    mutationFn: createProjectApi,
    onSuccess: (createdProject) => {
      // Save global token for reuse
      if (token.trim() && parsed) {
        const key = parsed.provider === 'gitlab' ? 'gl_token_global' : 'gh_token_global'
        localStorage.setItem(key, token.trim())
      }

      queryClient.invalidateQueries({ queryKey: ['projects'] })

      if (githubRepoUrl.trim() && parsed) {
        const savedToken = token.trim()
        if (savedToken && createdProject?.id) {
          apiClient.post('/git/sync', {
            repoUrl: githubRepoUrl.trim(),
            token: savedToken,
            projectId: createdProject.id
          }).then(() => {
            queryClient.invalidateQueries({ queryKey: ['commitActivity', createdProject.id] })
          }).catch(() => {})
        }
      }

      onClose()
    }
  })

  const isNameRequired = !hasRepoUrl
  const isTokenRequired = hasRepoUrl
  const canSubmit = hasRepoUrl
    ? (githubRepoUrl.trim().length > 0 && token.trim().length > 0)
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

  const isGitLab = parsed?.provider === 'gitlab'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="w-full max-w-md max-h-[90vh] flex flex-col"
      >
        <GlassCard className="relative overflow-y-auto flex-1">
          <button onClick={onClose} disabled={createMutation.isPending} className="absolute top-4 right-4 p-1 hover:bg-white/10 rounded-full transition-colors disabled:opacity-50">
            <X className="w-4 h-4" />
          </button>
          <h2 className="text-xl font-bold mb-1 text-foreground">Create New Project</h2>
          <p className="text-sm text-muted-foreground mb-6">
            {hasRepoUrl
              ? `Import from ${isGitLab ? 'GitLab' : 'GitHub'} — name & description are auto-filled from the repo.`
              : 'Start from scratch or paste a GitHub/GitLab repo URL to import.'}
          </p>

          {createMutation.isError && (
            <div className="mb-4 p-3 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-sm">
              {(createMutation.error as Error)?.message || 'Failed to create project. Make sure you are logged in.'}
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            {/* Repo URL — FIRST field so it can auto-fill name/description */}
            <div className="space-y-1">
              <label className="text-sm font-medium text-foreground flex items-center gap-2">
                {isGitLab ? <Gitlab className="w-4 h-4 text-orange-500" /> : <Github className="w-4 h-4" />} Repository URL (GitHub / GitLab)
                <span className="ml-auto text-xs text-muted-foreground font-normal">Optional</span>
              </label>
              <input
                type="url"
                placeholder="https://github.com/user/repo or https://gitlab.com/user/repo"
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

            {/* Token Token — appears and becomes mandatory as soon as a repo URL is entered */}
            {hasRepoUrl && (
              <div className="space-y-1">
                <label className="text-sm font-medium text-foreground flex items-center gap-2">
                  <Key className="w-4 h-4" />
                  {isGitLab ? 'GitLab' : 'GitHub'} Personal Access Token
                  {isTokenRequired && <span className="text-destructive ml-0.5">*</span>}
                  <span className="ml-auto text-xs text-muted-foreground font-normal">Required for cloning</span>
                </label>
                <div className="relative">
                  <input
                    type={showToken ? 'text' : 'password'}
                    placeholder={isGitLab ? "glpat-xxxxxxxxxxxxxxxxxxxx" : "ghp_xxxxxxxxxxxxxxxxxxxx"}
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    required={isTokenRequired}
                    className="w-full bg-muted dark:bg-background/50 border border-input rounded-lg pl-4 pr-10 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary placeholder:text-muted-foreground"
                  />
                  <button
                    type="button"
                    onClick={() => setShowToken(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    tabIndex={-1}
                    aria-label={showToken ? 'Hide token' : 'Show token'}
                  >
                    {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {token && (
                  <div className="flex items-center gap-1.5 text-xs text-green-500 mt-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Token loaded from saved session
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  Needs {isGitLab ? <code className="bg-muted px-1 rounded">api</code> : <code className="bg-muted px-1 rounded">repo</code>} scope.
                  {' '}Stored locally in your browser and reused across projects.
                </p>
              </div>
            )}

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
                placeholder={hasRepoUrl ? `Auto-filled from ${isGitLab ? 'GitLab' : 'GitHub'} repo…` : 'My Awesome Project'}
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
                {hasRepoUrl && <span className="text-xs text-muted-foreground font-normal ml-1">(auto-filled from repo)</span>}
              </label>
              <textarea
                placeholder={hasRepoUrl ? `Auto-filled from ${isGitLab ? 'GitLab' : 'GitHub'} repo…` : 'What does this project do?'}
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
                {createMutation.isPending ? 'Creating…' : hasRepoUrl ? 'Import Project' : 'Create Project'}
              </button>
            </div>
          </form>
        </GlassCard>
      </motion.div>
    </div>
  )
}
