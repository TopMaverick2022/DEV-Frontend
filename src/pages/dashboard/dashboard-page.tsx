import { useState, useRef, useEffect, useMemo } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { GlassCard } from '@/components/shared/glass-components'
import { CreateProjectModal } from '@/components/shared/create-project-modal'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell, Label
} from 'recharts'
import {
  Code,
  ShieldCheck,
  Zap,
  ArrowUpRight,
  Github,
  GitBranch,
  Clock,
  Activity,
  Plus,
  Loader2,
  Upload,
  CheckCircle,
  ChevronDown,
  FolderOpen,
  Bug,
  TrendingDown,
  X
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { projectService } from '@/features/projects/project-service'
import apiClient, { tokenStore } from '@/lib/api-client'
import { useNavigate } from 'react-router-dom'
import { Project } from '@/types/project'
import { GitHubPanel } from '@/components/shared/github-panel'
import { RepositoryBrowser } from '@/components/shared/repository-browser'
import { AlertCircle } from 'lucide-react'
import Swal from 'sweetalert2'
import './quota-alerts.css' // We'll create this for custom styling


// ── Project Switcher Dropdown ────────────────────────────────────────────────
function ProjectSwitcher({
  projects,
  selected,
  onSelect
}: {
  projects: Project[]
  selected: Project | null
  onSelect: (p: Project) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between gap-2 glass border border-border/50 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-white/10 transition-all duration-200 w-[220px] shrink-0"
      >
        <FolderOpen className="w-4 h-4 text-primary shrink-0" />
        <span className="truncate flex-1 text-left max-w-[140px]">
          {selected?.name ?? 'Select project'}
        </span>
        <ChevronDown className={cn('w-4 h-4 shrink-0 text-muted-foreground transition-transform duration-200', open && 'rotate-180')} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 top-full mt-2 w-64 z-50 bg-card border border-border rounded-xl shadow-2xl shadow-black/30 overflow-hidden"
          >
            <div className="p-1.5 max-h-64 overflow-y-auto">
              {projects.map((p) => (
                <button
                  key={p.id}
                  onClick={() => { onSelect(p); setOpen(false) }}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-left transition-colors',
                    selected?.id === p.id
                      ? 'bg-primary/10 text-primary font-semibold'
                      : 'hover:bg-accent text-foreground'
                  )}
                >
                  <FolderOpen className="w-4 h-4 shrink-0 opacity-60" />
              <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{p.name}</p>
                    {p.description && (
                      <p className="truncate text-xs text-muted-foreground">{p.description}</p>
                    )}
                  </div>
                  {selected?.id === p.id && (
                    <CheckCircle className="w-3.5 h-3.5 shrink-0 ml-auto text-primary" />
                  )}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Dashboard Page ────────────────────────────────────────────────────────────
export function DashboardPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [showModal, setShowModal] = useState(false)
  const [uploadState, setUploadState] = useState<'idle' | 'uploading' | 'done'>('idle')
  const [uploadProgress, setUploadProgress] = useState({ loaded: 0, total: 0, percent: 0 })
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const handleZipUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadState('uploading')
    setUploadProgress({ loaded: 0, total: file.size, percent: 0 })

    try {
      const formData = new FormData()
      formData.append('project', file)
      // Always create a new project from ZIP, consistent with projects page
      const { data } = await apiClient.post('/ai/code-review-zip', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          const loaded = progressEvent.loaded
          const total = progressEvent.total || file.size
          const percent = Math.round((loaded * 100) / total)
          setUploadProgress({ loaded, total, percent })
        }
      })
      setUploadState('done')
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      
      // Auto-trigger analysis for the new project
      if (data?.projectId) {
        handleAnalyzeWorkspace(data.projectId, data.projectName || file.name)
      }

      setTimeout(() => setUploadState('idle'), 3000)
    } catch (error: any) {
      console.error('Upload failed:', error)
      setUploadState('idle')
      
      // SweetAlert for quota exhaustion
      if (error.response?.status === 429) {
        Swal.fire({
          title: 'Gemini Quota Exceeded',
          text: 'You have reached the daily limit for the Gemini API free tier (1,500 requests). Please try again tomorrow.',
          icon: 'warning',
          background: 'rgba(15, 15, 20, 0.95)',
          color: '#fff',
          confirmButtonColor: '#3b82f6',
          backdrop: `rgba(0,0,0,0.4) blur(4px)`
        })
      }
    } finally {
      e.target.value = ''
    }
  }

  // SSE-based analysis with real-time progress
  const [analysisState, setAnalysisState] = useState<{
    active: boolean
    current: number
    total: number
    filename: string
    logs: string[]
    isComplete: boolean
  }>({ active: false, current: 0, total: 0, filename: '', logs: [], isComplete: false })

  const handleAnalyzeWorkspace = (projId?: number, projName?: string) => {
    const id = projId || selectedProject?.id
    const name = projName || selectedProject?.name || 'Workspace'
    
    if (!id) return

    // Get the JWT token — EventSource doesn't support custom headers, so we pass it as ?token=
    const token = tokenStore.get()
      || localStorage.getItem('token')
      || localStorage.getItem('auth_token')
      || localStorage.getItem('accessToken')

    if (!token) {
      console.error('No auth token found, cannot start analysis')
      return
    }

    const baseUrl = 'http://localhost:8080/api'
    const url = `${baseUrl}/ai/analyze-workspace/${id}/stream?projectName=${encodeURIComponent(name)}&token=${encodeURIComponent(token)}`

    setAnalysisState({ active: true, current: 0, total: 0, filename: 'Connecting...', logs: [], isComplete: false })

    const evtSource = new EventSource(url)

    evtSource.onopen = () => {
      setAnalysisState(prev => ({ ...prev, filename: 'Initializing...' }))
    }

    evtSource.onmessage = (event) => {
      const raw = event.data
      if (raw === 'COMPLETE') {
        evtSource.close()
        setAnalysisState(prev => ({ ...prev, filename: 'Analysis Complete!', isComplete: true }))
        queryClient.invalidateQueries({ queryKey: ['projectStats', id] })
        queryClient.invalidateQueries({ queryKey: ['geminiQuota'] })
      } else if (raw.startsWith('ERROR:')) {
        evtSource.close()
        const msg = raw.replace('ERROR:', '')
        setAnalysisState(prev => ({ ...prev, active: false, filename: `Error: ${msg}` }))
        console.error('Analysis error:', msg)

        // SweetAlert for quota exhaustion in SSE
        if (msg.toLowerCase().includes('quota') || msg.toLowerCase().includes('429')) {
          Swal.fire({
            title: 'Gemini Quota Exceeded',
            text: 'Daily limit reached (1,500 requests). Please try again tomorrow.',
            icon: 'error',
            background: 'rgba(15, 15, 20, 0.95)',
            color: '#fff',
            confirmButtonColor: '#3b82f6',
            backdrop: `rgba(0,0,0,0.4) blur(4px)`
          })
        }
      } else {
        try {
          const parsed = JSON.parse(raw) as { current?: number; total?: number; filename?: string }
          setAnalysisState(prev => {
            const nextLogs = [...prev.logs]
            if (parsed.filename && parsed.filename !== 'Starting analysis...' && !nextLogs.includes(parsed.filename)) {
              nextLogs.push(parsed.filename)
            }
            return {
              ...prev,
              active: true,
              current: parsed.current ?? prev.current,
              total: parsed.total ?? prev.total,
              filename: parsed.filename ?? prev.filename,
              logs: nextLogs
            }
          })
        } catch { /* ignore parse errors for non-JSON keepalive frames */ }
      }
    }

    evtSource.onerror = (e) => {
      console.error('SSE connection error:', e)
      evtSource.close()
      setAnalysisState(prev => ({
        ...prev,
        active: false,
        filename: 'Connection failed. Check console for details.'
      }))
    }
  }

  const { data: projects, isLoading, isError, error } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectService.getMyProjects(),
  });

  useEffect(() => {
    const token = localStorage.getItem("token") || localStorage.getItem("auth_token") || localStorage.getItem("accessToken");
    console.log("Auth token from localStorage:", token);
  }, []);

  useEffect(() => {
    console.log("Projects query result:", {
      projects,
      isLoading,
      isError,
      error,
    });
  }, [projects, isLoading, isError, error]);

  // Fetch dynamic AI health stats for the selected project
  const { data: projectStats, isLoading: statsLoading } = useQuery({
    queryKey: ['projectStats', selectedProject?.id],
    queryFn: async () => {
      if (!selectedProject?.id) return null
      const { data } = await apiClient.get(`/projects/${selectedProject.id}/stats`)
      return data
    },
    enabled: !!selectedProject?.id,
  });

  // Auto-select the first project when projects load, only once
  useEffect(() => {
    if (projects && projects.length > 0 && !selectedProject) {
      setSelectedProject(projects[0])
    }
  }, [projects]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-red-500">
        <AlertCircle className="w-8 h-8 mb-2" />
        <h2 className="text-xl font-semibold">Error Fetching Projects</h2>
        <p className="text-sm text-red-400">{error?.message || 'An unknown error occurred.'}</p>
      </div>
    )
  }

  const hasProjects = projects && projects.length > 0

  return (
    <>
      <AnimatePresence>
        {showModal && <CreateProjectModal onClose={() => setShowModal(false)} />}
      </AnimatePresence>

      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        {/* ── Header Row ── */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Project Overview</h1>
            <p className="text-muted-foreground mt-0.5">
              {selectedProject ? (
                <>Metrics and health status for <span className="text-primary font-medium">{selectedProject.name}</span></>
              ) : (
                'No active projects. Create one to get started.'
              )}
            </p>
          </div>

          <div className="flex items-center justify-start xl:justify-end gap-3 flex-wrap">
            <input ref={fileInputRef} type="file" accept=".zip" onChange={handleZipUpload} className="hidden" />

            {/* Project switcher — only when there are projects */}
            {hasProjects && (
              <ProjectSwitcher
                projects={projects}
                selected={selectedProject}
                onSelect={setSelectedProject}
              />
            )}

            {/* GitHub link for the selected project */}
            {selectedProject?.githubRepoUrl && (
              <a
                href={selectedProject.githubRepoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="glass px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-white/10 border border-border/50 shrink-0"
              >
                <Github className="w-4 h-4" /> Repo
              </a>
            )}

            <button
              onClick={() => navigate('/projects')}
              className="glass px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-white/10 transition-colors border border-border/50 shrink-0"
            >
              All Projects{hasProjects ? ` (${projects.length})` : ''}
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadState === 'uploading'}
              className="glass px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-white/10 transition-colors disabled:opacity-50 border border-border/50 shrink-0"
              title="Upload a project zip for AI code review"
            >
              {uploadState === 'uploading' ? <Loader2 className="w-4 h-4 animate-spin" />
                : uploadState === 'done' ? <CheckCircle className="w-4 h-4 text-green-500" />
                  : <Upload className="w-4 h-4" />}
              {uploadState === 'uploading' ? 'Uploading…' : uploadState === 'done' ? 'Uploaded!' : 'Upload ZIP'}
            </button>

            <button
              onClick={() => setShowModal(true)}
              className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 shadow-lg shadow-primary/25 hover:opacity-90 shrink-0"
            >
              <Plus className="w-4 h-4" /> New Project
            </button>
          </div>
        </div>

        {/* ── Content ── */}
        {hasProjects ? (
          <motion.div
            key={selectedProject?.id ?? 'none'}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="space-y-8"
          >
            {/* Sync Warning Banner */}
            {(projectStats?.syncStatus === 'NEEDS_PULL' || projectStats?.syncStatus === 'NEEDS_ANALYSIS' || projectStats?.syncStatus === 'OUT_OF_SYNC') && (
              <GlassCard className="bg-amber-500/10 border-amber-500/20 py-3 px-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
                  <div>
                    {projectStats.syncStatus === 'NEEDS_PULL' || projectStats.syncStatus === 'OUT_OF_SYNC' ? (
                      <>
                        <h4 className="text-sm font-bold text-amber-500">Repository Needs Updating</h4>
                        <p className="text-xs text-amber-400">New commits detected on GitHub that haven't been pulled to the server yet.</p>
                      </>
                    ) : (
                      <>
                        <h4 className="text-sm font-bold text-amber-500">Analysis Pending</h4>
                        <p className="text-xs text-amber-400">Files on server are up to date, but the AI hasn't analyzed them yet.</p>
                      </>
                    )}
                  </div>
                </div>
                {projectStats.syncStatus === 'NEEDS_ANALYSIS' ? (
                  <button 
                    onClick={() => handleAnalyzeWorkspace()}
                    disabled={analysisState.active}
                    className="px-4 py-1.5 bg-amber-500 text-black rounded-lg text-xs font-bold hover:bg-amber-400 disabled:opacity-50 transition-colors shrink-0"
                  >
                    {analysisState.active ? 'Analyzing...' : 'Analyze Now'}
                  </button>
                ) : (
                  <p className="text-[10px] uppercase font-bold text-amber-500/70 tracking-widest px-2 py-1 border border-amber-500/20 rounded-md">
                    Please Sync in Git Panel
                  </p>
                )}
              </GlassCard>
            )}

            {/* Stats Grid — clickable cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-4">
              <StatCard 
                title="AI Health Score" 
                value={`${projectStats?.healthScore ?? 0}%`} 
                trend={`${projectStats?.totalFilesAnalyzed ?? 0} files scanned`} 
                icon={<Activity className="text-green-500" />} 
                color="bg-green-500/10"
                onClick={() => selectedProject?.id && navigate(`/dashboard/projects/${selectedProject.id}/health`)}
              />
              <StatCard 
                title="Security Issues" 
                value={projectStats?.totalSecurityIssues ?? 0} 
                trend="Click to see vulnerabilities" 
                icon={<ShieldCheck className="text-blue-500" />} 
                color="bg-blue-500/10"
                onClick={() => selectedProject?.id && navigate(`/dashboard/projects/${selectedProject.id}/security`)}
              />
              <StatCard 
                title="Estimated Effort" 
                value={projectStats?.techDebtEstimate ?? '0h'} 
                trend="Click to see what this means" 
                icon={<Clock className="text-amber-500" />} 
                color="bg-amber-500/10"
                onClick={() => selectedProject?.id && navigate(`/dashboard/projects/${selectedProject.id}/tech-debt`)}
              />
              <StatCard 
                title="Code Bugs" 
                value={projectStats?.totalBugs ?? 0} 
                trend="Click to see all bugs" 
                icon={<Zap className="text-purple-500" />} 
                color="bg-purple-500/10"
                onClick={() => selectedProject?.id && navigate(`/dashboard/projects/${selectedProject.id}/bugs`)}
              />
            </div>


              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {selectedProject?.githubRepoUrl ? (
                  <GitHubPanel 
                    project={selectedProject} 
                    leftPanelContent={<ProjectMetricsPane project={selectedProject} projectStats={projectStats} />}
                  />
                ) : (
                  <>
                    <div className="lg:col-span-2">
                      <ProjectMetricsPane project={selectedProject} projectStats={projectStats} />
                    </div>
                    <div>
                      <GlassCard>
                        <h3 className="text-lg font-bold mb-6 text-foreground">AI Insights</h3>
                        <div className="space-y-4">
                          <InsightItem icon={<ShieldCheck className="text-green-500" />} title="Security Patch Ready" desc="Update lodash to v4.17.21 to fix CVE-2020-8203." />
                          <InsightItem icon={<Zap className="text-amber-500" />} title="Optimization Gap" desc="Component 'Header.tsx' re-renders excessively. Suggested useMemo hook." />
                          <InsightItem icon={<Code className="text-blue-500" />} title="Style Inconsistency" desc="5 files use mixed indentation. Suggested 'prettier --write'." />
                        </div>
                        <button className="w-full mt-8 py-3 rounded-xl bg-accent hover:bg-accent/80 transition-colors text-sm font-medium text-foreground">
                          View All Insights
                        </button>
                      </GlassCard>
                    </div>
                  </>
                )}
              </div>

              {/* Repository Browser Section */}
              {selectedProject?.id && (
                <div className="mt-8">
                  <div className="mb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-bold text-foreground">Live Server Workspace</h3>
                      <p className="text-sm text-muted-foreground">Browse files currently checked out into the backend AI pipeline.</p>
                    </div>
                    {/* Native Analyze trigger for non-GitHub environments */}
                    {!selectedProject.githubRepoUrl && (
                      <button 
                        onClick={() => handleAnalyzeWorkspace()}
                        disabled={analysisState.active}
                        className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white shadow-lg shadow-purple-600/20 px-4 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-all"
                      >
                        {analysisState.active ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                        AI Analyze Codebase
                      </button>
                    )}
                  </div>
                  <RepositoryBrowser projectId={selectedProject.id} />
                </div>
              )}
          </motion.div>
        ) : (
          <div className="flex flex-col items-center justify-center p-20 glass rounded-3xl border-dashed border-2 text-center space-y-4">
            <div className="p-4 rounded-full bg-primary/10">
              <Zap className="w-10 h-10 text-primary" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-foreground">No Projects Found</h3>
              <p className="text-muted-foreground max-w-xs mx-auto">
                Get started by creating your first project and connect your repository for AI analysis.
              </p>
            </div>
            <button
              onClick={() => setShowModal(true)}
              className="bg-primary text-primary-foreground px-6 py-2 rounded-lg font-medium shadow-lg shadow-primary/25 hover:opacity-90 transition-all active:scale-95"
            >
              Create First Project
            </button>
          </div>
        )}
      </div>

      {/* SSE Analysis Progress Overlay */}
      <AnimatePresence>
        {analysisState.active && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-md glass border border-border rounded-2xl p-6 space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-lg">{analysisState.isComplete ? 'Analysis Summary' : 'AI Analyzing Codebase'}</h3>
                {analysisState.isComplete ? (
                   <CheckCircle className="w-5 h-5 text-green-500" />
                ) : (
                   <Loader2 className="w-5 h-5 animate-spin text-primary" />
                )}
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground truncate max-w-[70%]">
                    {analysisState.isComplete ? `Analysed ${analysisState.logs.length} files successfully` : analysisState.filename}
                  </span>
                  {!analysisState.isComplete && (
                    <span className="font-mono font-bold text-primary">{analysisState.current}/{analysisState.total}</span>
                  )}
                </div>
                {!analysisState.isComplete && (
                  <div className="w-full bg-muted/30 rounded-full h-3 overflow-hidden">
                    <motion.div
                      className="h-full bg-primary rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: analysisState.total > 0 ? `${(analysisState.current / analysisState.total) * 100}%` : '5%' }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                )}
              </div>

              {/* Analysis Log Log */}
              {analysisState.logs.length > 0 && (
                <div className="mt-4 space-y-2">
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Processed Files</p>
                  <div className="bg-black/20 rounded-xl border border-border/50 p-3 max-h-60 overflow-y-auto custom-scrollbar">
                    {analysisState.logs.map((log, i) => (
                      <div key={i} className="flex items-center gap-2 py-1.5 text-xs text-muted-foreground border-b border-white/5 last:border-0 hover:bg-white/5 px-1 rounded transition-colors">
                        <CheckCircle className="w-3 h-3 text-green-500/60 shrink-0" />
                        <span className="truncate">{log}</span>
                        {i === analysisState.logs.length - 1 && !analysisState.isComplete && (
                          <span className="ml-auto flex gap-0.5">
                            <span className="w-1 h-1 bg-primary rounded-full animate-bounce" />
                            <span className="w-1 h-1 bg-primary rounded-full animate-bounce [animation-delay:0.2s]" />
                            <span className="w-1 h-1 bg-primary rounded-full animate-bounce [animation-delay:0.4s]" />
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {analysisState.isComplete ? (
                <button
                  onClick={() => setAnalysisState(prev => ({ ...prev, active: false }))}
                  className="w-full py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-bold shadow-lg shadow-primary/20 hover:opacity-90 transition-all active:scale-95 mt-4"
                >
                  Dismiss Log
                </button>
              ) : (
                <p className="text-xs text-muted-foreground text-center italic">
                  Processing batch of files with Gemini AI...
                </p>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Upload Progress Overlay */}
      <AnimatePresence>
        {uploadState === 'uploading' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-md glass border border-border rounded-2xl p-6 space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-lg">Uploading Project ZIP</h3>
                <Upload className="w-5 h-5 text-primary animate-pulse" />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    {formatBytes(uploadProgress.loaded)} / {formatBytes(uploadProgress.total)}
                  </span>
                  <span className="font-mono font-bold text-primary">{uploadProgress.percent}%</span>
                </div>
                <div className="w-full bg-muted/30 rounded-full h-3 overflow-hidden">
                  <motion.div
                    className="h-full bg-primary rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${uploadProgress.percent}%` }}
                    transition={{ duration: 0.2 }}
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground italic">
                Please do not close this window until the upload is complete.
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

function StatCard({ title, value, trend, icon, color, onClick }: any) {
  return (
    <GlassCard
      className={cn('flex flex-col gap-4', onClick && 'cursor-pointer hover:scale-[1.02] hover:shadow-xl transition-transform')} 
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <div className={cn("p-2 rounded-lg", color)}>
          {icon}
        </div>
        {onClick && (
          <span className="text-xs font-medium text-muted-foreground flex items-center gap-1 bg-muted/30 px-2 py-0.5 rounded-full">
            Details <ArrowUpRight className="w-3 h-3" />
          </span>
        )}
      </div>
      <div>
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        <p className="text-3xl font-bold">{value}</p>
        <p className="text-xs text-muted-foreground mt-1">{trend}</p>
      </div>
    </GlassCard>
  )
}

function InsightItem({ icon, title, desc }: any) {
  return (
    <div className="flex gap-4 p-3 rounded-xl hover:bg-white/5 transition-colors group cursor-pointer">
      <div className="mt-1">{icon}</div>
      <div>
        <p className="text-sm font-semibold group-hover:text-primary transition-colors">{title}</p>
        <p className="text-xs text-muted-foreground line-clamp-2">{desc}</p>
      </div>
    </div>
  )
}


function ProjectMetricsPane({ project, projectStats }: { project: Project | null, projectStats: any }) {
  const [activeTab, setActiveTab] = useState<'activity' | 'health'>('activity')
  
  if (!project?.githubRepoUrl) {
    return <ProjectHealthChart projectStats={projectStats} inPane={false} />
  }
  
  return (
    <GlassCard className="flex flex-col h-full p-0 overflow-hidden">
      <div className="flex border-b border-border/50 bg-background/20">
        <button 
          onClick={() => setActiveTab('activity')}
          className={`flex-1 py-3 text-sm font-semibold transition-colors ${activeTab === 'activity' ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground hover:text-foreground hover:bg-white/5'}`}
        >
          Commit Graph
        </button>
        <button 
          onClick={() => setActiveTab('health')}
          className={`flex-1 py-3 text-sm font-semibold transition-colors ${activeTab === 'health' ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground hover:text-foreground hover:bg-white/5'}`}
        >
          Security & Health
        </button>
      </div>
      <div className="flex-1 p-6">
        {activeTab === 'activity' ? (
          <CommitActivityChart project={project} inPane={true} />
        ) : (
          <ProjectHealthChart projectStats={projectStats} inPane={true} />
        )}
      </div>
    </GlassCard>
  )
}

function CommitActivityChart({ project, inPane = false }: { project: Project | null, inPane?: boolean }) {
  const [period, setPeriod] = useState('Last 30 Days')
  
  const { data: rawCommits, isLoading } = useQuery({
    queryKey: ['commitActivity', project?.id],
    queryFn: async () => {
      if (!project?.id) return []
      const { data } = await apiClient.get(`/git/commits/${project.id}/activity`)
      return data as { date: string, commits: number }[]
    },
    enabled: !!project?.id && !!project.githubRepoUrl
  })

  // Process data based on period
  const chartData = useMemo(() => {
    if (!rawCommits) return []
    
    const now = new Date()
    let cutoff = new Date()
    const isDaily = period === 'Last 7 Days' || period === 'Last 30 Days'
    
    if (isDaily) {
      const daysCount = period === 'Last 7 Days' ? 7 : 30;
      const buckets = [];
      for (let i = daysCount - 1; i >= 0; i--) {
        const d = new Date()
        d.setDate(d.getDate() - i)
        const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
        const match = rawCommits.find(c => c.date === key)
        buckets.push({
          name: key.substring(5), // MM-DD
          commits: match ? match.commits : 0
        })
      }
      return buckets
    }

    if (period === 'Last 12 Weeks') cutoff.setDate(now.getDate() - 84)
    else if (period === 'Last 12 Months') cutoff.setMonth(now.getMonth() - 12)
    else if (period === 'Last 5 Years') cutoff.setFullYear(now.getFullYear() - 5)
    
    // Filter by cutoff
    const filtered = rawCommits.filter(c => new Date(c.date) >= cutoff)
    if (filtered.length === 0) return []
    
    // Grouping
    const grouped = filtered.reduce((acc, curr) => {
      const d = new Date(curr.date)
      let key = ''
      if (period === 'Last 12 Weeks') {
        const startOfWeek = new Date(d);
        startOfWeek.setDate(d.getDate() - d.getDay());
        key = `${startOfWeek.getMonth()+1}/${startOfWeek.getDate()}`
      }
      else if (period === 'Last 12 Months') key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}` 
      else key = `${d.getFullYear()}`
        
      acc[key] = (acc[key] || 0) + curr.commits
      return acc
    }, {} as Record<string, number>)
    
    return Object.entries(grouped).map(([name, commits]) => ({ name, commits }))
  }, [rawCommits, period])

  const content = (
    <div className="flex flex-col h-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <div>
          <h3 className="text-lg font-bold text-foreground">Commit Graph</h3>
          <p className="text-sm text-muted-foreground">
            {project?.name ?? 'Select project'} — daily code changes across branches
          </p>
        </div>
        <select 
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          className="bg-background/50 text-foreground border border-border/50 rounded-md text-xs px-3 py-2 outline-none"
        >
          <option>Last 7 Days</option>
          <option>Last 30 Days</option>
          <option>Last 12 Months</option>
          <option>Last 5 Years</option>
        </select>
      </div>
      <div style={{ width: '100%', height: '300px' }} className="mt-4">
        {isLoading ? (
          <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground gap-2">
            <Loader2 className="w-6 h-6 animate-spin" />
            <span className="text-sm">Loading activity...</span>
          </div>
        ) : chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ bottom: 15, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#888', fontSize: 12 }} dy={10}>
                <Label value="Time Frame" offset={-10} position="insideBottom" fill="#888" fontSize={12} />
              </XAxis>
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#888', fontSize: 12 }}>
                <Label value="Total Commits" angle={-90} position="insideLeft" fill="#888" fontSize={12} style={{ textAnchor: 'middle' }} />
              </YAxis>
              <Tooltip
                cursor={{ fill: 'rgba(128,128,128,0.1)' }}
                contentStyle={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: '12px' }}
                itemStyle={{ color: 'var(--foreground)' }}
                labelStyle={{ color: 'var(--muted-foreground)' }}
              />
              <Bar dataKey="commits" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm border-2 border-dashed border-border/40 rounded-xl">
            No commits found for this period. Ensure the repo is synced.
          </div>
        )}
      </div>
    </div>
  )

  return inPane ? content : <GlassCard className="h-full">{content}</GlassCard>
}

function ProjectHealthChart({ projectStats, inPane = false }: { projectStats: any, inPane?: boolean }) {
  const chartData = [
    { name: 'Security', value: projectStats?.totalSecurityIssues || 0, color: '#ef4444' },
    { name: 'Bugs', value: projectStats?.totalBugs || 0, color: '#eab308' },
    { name: 'Performance', value: projectStats?.totalPerformanceIssues || 0, color: '#f97316' }
  ]

  const content = (
    <div className="flex flex-col h-full">
      <div className="mb-8">
        <h3 className="text-lg font-bold text-foreground">Project Health Breakdown</h3>
        <p className="text-sm text-muted-foreground">
          Distribution of issues detected by AI analysis
        </p>
      </div>
      <div style={{ width: '100%', height: '300px' }} className="mt-4">
        {(projectStats?.totalSecurityIssues || projectStats?.totalBugs || projectStats?.totalPerformanceIssues) ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 15 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="rgba(255,255,255,0.05)" />
              <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#888', fontSize: 12 }}>
                <Label value="Total Discovered Issues" offset={-10} position="insideBottom" fill="#888" fontSize={12} />
              </XAxis>
              <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: '#888', fontSize: 13 }} width={80} />
              <Tooltip
                cursor={{ fill: 'rgba(128,128,128,0.1)' }}
                contentStyle={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: '12px' }}
                itemStyle={{ color: 'var(--foreground)' }}
                labelStyle={{ color: 'var(--muted-foreground)' }}
              />
              <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={32}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-green-500 font-medium border-2 border-dashed border-border/40 rounded-xl">
            <CheckCircle className="w-5 h-5 mr-2" />
            No issues detected!
          </div>
        )}
      </div>
    </div>
  )

  return inPane ? content : <GlassCard className="h-full">{content}</GlassCard>
}
