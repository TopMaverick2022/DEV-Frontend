import { useState, useRef } from 'react'
import { AnimatePresence } from 'framer-motion'
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
  CheckCircle
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useQuery } from '@tanstack/react-query'
import { projectService } from '@/features/projects/project-service'
import apiClient from '@/lib/api-client'
import { useNavigate } from 'react-router-dom'

const activityData = [
  { name: 'Mon', commits: 40, bugs: 24, coverage: 80 },
  { name: 'Tue', commits: 30, bugs: 13, coverage: 82 },
  { name: 'Wed', commits: 20, bugs: 98, coverage: 85 },
  { name: 'Thu', commits: 27, bugs: 39, coverage: 84 },
  { name: 'Fri', commits: 18, bugs: 48, coverage: 88 },
  { name: 'Sat', commits: 23, bugs: 38, coverage: 90 },
  { name: 'Sun', commits: 34, bugs: 43, coverage: 92 },
]

export function DashboardPage() {
  const navigate = useNavigate()
  const [showModal, setShowModal] = useState(false)
  const [uploadState, setUploadState] = useState<'idle' | 'uploading' | 'done'>('idle')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleZipUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadState('uploading')
    try {
      const formData = new FormData()
      formData.append('project', file)
      await apiClient.post('/ai/code-review', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
      setUploadState('done')
      setTimeout(() => setUploadState('idle'), 3000)
    } catch {
      setUploadState('idle')
    } finally {
      e.target.value = ''
    }
  }

  const { data: projects, isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectService.getMyProjects(),
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  const latestProject = projects?.[0]

  return (
    <>
      <AnimatePresence>
        {showModal && <CreateProjectModal onClose={() => setShowModal(false)} />}
      </AnimatePresence>

      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Project Overview</h1>
            <p className="text-muted-foreground">
              {latestProject ? (
                <>Detailed metrics and health status for <span className="text-primary font-medium">{latestProject.name}</span></>
              ) : (
                "No active projects. Create one to get started."
              )}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <input ref={fileInputRef} type="file" accept=".zip" onChange={handleZipUpload} className="hidden" />
            {latestProject?.githubRepoUrl && (
              <a href={latestProject.githubRepoUrl} target="_blank" rel="noopener noreferrer"
                className="glass px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-white/10">
                <Github className="w-4 h-4" /> Github Repo
              </a>
            )}
            <button
              onClick={() => navigate('/projects')}
              className="glass px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-white/10 transition-colors border border-border/50"
            >
              All Projects{projects && projects.length > 0 ? ` (${projects.length})` : ''}
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadState === 'uploading'}
              className="glass px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-white/10 transition-colors disabled:opacity-50"
              title="Upload a project zip for AI code review"
            >
              {uploadState === 'uploading' ? <Loader2 className="w-4 h-4 animate-spin" />
                : uploadState === 'done' ? <CheckCircle className="w-4 h-4 text-green-500" />
                : <Upload className="w-4 h-4" />}
              {uploadState === 'uploading' ? 'Uploading…' : uploadState === 'done' ? 'Uploaded!' : 'Upload ZIP'}
            </button>
            <button
              onClick={() => setShowModal(true)}
              className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 shadow-lg shadow-primary/25 hover:opacity-90"
            >
              <Plus className="w-4 h-4" /> New Project
            </button>
          </div>
        </div>

        {projects && projects.length > 0 ? (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatCard title="Code Health" value="94%" trend="+2.5%" icon={<Activity className="text-green-500" />} color="bg-green-500/10" />
              <StatCard title="Security Score" value="A+" trend="No issues" icon={<ShieldCheck className="text-blue-500" />} color="bg-blue-500/10" />
              <StatCard title="Avg. Build Time" value="4.2m" trend="-12s" icon={<Clock className="text-amber-500" />} color="bg-amber-500/10" />
              <StatCard title="Open PRs" value="12" trend="4 pending AI review" icon={<GitBranch className="text-purple-500" />} color="bg-purple-500/10" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Main Activity Chart */}
              <GlassCard className="lg:col-span-2">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h3 className="text-lg font-bold text-foreground">Commit Activity</h3>
                    <p className="text-sm text-muted-foreground">Daily code changes across all branches</p>
                  </div>
                  <select className="bg-background/50 text-foreground border-none rounded-md text-xs px-2 py-1 outline-none">
                    <option>Last 7 Days</option>
                    <option>Last 30 Days</option>
                  </select>
                </div>
                <div className="h-[300px] w-full">
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

              {/* AI Recommendations */}
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
