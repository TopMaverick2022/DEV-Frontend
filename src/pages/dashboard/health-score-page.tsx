import { useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Activity, ShieldAlert, Zap, TrendingDown, Info } from 'lucide-react'
import { GlassCard } from '@/components/shared/glass-components'
import apiClient from '@/lib/api-client'

interface FileBreakdown {
  filename: string
  path: string
  pointsDeducted: number
  reasons: string[]
}

interface HealthData {
  score: number
  totalBugs: number
  totalSecurityIssues: number
  totalPerformanceIssues: number
  filesAnalyzed: number
  files: FileBreakdown[]
}

export function HealthScorePage() {
  const { projectId } = useParams()
  const navigate = useNavigate()

  const { data, isLoading } = useQuery<HealthData>({
    queryKey: ['healthBreakdown', projectId],
    queryFn: async () => {
      const { data } = await apiClient.get(`/projects/${projectId}/health-breakdown`)
      return data
    },
    enabled: !!projectId
  })

  const score = data?.score ?? 0
  const scoreColor = score >= 80 ? 'text-green-500' : score >= 50 ? 'text-amber-500' : 'text-red-500'
  const barColor = score >= 80 ? 'bg-green-500' : score >= 50 ? 'bg-amber-500' : 'bg-red-500'

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
            <Activity className="w-6 h-6 text-green-500" />
            AI Health Score Breakdown
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Detailed breakdown of how the health score was calculated
          </p>
        </div>
      </div>

      {/* Score Card */}
      <GlassCard>
        <div className="flex items-center gap-8">
          <div className="text-center">
            <p className={`text-6xl font-black ${scoreColor}`}>{score}%</p>
            <p className="text-sm text-muted-foreground mt-1">AI Health Score</p>
          </div>
          <div className="flex-1 space-y-3">
            <div className="w-full bg-muted/30 rounded-full h-4 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${barColor}`}
                style={{ width: `${score}%` }}
              />
            </div>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-xl font-bold text-red-500">{data?.totalSecurityIssues ?? 0}</p>
                <p className="text-xs text-muted-foreground">Security (Weight: 5)</p>
              </div>
              <div>
                <p className="text-xl font-bold text-yellow-500">{data?.totalBugs ?? 0}</p>
                <p className="text-xs text-muted-foreground">Bugs (Weight: 2)</p>
              </div>
              <div>
                <p className="text-xl font-bold text-orange-500">{data?.totalPerformanceIssues ?? 0}</p>
                <p className="text-xs text-muted-foreground">Performance (Weight: 1)</p>
              </div>
            </div>
          </div>
        </div>
      </GlassCard>

      {/* How It's Calculated */}
      <GlassCard className="bg-blue-500/5 border-blue-500/20">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
          <div>
            <h3 className="font-bold text-blue-400 mb-2">How the Score Is Calculated</h3>
            <p className="text-sm text-muted-foreground">
              The AI Health Score is calculated based on detected issues. Each <span className="text-red-400 font-semibold">security vulnerability</span> adds 5 to the penalty, each <span className="text-yellow-400 font-semibold">bug</span> adds 2, and each <span className="text-orange-400 font-semibold">performance issue</span> adds 1.
              The final score is determined using an inverse-proportional formula: <code>100 * (100 / (100 + penalty))</code>. This ensures the score scales down gracefully and never drops straight to 0% even with multiple issues. If no files have been analyzed, the score shows 0%.
            </p>
          </div>
        </div>
      </GlassCard>

      {/* Per-File Breakdown */}
      <div>
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
          <TrendingDown className="w-5 h-5 text-muted-foreground" />
          Files Reducing Your Score
        </h2>
        {isLoading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">Loading breakdown...</div>
        ) : data?.files && data.files.length > 0 ? (
          <div className="space-y-3">
            {data.files.map((file) => (
              <GlassCard key={file.path} className="flex items-center gap-4">
                <div className="p-2 rounded-lg bg-red-500/10 shrink-0">
                  <TrendingDown className="w-4 h-4 text-red-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">{file.filename}</p>
                  <p className="text-xs text-muted-foreground truncate">{file.path}</p>
                  <div className="flex flex-wrap gap-2 mt-1.5">
                    {file.reasons.map((r, i) => (
                      <span key={i} className="text-xs text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full">{r}</span>
                    ))}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-2xl font-black text-red-500">+{file.pointsDeducted}</p>
                  <p className="text-xs text-muted-foreground">penalty</p>
                </div>
              </GlassCard>
            ))}
          </div>
        ) : (
          <GlassCard className="flex flex-col items-center py-12 text-center gap-3">
            <Activity className="w-10 h-10 text-green-500" />
            <p className="font-bold text-green-500">Perfect score! No deductions found.</p>
          </GlassCard>
        )}
      </div>
    </div>
  )
}
