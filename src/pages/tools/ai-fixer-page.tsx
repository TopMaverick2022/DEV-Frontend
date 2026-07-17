import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { GlassCard } from '@/components/shared/glass-components'
import { useProject } from '@/features/projects/project-context'
import { useNavigate, useLocation } from 'react-router-dom'
import apiClient from '@/lib/api-client'
import {
  Wrench,
  ShieldAlert,
  Bug,
  Zap,
  ChevronDown,
  ChevronRight,
  FileCode2,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Sparkles,
  RefreshCw,
  Play,
  Code2,
  CheckCheck,
  XCircle,
  ArrowLeft,
  Eye,
  Layers,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface Issue {
  line: number
  type: string
  message: string
}

interface FileIssue {
  fileId: number
  filename: string
  path: string
  language: string
  issues: Issue[]
}

type FixStatus = 'pending' | 'fixing' | 'fixed' | 'error'

interface FileFixState {
  status: FixStatus
  fixedCode?: string
  originalCode?: string
  summary?: string
  error?: string
}

const ISSUE_COLORS: Record<string, string> = {
  security:    'text-red-400 bg-red-500/10 border-red-500/30',
  bug:         'text-yellow-400 bg-yellow-500/10 border-yellow-500/30',
  performance: 'text-orange-400 bg-orange-500/10 border-orange-500/30',
}

const ISSUE_ICONS: Record<string, React.ReactNode> = {
  security:    <ShieldAlert className="w-3.5 h-3.5" />,
  bug:         <Bug className="w-3.5 h-3.5" />,
  performance: <Zap className="w-3.5 h-3.5" />,
}

function getIssueStyle(type: string) {
  const key = type.toLowerCase()
  if (key.startsWith('sec')) return ISSUE_COLORS.security
  if (key.startsWith('per')) return ISSUE_COLORS.performance
  return ISSUE_COLORS.bug
}
function getIssueIcon(type: string) {
  const key = type.toLowerCase()
  if (key.startsWith('sec')) return ISSUE_ICONS.security
  if (key.startsWith('per')) return ISSUE_ICONS.performance
  return ISSUE_ICONS.bug
}

export function AiFixerPage() {
  const { selectedProject } = useProject()
  const navigate = useNavigate()
  const location = useLocation()

  const [files, setFiles] = useState<FileIssue[]>([])
  const [loading, setLoading] = useState(false)
  const [expandedFile, setExpandedFile] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<FileIssue | null>(null)
  const [fixStates, setFixStates] = useState<Record<string, FileFixState>>({})
  const [viewMode, setViewMode] = useState<'diff' | 'fixed'>('diff')
  const [fixingAll, setFixingAll] = useState(false)
  const [activeTab, setActiveTab] = useState<'all' | 'security' | 'bug' | 'performance'>('all')

  // Pre-select category from dashboard navigation
  useEffect(() => {
    const state = location.state as { category?: string } | null
    if (state?.category) {
      setActiveTab(state.category as any)
    }
  }, [location.state])

  // Load issues on project change
  useEffect(() => {
    if (selectedProject?.id) fetchIssues()
  }, [selectedProject?.id])

  const fetchIssues = async () => {
    if (!selectedProject?.id) return
    setLoading(true)
    setFiles([])
    setSelectedFile(null)
    setFixStates({})
    try {
      const { data } = await apiClient.get<FileIssue[]>(`/fixer/${selectedProject.id}/issues`)
      setFiles(data)
    } catch (err) {
      console.error('Failed to load issues:', err)
    } finally {
      setLoading(false)
    }
  }

  const fixFile = async (file: FileIssue) => {
    const projectId = selectedProject?.id
    if (!projectId) return

    setFixStates(prev => ({ ...prev, [file.path]: { status: 'fixing' } }))
    setSelectedFile(file)

    try {
      const { data } = await apiClient.post<{
        filePath: string
        originalCode: string
        fixedCode: string
        summary: string
        issueCount: number
      }>(`/fixer/${projectId}/fix-file`, { filePath: file.path })

      setFixStates(prev => ({
        ...prev,
        [file.path]: {
          status: 'fixed',
          fixedCode: data.fixedCode,
          originalCode: data.originalCode,
          summary: data.summary,
        },
      }))
    } catch (err: any) {
      setFixStates(prev => ({
        ...prev,
        [file.path]: {
          status: 'error',
          error: err?.response?.data?.error || 'Fix failed. Please try again.',
        },
      }))
    }
  }

  const fixAll = async () => {
    if (!selectedProject?.id || filteredFiles.length === 0) return
    setFixingAll(true)
    for (const file of filteredFiles) {
      if (fixStates[file.path]?.status === 'fixed') continue
      await fixFile(file)
    }
    setFixingAll(false)
  }

  const filteredFiles = files.filter(f => {
    if (activeTab === 'all') return true
    return f.issues.some(i => i.type.toLowerCase().startsWith(activeTab.substring(0, 3)))
  })

  const totalIssues   = files.reduce((s, f) => s + f.issues.length, 0)
  const totalFixed    = Object.values(fixStates).filter(s => s.status === 'fixed').length
  const totalSecurity = files.reduce((s, f) => s + f.issues.filter(i => i.type.toLowerCase().startsWith('sec')).length, 0)
  const totalBugs     = files.reduce((s, f) => s + f.issues.filter(i => i.type.toLowerCase().startsWith('bug') || i.type.toLowerCase() === 'bug').length, 0)
  const totalPerf     = files.reduce((s, f) => s + f.issues.filter(i => i.type.toLowerCase().startsWith('per')).length, 0)

  const selectedState = selectedFile ? fixStates[selectedFile.path] : null

  return (
    <div className="h-full flex flex-col gap-4 p-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 border border-violet-500/30">
            <Wrench className="w-6 h-6 text-violet-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
              AI Code Fixer
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              AI-powered automatic code remediation — security, bugs &amp; performance
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchIssues}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/40 border border-border hover:bg-muted/70 transition text-sm font-medium"
          >
            <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
            Re-Analyze
          </button>
          {filteredFiles.length > 0 && (
            <button
              id="fix-all-btn"
              onClick={fixAll}
              disabled={fixingAll}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-bold text-sm transition shadow-lg shadow-violet-500/20"
            >
              {fixingAll ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              Fix All ({filteredFiles.filter(f => fixStates[f.path]?.status !== 'fixed').length} remaining)
            </button>
          )}
        </div>
      </div>

      {/* ── Stats Bar ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Issues',    value: totalIssues,   color: 'text-foreground',    bg: 'bg-muted/30' },
          { label: 'Security',        value: totalSecurity, color: 'text-red-400',       bg: 'bg-red-500/10' },
          { label: 'Bugs',            value: totalBugs,     color: 'text-yellow-400',    bg: 'bg-yellow-500/10' },
          { label: 'Performance',     value: totalPerf,     color: 'text-orange-400',    bg: 'bg-orange-500/10' },
        ].map(s => (
          <GlassCard key={s.label} className={cn('flex items-center gap-3 py-3 px-4', s.bg)}>
            <p className={cn('text-2xl font-bold', s.color)}>{s.value}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </GlassCard>
        ))}
      </div>

      {/* ── Fixed Progress ── */}
      {totalFixed > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-green-500/10 border border-green-500/30"
        >
          <CheckCheck className="w-4 h-4 text-green-400 shrink-0" />
          <span className="text-sm text-green-300 font-medium">
            {totalFixed} of {files.length} file{files.length !== 1 ? 's' : ''} fixed
          </span>
          <div className="flex-1 h-1.5 rounded-full bg-green-900/30 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-green-500 to-emerald-400 transition-all duration-700"
              style={{ width: `${Math.round((totalFixed / files.length) * 100)}%` }}
            />
          </div>
          <span className="text-xs text-green-400 font-bold">{Math.round((totalFixed / files.length) * 100)}%</span>
        </motion.div>
      )}

      {/* ── Main Layout ── */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4 min-h-0" style={{ maxHeight: 'calc(100vh - 340px)' }}>

        {/* ── Left: File / Issue List ── */}
        <GlassCard className="flex flex-col p-0 overflow-hidden">
          {/* Category Tabs */}
          <div className="flex border-b border-border/50 shrink-0">
            {(['all', 'security', 'bug', 'performance'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  'flex-1 py-2.5 text-xs font-semibold uppercase tracking-wider transition-colors',
                  activeTab === tab
                    ? 'border-b-2 border-violet-500 text-violet-400'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {tab === 'all' ? `All (${totalIssues})` :
                 tab === 'security' ? `Security (${totalSecurity})` :
                 tab === 'bug' ? `Bugs (${totalBugs})` :
                 `Perf (${totalPerf})`}
              </button>
            ))}
          </div>

          {/* File List */}
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-48 gap-3 text-muted-foreground">
                <Loader2 className="w-6 h-6 animate-spin text-violet-400" />
                <p className="text-sm">Fetching issues...</p>
              </div>
            ) : filteredFiles.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 gap-3 text-muted-foreground">
                <CheckCircle2 className="w-8 h-8 text-green-400" />
                <p className="text-sm font-medium text-green-400">No issues found!</p>
                <p className="text-xs text-center px-6">
                  {files.length === 0
                    ? 'Run an analysis from the Dashboard first to detect issues.'
                    : 'All issues in this category have been fixed or resolved.'}
                </p>
              </div>
            ) : (
              <div className="p-3 space-y-2">
                {filteredFiles.map(file => {
                  const state = fixStates[file.path]
                  const isExpanded = expandedFile === file.path
                  const isSelected = selectedFile?.path === file.path

                  return (
                    <motion.div key={file.path} layout>
                      <div
                        className={cn(
                          'rounded-xl border overflow-hidden transition-all duration-200',
                          isSelected ? 'border-violet-500/60 bg-violet-500/5' : 'border-border/50 bg-card/40',
                          state?.status === 'fixed' && 'border-green-500/40 bg-green-500/5',
                          state?.status === 'error'  && 'border-red-500/40  bg-red-500/5',
                        )}
                      >
                        {/* File Header */}
                        <div className="flex items-center gap-2 p-3">
                          <button
                            onClick={() => setExpandedFile(isExpanded ? null : file.path)}
                            className="shrink-0 text-muted-foreground hover:text-foreground"
                          >
                            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                          </button>
                          <FileCode2 className="w-4 h-4 text-muted-foreground shrink-0" />
                          <div className="flex-1 min-w-0" onClick={() => setSelectedFile(file)} role="button">
                            <p className="text-xs font-bold truncate">{file.filename}</p>
                            <p className="text-[10px] text-muted-foreground truncate">{file.path}</p>
                          </div>

                          {/* Status Badge */}
                          {state?.status === 'fixing' && (
                            <span className="flex items-center gap-1 text-[10px] font-bold text-violet-400 bg-violet-500/20 px-2 py-0.5 rounded-full">
                              <Loader2 className="w-2.5 h-2.5 animate-spin" /> Fixing...
                            </span>
                          )}
                          {state?.status === 'fixed' && (
                            <span className="flex items-center gap-1 text-[10px] font-bold text-green-400 bg-green-500/20 px-2 py-0.5 rounded-full">
                              <CheckCircle2 className="w-2.5 h-2.5" /> Fixed
                            </span>
                          )}
                          {state?.status === 'error' && (
                            <span className="flex items-center gap-1 text-[10px] font-bold text-red-400 bg-red-500/20 px-2 py-0.5 rounded-full">
                              <XCircle className="w-2.5 h-2.5" /> Error
                            </span>
                          )}
                          {!state && (
                            <span className="text-[10px] text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full">
                              {file.issues.length} issue{file.issues.length !== 1 ? 's' : ''}
                            </span>
                          )}

                          {/* Fix Button */}
                          {state?.status !== 'fixing' && state?.status !== 'fixed' && (
                            <button
                              id={`fix-btn-${file.fileId}`}
                              onClick={() => fixFile(file)}
                              className="ml-1 shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-[10px] font-bold transition"
                            >
                              <Play className="w-2.5 h-2.5" /> Fix
                            </button>
                          )}
                          {state?.status === 'fixed' && (
                            <button
                              onClick={() => setSelectedFile(file)}
                              className="ml-1 shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-lg bg-green-600/40 hover:bg-green-600/60 text-green-300 text-[10px] font-bold transition"
                            >
                              <Eye className="w-2.5 h-2.5" /> View
                            </button>
                          )}
                        </div>

                        {/* Issues list (expandable) */}
                        <AnimatePresence initial={false}>
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="overflow-hidden"
                            >
                              <div className="border-t border-border/30 divide-y divide-border/20 max-h-48 overflow-y-auto">
                                {file.issues.map((issue, idx) => (
                                  <div key={idx} className="flex items-start gap-2 px-4 py-2.5 hover:bg-white/5 transition-colors">
                                    <span className={cn('mt-0.5 shrink-0', getIssueStyle(issue.type).split(' ')[0])}>
                                      {getIssueIcon(issue.type)}
                                    </span>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2 mb-0.5">
                                        <span className={cn('text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border', getIssueStyle(issue.type))}>
                                          {issue.type}
                                        </span>
                                        {issue.line > 0 && (
                                          <span className="text-[10px] text-muted-foreground">Line {issue.line}</span>
                                        )}
                                      </div>
                                      <p className="text-xs text-foreground/80">{issue.message}</p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            )}
          </div>
        </GlassCard>

        {/* ── Right: Code Viewer ── */}
        <GlassCard className="flex flex-col p-0 overflow-hidden">
          {!selectedFile ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 text-muted-foreground p-8 text-center">
              <div className="p-5 rounded-2xl bg-gradient-to-br from-violet-500/10 to-fuchsia-500/10 border border-violet-500/20">
                <Wrench className="w-10 h-10 text-violet-400" />
              </div>
              <h3 className="font-semibold text-base text-foreground">Select a file to fix</h3>
              <p className="text-sm max-w-xs">
                Choose any file from the left panel and click <strong>Fix</strong> to let the AI automatically resolve all detected issues.
              </p>
              {filteredFiles.length > 0 && (
                <button
                  onClick={fixAll}
                  disabled={fixingAll}
                  className="mt-2 flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-bold text-sm transition shadow-lg shadow-violet-500/20"
                >
                  {fixingAll ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  Fix All Issues Automatically
                </button>
              )}
            </div>
          ) : (
            <>
              {/* Viewer Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 shrink-0">
                <div className="flex items-center gap-2 min-w-0">
                  <FileCode2 className="w-4 h-4 text-violet-400 shrink-0" />
                  <span className="text-xs font-bold truncate">{selectedFile.filename}</span>
                  {selectedState?.status === 'fixing' && (
                    <span className="flex items-center gap-1 text-[10px] text-violet-400 font-semibold animate-pulse">
                      <Loader2 className="w-3 h-3 animate-spin" /> AI is fixing...
                    </span>
                  )}
                  {selectedState?.status === 'fixed' && (
                    <span className="text-[10px] text-green-400 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Fixed!
                    </span>
                  )}
                </div>
                {selectedState?.status === 'fixed' && (
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => setViewMode('diff')}
                      className={cn('text-xs px-2.5 py-1 rounded-lg font-medium transition', viewMode === 'diff' ? 'bg-violet-600 text-white' : 'text-muted-foreground hover:bg-muted/60')}
                    >
                      Diff
                    </button>
                    <button
                      onClick={() => setViewMode('fixed')}
                      className={cn('text-xs px-2.5 py-1 rounded-lg font-medium transition', viewMode === 'fixed' ? 'bg-violet-600 text-white' : 'text-muted-foreground hover:bg-muted/60')}
                    >
                      Fixed Code
                    </button>
                  </div>
                )}
              </div>

              {/* Summary Banner */}
              {selectedState?.status === 'fixed' && selectedState.summary && (
                <div className="px-4 py-2 bg-green-500/10 border-b border-green-500/20 text-xs text-green-300 flex items-start gap-2 shrink-0">
                  <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 shrink-0 text-green-400" />
                  {selectedState.summary}
                </div>
              )}

              {/* Error Banner */}
              {selectedState?.status === 'error' && selectedState.error && (
                <div className="px-4 py-2 bg-red-500/10 border-b border-red-500/20 text-xs text-red-300 flex items-start gap-2 shrink-0">
                  <XCircle className="w-3.5 h-3.5 mt-0.5 shrink-0 text-red-400" />
                  {selectedState.error}
                </div>
              )}

              {/* Code Viewer Body */}
              <div className="flex-1 overflow-auto bg-[#0f172a] custom-scrollbar">
                {selectedState?.status === 'fixing' ? (
                  <div className="flex flex-col items-center justify-center h-full gap-4 text-muted-foreground">
                    <div className="relative">
                      <div className="absolute inset-0 rounded-full bg-violet-500/20 animate-ping" />
                      <div className="relative p-4 rounded-full bg-violet-500/20 border border-violet-500/40">
                        <Sparkles className="w-8 h-8 text-violet-400 animate-pulse" />
                      </div>
                    </div>
                    <p className="text-sm font-medium text-violet-300 animate-pulse">AI is analyzing and fixing issues...</p>
                    <p className="text-xs text-muted-foreground">This may take 10-30 seconds</p>
                  </div>
                ) : selectedState?.status === 'fixed' ? (
                  viewMode === 'fixed' ? (
                    <CodeView code={selectedState.fixedCode || ''} />
                  ) : (
                    <DiffView original={selectedState.originalCode || ''} fixed={selectedState.fixedCode || ''} />
                  )
                ) : (
                  /* Show issues list when not yet fixed */
                  <div className="p-5 space-y-3">
                    <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-4">
                      {selectedFile.issues.length} Issues to Fix in {selectedFile.filename}
                    </p>
                    {selectedFile.issues.map((issue, idx) => (
                      <div key={idx} className={cn('flex items-start gap-3 p-3 rounded-lg border', getIssueStyle(issue.type))}>
                        <span className="mt-0.5 shrink-0">{getIssueIcon(issue.type)}</span>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] font-bold uppercase">{issue.type}</span>
                            {issue.line > 0 && <span className="text-[10px] opacity-70">Line {issue.line}</span>}
                          </div>
                          <p className="text-xs opacity-90">{issue.message}</p>
                        </div>
                      </div>
                    ))}
                    <button
                      onClick={() => fixFile(selectedFile)}
                      className="mt-4 w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-bold text-sm transition"
                    >
                      <Sparkles className="w-4 h-4" />
                      Fix All {selectedFile.issues.length} Issues with AI
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </GlassCard>
      </div>
    </div>
  )
}

// ── Sub-components ──────────────────────────────────────────────────────────

function CodeView({ code }: { code: string }) {
  return (
    <pre className="p-4 font-mono text-xs text-green-300 leading-relaxed whitespace-pre-wrap break-words">
      {code}
    </pre>
  )
}

function DiffView({ original, fixed }: { original: string; fixed: string }) {
  const originalLines = original.split('\n')
  const fixedLines = fixed.split('\n')

  // Very simple diff: show side by side
  const maxLines = Math.max(originalLines.length, fixedLines.length)

  return (
    <div className="flex h-full min-h-0">
      {/* Original */}
      <div className="flex-1 min-w-0 border-r border-border/30">
        <div className="sticky top-0 px-3 py-1.5 bg-red-500/10 border-b border-red-500/20 text-[10px] font-bold text-red-400 uppercase tracking-wider z-10">
          Original
        </div>
        <pre className="p-3 font-mono text-xs text-red-200/70 leading-relaxed whitespace-pre-wrap break-words">
          {original}
        </pre>
      </div>
      {/* Fixed */}
      <div className="flex-1 min-w-0">
        <div className="sticky top-0 px-3 py-1.5 bg-green-500/10 border-b border-green-500/20 text-[10px] font-bold text-green-400 uppercase tracking-wider z-10">
          Fixed
        </div>
        <pre className="p-3 font-mono text-xs text-green-300 leading-relaxed whitespace-pre-wrap break-words">
          {fixed}
        </pre>
      </div>
    </div>
  )
}
