import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { GlassCard } from '@/components/shared/glass-components'
import {
  Wand2, Loader2, Sparkles, ChevronDown, ChevronRight,
  Clock, Zap, Shield, Code2, TestTube2, FileText,
  Layers, Terminal, CheckCircle2, AlertTriangle,
  BarChart3, FolderKanban, BookOpen, Database, ArrowRight,
  X, Download, Check, Edit2, Trash2
} from 'lucide-react'
import apiClient from '@/lib/api-client'
import { projectService } from '@/features/projects/project-service'
import type { Project } from '@/types/project'
import Swal from 'sweetalert2'

// ── Types ────────────────────────────────────────────────────────────────────

interface TaskDto {
  title: string
  description: string
  type: string
  estimatedHours: number
  priority: string
}

interface PlanResult {
  featureId: number
  featureName?: string
  name?: string
  complexity: string
  totalEstimatedHours: number
  tasks: TaskDto[]
  error?: string
}

interface SavedFeaturePlan {
  id: number
  featureName?: string
  name?: string
  complexity: string
  totalEstimatedHours: number
  tasks: {
    id: number
    title: string
    description: string
    type: string
    estimatedHours: number
    priority: string
    status: string
  }[]
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const TYPE_META: Record<string, { icon: React.ReactNode; color: string; bg: string }> = {
  Backend:       { icon: <Terminal className="w-3.5 h-3.5" />,   color: 'text-blue-400',   bg: 'bg-blue-500/10 border-blue-500/20' },
  Frontend:      { icon: <Layers className="w-3.5 h-3.5" />,     color: 'text-violet-400', bg: 'bg-violet-500/10 border-violet-500/20' },
  Design:        { icon: <Sparkles className="w-3.5 h-3.5" />,   color: 'text-pink-400',   bg: 'bg-pink-500/10 border-pink-500/20' },
  Security:      { icon: <Shield className="w-3.5 h-3.5" />,     color: 'text-red-400',    bg: 'bg-red-500/10 border-red-500/20' },
  Testing:       { icon: <TestTube2 className="w-3.5 h-3.5" />,  color: 'text-green-400',  bg: 'bg-green-500/10 border-green-500/20' },
  Documentation: { icon: <FileText className="w-3.5 h-3.5" />,   color: 'text-amber-400',  bg: 'bg-amber-500/10 border-amber-500/20' },
  DevOps:        { icon: <Zap className="w-3.5 h-3.5" />,        color: 'text-cyan-400',   bg: 'bg-cyan-500/10 border-cyan-500/20' },
  Architecture:  { icon: <Layers className="w-3.5 h-3.5" />,     color: 'text-indigo-400', bg: 'bg-indigo-500/10 border-indigo-500/20' },
  Database:      { icon: <Database className="w-3.5 h-3.5" />,   color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
}

const PRIORITY_META: Record<string, { color: string; dot: string }> = {
  High:   { color: 'text-red-400 bg-red-500/10 border border-red-500/20',    dot: 'bg-red-400' },
  Medium: { color: 'text-amber-400 bg-amber-500/10 border border-amber-500/20', dot: 'bg-amber-400' },
  Low:    { color: 'text-green-400 bg-green-500/10 border border-green-500/20', dot: 'bg-green-400' },
}

const COMPLEXITY_META: Record<string, { color: string; icon: React.ReactNode }> = {
  Low:    { color: 'text-green-400',  icon: <CheckCircle2 className="w-4 h-4" /> },
  Medium: { color: 'text-amber-400',  icon: <AlertTriangle className="w-4 h-4" /> },
  High:   { color: 'text-red-400',    icon: <AlertTriangle className="w-4 h-4" /> },
}

function getTypeMeta(type: string) {
  return TYPE_META[type] ?? { icon: <Code2 className="w-3.5 h-3.5" />, color: 'text-slate-400', bg: 'bg-slate-500/10 border-slate-500/20' }
}

function getPriorityMeta(priority: string) {
  return PRIORITY_META[priority] ?? { color: 'text-slate-400 bg-slate-500/10', dot: 'bg-slate-400' }
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

    categoriesHtml += `
      <div class="category-section">
        <div class="category-header">
          ${iconSvg}
          <span style="margin-left: 8px;">${type}</span>
          <span style="font-size: 12px; font-weight: normal; color: #64748b; margin-left: auto;">
            ${tasks.length} tasks · ${tasks.reduce((s: number, t: any) => s + (t.estimatedHours || 0), 0)}h
          </span>
        </div>
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
      <strong>Total Estimated Hours:</strong> ${feature.totalEstimatedHours || feature.totalEstimatedHours || 0}h &nbsp;|&nbsp; 
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
            padding: 40px;
            background: #ffffff;
          }
          h1 {
            font-size: 32px;
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
            display: flex;
            align-items: center;
            font-size: 16px;
            font-weight: 700;
            color: #1e1b4b;
            margin-top: 32px;
            margin-bottom: 16px;
            border-bottom: 2px solid #e2e8f0;
            padding-bottom: 6px;
          }
          .category-icon {
            width: 18px;
            height: 18px;
            stroke-width: 2.5;
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

function getActionForType(type: string) {
  const t = type.toLowerCase()
  if (t === 'backend' || t === 'frontend' || t === 'devops' || t === 'testing') {
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

// ── Component ─────────────────────────────────────────────────────────────────

// ── Saved Plans Section ───────────────────────────────────────────────────────

function SavedPlansSection({
  projectId,
  onViewReport,
  onImplementType,
  implementingType
}: {
  projectId: number
  onViewReport: (featureName: string, tasks: any[]) => void
  onImplementType: (featureId: number, featureName: string, type: string) => Promise<void>
  implementingType: string | null
}) {
  const [expandedId, setExpandedId] = useState<number | null>(null)
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

  const { data: plans, isLoading } = useQuery<SavedFeaturePlan[]>({
    queryKey: ['projectPlans', projectId],
    queryFn: async () => {
      const { data } = await apiClient.get(`/features/project/${projectId}`)
      return data
    },
    enabled: !!projectId,
  })

  const handleSaveFeature = async (e: React.MouseEvent, featureId: number) => {
    e.stopPropagation()
    try {
      await apiClient.put(`/features/${featureId}`, {
        name: editFeatureName,
        complexity: editFeatureComplexity
      })
      setEditingFeatureId(null)
      queryClient.invalidateQueries({ queryKey: ['projectPlans', projectId] })
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
        queryClient.invalidateQueries({ queryKey: ['projectPlans', projectId] })
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
      queryClient.invalidateQueries({ queryKey: ['projectPlans', projectId] })
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

  if (isLoading) {
    return (
      <GlassCard>
        <div className="flex items-center gap-3 text-muted-foreground animate-pulse">
          <Loader2 className="w-4 h-4 animate-spin text-primary" />
          <span className="text-sm">Loading saved plans...</span>
        </div>
      </GlassCard>
    )
  }

  if (!plans || plans.length === 0) {
    return (
      <GlassCard>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-muted/30">
            <BookOpen className="w-4 h-4 text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">No saved plans yet</p>
            <p className="text-xs text-muted-foreground mt-0.5">Generate a plan above — it will appear here automatically.</p>
          </div>
        </div>
      </GlassCard>
    )
  }

  return (
    <div className="space-y-3">
      {plans.map((feature) => {
        const isOpen = expandedId === feature.id
        const isEditingThisFeature = editingFeatureId === feature.id
        const complexityMeta = COMPLEXITY_META[feature.complexity] ?? { color: 'text-slate-400', icon: null }
        const tasksByType = feature.tasks.reduce<Record<string, typeof feature.tasks>>((acc, t) => {
          const key = t.type || 'Other'
          acc[key] = [...(acc[key] ?? []), t]
          return acc
        }, {})

        return (
          <div
            key={feature.id}
            className="rounded-xl border border-border/60 bg-background/30 overflow-hidden"
          >
            {/* Feature header */}
            <div
              className="w-full flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3.5 hover:bg-white/5 transition-colors text-left border-b border-transparent cursor-pointer"
              onClick={() => setExpandedId(isOpen ? null : feature.id)}
            >
              {isEditingThisFeature ? (
                <div className="flex items-center gap-2 min-w-0 flex-1" onClick={e => e.stopPropagation()}>
                  <FolderKanban className="w-4 h-4 text-primary shrink-0" />
                  <input
                    type="text"
                    value={editFeatureName}
                    onChange={e => setEditFeatureName(e.target.value)}
                    className="bg-[#18181b] border border-border rounded-lg px-2 py-1 text-sm text-foreground w-full max-w-[240px]"
                  />
                  <select
                    value={editFeatureComplexity}
                    onChange={e => setEditFeatureComplexity(e.target.value)}
                    className="bg-[#18181b] border border-border rounded-lg px-2 py-1 text-xs text-foreground"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                  <button
                    onClick={(e) => handleSaveFeature(e, feature.id)}
                    className="p-1.5 rounded-lg bg-green-500/10 text-green-400 hover:bg-green-500 hover:text-white transition-colors"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setEditingFeatureId(null) }}
                    className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
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
                    {/* Complexity */}
                    <span className={`hidden sm:flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-background/60 border border-border ${complexityMeta.color}`}>
                      <BarChart3 className="w-2.5 h-2.5" /> {feature.complexity}
                    </span>
                    {/* Hours */}
                    <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border border-blue-500/20 bg-blue-500/10 text-blue-400">
                      <Clock className="w-2.5 h-2.5" /> {feature.totalEstimatedHours}h
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

                <ChevronRight className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`} />
              </div>
            </div>

            {/* Expanded task list */}
            {isOpen && (
              <div className="px-4 pb-4 pt-3 space-y-4 border-t border-border/40 animate-in fade-in slide-in-from-top-2 duration-200">
                {Object.entries(tasksByType).map(([type, tasks]) => {
                  const meta = getTypeMeta(type)
                  const actionBtn = getActionForType(type)
                  return (
                    <div key={type}>
                      <div className="flex items-center gap-2 mb-2">
                        <div className={`flex items-center gap-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${meta.color} ${meta.bg}`}>
                          {meta.icon} {type}
                        </div>
                        <div className="flex-1 h-px bg-border" />

                        {actionBtn && (
                          <button
                            onClick={() => {
                              if (actionBtn.action === 'navigate') {
                                navigate(actionBtn.to as string)
                              } else if (actionBtn.action === 'implement_code' && feature.id) {
                                onImplementType(feature.id, feature.featureName || feature.name || '', type)
                              } else if (actionBtn.action === 'view_report') {
                                onViewReport(feature.featureName || feature.name || '', tasks)
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
                          {tasks.length} task{tasks.length > 1 ? 's' : ''} · {tasks.reduce((s, t) => s + (t.estimatedHours || 0), 0)}h
                        </span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {tasks.map((task) => {
                          const pMeta = getPriorityMeta(task.priority)
                          const isTaskEditing = editingTaskId === task.id
                          return (
                            <div
                              key={task.id}
                              className="p-3 rounded-xl bg-background/40 border border-border hover:border-primary/30 hover:bg-background/60 transition-all"
                            >
                              {isTaskEditing ? (
                                <div className="space-y-2">
                                  <input
                                    type="text"
                                    value={editTaskTitle}
                                    onChange={e => setEditTaskTitle(e.target.value)}
                                    className="w-full text-xs font-semibold text-foreground bg-[#18181b] border border-border rounded px-2 py-1"
                                    placeholder="Task Title"
                                  />
                                  <textarea
                                    value={editTaskDesc}
                                    onChange={e => setEditTaskDesc(e.target.value)}
                                    rows={2}
                                    className="w-full text-[11px] text-muted-foreground bg-[#18181b] border border-border rounded px-2 py-1 resize-none"
                                    placeholder="Task Description"
                                  />
                                  <div className="flex items-center gap-2">
                                    <select
                                      value={editTaskPriority}
                                      onChange={e => setEditTaskPriority(e.target.value)}
                                      className="text-[10px] bg-[#18181b] border border-border rounded px-1.5 py-0.5 text-foreground"
                                    >
                                      <option value="High">High</option>
                                      <option value="Medium">Medium</option>
                                      <option value="Low">Low</option>
                                    </select>
                                    <input
                                      type="number"
                                      value={editTaskHours}
                                      onChange={e => setEditTaskHours(parseInt(e.target.value) || 0)}
                                      className="w-16 text-[10px] bg-[#18181b] border border-border rounded px-1.5 py-0.5 text-foreground"
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
                                  <div className="flex items-start justify-between gap-2 mb-1.5">
                                    <h4 className="text-xs font-semibold text-foreground leading-tight">{task.title}</h4>
                                    <div className="flex items-center gap-1 shrink-0">
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
                                  </div>
                                  <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed mb-2">{task.description}</p>
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-1">
                                      <Clock className="w-2.5 h-2.5 text-muted-foreground" />
                                      <span className="text-[10px] text-muted-foreground">{task.estimatedHours}h</span>
                                    </div>
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
    </div>
  )
}

// ── Component ─────────────────────────────────────────────────────────────────

export function PlannerPage() {
  const [feature, setFeature]           = useState('')
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [projectDropdownOpen, setProjectDropdownOpen] = useState(false)
  const [loading, setLoading]           = useState(false)
  const [result, setResult]             = useState<PlanResult | null>(null)
  const [implemented, setImplemented]   = useState(false)
  const [implementingType, setImplementingType] = useState<string | null>(null)
  const [reportModalData, setReportModalData] = useState<{ featureName: string; tasks: any[] } | null>(null)
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ['projects'],
    queryFn: () => projectService.getMyProjects(),
  })

  const handleGenerate = async () => {
    if (!feature.trim()) return
    if (!selectedProject) {
      Swal.fire({
        title: 'Select a Project',
        text: 'Please select a project to link this plan to.',
        icon: 'warning',
        background: 'rgba(15,15,20,0.95)',
        color: '#fff',
        confirmButtonColor: '#6366f1',
        backdrop: 'rgba(0,0,0,0.4) blur(4px)',
      })
      return
    }

    setLoading(true)
    setResult(null)
    setImplemented(false)

    // 30-second hard timeout — if the backend is still hanging after this, abort
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 30_000)

    const showBusySwal = (title: string, html: string, icon: 'warning' | 'error' = 'warning') =>
      Swal.fire({
        title,
        html,
        icon,
        background: 'rgba(15,15,20,0.97)',
        color: '#fff',
        confirmButtonColor: icon === 'error' ? '#ef4444' : '#f59e0b',
        confirmButtonText: icon === 'error' ? 'Understood' : 'OK, I will try again',
        backdrop: 'rgba(0,0,0,0.5) blur(4px)',
      })

    try {
      const response = await apiClient.post<PlanResult>('/ai/project-plan', {
        featureDescription: feature,
        projectId: selectedProject.id,
      }, { signal: controller.signal })

      setResult(response.data)
      // Refresh saved plans list so the new plan appears immediately
      queryClient.invalidateQueries({ queryKey: ['projectPlans', selectedProject?.id] })

    } catch (error: any) {
      // AbortController fired — request took > 30 s
      if (error.name === 'CanceledError' || error.code === 'ERR_CANCELED' || controller.signal.aborted) {
        showBusySwal(
          '⏱ Request Timed Out',
          `<p style="color:#a1a1aa;font-size:14px;line-height:1.6">
            The AI took too long to respond (>30 s). Gemini may be under high demand.<br/><br/>
            <strong style="color:#fff">Please wait a few seconds and try again.</strong>
          </p>`
        )
        return
      }

      const status = error.response?.status
      const userMessage = error.response?.data?.userMessage || error.response?.data?.message

      if (status === 503) {
        showBusySwal(
          '🚦 Gemini is Busy',
          `<p style="color:#a1a1aa;font-size:14px;line-height:1.6">
            The Gemini AI model is currently experiencing <strong style="color:#fff">high demand</strong>.<br/><br/>
            Please wait <strong style="color:#fff">10–15 seconds</strong> and try again.
          </p>`
        )
      } else if (status === 429) {
        showBusySwal(
          '🚫 API Quota Exceeded',
          `<p style="color:#a1a1aa;font-size:14px;line-height:1.6">
            Your Gemini API daily limit has been reached.<br/>
            <strong style="color:#fff">Please try again tomorrow</strong> or upgrade your API plan.
          </p>`,
          'error'
        )
      } else {
        setResult({
          featureId: 0, featureName: '', complexity: '', totalEstimatedHours: 0, tasks: [],
          error: userMessage || 'Failed to generate plan. Please try again.'
        })
      }
    } finally {
      clearTimeout(timeoutId)
      setLoading(false)
    }
  }

  const handleImplementPlan = async () => {
    const res = await Swal.fire({
      title: '✅ Plan Saved to Project!',
      html: `
        <p style="color:#a1a1aa;font-size:14px;line-height:1.6">
          The feature <strong style="color:#fff">"${result?.featureName}"</strong> and all 
          <strong style="color:#fff">${result?.tasks?.length} tasks</strong> have been saved to 
          <strong style="color:#fff">"${selectedProject?.name}"</strong>.
        </p>
        <p style="color:#a1a1aa;font-size:14px;margin-top:10px">
          Go to the <strong style="color:#fff">Dashboard</strong> to view your project and track progress.
        </p>`,
      icon: 'success',
      showCancelButton: true,
      background: 'rgba(15,15,20,0.97)',
      color: '#fff',
      confirmButtonColor: '#6366f1',
      confirmButtonText: '→ Go to Dashboard',
      cancelButtonText: 'Stay here',
      cancelButtonColor: '#3f3f46',
      backdrop: 'rgba(0,0,0,0.5) blur(4px)',
    })
    if (res.isConfirmed) {
      navigate('/dashboard')
    } else {
      setImplemented(true)
    }
  }

  const handleAiImplementType = async (featureId: number, featureName: string, type: string) => {
    if (!featureId) return;
    
    setImplementingType(type);
    try {
      await apiClient.post(`/ai/implement-plan/${featureId}`);
      
      const res = await Swal.fire({
        title: '✨ AI Implementation Complete!',
        html: `
          <p style="color:#a1a1aa;font-size:14px;line-height:1.6">
            The tasks for <strong style="color:#fff">"${featureName}"</strong> have been successfully implemented by AI.
            The files have been generated and saved into your project's workspace folder.
          </p>`,
        icon: 'success',
        showCancelButton: true,
        background: 'rgba(15,15,20,0.97)',
        color: '#fff',
        confirmButtonColor: '#6366f1',
        confirmButtonText: '→ Go to Dashboard',
        cancelButtonText: 'Stay here',
        cancelButtonColor: '#3f3f46',
        backdrop: 'rgba(0,0,0,0.5) blur(4px)',
      });
      
      if (res.isConfirmed) {
        navigate('/dashboard');
      } else {
        setImplemented(true);
      }
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

  // Group tasks by type
  const tasksByType = result?.tasks?.reduce<Record<string, TaskDto[]>>((acc, task) => {
    const t = task.type || 'Other'
    acc[t] = [...(acc[t] ?? []), task]
    return acc
  }, {}) ?? {}

  const complexityMeta = result?.complexity ? COMPLEXITY_META[result.complexity] ?? { color: 'text-slate-400', icon: null } : null

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-5xl mx-auto">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <div className="p-2 rounded-xl bg-primary/10 border border-primary/20">
            <FolderKanban className="w-5 h-5 text-primary" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">AI Project Planner</h1>
        </div>
        <p className="text-muted-foreground ml-14">
          Describe a feature and let Gemini AI generate a full, actionable development plan — instantly saved to your project.
        </p>
      </div>

      {/* ── Input Form ─────────────────────────────────────────────────── */}
      <GlassCard>
        <div className="space-y-5">

          {/* Project Selector */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-foreground flex items-center gap-1.5">
              <FolderKanban className="w-3.5 h-3.5 text-primary" />
             Projects List <span className="text-destructive">*</span>
            </label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setProjectDropdownOpen(v => !v)}
                className="w-full flex items-center justify-between bg-background/50 border border-input rounded-xl px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary hover:bg-background/80 transition-colors"
              >
                <span className={selectedProject ? 'text-foreground' : 'text-muted-foreground'}>
                  {selectedProject
                    ? <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-primary inline-block" />{selectedProject.name}</span>
                    : 'Select a project...'}
                </span>
                <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${projectDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              {projectDropdownOpen && (
                <div className="absolute z-20 w-full mt-1 bg-background border border-input rounded-xl shadow-2xl overflow-hidden">
                  {projects.length === 0 ? (
                    <div className="px-4 py-3 text-sm text-muted-foreground">No projects found. Create a project first.</div>
                  ) : (
                    projects.map(p => (
                      <button
                        key={p.id}
                        onClick={() => { setSelectedProject(p); setProjectDropdownOpen(false) }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm text-left hover:bg-primary/10 transition-colors"
                      >
                        <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                        <span className="font-medium text-foreground">{p.name}</span>
                        {p.githubRepoUrl && <span className="ml-auto text-xs text-muted-foreground truncate max-w-[120px]">{p.githubRepoUrl.replace('https://github.com/', '')}</span>}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Feature Description */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-foreground flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              Feature Description <span className="text-destructive">*</span>
            </label>
            <textarea
              value={feature}
              onChange={(e) => setFeature(e.target.value)}
              placeholder="e.g., Build a user authentication system with JWT, OAuth2, and password reset functionality..."
              rows={4}
              className="w-full bg-background/50 border border-input rounded-xl px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary placeholder:text-muted-foreground resize-none transition-colors"
            />
          </div>

          <button
            onClick={handleGenerate}
            disabled={loading || !feature.trim() || !selectedProject}
            className="relative overflow-hidden bg-primary text-primary-foreground px-8 py-3 rounded-xl text-sm font-semibold flex items-center gap-2 hover:opacity-90 disabled:opacity-40 transition-all active:scale-95 shadow-lg shadow-primary/20"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
            {loading ? 'Generating Plan...' : 'Generate Plan with Gemini AI'}
          </button>
        </div>
      </GlassCard>

      {/* ── Loading skeleton ────────────────────────────────────────────── */}
      {loading && (
        <GlassCard>
          <div className="space-y-4 animate-pulse">
            <div className="h-6 w-48 bg-muted rounded-lg" />
            <div className="flex gap-4">
              <div className="h-10 w-28 bg-muted rounded-xl" />
              <div className="h-10 w-28 bg-muted rounded-xl" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1,2,3,4].map(i => <div key={i} className="h-24 bg-muted rounded-xl" />)}
            </div>
          </div>
        </GlassCard>
      )}

      {/* ── Result: Error ──────────────────────────────────────────────── */}
      {result?.error && !loading && (
        <GlassCard>
          <div className="flex items-start gap-3 text-destructive">
            <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-sm">Generation Failed</p>
              <p className="text-sm text-muted-foreground mt-1">{result.error}</p>
            </div>
          </div>
        </GlassCard>
      )}

      {/* ── Result: Plan ───────────────────────────────────────────────── */}
      {result && !result.error && !loading && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

          {/* Summary Banner */}
          <GlassCard>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle2 className="w-4 h-4 text-green-400" />
                  <span className="text-xs text-green-400 font-medium uppercase tracking-wide">Plan Generated & Saved</span>
                </div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-foreground">{result.featureName || result.name}</h2>
                  <button
                    onClick={() => handleDownloadGlobalPlan(result)}
                    className="p-1 rounded hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors shrink-0"
                    title="Download Full Plan (PDF)"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Linked to <span className="text-foreground font-medium">{selectedProject?.name}</span>
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                {/* Complexity */}
                <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-background/60 border border-border">
                  <BarChart3 className={`w-4 h-4 ${complexityMeta?.color}`} />
                  <div>
                    <p className="text-xs text-muted-foreground">Complexity</p>
                    <p className={`text-sm font-bold ${complexityMeta?.color}`}>{result.complexity}</p>
                  </div>
                </div>
                {/* Total Hours */}
                <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-background/60 border border-border">
                  <Clock className="w-4 h-4 text-blue-400" />
                  <div>
                    <p className="text-xs text-muted-foreground">Total Estimated</p>
                    <p className="text-sm font-bold text-foreground">{result.totalEstimatedHours} hrs</p>
                  </div>
                </div>
                {/* Task Count */}
                <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-background/60 border border-border">
                  <FolderKanban className="w-4 h-4 text-violet-400" />
                  <div>
                    <p className="text-xs text-muted-foreground">Tasks</p>
                    <p className="text-sm font-bold text-foreground">{result.tasks.length}</p>
                  </div>
                </div>
              </div>
            </div>
          </GlassCard>

          {/* Tasks By Category */}
          {Object.entries(tasksByType).map(([type, tasks]) => {
            const meta = getTypeMeta(type)
            const actionBtn = getActionForType(type)
            return (
              <div key={type}>
                {/* Category Header */}
                <div className="flex items-center gap-2 mb-3 px-1">
                  <div className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${meta.color} ${meta.bg}`}>
                    {meta.icon}
                    {type}
                  </div>
                  <div className="flex-1 h-px bg-border" />
                  
                  {actionBtn && (
                    <button
                      onClick={() => {
                        if (actionBtn.action === 'navigate') {
                          navigate(actionBtn.to as string)
                        } else if (actionBtn.action === 'implement_code' && result?.featureId) {
                          handleAiImplementType(result.featureId, result.featureName || result.name || '', type)
                        } else if (actionBtn.action === 'view_report') {
                          setReportModalData({ featureName: result.featureName || result.name || '', tasks })
                        }
                      }}
                      disabled={implementingType === type}
                      className="shrink-0 flex items-center gap-1.5 text-[10px] font-semibold px-3 py-1 rounded-full border border-primary/30 bg-primary/10 text-primary hover:bg-primary hover:text-white transition-colors"
                    >
                      {implementingType === type ? <Loader2 className="w-3 h-3 animate-spin" /> : actionBtn.icon}
                      {implementingType === type ? 'Implementing...' : actionBtn.label}
                    </button>
                  )}

                  <span className="text-xs text-muted-foreground ml-2">{tasks.length} task{tasks.length > 1 ? 's' : ''} · {tasks.reduce((s, t) => s + t.estimatedHours, 0)}h</span>
                </div>

                {/* Task Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {tasks.map((task, i) => {
                    const pMeta = getPriorityMeta(task.priority)
                    return (
                      <div
                        key={i}
                        className="group relative p-4 rounded-xl bg-background/40 border border-border hover:border-primary/30 hover:bg-background/60 transition-all"
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <h4 className="text-sm font-semibold text-foreground leading-tight">{task.title}</h4>
                          <span className={`flex-shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${pMeta.color}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${pMeta.dot}`} />
                            {task.priority}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed mb-3">{task.description}</p>
                        <div className="flex items-center gap-2">
                          <Clock className="w-3 h-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">{task.estimatedHours}h estimated</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}

          {/* Implement Plan Button */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={() => { setResult(null); setImplemented(false) }}
              className="px-6 py-2.5 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:border-foreground/20 transition-all"
            >
              Generate Another
            </button>
            <button
              onClick={handleImplementPlan}
              disabled={implemented}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 active:scale-95 transition-all shadow-lg shadow-primary/20 disabled:opacity-60"
            >
              {implemented
                ? <><CheckCircle2 className="w-4 h-4" /> Plan Implemented</>
                : <><Zap className="w-4 h-4" /> View in Project Board</>}
            </button>
          </div>
        </div>
      )}

      {/* ── Saved Plans ────────────────────────────────────────────────────── */}
      {selectedProject && (
        <div className="space-y-4 animate-in fade-in duration-500">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10 border border-primary/20">
              <BookOpen className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">Saved Plans</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                All AI-generated plans linked to{' '}
                <span className="text-foreground font-medium">{selectedProject.name}</span>
              </p>
            </div>
          </div>
          <SavedPlansSection
            projectId={selectedProject.id}
            onViewReport={(featureName, tasks) => setReportModalData({ featureName, tasks })}
            onImplementType={handleAiImplementType}
            implementingType={implementingType}
          />
        </div>
      )}

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
