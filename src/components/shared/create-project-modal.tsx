import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { GlassCard } from '@/components/shared/glass-components'
import { Plus, Github, Gitlab, Loader2, X, CheckCircle2, AlertCircle, Key, Eye, EyeOff, Code2, Sparkles, Link2, Monitor, Server, LayoutDashboard } from 'lucide-react'
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api-client'
import { projectService } from '@/features/projects/project-service'
import { ProjectType } from '@/types/project'

const LANGUAGES = ['Java', 'Python', 'JavaScript', 'TypeScript', 'Go', 'Rust', 'Ruby', 'C#']
const FRAMEWORKS: Record<string, string[]> = {
  Java: ['Spring Boot', 'Quarkus', 'Micronaut', 'Jakarta EE'],
  Python: ['Django', 'FastAPI', 'Flask', 'Tornado'],
  JavaScript: ['Express', 'Next.js', 'NestJS', 'React', 'Vue'],
  TypeScript: ['NestJS', 'Next.js', 'Express', 'React', 'Vue', 'Angular'],
  Go: ['Gin', 'Fiber', 'Echo', 'Standard Library'],
  Rust: ['Actix-web', 'Axum', 'Rocket'],
  Ruby: ['Ruby on Rails', 'Sinatra'],
  'C#': ['ASP.NET Core', 'Nancy']
}
const DATABASES = ['PostgreSQL', 'MySQL', 'MongoDB', 'SQLite', 'Redis', 'Oracle', 'None']

