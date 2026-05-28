import { useState, useEffect } from 'react'
import { GlassCard } from '@/components/shared/glass-components'
import {
  Github, Gitlab, Star, GitFork, AlertCircle, Eye, Code2,
  GitCommit, Loader2, Key, CheckCircle2, ExternalLink, RefreshCw,
  DownloadCloud, UploadCloud, BrainCircuit
} from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/api-client'
import { Project } from '@/types/project'
import { cn } from '@/lib/utils'

// ── Util: parse Git URL → { provider, owner, repo, fullPath } ────────────────────────────────
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

// ── Token storage helpers ────────────────────────────────────────────────────
function getStoredToken(provider: 'github' | 'gitlab') {
  const key = provider === 'gitlab' ? 'gl_token_global' : 'gh_token_global'
  return localStorage.getItem(key) ?? ''
}
function saveToken(provider: 'github' | 'gitlab', token: string) {
  const key = provider === 'gitlab' ? 'gl_token_global' : 'gh_token_global'
  if (token) localStorage.setItem(key, token)
  else localStorage.removeItem(key)
}

// ── Types ────────────────────────────────────────────────────────────────────
interface RepoMeta {
  full_name: string
  description: string
  stargazers_count: number
  forks_count: number
  open_issues_count: number
  watchers_count: number
  language: string
  default_branch: string
  html_url: string
  private: boolean
}

interface Commit {
  sha: string
  commit: {
    message: string
    author: { name: string; date: string }
  }
  html_url: string
}

