import { useState, useRef, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { GlassCard } from '@/components/shared/glass-components'
import { CreateProjectModal } from '@/components/shared/create-project-modal'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
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
  FolderOpen
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { projectService } from '@/features/projects/project-service'
import apiClient from '@/lib/api-client'
import { useNavigate } from 'react-router-dom'
import { Project } from '@/types/project'
import { GitHubPanel } from '@/components/shared/github-panel'
import { RepositoryBrowser } from '@/components/shared/repository-browser'
import { AlertCircle } from 'lucide-react'

const activityData = [
  { name: 'Mon', commits: 40, bugs: 24, coverage: 80 },
  { name: 'Tue', commits: 30, bugs: 13, coverage: 82 },
  { name: 'Wed', commits: 20, bugs: 98, coverage: 85 },
  { name: 'Thu', commits: 27, bugs: 39, coverage: 84 },
  { name: 'Fri', commits: 18, bugs: 48, coverage: 88 },
  { name: 'Sat', commits: 23, bugs: 38, coverage: 90 },
  { name: 'Sun', commits: 34, bugs: 43, coverage: 92 },
]

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
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleZipUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadState('uploading')
    try {
      const formData = new FormData()
      formData.append('project', file)
      // Always create a new project from ZIP, consistent with projects page
      await apiClient.post('/ai/code-review-zip', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setUploadState('done')
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      setTimeout(() => setUploadState('idle'), 3000)
    } catch (error) {
      console.error('Upload failed:', error)
      setUploadState('idle')
    } finally {
      e.target.value = ''
    }
  }

  const [analyzingWorkspace, setAnalyzingWorkspace] = useState(false)
  const handleAnalyzeWorkspace = async () => {
    if (!selectedProject?.id) return
    setAnalyzingWorkspace(true)
    try {
      await apiClient.post(`/ai/analyze-workspace/${selectedProject.id}`, null, {
        params: { projectName: encodeURIComponent(selectedProject.name) }
      })
      queryClient.invalidateQueries({ queryKey: ['projectStats', selectedProject.id] })
    } catch (error) {
      console.error('Failed to trigger workspace analysis:', error)
    } finally {
      setAnalyzingWorkspace(false)
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
            {/* Out of Sync Warning Banner */}
            {projectStats?.syncStatus === 'OUT_OF_SYNC' && (
              <GlassCard className="bg-amber-500/10 border-amber-500/20 py-3 px-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-500" />
                  <div>
                    <h4 className="text-sm font-bold text-amber-500">Repository Out of Sync</h4>
                    <p className="text-xs text-amber-400">New commits detected on GitHub that haven't been analyzed. Please Pull & Analyze.</p>
                  </div>
                </div>
              </GlassCard>
            )}

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <StatCard 
                title="AI Health Score" 
                value={`${projectStats?.healthScore ?? 0}%`} 
                trend={`${projectStats?.totalFilesAnalyzed ?? 0} files scanned`} 
                icon={<Activity className="text-green-500" />} 
                color="bg-green-500/10" 
              />
              <StatCard 
                title="Security Issues" 
                value={projectStats?.totalSecurityIssues ?? 0} 
                trend="AI Detected" 
                icon={<ShieldCheck className="text-blue-500" />} 
                color="bg-blue-500/10" 
              />
              <StatCard 
                title="Tech Debt" 
                value={projectStats?.techDebtEstimate ?? '0h'} 
                trend="Estimated effort" 
                icon={<Clock className="text-amber-500" />} 
                color="bg-amber-500/10" 
              />
              <StatCard 
                title="Code Bugs" 
                value={projectStats?.totalBugs ?? 0} 
                trend="Requires fix" 
                icon={<Zap className="text-purple-500" />} 
                color="bg-purple-500/10" 
              />
            </div>

              {/* Activity Chart + Right Panel */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {selectedProject?.githubRepoUrl ? (
                  <GitHubPanel 
                    project={selectedProject} 
                    leftPanelContent={<CommitActivityChart project={selectedProject} />}
                  />
                ) : (
                  <>
                    <div className="lg:col-span-2">
                      <CommitActivityChart project={selectedProject} />
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
                        onClick={handleAnalyzeWorkspace}
                        disabled={analyzingWorkspace}
                        className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white shadow-lg shadow-purple-600/20 px-4 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-all"
                      >
                        {analyzingWorkspace ? <Loader2 className="w-4 h-4 animate-spin" /> : <Loader2 className="w-4 h-4 hidden" />} {/* Visual balance */}
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
    </>
  )
}

function StatCard({ title, value, trend, icon, color }: any) {
  return (
    <GlassCard className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className={cn("p-2 rounded-lg", color)}>
          {icon}
        </div>
        <span className="text-xs font-medium text-green-500 flex items-center gap-1 bg-green-500/10 px-2 py-0.5 rounded-full">
          {trend} <ArrowUpRight className="w-3 h-3" />
        </span>
      </div>
      <div>
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        <p className="text-3xl font-bold">{value}</p>
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

function CommitActivityChart({ project }: { project: Project | null }) {
  return (
    <GlassCard className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h3 className="text-lg font-bold text-foreground">Commit Activity</h3>
          <p className="text-sm text-muted-foreground">
            {project?.name ?? 'Select project'} — daily code changes across branches
          </p>
        </div>
        <select className="bg-background/50 text-foreground border-none rounded-md text-xs px-2 py-1 outline-none">
          <option>Last 7 Days</option>
          <option>Last 30 Days</option>
        </select>
      </div>
      <div style={{ width: '100%', height: '300px' }} className="mt-4">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={activityData}>
            <defs>
              <linearGradient id="colorCommits" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#888', fontSize: 12 }} dy={10} />
            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#888', fontSize: 12 }} />
            <Tooltip contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }} itemStyle={{ color: '#fff' }} />
            <Area type="monotone" dataKey="commits" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorCommits)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </GlassCard>
  )
}
