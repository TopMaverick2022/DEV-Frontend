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
  BrainCircuit,
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
  X,
  FolderKanban,
  ChevronRight,
  Terminal,
  Layers,
  Sparkles,
  Shield,
  TestTube2,
  FileText,
  BarChart3,
  CheckCircle2,
  AlertTriangle,
  Wand2,
  Database,
  Download,
  Check,
  Edit2,
  Trash2
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { projectService } from '@/features/projects/project-service'
import apiClient, { tokenStore } from '@/lib/api-client'
import { useNavigate } from 'react-router-dom'
import { Project } from '@/types/project'
import { GitHubPanel } from '@/components/shared/github-panel'
import { ProjectSwitcher } from '@/components/shared/project-switcher'
import { AlertCircle } from 'lucide-react'
import Swal from 'sweetalert2'
import './quota-alerts.css' // We'll create this for custom styling


// ProjectSwitcher component has been moved to shared components

// ── Dashboard Page ────────────────────────────────────────────────────────────
export function DashboardPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [showModal, setShowModal] = useState(false)
  const [uploadState, setUploadState] = useState<'idle' | 'uploading' | 'done'>('idle')
  const [uploadProgress, setUploadProgress] = useState({ loaded: 0, total: 0, percent: 0 })
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const evtSourceRef = useRef<EventSource | null>(null)

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
      
      // Auto-trigger analysis for the new project (REMOVED: User wants to manually trigger analysis)
      // if (data?.projectId) {
      //   handleAnalyzeWorkspace(data.projectId, data.projectName || file.name)
      // }
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
    projectId: number | null
  }>({ active: false, current: 0, total: 0, filename: '', logs: [], isComplete: false, projectId: null })

  const handleAnalyzeWorkspace = (projId?: number, projName?: string) => {
    const id = projId || selectedProject?.id
    const name = projName || selectedProject?.name || 'Project Files'
    
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
    
    setAnalysisState({ active: true, current: 0, total: 0, filename: 'Connecting...', logs: [], isComplete: false, projectId: id })

    const evtSource = new EventSource(url)
    evtSourceRef.current = evtSource

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
      } else if (raw.startsWith('QUOTA_EXCEEDED:')) {
        // Quota/rate-limit error — close stream and show immediate SweetAlert
        evtSource.close()
        const msg = raw.replace('QUOTA_EXCEEDED:', '').trim()
        setAnalysisState({ active: false, current: 0, total: 0, filename: '', logs: [], isComplete: false, projectId: null })
        Swal.fire({
          title: 'API Quota Exceeded',
          text: msg || 'Daily AI processing limit reached. Please try again tomorrow.',
          icon: 'warning',
          background: 'rgba(15, 15, 20, 0.95)',
          color: '#fff',
          confirmButtonColor: '#3b82f6',
          backdrop: `rgba(0,0,0,0.4) blur(4px)`
        })
      } else if (raw.startsWith('ERROR:')) {
        evtSource.close()
        const msg = raw.replace('ERROR:', '').trim()
        setAnalysisState(prev => ({ ...prev, active: false, filename: `Error: ${msg}` }))
        console.error('Analysis error:', msg)

        // SweetAlert for quota exhaustion in SSE (legacy ERROR: path)
        if (msg.toLowerCase().includes('quota') || msg.toLowerCase().includes('429') || msg.toLowerCase().includes('rate limit')) {
          Swal.fire({
            title: 'API Quota Exceeded',
            text: 'Daily limit reached. Please try again tomorrow.',
            icon: 'error',
            background: 'rgba(15, 15, 20, 0.95)',
            color: '#fff',
            confirmButtonColor: '#3b82f6',
            backdrop: `rgba(0,0,0,0.4) blur(4px)`
          })
        } else {
          Swal.fire({
            title: 'Analysis Error',
            text: msg || 'An error occurred during analysis. Please try again.',
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

  const handleCancelAnalysis = () => {
    const id = analysisState.projectId;
    if (!id) return;
    
    Swal.fire({
      title: 'Cancel Analysis?',
      text: 'Are you sure you want to stop the AI analysis? Partially processed files will be saved.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, cancel it',
      cancelButtonText: 'No, keep analyzing',
      background: 'rgba(15, 15, 20, 0.95)',
      color: '#fff',
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#3f3f46',
      backdrop: `rgba(0,0,0,0.4) blur(4px)`
    }).then(async (result) => {
      if (result.isConfirmed) {
        if (evtSourceRef.current) {
          evtSourceRef.current.close();
          evtSourceRef.current = null;
        }
        
        try {
          await apiClient.post(`/ai/analyze-workspace/${id}/cancel`);
        } catch (error) {
          console.error('Failed to cancel on backend:', error);
        }

        setAnalysisState({ active: false, current: 0, total: 0, filename: '', logs: [], isComplete: false, projectId: null });
        Swal.fire({
          title: 'Cancelled',
          text: 'Analysis has been stopped.',
          icon: 'info',
          background: 'rgba(15, 15, 20, 0.95)',
          color: '#fff',
          confirmButtonColor: '#3b82f6',
        });
      }
    });
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

  // Sync with localStorage
  useEffect(() => {
    if (projects && projects.length > 0) {
      const savedId = localStorage.getItem('selectedProjectId')
      const matched = savedId ? projects.find(p => p.id === parseInt(savedId)) : null
      if (matched) {
        setSelectedProject(matched)
      } else if (!selectedProject) {
        setSelectedProject(projects[0])
      }
    }
  }, [projects])

  const handleSelectProject = (project: Project) => {
    setSelectedProject(project)
    localStorage.setItem('selectedProjectId', project.id.toString())
  }

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
                onSelect={handleSelectProject}
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
                    onAnalyze={() => handleAnalyzeWorkspace()}
                  />
                ) : (
                  <>
                    <div className="lg:col-span-2 min-w-0">
                      <ProjectMetricsPane project={selectedProject} projectStats={projectStats} />
                    </div>
                    <div className="lg:col-span-1 min-w-0">
                      <GlassCard className="flex flex-col items-center justify-center text-center gap-4 py-8 h-full">
                        <div className="p-4 rounded-full bg-purple-500/10">
                          <BrainCircuit className="w-8 h-8 text-purple-500" />
                        </div>
                        <div>
                          {/* <h3 className="text-lg font-bold">Manual Analysis</h3> */}
                          <p className="text-sm text-muted-foreground mt-1 px-4">Run AI code analysis on your uploaded ZIP project.</p>
                        </div>
                        <button
                          onClick={() => handleAnalyzeWorkspace()}
                          disabled={analysisState.active}
                          className="mt-4 px-6 py-2.5 bg-purple-500 text-white rounded-lg font-bold hover:bg-purple-600 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                        >
                          {analysisState.active ? (
                            <><Loader2 className="w-4 h-4 animate-spin" /> Analyzing...</>
                          ) : (
                            <><BrainCircuit className="w-4 h-4" /> Analyze</>
                          )}
                        </button>
                      </GlassCard>
                    </div>
                  </>
                )}
              </div>

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
                    {analysisState.logs.map((log, i) => {
                      const isProcessing = i === analysisState.logs.length - 1 && !analysisState.isComplete;
                      return (
                      <div key={i} className="flex items-center gap-2 py-1.5 text-xs text-muted-foreground border-b border-white/5 last:border-0 hover:bg-white/5 px-1 rounded transition-colors">
                        {isProcessing ? (
                          <Loader2 className="w-3 h-3 text-primary animate-spin shrink-0" />
                        ) : (
                          <CheckCircle className="w-3 h-3 text-green-500/60 shrink-0" />
                        )}
                        <span className={cn("truncate", isProcessing ? "text-primary font-medium" : "")}>{log}</span>
                        {isProcessing && (
                          <span className="ml-auto flex gap-0.5">
                            <span className="w-1 h-1 bg-primary rounded-full animate-bounce" />
                            <span className="w-1 h-1 bg-primary rounded-full animate-bounce [animation-delay:0.2s]" />
                            <span className="w-1 h-1 bg-primary rounded-full animate-bounce [animation-delay:0.4s]" />
                          </span>
                        )}
                      </div>
                    )})}
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
                <div className="flex flex-col gap-3 mt-4">
                  <p className="text-xs text-muted-foreground text-center italic">
                    Processing batch of files with Gemini AI...
                  </p>
                  <button
                    onClick={handleCancelAnalysis}
                    className="w-full py-2.5 bg-destructive/10 text-destructive border border-destructive/20 rounded-xl text-sm font-bold shadow-lg hover:bg-destructive hover:text-white transition-all active:scale-95"
                  >
                    Cancel Analysis
                  </button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Upload Progress Overlay */}
      <AnimatePresence>
        {(uploadState === 'uploading' || uploadState === 'done') && (
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
              {uploadState === 'uploading' ? (
                <>
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
                </>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-lg text-green-500">Upload Successful!</h3>
                    <CheckCircle className="w-5 h-5 text-green-500 animate-bounce" />
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      Your project has been uploaded successfully. Processing and analysis will start shortly.
                    </p>
                  </div>
                  <button
                    onClick={() => setUploadState('idle')}
                    className="w-full py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-bold shadow-lg shadow-primary/20 hover:opacity-90 transition-all active:scale-95 mt-4"
                  >
                    Close
                  </button>
                </>
              )}
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


// ── Task type helpers (mirrors planner-page but local to avoid import) ────────
const TASK_TYPE_META: Record<string, { icon: React.ReactNode; color: string; bg: string }> = {
  Backend:       { icon: <Terminal className="w-3 h-3" />,   color: 'text-blue-400',   bg: 'bg-blue-500/10 border-blue-500/20' },
  Frontend:      { icon: <Layers className="w-3 h-3" />,     color: 'text-violet-400', bg: 'bg-violet-500/10 border-violet-500/20' },
  Design:        { icon: <Sparkles className="w-3 h-3" />,   color: 'text-pink-400',   bg: 'bg-pink-500/10 border-pink-500/20' },
  Security:      { icon: <Shield className="w-3 h-3" />,     color: 'text-red-400',    bg: 'bg-red-500/10 border-red-500/20' },
  Testing:       { icon: <TestTube2 className="w-3 h-3" />,  color: 'text-green-400',  bg: 'bg-green-500/10 border-green-500/20' },
  Documentation: { icon: <FileText className="w-3 h-3" />,   color: 'text-amber-400',  bg: 'bg-amber-500/10 border-amber-500/20' },
  DevOps:        { icon: <Zap className="w-3 h-3" />,        color: 'text-cyan-400',   bg: 'bg-cyan-500/10 border-cyan-500/20' },
  Architecture:  { icon: <Layers className="w-3 h-3" />,     color: 'text-indigo-400', bg: 'bg-indigo-500/10 border-indigo-500/20' },
  Database:      { icon: <Database className="w-3 h-3" />,   color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
  Development:   { icon: <Code className="w-3 h-3" />,       color: 'text-fuchsia-400', bg: 'bg-fuchsia-500/10 border-fuchsia-500/20' },
}

const TASK_PRIORITY_META: Record<string, { color: string; dot: string }> = {
  High:   { color: 'text-red-400 bg-red-500/10 border border-red-500/20',       dot: 'bg-red-400' },
  Medium: { color: 'text-amber-400 bg-amber-500/10 border border-amber-500/20', dot: 'bg-amber-400' },
  Low:    { color: 'text-green-400 bg-green-500/10 border border-green-500/20', dot: 'bg-green-400' },
}

const COMPLEXITY_BADGE: Record<string, string> = {
  Low:    'text-green-400 bg-green-500/10 border-green-500/20',
  Medium: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  High:   'text-red-400 bg-red-500/10 border-red-500/20',
}

function getTaskTypeMeta(type: string) {
  return TASK_TYPE_META[type] ?? { icon: <Code className="w-3 h-3" />, color: 'text-slate-400', bg: 'bg-slate-500/10 border-slate-500/20' }
}

function getTaskPriorityMeta(priority: string) {
  return TASK_PRIORITY_META[priority] ?? { color: 'text-slate-400 bg-slate-500/10', dot: 'bg-slate-400' }
}

function getSvgIconForType(type: string) {
  const t = type.toLowerCase()
  if (t === 'backend') {
    return `<svg class="category-icon" style="color:#60a5fa" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 17 10 11 4 5"></polyline><line x1="12" y1="19" x2="20" y2="19"></line></svg>`
  }
  if (t === 'frontend') {
    return `<svg class="category-icon" style="color:#a78bfa" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline></svg>`
  }
  if (t === 'design') {
    return `<svg class="category-icon" style="color:#f472b6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.3-6.3l-.7.7M6.7 17.3l-.7.7m12.6 0l-.7-.7M6.7 6.7l-.7-.7"></path></svg>`
  }
  if (t === 'security') {
    return `<svg class="category-icon" style="color:#f87171" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>`
  }
  if (t === 'testing') {
    return `<svg class="category-icon" style="color:#4ade80" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.667 24H9.333c-.8 0-1.547-.427-1.947-1.12l-5.333-9.333c-.4-.707-.4-1.573 0-2.28L7.387 1.947C7.787 1.253 8.533.827 9.333.827h5.333c.8 0 1.547.427 1.947 1.12l5.333 9.333c.4.707.4 1.573 0 2.28l-5.333 9.333c-.4.693-1.147 1.12-1.947 1.12z"></path></svg>`
  }
  if (t === 'documentation' || t === 'document') {
    return `<svg class="category-icon" style="color:#fbbf24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>`
  }
  if (t === 'devops') {
    return `<svg class="category-icon" style="color:#22d3ee" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>`
  }
  if (t === 'architecture') {
    return `<svg class="category-icon" style="color:#818cf8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline></svg>`
  }
  if (t === 'development') {
    return `<svg class="category-icon" style="color:#e879f9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>`
  }
  if (t === 'database') {
    return `<svg class="category-icon" style="color:#34d399" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"></ellipse><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path><path d="M3 12c0 1.66 4 3 9 3s9-1.34 9-3"></path></svg>`
  }
  return `<svg class="category-icon" style="color:#94a3b8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>`
}

function handleDownloadGlobalPlan(feature: any) {
  const tasksByType = feature.tasks.reduce((acc: any, t: any) => {
    const key = t.type || 'Other'
    acc[key] = [...(acc[key] ?? []), t]
    return acc
  }, {})

  const categorySubtitles: Record<string, string> = {
    Backend:       "SERVICE LOGIC, API ROUTING & BACKEND OPERATIONS",
    Frontend:      "USER INTERFACES, COMPONENTS & CLIENT-SIDE LOGIC",
    Design:        "USER EXPERIENCE, STYLING & WIREFRAMES",
    Security:      "AUTHENTICATION, AUTHORIZATION & SYSTEM HARDENING",
    Testing:       "UNIT TESTS, INTEGRATION TESTING & QUALITY ASSURANCE",
    Documentation: "TECHNICAL DOCUMENTATION & KNOWLEDGE BASE",
    DevOps:        "DEPLOYMENT PIPELINES, CONTAINERIZATION & CLOUD",
    Architecture:  "SYSTEM DESIGN, CLASS DIAGRAMS & DATA FLOWS",
    Database:      "DATABASE ARCHITECTURE, SCHEMA & MIGRATIONS",
  }

  let categoriesHtml = ''
  Object.entries(tasksByType).forEach(([type, tasks]: [string, any]) => {
    let tasksHtml = ''
    tasks.forEach((t: any) => {
      const priorityClass = t.priority === 'High' ? 'badge-high' : t.priority === 'Medium' ? 'badge-medium' : 'badge-low';
      tasksHtml += `
        <div class="task-card">
          <div class="task-header">
            <span class="task-title">${t.title}</span>
            <span class="badge ${priorityClass}">${t.priority}</span>
          </div>
          <p class="task-desc">${t.description}</p>
          <div class="task-meta">
            <span><strong>Hours:</strong> ${t.estimatedHours || 0}h</span>
            ${t.status ? `<span><strong>Status:</strong> ${t.status}</span>` : ''}
          </div>
        </div>
      `
    })

    const iconSvg = getSvgIconForType(type)
    const sub = categorySubtitles[type] || "PLAN SPECIFICATIONS & DEVELOPMENT TASKS"

    categoriesHtml += `
      <div class="category-section">
        <div class="category-header">
          ${iconSvg}
          <span style="margin-left: 10px;">${type} Development Plan</span>
          <span class="category-meta-hours">
            ${tasks.length} tasks &middot; ${tasks.reduce((s: number, t: any) => s + (t.estimatedHours || 0), 0)}h
          </span>
        </div>
        <div class="category-subtitle">${sub}</div>
        <div>
          ${tasksHtml}
        </div>
      </div>
    `
  })

  const htmlContent = `
    <h1>${feature.featureName || feature.name}</h1>
    <div class="subtitle">DEVELOPMENT PLAN & REQUIREMENTS SPECIFICATION</div>
    <div class="meta-info">
      <strong>Complexity:</strong> ${feature.complexity} &nbsp;|&nbsp; 
      <strong>Total Estimated Hours:</strong> ${feature.totalEstimatedHours || 0}h &nbsp;|&nbsp; 
      <strong>Generated:</strong> ${new Date(feature.createdAt || Date.now()).toLocaleDateString()}
    </div>
    ${categoriesHtml}
  `

  const printWindow = window.open('', '_blank')
  if (!printWindow) return
  printWindow.document.write(`
    <html>
      <head>
        <title>Plan - ${feature.featureName || feature.name}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
          body {
            font-family: 'Inter', sans-serif;
            color: #0f172a;
            line-height: 1.5;
            padding: 50px;
            background: #ffffff;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          h1 {
            font-size: 32px;
            font-weight: 800;
            margin-bottom: 6px;
            color: #0f172a;
          }
          .subtitle {
            font-size: 12px;
            font-weight: 700;
            color: #4f46e5;
            margin-bottom: 20px;
            text-transform: uppercase;
            letter-spacing: 0.08em;
          }
          .meta-info {
            font-size: 12px;
            color: #64748b;
            margin-bottom: 32px;
            border-bottom: 2px solid #f1f5f9;
            padding-bottom: 16px;
          }
          .category-section {
            page-break-inside: avoid;
            margin-bottom: 30px;
          }
          .category-header {
            display: flex;
            align-items: center;
            font-size: 22px;
            font-weight: 800;
            color: #1e1b4b;
            margin-top: 36px;
            margin-bottom: 2px;
          }
          .category-subtitle {
            font-size: 10px;
            font-weight: 700;
            color: #6366f1;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            margin-bottom: 18px;
            border-bottom: 1.5px solid #e2e8f0;
            padding-bottom: 6px;
          }
          .category-meta-hours {
            font-size: 12px;
            font-weight: 500;
            color: #64748b;
            margin-left: auto;
          }
          .category-icon {
            width: 24px;
            height: 24px;
            stroke-width: 2.5;
          }
          .task-card {
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            padding: 18px;
            margin-bottom: 16px;
            background: #f8fafc;
            page-break-inside: avoid;
          }
          .task-header {
            display: flex;
            justify-content: justify;
            align-items: start;
            margin-bottom: 8px;
          }
          .task-title {
            font-weight: 700;
            font-size: 15px;
            color: #0f172a;
          }
          .badge {
            font-size: 10px;
            font-weight: 700;
            padding: 3px 10px;
            border-radius: 9999px;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            margin-left: auto;
          }
          .badge-high { background-color: #fee2e2 !important; color: #991b1b !important; }
          .badge-medium { background-color: #fef3c7 !important; color: #92400e !important; }
          .badge-low { background-color: #dcfce7 !important; color: #166534 !important; }
          .task-desc {
            font-size: 12.5px;
            color: #334155;
            margin-bottom: 10px;
            line-height: 1.6;
          }
          .task-meta {
            font-size: 11px;
            color: #64748b;
            font-weight: 500;
            display: flex;
            gap: 16px;
          }
          @media print {
            body { padding: 20px; }
          }
        </style>
      </head>
      <body>
        ${htmlContent}
        <script>
          window.onload = function() {
            window.print();
            setTimeout(function() { window.close(); }, 500);
          };
        </script>
      </body>
    </html>
  `)
  printWindow.document.close()
}

function getActionForType(type: string) {
  const t = type.toLowerCase()
  if (t === 'backend' || t === 'frontend' || t === 'devops' || t === 'testing' || t === 'development') {
    return { label: 'Implement Code with AI', action: 'implement_code', icon: <Wand2 className="w-3.5 h-3.5" /> }
  }
  if (t === 'documentation' || t === 'document') {
    return { label: 'Go to Docs Gen', action: 'navigate', to: '/docs', icon: <FileText className="w-3.5 h-3.5" /> }
  }
  if (t === 'architecture' || t === 'database architecture design' || t === 'database') {
    return { label: 'Go to Architecture Gen', action: 'navigate', to: '/architecture', icon: <Layers className="w-3.5 h-3.5" /> }
  }
  if (t === 'requirement analysis' || t === 'requirements' || t === 'analysis' || t === 'design') {
    return { label: 'View & Download Report', action: 'view_report', icon: <FileText className="w-3.5 h-3.5" /> }
  }
  // Default fallback for any other task type
  return { label: 'View & Download Report', action: 'view_report', icon: <FileText className="w-3.5 h-3.5" /> }
}

// ── Project Plans Tab ─────────────────────────────────────────────────────────
interface FeaturePlanDto {
  id: number
  featureName?: string
  name: string
  complexity: string
  totalEstimatedHours: number
  tasks: { id: number; title: string; description: string; type: string; estimatedHours: number; priority: string; status: string }[]
}

function ProjectPlansTab({ project }: { project: Project | null }) {
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [implementingType, setImplementingType] = useState<string | null>(null)
  const [reportModalData, setReportModalData] = useState<{ featureName: string; tasks: any[] } | null>(null)
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  // Editing Feature states
  const [editingFeatureId, setEditingFeatureId] = useState<number | null>(null)
  const [editFeatureName, setEditFeatureName] = useState('')
  const [editFeatureComplexity, setEditFeatureComplexity] = useState('')

  // Editing Task states
  const [editingTaskId, setEditingTaskId] = useState<number | null>(null)
  const [editTaskTitle, setEditTaskTitle] = useState('')
  const [editTaskDesc, setEditTaskDesc] = useState('')
  const [editTaskPriority, setEditTaskPriority] = useState('')
  const [editTaskHours, setEditTaskHours] = useState<number>(0)

  const handleAiImplementType = async (featureId: number, featureName: string, type: string) => {
    if (!featureId) return;
    
    setImplementingType(type);
    try {
      await apiClient.post(`/ai/implement-plan/${featureId}`);
      
      await Swal.fire({
        title: '✨ AI Implementation Complete!',
        html: `
          <p style="color:#a1a1aa;font-size:14px;line-height:1.6">
            The tasks for <strong style="color:#fff">"${featureName}"</strong> have been successfully implemented by AI.
            The files have been generated and saved into your project's workspace folder.
          </p>`,
        icon: 'success',
        background: 'rgba(15,15,20,0.97)',
        color: '#fff',
        confirmButtonColor: '#6366f1',
        confirmButtonText: 'Great!',
        backdrop: 'rgba(0,0,0,0.5) blur(4px)',
      });
    } catch (error: any) {
        Swal.fire({
          title: 'Error Implementing Plan',
          text: error.response?.data?.message || 'Failed to implement plan with AI. Please try again.',
          icon: 'error',
          background: 'rgba(15,15,20,0.95)',
          color: '#fff',
          confirmButtonColor: '#ef4444',
        });
    } finally {
        setImplementingType(null);
    }
  }

  const handleSaveFeature = async (e: React.MouseEvent, featureId: number) => {
    e.stopPropagation()
    try {
      await apiClient.put(`/features/${featureId}`, {
        name: editFeatureName,
        complexity: editFeatureComplexity
      })
      setEditingFeatureId(null)
      queryClient.invalidateQueries({ queryKey: ['projectPlans', project?.id] })
      Swal.fire({
        title: 'Updated',
        text: 'Feature plan updated successfully.',
        icon: 'success',
        timer: 1500,
        showConfirmButton: false,
        background: 'rgba(15,15,20,0.95)',
        color: '#fff',
      })
    } catch (err) {
      Swal.fire({
        title: 'Error',
        text: 'Failed to update feature plan.',
        icon: 'error',
        background: 'rgba(15,15,20,0.95)',
        color: '#fff',
      })
    }
  }

  const handleDeleteFeature = async (e: React.MouseEvent, featureId: number, featureName: string) => {
    e.stopPropagation()
    const res = await Swal.fire({
      title: 'Delete Feature Plan?',
      text: `Are you sure you want to delete "${featureName}"? This will permanently delete all associated tasks.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Delete',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#3f3f46',
      background: 'rgba(15,15,20,0.95)',
      color: '#fff',
    })

    if (res.isConfirmed) {
      try {
        await apiClient.delete(`/features/${featureId}`)
        queryClient.invalidateQueries({ queryKey: ['projectPlans', project?.id] })
        Swal.fire({
          title: 'Deleted',
          text: 'Feature plan has been deleted.',
          icon: 'success',
          timer: 1500,
          showConfirmButton: false,
          background: 'rgba(15,15,20,0.95)',
          color: '#fff',
        })
      } catch (err) {
        Swal.fire({
          title: 'Error',
          text: 'Failed to delete feature plan.',
          icon: 'error',
          background: 'rgba(15,15,20,0.95)',
          color: '#fff',
        })
      }
    }
  }

  const handleSaveTask = async (taskId: number) => {
    try {
      await apiClient.put(`/tasks/${taskId}`, {
        title: editTaskTitle,
        description: editTaskDesc,
        estimatedHours: editTaskHours,
        priority: editTaskPriority
      })
      setEditingTaskId(null)
      queryClient.invalidateQueries({ queryKey: ['projectPlans', project?.id] })
      Swal.fire({
        title: 'Updated',
        text: 'Task updated successfully.',
        icon: 'success',
        timer: 1500,
        showConfirmButton: false,
        background: 'rgba(15,15,20,0.95)',
        color: '#fff',
      })
    } catch (err) {
      Swal.fire({
        title: 'Error',
        text: 'Failed to update task.',
        icon: 'error',
        background: 'rgba(15,15,20,0.95)',
        color: '#fff',
      })
    }
  }

  const { data: features, isLoading, isError } = useQuery<FeaturePlanDto[]>({
    queryKey: ['projectPlans', project?.id],
    queryFn: async () => {
      if (!project?.id) return []
      const { data } = await apiClient.get(`/features/project/${project.id}`)
      return data
    },
    enabled: !!project?.id,
  })

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-48 gap-3 text-muted-foreground">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
        <span className="text-sm">Loading plans...</span>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center h-48 gap-2 text-destructive">
        <AlertTriangle className="w-6 h-6" />
        <span className="text-sm">Failed to load project plans.</span>
      </div>
    )
  }

  if (!features || features.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 gap-3 text-muted-foreground border-2 border-dashed border-border/40 rounded-2xl">
        <FolderKanban className="w-8 h-8 opacity-40" />
        <div className="text-center">
          <p className="text-sm font-medium">No plans generated yet</p>
          <p className="text-xs mt-1">Use the AI Planner to generate a feature plan for this project.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3 overflow-y-auto max-h-[420px] pr-1 custom-scrollbar">
      {features.map((feature) => {
        const isOpen = expandedId === feature.id
        const isEditingThisFeature = editingFeatureId === feature.id
        const complexityClass = COMPLEXITY_BADGE[feature.complexity] ?? 'text-slate-400 bg-slate-500/10 border-slate-500/20'
        const tasksByType = feature.tasks.reduce<Record<string, typeof feature.tasks>>((acc, t) => {
          const key = t.type || 'Other'
          acc[key] = [...(acc[key] ?? []), t]
          return acc
        }, {})

        return (
          <div
            key={feature.id}
            className="rounded-xl border border-border/60 bg-background/30 overflow-hidden transition-all"
          >
            {/* Feature Header — click to expand/collapse */}
            <div
              className="w-full flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 hover:bg-white/5 transition-colors text-left cursor-pointer"
              onClick={() => setExpandedId(isOpen ? null : feature.id)}
            >
              {isEditingThisFeature ? (
                <div className="flex items-center gap-2 min-w-0 flex-1" onClick={e => e.stopPropagation()}>
                  <FolderKanban className="w-3.5 h-3.5 text-primary shrink-0" />
                  <input
                    type="text"
                    value={editFeatureName}
                    onChange={e => setEditFeatureName(e.target.value)}
                    className="bg-background border border-border rounded-lg px-2 py-1 text-sm text-foreground w-full max-w-[200px]"
                  />
                  <select
                    value={editFeatureComplexity}
                    onChange={e => setEditFeatureComplexity(e.target.value)}
                    className="bg-background border border-border rounded-lg px-2 py-1 text-xs text-foreground"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                  <button
                    onClick={(e) => handleSaveFeature(e, feature.id)}
                    className="p-1.5 rounded-lg bg-green-500/10 text-green-400 hover:bg-green-500 hover:text-white transition-colors"
                  >
                    <Check className="w-3 h-3" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setEditingFeatureId(null) }}
                    className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-1.5 rounded-lg bg-primary/10 border border-primary/20 shrink-0">
                    <FolderKanban className="w-3.5 h-3.5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{feature.featureName || feature.name}</p>
                    <p className="text-xs text-muted-foreground">{feature.tasks.length} tasks</p>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                {!isEditingThisFeature && (
                  <>
                    {/* Complexity badge */}
                    <span className={`hidden sm:flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${complexityClass}`}>
                      <BarChart3 className="w-2.5 h-2.5" />
                      {feature.complexity}
                    </span>
                    {/* Hours badge */}
                    <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border border-blue-500/20 bg-blue-500/10 text-blue-400">
                      <Clock className="w-2.5 h-2.5" />
                      {feature.totalEstimatedHours}h
                    </span>

                    {/* Edit Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setEditingFeatureId(feature.id)
                        setEditFeatureName(feature.featureName || feature.name || '')
                        setEditFeatureComplexity(feature.complexity)
                      }}
                      className="p-1.5 rounded-lg hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors shrink-0"
                      title="Edit Plan"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>

                    {/* Delete Button */}
                    <button
                      onClick={(e) => handleDeleteFeature(e, feature.id, feature.featureName || feature.name || '')}
                      className="p-1.5 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors shrink-0"
                      title="Delete Plan"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>

                    {/* Download PDF Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDownloadGlobalPlan(feature)
                      }}
                      className="p-1.5 rounded-lg hover:bg-blue-500/10 text-muted-foreground hover:text-blue-400 transition-colors shrink-0"
                      title="Download PDF"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                  </>
                )}

                <ChevronRight
                  className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`}
                />
              </div>
            </div>

            {/* Task list — shown when expanded */}
            {isOpen && (
              <div className="px-4 pb-4 space-y-4 border-t border-border/40 pt-3 animate-in fade-in slide-in-from-top-2 duration-200">
                {Object.entries(tasksByType).map(([type, tasks]) => {
                  const meta = getTaskTypeMeta(type)
                  const actionBtn = getActionForType(type)
                  return (
                    <div key={type}>
                      {/* Type header */}
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${meta.color} ${meta.bg}`}>
                          {meta.icon} {type}
                        </span>
                        <div className="flex-1 h-px bg-border/50" />
                        
                        {actionBtn && (
                          <button
                            onClick={() => {
                              if (actionBtn.action === 'navigate') {
                                if (actionBtn.to === '/architecture') {
                                  const prompt = tasks.map((t: any) => `${t.title}: ${t.description}`).join('\n')
                                  navigate(actionBtn.to as string, { state: { prompt } })
                                } else {
                                  navigate(actionBtn.to as string)
                                }
                              } else if (actionBtn.action === 'implement_code' && feature.id) {
                                handleAiImplementType(feature.id, feature.featureName || feature.name, type)
                              } else if (actionBtn.action === 'view_report') {
                                setReportModalData({ featureName: feature.featureName || feature.name, tasks })
                              }
                            }}
                            disabled={implementingType === type}
                            className="shrink-0 flex items-center gap-1.5 text-[10px] font-semibold px-3 py-1 rounded-full border border-primary/30 bg-primary/10 text-primary hover:bg-primary hover:text-white transition-colors"
                          >
                            {implementingType === type ? <Loader2 className="w-3 h-3 animate-spin" /> : actionBtn.icon}
                            {implementingType === type ? 'Implementing...' : actionBtn.label}
                          </button>
                        )}

                        <span className="text-[10px] text-muted-foreground ml-2">
                          {tasks.reduce((s, t) => s + (t.estimatedHours || 0), 0)}h
                        </span>
                      </div>
                      {/* Task cards */}
                      <div className="space-y-2">
                        {tasks.map((task) => {
                          const pMeta = getTaskPriorityMeta(task.priority)
                          const isTaskEditing = editingTaskId === task.id
                          return (
                            <div
                              key={task.id}
                              className="flex items-start justify-between gap-3 p-3 rounded-lg bg-background/50 border border-border/50 hover:border-primary/20 hover:bg-background/70 transition-all"
                            >
                              {isTaskEditing ? (
                                <div className="space-y-2 flex-1">
                                  <input
                                    type="text"
                                    value={editTaskTitle}
                                    onChange={e => setEditTaskTitle(e.target.value)}
                                    className="w-full text-xs font-semibold text-foreground bg-background border border-border rounded px-2 py-1"
                                    placeholder="Task Title"
                                  />
                                  <textarea
                                    value={editTaskDesc}
                                    onChange={e => setEditTaskDesc(e.target.value)}
                                    rows={2}
                                    className="w-full text-[11px] text-muted-foreground bg-background border border-border rounded px-2 py-1 resize-none"
                                    placeholder="Task Description"
                                  />
                                  <div className="flex items-center gap-2">
                                    <select
                                      value={editTaskPriority}
                                      onChange={e => setEditTaskPriority(e.target.value)}
                                      className="text-[10px] bg-background border border-border rounded px-1.5 py-0.5 text-foreground"
                                    >
                                      <option value="High">High</option>
                                      <option value="Medium">Medium</option>
                                      <option value="Low">Low</option>
                                    </select>
                                    <input
                                      type="number"
                                      value={editTaskHours}
                                      onChange={e => setEditTaskHours(parseInt(e.target.value) || 0)}
                                      className="w-16 text-[10px] bg-background border border-border rounded px-1.5 py-0.5 text-foreground"
                                      placeholder="Hours"
                                    />
                                    <button
                                      onClick={() => handleSaveTask(task.id)}
                                      className="ml-auto flex items-center gap-1 text-[10px] font-semibold bg-green-500/20 text-green-400 border border-green-500/30 px-2 py-1 rounded hover:bg-green-500 hover:text-white transition-all"
                                    >
                                      Save
                                    </button>
                                    <button
                                      onClick={() => setEditingTaskId(null)}
                                      className="flex items-center gap-1 text-[10px] font-semibold bg-white/5 text-muted-foreground border border-border px-2 py-1 rounded hover:bg-white/10 hover:text-white transition-all"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <>
                                  <div className="min-w-0 flex-1">
                                    <p className="text-xs font-semibold text-foreground leading-tight">{task.title}</p>
                                    <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2 leading-relaxed">{task.description}</p>
                                  </div>
                                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                                    <div className="flex items-center gap-1">
                                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-1 ${pMeta.color}`}>
                                        <span className={`w-1.5 h-1.5 rounded-full ${pMeta.dot}`} />
                                        {task.priority}
                                      </span>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          setEditingTaskId(task.id)
                                          setEditTaskTitle(task.title)
                                          setEditTaskDesc(task.description)
                                          setEditTaskPriority(task.priority)
                                          setEditTaskHours(task.estimatedHours)
                                        }}
                                        className="p-1 rounded hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors"
                                        title="Edit Task"
                                      >
                                        <Edit2 className="w-2.5 h-2.5" />
                                      </button>
                                    </div>
                                    <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                                      <Clock className="w-2.5 h-2.5" />{task.estimatedHours}h
                                    </span>
                                    {task.status && (
                                      <span className="text-[9px] font-medium text-muted-foreground bg-muted/40 px-1.5 py-0.5 rounded-full">
                                        {task.status}
                                      </span>
                                    )}
                                  </div>
                                </>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}


      {/* Requirement Report Modal */}
      <RequirementReportModal
        isOpen={!!reportModalData}
        onClose={() => setReportModalData(null)}
        featureName={reportModalData?.featureName || ''}
        tasks={reportModalData?.tasks || []}
      />
    </div>
  )
}

// ── Requirement Report Modal Component ──────────────────────────────────────────

interface ReportModalProps {
  isOpen: boolean
  onClose: () => void
  featureName: string
  tasks: any[]
}

function RequirementReportModal({ isOpen, onClose, featureName, tasks }: ReportModalProps) {
  if (!isOpen) return null

  const handleDownloadPdf = () => {
    const htmlContent = `
      <h1>Requirement Analysis Report</h1>
      <div class="subtitle">FEATURE SPECIFICATIONS & SCOPING DOCUMENT</div>
      <div class="meta-info">
        <strong>Feature:</strong> ${featureName} &nbsp;|&nbsp; 
        <strong>Generated:</strong> ${new Date().toLocaleDateString()}
      </div>
      <div class="category-header">
        <span>Requirements Breakdown</span>
      </div>
      ${tasks.map((t, idx) => `
        <div class="task-card">
          <div class="task-header">
            <span class="task-title">${idx + 1}. ${t.title}</span>
            <span class="badge ${t.priority === 'High' ? 'badge-high' : t.priority === 'Medium' ? 'badge-medium' : 'badge-low'}">${t.priority}</span>
          </div>
          <p class="task-desc">${t.description}</p>
          <div class="task-meta">
            <span><strong>Hours:</strong> ${t.estimatedHours || 0}h</span>
            ${t.status ? `<span><strong>Status:</strong> ${t.status}</span>` : ''}
          </div>
        </div>
      `).join('')}
    `
    const printWindow = window.open('', '_blank')
    if (!printWindow) return
    printWindow.document.write(`
      <html>
        <head>
          <title>Report - ${featureName}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
            body {
              font-family: 'Inter', sans-serif;
              color: #0f172a;
              line-height: 1.5;
              padding: 40px;
              background: #ffffff;
            }
            h1 {
              font-size: 28px;
              font-weight: 800;
              margin-bottom: 6px;
              color: #1e1b4b;
            }
            .subtitle {
              font-size: 12px;
              font-weight: 700;
              color: #4f46e5;
              margin-bottom: 24px;
              text-transform: uppercase;
              letter-spacing: 0.05em;
            }
            .meta-info {
              font-size: 12px;
              color: #64748b;
              margin-bottom: 24px;
              border-bottom: 1px solid #e2e8f0;
              padding-bottom: 12px;
            }
            .task-card {
              border: 1px solid #e2e8f0;
              border-radius: 8px;
              padding: 16px;
              margin-bottom: 12px;
              page-break-inside: avoid;
            }
            .task-header {
              display: flex;
              justify-content: justify;
              align-items: start;
              margin-bottom: 8px;
            }
            .task-title {
              font-weight: 600;
              font-size: 14px;
              color: #0f172a;
            }
            .badge {
              font-size: 10px;
              font-weight: 700;
              padding: 2px 8px;
              border-radius: 9999px;
              text-transform: uppercase;
              margin-left: auto;
            }
            .badge-high { background-color: #fee2e2; color: #991b1b; }
            .badge-medium { background-color: #fef3c7; color: #92400e; }
            .badge-low { background-color: #dcfce7; color: #166534; }
            .category-header {
              font-size: 16px;
              font-weight: 700;
              color: #1e1b4b;
              margin-top: 24px;
              margin-bottom: 12px;
              border-bottom: 2px solid #e2e8f0;
              padding-bottom: 6px;
            }
            .task-desc {
              font-size: 12px;
              color: #475569;
              margin-bottom: 8px;
            }
            .task-meta {
              font-size: 11px;
              color: #64748b;
              display: flex;
              gap: 12px;
            }
            @media print {
              body { padding: 20px; }
            }
          </style>
        </head>
        <body>
          ${htmlContent}
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `)
    printWindow.document.close()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-[#18181b]/95 border border-border/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/60">
          <div>
            <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" /> Requirement Analysis Report
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">{featureName}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/5 transition-colors">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
          <div className="space-y-4">
            {tasks.map((t, idx) => (
              <div key={idx} className="p-4 rounded-xl bg-white/5 border border-border/50">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <h5 className="text-sm font-semibold text-foreground leading-tight">
                    {idx + 1}. {t.title}
                  </h5>
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                    t.priority === 'High' ? 'text-red-400 bg-red-500/10' :
                    t.priority === 'Medium' ? 'text-amber-400 bg-amber-500/10' :
                    'text-green-400 bg-green-500/10'
                  }`}>
                    {t.priority}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed mb-2">{t.description}</p>
                <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {t.estimatedHours}h estimated
                  </span>
                  {t.status && (
                    <span className="bg-white/5 px-1.5 py-0.5 rounded">
                      {t.status}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border/60 bg-white/[0.02]">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
          >
            Close
          </button>
          <button
            onClick={handleDownloadPdf}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-all"
          >
            <Download className="w-4 h-4" /> Download Report (PDF)
          </button>
        </div>
      </div>
    </div>
  )
}

function ProjectMetricsPane({ project, projectStats }: { project: Project | null, projectStats: any }) {
  const [activeTab, setActiveTab] = useState<'activity' | 'health' | 'plans'>('activity')
  
  if (!project?.githubRepoUrl) {
    // Non-GitHub projects: show plans and health tabs side by side
    return (
      <GlassCard className="flex flex-col h-full p-0 overflow-hidden">
        <div className="flex border-b border-border/50 bg-background/20">
          <button
            onClick={() => setActiveTab('health')}
            className={`flex-1 py-3 text-sm font-semibold transition-colors ${activeTab === 'health' ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground hover:text-foreground hover:bg-white/5'}`}
          >
            Security & Health
          </button>
          <button
            onClick={() => setActiveTab('plans')}
            className={`flex-1 py-3 text-sm font-semibold transition-colors flex items-center justify-center gap-1.5 ${activeTab === 'plans' ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground hover:text-foreground hover:bg-white/5'}`}
          >
            <FolderKanban className="w-3.5 h-3.5" /> Project Plans
          </button>
        </div>
        <div className="flex-1 p-6 overflow-hidden">
          {activeTab === 'health' ? (
            <ProjectHealthChart projectStats={projectStats} inPane={true} />
          ) : (
            <ProjectPlansTab project={project} />
          )}
        </div>
      </GlassCard>
    )
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
        <button
          onClick={() => setActiveTab('plans')}
          className={`flex-1 py-3 text-sm font-semibold transition-colors flex items-center justify-center gap-1.5 ${activeTab === 'plans' ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground hover:text-foreground hover:bg-white/5'}`}
        >
          <FolderKanban className="w-3.5 h-3.5" /> Plans
        </button>
      </div>
      <div className="flex-1 p-6 overflow-hidden">
        {activeTab === 'activity' ? (
          <CommitActivityChart project={project} inPane={true} />
        ) : activeTab === 'health' ? (
          <ProjectHealthChart projectStats={projectStats} inPane={true} />
        ) : (
          <ProjectPlansTab project={project} />
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