// ── Main Component ───────────────────────────────────────────────────────────
export function GitHubPanel({ project, leftPanelContent, onAnalyze }: { project: Project, leftPanelContent?: React.ReactNode, onAnalyze?: () => void }) {
  const queryClient = useQueryClient()
  const parsed = project.githubRepoUrl ? parseGitUrl(project.githubRepoUrl) : null

  const [token, setToken] = useState(() => parsed ? getStoredToken(parsed.provider) : '')
  const [tokenInput, setTokenInput] = useState('')
  const [showTokenInput, setShowTokenInput] = useState(!token)

  const [repoData, setRepoData] = useState<RepoMeta | null>(null)
  const [commits, setCommits] = useState<Commit[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Action states
  const [syncing, setSyncing] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [pushing, setPushing] = useState(false)
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [notifiedCommitSha, setNotifiedCommitSha] = useState<string | null>(null)

  // Re-init when project changes or parsed provider changes
  useEffect(() => {
    const stored = parsed ? getStoredToken(parsed.provider) : ''
    setToken(stored)
    setShowTokenInput(!stored)
    setTokenInput('')
    setRepoData(null)
    setCommits([])
    setError('')
  }, [project.id, parsed?.provider])

  // Auto-fetch when we have a token and parsed URL
  useEffect(() => {
    if (token && parsed) fetchData()
  }, [token, project.id, parsed?.provider])

  // Poll for new commits
  useEffect(() => {
    if (!token || !parsed) return
    const interval = setInterval(async () => {
      try {
        const url = parsed.provider === 'gitlab'
          ? `/gitlab/commits?projectPath=${encodeURIComponent(parsed.fullPath)}&host=${encodeURIComponent(parsed.host)}&protocol=${encodeURIComponent(parsed.protocol)}&token=${token}`
          : `/github/commits?owner=${parsed.owner}&repo=${parsed.repo}&token=${token}`
        const commitsRes = await apiClient.get(url)
        const rawCommits = typeof commitsRes.data === 'string' ? JSON.parse(commitsRes.data) : commitsRes.data
        const latestCommits = Array.isArray(rawCommits) ? rawCommits.slice(0, 1) : []
        
        if (latestCommits.length > 0 && commits.length > 0) {
           const remoteSha = latestCommits[0].sha
           const localKnownSha = commits[0].sha
           
           if (remoteSha !== localKnownSha && remoteSha !== notifiedCommitSha) {
               setNotifiedCommitSha(remoteSha)
               
               import('sweetalert2').then(Swal => {
                  Swal.default.fire({
                    title: 'New Commit Detected!',
                    text: `A new commit was pushed to ${parsed.provider === 'gitlab' ? 'GitLab' : 'GitHub'}. Would you like to automatically pull and analyze the changes?`,
                    icon: 'info',
                    showCancelButton: true,
                    confirmButtonText: 'Pull & Analyze',
                    cancelButtonText: 'Later',
                    background: 'rgba(15, 15, 20, 0.95)',
                    color: '#fff',
                    confirmButtonColor: '#8b5cf6',
                    cancelButtonColor: '#3f3f46',
                    backdrop: `rgba(0,0,0,0.4) blur(4px)`
                  }).then((result) => {
                     if (result.isConfirmed) {
                         handleAutoSyncAndAnalyze()
                     }
                  })
               })
           }
        }
      } catch (e) {
         // ignore polling errors to avoid console spam
      }
    }, 20000)
    return () => clearInterval(interval)
  }, [token, parsed, commits, notifiedCommitSha])

  async function fetchData() {
    if (!parsed) return
    setLoading(true)
    setError('')
    try {
      const repoUrl = parsed.provider === 'gitlab'
        ? `/gitlab/repo?projectPath=${encodeURIComponent(parsed.fullPath)}&host=${encodeURIComponent(parsed.host)}&protocol=${encodeURIComponent(parsed.protocol)}&token=${token}`
        : `/github/repo?owner=${parsed.owner}&repo=${parsed.repo}&token=${token}`
      const commitsUrl = parsed.provider === 'gitlab'
        ? `/gitlab/commits?projectPath=${encodeURIComponent(parsed.fullPath)}&host=${encodeURIComponent(parsed.host)}&protocol=${encodeURIComponent(parsed.protocol)}&token=${token}`
        : `/github/commits?owner=${parsed.owner}&repo=${parsed.repo}&token=${token}`

      const [repoRes, commitsRes] = await Promise.all([
        apiClient.get(repoUrl),
        apiClient.get(commitsUrl)
      ])
      const repo = typeof repoRes.data === 'string' ? JSON.parse(repoRes.data) : repoRes.data
      const rawCommits = typeof commitsRes.data === 'string' ? JSON.parse(commitsRes.data) : commitsRes.data
      setRepoData(repo)
      setCommits(Array.isArray(rawCommits) ? rawCommits.slice(0, 8) : [])
    } catch (e: any) {
      const status = e?.response?.status
      if (status === 401) setError(`Invalid token. Please re-enter your ${parsed.provider === 'gitlab' ? 'GitLab' : 'GitHub'} PAT.`)
      else if (status === 404) setError('Repository not found. Check the URL and token scope.')
      else setError(`Failed to fetch ${parsed.provider === 'gitlab' ? 'GitLab' : 'GitHub'} data. Check your connection.`)
      setToken('')
      if (parsed) saveToken(parsed.provider, '')
      setShowTokenInput(true)
    } finally {
      setLoading(false)
    }
  }

  function handleSaveToken() {
    const t = tokenInput.trim()
    if (!t || !parsed) return
    saveToken(parsed.provider, t)
    setToken(t)
    setShowTokenInput(false)
  }

  function handleDisconnect() {
    if (parsed) saveToken(parsed.provider, '')
    setToken('')
    setShowTokenInput(true)
    setRepoData(null)
    setCommits([])
    setError('')
    setActionMessage(null)
  }

  // ── Server-Side Actions ──────────────────────────────────────────────────
  async function handleAutoSyncAndAnalyze() {
    if (!parsed || !token) return
    setSyncing(true)
    setActionMessage({ type: 'success', text: 'Pulling latest changes...' })
    try {
      await apiClient.post('/git/sync', {
        repoUrl: project.githubRepoUrl,
        token: token,
        projectId: project.id
      })
      setActionMessage({ type: 'success', text: 'Repository pulled. Starting AI Analysis...' })
      fetchData() // refresh commits list
      queryClient.invalidateQueries({ queryKey: ['projectStats', project.id] })
      
      // Delegate to the SSE-based onAnalyze callback so the progress overlay is shown
      if (onAnalyze) {
        onAnalyze()
      } else {
        // Fallback: should not normally happen if the panel is used from DashboardPage
        import('sweetalert2').then(Swal => {
          Swal.default.fire({
            title: 'Pull Successful',
            text: 'Repository pulled. Please click "Analyze" to start AI analysis.',
            icon: 'success',
            background: 'rgba(15, 15, 20, 0.95)',
            color: '#fff',
            confirmButtonColor: '#8b5cf6',
            backdrop: `rgba(0,0,0,0.4) blur(4px)`
          })
        })
      }
    } catch (e: any) {
      console.error("Auto Sync/Analyze Error:", e);
      const backendError = e.response?.data?.userMessage || e.response?.data?.error || (typeof e.response?.data === 'string' ? e.response?.data : null);
      setActionMessage({ type: 'error', text: backendError || 'Failed to pull repository. Please try again.' })
    } finally {
      setSyncing(false)
    }
  }

  async function handleSync() {
    if (!parsed || !token) return
    setSyncing(true)
    setActionMessage(null)
    try {
      await apiClient.post('/git/sync', {
        repoUrl: project.githubRepoUrl,
        token: token,
        projectId: project.id
      })
      setActionMessage({ type: 'success', text: 'Repository cloned/updated on server successfully.' })
      // Refresh project stats to reflect that we now need analysis, not sync
      queryClient.invalidateQueries({ queryKey: ['projectStats', project.id] })
    } catch (e: any) {
      setActionMessage({ type: 'error', text: e.response?.data || 'Failed to sync repository.' })
    } finally {
      setSyncing(false)
    }
  }

  async function handleAnalyze() {
    if (onAnalyze) {
      onAnalyze();
      return;
    }
    setAnalyzing(true)
    setActionMessage(null)
    try {
      await apiClient.post(`/ai/analyze-workspace/${project.id}?projectName=${encodeURIComponent(project.name)}`)
      setActionMessage({ type: 'success', text: 'AI Analysis complete! Check project details or Insights.' })
      // Refresh stats to clear the "Analysis Pending" warning
      queryClient.invalidateQueries({ queryKey: ['projectStats', project.id] })
    } catch (e: any) {
      console.error("Analysis Error:", e);
      const backendError = e.response?.data?.userMessage || e.response?.data?.error || (typeof e.response?.data === 'string' ? e.response?.data : null);
      const errorMessage = backendError || 'Failed to analyze workspace. Ensure you have synced the repo first.';
      
      setActionMessage({ type: 'error', text: errorMessage })

      if (e.response?.status === 429) {
        import('sweetalert2').then(Swal => {
           Swal.default.fire({
             title: 'Gemini Quota Exceeded',
             text: errorMessage,
             icon: 'error',
             background: 'rgba(15, 15, 20, 0.95)',
             color: '#fff',
             confirmButtonColor: '#3b82f6',
             backdrop: `rgba(0,0,0,0.4) blur(4px)`
           });
        });
      }
    } finally {
      setAnalyzing(false)
    }
  }

  async function handlePush() {
    if (!token || !parsed) return
    setPushing(true)
    setActionMessage(null)
    try {
      await apiClient.post('/git/push', {
        token: token,
        projectId: project.id,
        commitMessage: `AI Auto-update for ${project.name}`
      })
      setActionMessage({ type: 'success', text: `Changes pushed to ${parsed.provider === 'gitlab' ? 'GitLab' : 'GitHub'} successfully.` })
      fetchData() // Refresh commits
    } catch (e: any) {
      setActionMessage({ type: 'error', text: e.response?.data || `Failed to push changes to ${parsed.provider === 'gitlab' ? 'GitLab' : 'GitHub'}.` })
    } finally {
      setPushing(false)
    }
  }

  const renderLayout = (rightContent: React.ReactNode, bottomContent?: React.ReactNode) => {
    if (leftPanelContent) {
      return (
        <>
          <div className="lg:col-span-2 min-w-0">
            {leftPanelContent}
          </div>
          <div className="lg:col-span-1 min-w-0">
            {rightContent}
          </div>
          {bottomContent && (
            <div className="lg:col-span-3">
              {bottomContent}
            </div>
          )}
        </>
      )
    }
    return (
      <div className="space-y-8">
        {rightContent}
        {bottomContent}
      </div>
    )
  }

  // ── No GitHub URL ────────────────────────────────────────────────────────
  if (!project.githubRepoUrl) {
    return renderLayout(
      <GlassCard>
        <div className="flex items-center gap-3 mb-4">
          <Github className="w-5 h-5 text-muted-foreground" />
          <h3 className="font-semibold text-foreground">Repository Integration</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          No GitHub/GitLab repository linked to this project. Add a repo URL when creating or updating the project.
        </p>
      </GlassCard>
    )
  }

  // ── Can't parse URL ──────────────────────────────────────────────────────
  if (!parsed) {
    return renderLayout(
      <GlassCard>
        <div className="flex items-center gap-3 mb-3">
          <AlertCircle className="w-5 h-5 text-amber-500" />
          <h3 className="font-semibold text-foreground">Repository Integration</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          Could not parse the Git URL: <code className="text-xs bg-muted px-1 py-0.5 rounded">{project.githubRepoUrl}</code>
        </p>
      </GlassCard>
    )
  }

  // ── Token Entry ──────────────────────────────────────────────────────────
  if (showTokenInput) {
    const isGitLab = parsed.provider === 'gitlab'
    return renderLayout(
      <GlassCard>
        <div className="flex items-center gap-3 mb-1">
          {isGitLab ? <Gitlab className="w-5 h-5 text-foreground" /> : <Github className="w-5 h-5 text-foreground" />}
          <h3 className="font-semibold text-foreground">{isGitLab ? 'GitLab' : 'GitHub'} Integration</h3>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Enter a {isGitLab ? 'GitLab' : 'GitHub'} Personal Access Token (PAT) to fetch live data for{' '}
          <span className="text-primary font-medium">{parsed.fullPath}</span>.
        </p>
        {error && (
          <div className="mb-3 flex items-center gap-2 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="password"
              placeholder={isGitLab ? "glpat-xxxxxxxxxxxxxxxxxxxx" : "ghp_xxxxxxxxxxxxxxxxxxxx"}
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSaveToken()}
              className="w-full pl-9 pr-4 py-2 bg-muted dark:bg-background/50 border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <button
            onClick={handleSaveToken}
            disabled={!tokenInput.trim()}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            Connect
          </button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Needs {isGitLab ? <code className="bg-muted px-1 rounded">api</code> : <code className="bg-muted px-1 rounded">repo</code>} scope. Token is stored locally in your browser only.
        </p>
      </GlassCard>
    )
  }

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading) {
    return renderLayout(
      <GlassCard>
        <div className="flex items-center gap-3">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
          <span className="text-sm text-muted-foreground">Fetching GitHub data…</span>
        </div>
      </GlassCard>
    )
  }

  // ── Connected: show real data ────────────────────────────────────────────
  const rightContent = (
    <GlassCard>
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-2 bg-foreground/10 rounded-xl shrink-0">
            {parsed?.provider === 'gitlab' ? <Gitlab className="w-5 h-5 text-orange-500" /> : <Github className="w-5 h-5" />}
          </div>
          <div className="min-w-0">
            <a
              href={repoData?.html_url ?? project.githubRepoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-foreground hover:text-primary transition-colors flex items-center gap-1 min-w-0"
            >
              <span className="truncate">{parsed.owner}/{parsed.repo}</span>
              <ExternalLink className="w-3 h-3 opacity-50 shrink-0" />
            </a>
            {repoData?.description && (
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{repoData.description}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={fetchData}
            className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-muted-foreground"
            title="Refresh"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleDisconnect}
            className="p-1.5 hover:bg-destructive/10 rounded-lg transition-colors text-muted-foreground hover:text-destructive"
            title={`Disconnect ${parsed?.provider === 'gitlab' ? 'GitLab' : 'GitHub'}`}
          >
            <Key className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {repoData && (
        <>
          <div className="flex items-center gap-1.5 flex-wrap mb-4">
            {repoData.private && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20">Private</span>
            )}
            {repoData.language && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center gap-1">
                <Code2 className="w-3 h-3" /> {repoData.language}
              </span>
            )}
            <span className="text-xs text-muted-foreground">Branch: <strong>{repoData.default_branch}</strong></span>
          </div>

          <div className="grid grid-cols-4 gap-3">
            {[
              { icon: Star, label: 'Stars', value: repoData.stargazers_count },
              { icon: GitFork, label: 'Forks', value: repoData.forks_count },
              { icon: AlertCircle, label: 'Issues', value: repoData.open_issues_count },
              { icon: Eye, label: 'Watchers', value: repoData.watchers_count },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="text-center p-2 rounded-xl bg-muted/50">
                <Icon className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
                <p className="text-base font-bold">{value.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </div>
            ))}
          </div>

          {/* Server-Side Git Actions */}
          <div className="mt-5 pt-5 border-t border-border/40">
            <h4 className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wider">Server Workspaces</h4>
            
            {actionMessage && (
              <div className={cn("mb-3 px-3 py-2 rounded-lg text-sm border flex items-center gap-2", 
                actionMessage.type === 'success' ? "bg-green-500/10 border-green-500/20 text-green-500" : "bg-destructive/10 border-destructive/20 text-destructive")}>
                {actionMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                {actionMessage.text}
              </div>
            )}

            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={handleSync}
                disabled={syncing || analyzing || pushing}
                className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl bg-accent hover:bg-accent/80 transition-colors disabled:opacity-50"
              >
                {syncing ? <Loader2 className="w-4 h-4 animate-spin text-primary" /> : <DownloadCloud className="w-4 h-4 text-primary" />}
                <span className="text-xs font-medium">Clone / Pull</span>
              </button>
              <button
                onClick={handleAnalyze}
                disabled={syncing || analyzing || pushing}
                className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl bg-accent hover:bg-accent/80 transition-colors disabled:opacity-50"
                title="Run AI review on the cloned workspace"
              >
                {analyzing ? <Loader2 className="w-4 h-4 animate-spin text-purple-500" /> : <BrainCircuit className="w-4 h-4 text-purple-500" />}
                <span className="text-xs font-medium">Analyze</span>
              </button>
              <button
                onClick={handlePush}
                disabled={syncing || analyzing || pushing}
                className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl bg-accent hover:bg-accent/80 transition-colors disabled:opacity-50"
                title="Push staged server changes upstream"
              >
                {pushing ? <Loader2 className="w-4 h-4 animate-spin text-amber-500" /> : <UploadCloud className="w-4 h-4 text-amber-500" />}
                <span className="text-xs font-medium">Push</span>
              </button>
            </div>
          </div>
        </>
      )}
    </GlassCard>
  );

  const bottomContent = commits.length > 0 ? (
    <GlassCard>
      <div className="flex items-center gap-2 mb-4">
        <GitCommit className="w-4 h-4 text-primary" />
        <h3 className="font-semibold text-foreground text-sm">Recent Commits</h3>
        <span className="ml-auto text-xs text-muted-foreground">{parsed.owner}/{parsed.repo}</span>
      </div>
      <div className="space-y-3">
        {commits.map((c) => (
          <a
            key={c.sha}
            href={c.html_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-start gap-3 group hover:bg-white/5 rounded-xl p-2 -mx-2 transition-colors"
          >
            <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-sm text-foreground line-clamp-1 group-hover:text-primary transition-colors">
                {c.commit.message.split('\n')[0]}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {c.commit.author.name} · {new Date(c.commit.author.date).toLocaleDateString()}
              </p>
            </div>
            <code className="text-xs text-muted-foreground font-mono shrink-0 mt-0.5">
              {c.sha.slice(0, 7)}
            </code>
          </a>
        ))}
      </div>
      <div className="mt-4 pt-3 border-t border-border/40">
        <div className="flex items-center gap-2 text-xs text-green-500">
          <CheckCircle2 className="w-3.5 h-3.5" />
          Connected via {parsed?.provider === 'gitlab' ? 'GitLab' : 'GitHub'} API &middot; Token stored locally
        </div>
      </div>
    </GlassCard>
  ) : null;

  return renderLayout(rightContent, bottomContent);
}