interface CreateProjectPayload {
  name: string
  description: string
  githubRepoUrl: string
  language?: string
  languageVersion?: string
  framework?: string
  frameworkVersion?: string
  databaseName?: string
  databaseVersion?: string
  dependencies?: string
  projectType?: ProjectType
  relatedProjectId?: number
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
    language: payload.language,
    languageVersion: payload.languageVersion,
    framework: payload.framework,
    frameworkVersion: payload.frameworkVersion,
    databaseName: payload.databaseName,
    databaseVersion: payload.databaseVersion,
    dependencies: payload.dependencies,
    projectType: payload.projectType ?? 'STANDALONE',
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
  } catch { }
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

  // Project type & related project linking
  const [projectType, setProjectType] = useState<ProjectType>('STANDALONE')
  const [relatedProjectId, setRelatedProjectId] = useState<number | null>(null)

  // Tech stack states
  const [language, setLanguage] = useState('')
  const [customLanguage, setCustomLanguage] = useState('')
  const [languageVersion, setLanguageVersion] = useState('')
  const [framework, setFramework] = useState('')
  const [customFramework, setCustomFramework] = useState('')
  const [frameworkVersion, setFrameworkVersion] = useState('')
  const [databaseName, setDatabaseName] = useState('')
  const [customDatabaseName, setCustomDatabaseName] = useState('')
  const [databaseVersion, setDatabaseVersion] = useState('')

  // AI dependencies recommendation states
  const [dependenciesList, setDependenciesList] = useState<{ name: string; description: string; checked: boolean }[]>([])
  const [fetchingDeps, setFetchingDeps] = useState(false)

  // Reset framework when language changes
  useEffect(() => {
    setFramework('')
    setFrameworkVersion('')
  }, [language])

  // Fetch AI recommended dependencies when stack changes (debounced by 600ms)
  useEffect(() => {
    if (!language) {
      setDependenciesList([])
      return
    }

    setFetchingDeps(true)
    const timeoutId = setTimeout(async () => {
      try {
        const finalLanguage = language === 'Other' ? customLanguage : language
        const finalFramework = framework === 'Other' ? customFramework : framework
        const finalDatabase = databaseName === 'Other' ? customDatabaseName : databaseName

        const res = await apiClient.post('/ai/recommend-dependencies', {
          language: finalLanguage,
          languageVersion,
          framework: finalFramework,
          frameworkVersion,
          database: finalDatabase,
          databaseVersion
        })
        setDependenciesList(res.data || [])
      } catch (err) {
        console.error('Failed to fetch recommended dependencies', err)
      } finally {
        setFetchingDeps(false)
      }
    }, 600)

    return () => clearTimeout(timeoutId)
  }, [language, customLanguage, languageVersion, framework, customFramework, frameworkVersion, databaseName, customDatabaseName, databaseVersion])

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

  // Fetch existing projects for the related-project picker
  const { data: existingProjects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: projectService.getMyProjects,
  })

  const createMutation = useMutation({
    mutationFn: createProjectApi,
    onSuccess: async (createdProject) => {
      // Save global token for reuse
      if (token.trim() && parsed) {
        const key = parsed.provider === 'gitlab' ? 'gl_token_global' : 'gh_token_global'
        localStorage.setItem(key, token.trim())
      }

      queryClient.invalidateQueries({ queryKey: ['projects'] })

      // If a related project was chosen, wire up the bidirectional link
      if (relatedProjectId && createdProject?.id && projectType !== 'STANDALONE') {
        try {
          await projectService.linkProjects(createdProject.id, relatedProjectId, projectType)
          queryClient.invalidateQueries({ queryKey: ['projects'] })
        } catch (e) {
          console.error('Failed to link projects', e)
        }
      }

      if (githubRepoUrl.trim() && parsed) {
        const savedToken = token.trim()
        if (savedToken && createdProject?.id) {
          apiClient.post('/git/sync', {
            repoUrl: githubRepoUrl.trim(),
            token: savedToken,
            projectId: createdProject.id
          }).then(() => {
            queryClient.invalidateQueries({ queryKey: ['commitActivity', createdProject.id] })
          }).catch(() => { })
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

    const selectedDeps = dependenciesList
      .filter(d => d.checked)
      .map(d => d.name)
      .join(', ')

    createMutation.mutate({
      name: finalName,
      description,
      githubRepoUrl: githubRepoUrl.trim(),
      language: language === 'Other' ? customLanguage : language,
      languageVersion,
      framework: framework === 'Other' ? customFramework : framework,
      frameworkVersion,
      databaseName: databaseName === 'Other' ? customDatabaseName : databaseName,
      databaseVersion,
      dependencies: selectedDeps,
      projectType,
      relatedProjectId: relatedProjectId ?? undefined,
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
          <p className="text-sm text-muted-foreground mb-4">
            {hasRepoUrl
              ? `Import from ${isGitLab ? 'GitLab' : 'GitHub'} — name & description are auto-filled from the repo.`
              : 'Start from scratch or paste a GitHub/GitLab repo URL to import.'}
          </p>

          {/* ── Project Type Selector ─────────────────────────────────── */}
          <div className="mb-5">
            <p className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
              <LayoutDashboard className="w-3.5 h-3.5 text-primary" /> Project Type
            </p>
            <div className="flex gap-2">
              {([
                { type: 'STANDALONE' as ProjectType, label: 'Standalone', icon: <LayoutDashboard className="w-3.5 h-3.5" />, desc: 'Single embedded project' },
                { type: 'FRONTEND' as ProjectType, label: 'Frontend Only', icon: <Monitor className="w-3.5 h-3.5" />, desc: 'Links to a backend project' },
                { type: 'BACKEND' as ProjectType, label: 'Backend Only', icon: <Server className="w-3.5 h-3.5" />, desc: 'Links to a frontend project' },
              ]).map(({ type, label, icon, desc }) => (
                <button
                  key={type}
                  type="button"
                  id={`project-type-${type.toLowerCase()}`}
                  onClick={() => { setProjectType(type); setRelatedProjectId(null) }}
                  className={`flex-1 flex flex-col items-center gap-1 py-2.5 px-2 rounded-xl border text-center transition-all text-[10px] font-semibold
                    ${projectType === type
                      ? type === 'FRONTEND'
                        ? 'bg-cyan-500/10 border-cyan-500/50 text-cyan-400'
                        : type === 'BACKEND'
                          ? 'bg-orange-500/10 border-orange-500/50 text-orange-400'
                          : 'bg-primary/10 border-primary/50 text-primary'
                      : 'border-border/40 text-muted-foreground hover:border-border hover:text-foreground'
                    }`}
                >
                  {icon}
                  <span>{label}</span>
                  <span className="text-[9px] font-normal opacity-70 leading-tight">{desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* ── Related Project Picker (only for FRONTEND / BACKEND) ───── */}
          {projectType !== 'STANDALONE' && (
            <div className="mb-4 p-3 rounded-xl border border-dashed border-primary/30 bg-primary/5 space-y-2">
              <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Link2 className="w-3.5 h-3.5 text-primary" />
                Link to {projectType === 'FRONTEND' ? 'Backend' : 'Frontend'} Project
                <span className="ml-auto text-[10px] font-normal text-muted-foreground">Optional — link now or later</span>
              </p>
              <select
                id="related-project-select"
                value={relatedProjectId ?? ''}
                onChange={e => setRelatedProjectId(e.target.value ? Number(e.target.value) : null)}
                className="w-full bg-muted dark:bg-background/50 border border-input rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">— No link (link later from project card) —</option>
                {existingProjects
                  .filter(p => p.projectType !== projectType) // don't link same type to same type
                  .map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name}{p.projectType && p.projectType !== 'STANDALONE' ? ` [${p.projectType}]` : ''}
                    </option>
                  ))}
              </select>
              {relatedProjectId && (
                <p className="text-[10px] text-primary flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  Will be linked bidirectionally after creation
                </p>
              )}
            </div>
          )}

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
                <div className={`flex items-center gap-1.5 text-xs mt-1 ${repoFetchState === 'success' ? 'text-green-500' :
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

            {/* Tech Stack Selection */}
            <div className="border-t border-border/40 pt-4 space-y-4">
              <h3 className="text-sm font-semibold text-primary flex items-center gap-1.5">
                <Code2 className="w-4 h-4" /> Tech Stack Configuration
              </h3>

              <div className="grid grid-cols-2 gap-3">
                {/* Language */}
                <div className="space-y-1">
                  <label className="text-xs font-medium text-foreground">Language</label>
                  <select
                    value={language}
                    onChange={(e) => {
                      setLanguage(e.target.value)
                      if (e.target.value !== 'Other') setCustomLanguage('')
                    }}
                    className="w-full bg-muted dark:bg-background/50 border border-input rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">Select Language...</option>
                    {LANGUAGES.map(lang => (
                      <option key={lang} value={lang}>{lang}</option>
                    ))}
                    <option value="Other">Other</option>
                  </select>
                  {language === 'Other' && (
                    <input
                      type="text"
                      placeholder="Specify Language"
                      value={customLanguage}
                      onChange={(e) => setCustomLanguage(e.target.value)}
                      className="w-full mt-2 bg-muted dark:bg-background/50 border border-input rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary placeholder:text-muted-foreground/60"
                    />
                  )}
                </div>
                {/* Language Version */}
                <div className="space-y-1">
                  <label className="text-xs font-medium text-foreground">Language Version</label>
                  <input
                    type="text"
                    placeholder="e.g. 17, 3.11, 20"
                    value={languageVersion}
                    onChange={(e) => setLanguageVersion(e.target.value)}
                    disabled={!language}
                    className="w-full bg-muted dark:bg-background/50 border border-input rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary placeholder:text-muted-foreground/60 disabled:opacity-50"
                  />
                </div>

                {/* Framework */}
                <div className="space-y-1">
                  <label className="text-xs font-medium text-foreground">Framework</label>
                  <select
                    value={framework}
                    onChange={(e) => {
                      setFramework(e.target.value)
                      if (e.target.value !== 'Other') setCustomFramework('')
                    }}
                    disabled={!language}
                    className="w-full bg-muted dark:bg-background/50 border border-input rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
                  >
                    <option value="">Select Framework...</option>
                    {language && FRAMEWORKS[language]?.map(fw => (
                      <option key={fw} value={fw}>{fw}</option>
                    ))}
                    <option value="Other">Other</option>
                  </select>
                  {framework === 'Other' && (
                    <input
                      type="text"
                      placeholder="Specify Framework"
                      value={customFramework}
                      onChange={(e) => setCustomFramework(e.target.value)}
                      className="w-full mt-2 bg-muted dark:bg-background/50 border border-input rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary placeholder:text-muted-foreground/60"
                    />
                  )}
                </div>
                {/* Framework Version */}
                <div className="space-y-1">
                  <label className="text-xs font-medium text-foreground">Framework Version</label>
                  <input
                    type="text"
                    placeholder="e.g. 3.2, 5.0, 14"
                    value={frameworkVersion}
                    onChange={(e) => setFrameworkVersion(e.target.value)}
                    disabled={!framework}
                    className="w-full bg-muted dark:bg-background/50 border border-input rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary placeholder:text-muted-foreground/60 disabled:opacity-50"
                  />
                </div>

                {/* Database */}
                <div className="space-y-1">
                  <label className="text-xs font-medium text-foreground">Database</label>
                  <select
                    value={databaseName}
                    onChange={(e) => {
                      setDatabaseName(e.target.value)
                      if (e.target.value !== 'Other') setCustomDatabaseName('')
                    }}
                    className="w-full bg-muted dark:bg-background/50 border border-input rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">Select Database...</option>
                    {DATABASES.map(db => (
                      <option key={db} value={db}>{db}</option>
                    ))}
                    <option value="Other">Other</option>
                  </select>
                  {databaseName === 'Other' && (
                    <input
                      type="text"
                      placeholder="Specify Database"
                      value={customDatabaseName}
                      onChange={(e) => setCustomDatabaseName(e.target.value)}
                      className="w-full mt-2 bg-muted dark:bg-background/50 border border-input rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary placeholder:text-muted-foreground/60"
                    />
                  )}
                </div>
                {/* Database Version */}
                <div className="space-y-1">
                  <label className="text-xs font-medium text-foreground">Database Version</label>
                  <input
                    type="text"
                    placeholder="e.g. 16, 8.0"
                    value={databaseVersion}
                    onChange={(e) => setDatabaseVersion(e.target.value)}
                    disabled={!databaseName || databaseName === 'None'}
                    className="w-full bg-muted dark:bg-background/50 border border-input rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary placeholder:text-muted-foreground/60 disabled:opacity-50"
                  />
                </div>
              </div>
            </div>

            {/* Recommended Dependencies */}
            {language && (
              <div className="space-y-2 border-t border-border/40 pt-4">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-primary" /> Optional Dependencies Recommended by AI
                </label>
                {fetchingDeps ? (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground animate-pulse py-2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                    <span>Asking AI for recommendations...</span>
                  </div>
                ) : dependenciesList.length > 0 ? (
                  <div className="max-h-40 overflow-y-auto space-y-1.5 border border-border/40 rounded-lg p-2.5 bg-background/30">
                    {dependenciesList.map((dep, idx) => (
                      <label key={idx} className="flex items-start gap-2.5 p-1.5 hover:bg-white/5 rounded transition-colors cursor-pointer text-xs">
                        <input
                          type="checkbox"
                          checked={dep.checked}
                          onChange={(e) => {
                            const updated = [...dependenciesList]
                            updated[idx].checked = e.target.checked
                            setDependenciesList(updated)
                          }}
                          className="mt-0.5 rounded border-input text-primary focus:ring-primary w-3.5 h-3.5"
                        />
                        <div className="space-y-0.5 text-left">
                          <span className="font-semibold text-foreground">{dep.name}</span>
                          <p className="text-[10px] text-muted-foreground leading-normal">{dep.description}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground italic py-1">No dependency recommendations available for this stack.</p>
                )}
              </div>
            )}

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
