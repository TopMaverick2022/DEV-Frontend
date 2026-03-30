import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, ShieldAlert, ChevronRight, ChevronDown, FileCode2, AlertTriangle } from 'lucide-react'
import { GlassCard } from '@/components/shared/glass-components'
import apiClient from '@/lib/api-client'

interface Issue {
  line: number
  type: string
  message: string
}

interface FileIssue {
  filename: string
  path: string
  language: string
  issues: Issue[]
}

export function SecurityIssuesPage() {
  const { projectId } = useParams()
  const navigate = useNavigate()
  const [expandedFile, setExpandedFile] = useState<string | null>(null)

  const { data: files, isLoading } = useQuery<FileIssue[]>({
    queryKey: ['securityIssues', projectId],
    queryFn: async () => {
      const { data } = await apiClient.get(`/projects/${projectId}/issues/security`)
      return data
    },
    enabled: !!projectId
  })

  const totalIssues = files?.reduce((sum, f) => sum + f.issues.length, 0) ?? 0

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 p-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-xl glass border border-border/50 hover:bg-white/10 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3">
            <ShieldAlert className="w-6 h-6 text-red-500" />
            Security Issues
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            AI-detected vulnerabilities across your codebase — read only view
          </p>
        </div>
      </div>

      {/* Summary Bar */}
      <GlassCard className="flex flex-wrap items-center gap-6 py-4">
        <div className="text-center">
          <p className="text-3xl font-bold text-red-500">{totalIssues}</p>
          <p className="text-xs text-muted-foreground">Total Vulnerabilities</p>
        </div>
        <div className="w-px h-10 bg-border/50" />
        <div className="text-center">
          <p className="text-3xl font-bold">{files?.length ?? 0}</p>
          <p className="text-xs text-muted-foreground">Files Affected</p>
        </div>
        <div className="ml-auto text-xs text-muted-foreground italic">
          Read-only • AI-generated analysis
        </div>
      </GlassCard>

      {/* File List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          Analyzing security issues...
        </div>
      ) : files && files.length > 0 ? (
        <div className="space-y-3">
          {files.map((file) => (
            <motion.div key={file.path} layout>
              <GlassCard className="p-0 overflow-hidden">
                {/* File Header */}
                <button
                  onClick={() => setExpandedFile(expandedFile === file.path ? null : file.path)}
                  className="w-full flex items-center gap-4 p-4 hover:bg-white/5 transition-colors text-left"
                >
                  <FileCode2 className="w-5 h-5 text-red-500 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm">{file.filename}</p>
                    <p className="text-xs text-muted-foreground truncate">{file.path}</p>
                  </div>
                  <span className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full font-bold shrink-0">
                    {file.issues.length} {file.issues.length === 1 ? 'issue' : 'issues'}
                  </span>
                  {expandedFile === file.path
                    ? <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                    : <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                  }
                </button>

                {/* Issues Detail */}
                <AnimatePresence>
                  {expandedFile === file.path && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="border-t border-border/50 divide-y divide-border/30">
                        {file.issues.map((issue, i) => (
                          <div key={i} className="px-4 py-3 flex items-start gap-3 hover:bg-red-500/5 transition-colors">
                            <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-0.5">
                                <span className="text-xs font-bold text-red-500 uppercase">{issue.type}</span>
                                {issue.line > 0 && (
                                  <span className="text-xs text-muted-foreground">Line {issue.line}</span>
                                )}
                              </div>
                              <p className="text-sm text-foreground">{issue.message}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      ) : (
        <GlassCard className="flex flex-col items-center justify-center py-16 text-center gap-3">
          <ShieldAlert className="w-12 h-12 text-green-500" />
          <h3 className="text-xl font-bold text-green-500">No Security Issues Found</h3>
          <p className="text-muted-foreground text-sm">Your code has no detected security vulnerabilities. Keep it up!</p>
        </GlassCard>
      )}
    </div>
  )
}
