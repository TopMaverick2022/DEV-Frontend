import { useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Clock, FileCode2, BookOpen, CheckCircle2 } from 'lucide-react'
import { GlassCard } from '@/components/shared/glass-components'
import apiClient from '@/lib/api-client'

interface DebtItem {
  type: string
  count: number
  hours: number
  guide: string
}

interface FileDebt {
  filename: string
  path: string
  totalHours: string
  items: DebtItem[]
}

interface TechDebtData {
  totalHours: string
  totalFiles: number
  files: FileDebt[]
}

const REMEDIATION_GUIDE = [
  {
    step: '1. Triage',
    detail: 'Start with Security issues — they are highest risk. Fix those before bugs and performance.'
  },
  {
    step: '2. One file at a time',
    detail: 'Pick the file with the most hours, open it, and address each issue methodically. Don\'t try to fix everything at once.'
  },
  {
    step: '3. Write tests first',
    detail: 'Before fixing a bug, write a test that reproduces it. This ensures your fix is correct and won\'t regress.'
  },
  {
    step: '4. Code review',
    detail: 'After fixing, get a peer review to verify the change doesn\'t introduce new issues.'
  },
  {
    step: '5. Re-analyze',
    detail: 'Once done, re-sync and re-analyze the project so the AI can confirm the issues are resolved and update your health score.'
  }
]

const typeColor: Record<string, string> = {
  Security: 'text-red-400 bg-red-500/10',
  Bug: 'text-yellow-400 bg-yellow-500/10',
  Performance: 'text-orange-400 bg-orange-500/10',
}

export function TechDebtPage() {
  const { projectId } = useParams()
  const navigate = useNavigate()

  const { data, isLoading } = useQuery<TechDebtData>({
    queryKey: ['techDebt', projectId],
    queryFn: async () => {
      const { data } = await apiClient.get(`/projects/${projectId}/tech-debt`)
      return data
    },
    enabled: !!projectId
  })

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
            <Clock className="w-6 h-6 text-amber-500" />
            Estimated Tech Debt
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Not a measure of developer speed — it's the estimated time to properly fix detected issues
          </p>
        </div>
      </div>

      {/* What is Tech Debt? */}
      <GlassCard className="bg-amber-500/5 border-amber-500/20">
        <div className="flex items-start gap-3">
          <BookOpen className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <h3 className="font-bold text-amber-400 mb-2">What does this mean?</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              <strong className="text-foreground">Tech Debt</strong> is not about how fast a developer works.
              It's the <em>accumulated cost</em> of leaving code issues unresolved. Think of it like financial debt — the longer
              you ignore it, the more expensive it becomes to fix.
              <br /><br />
              Here, "Estimated Effort" is how long a <em>typical experienced developer</em> would take to
              properly research, fix, test, and review each issue type. It's calculated as:
            </p>
            <div className="mt-3 grid grid-cols-3 gap-3 text-center">
              <div className="bg-red-500/10 rounded-lg p-3">
                <p className="font-bold text-red-400">3 hrs</p>
                <p className="text-xs text-muted-foreground">per Security issue</p>
              </div>
              <div className="bg-yellow-500/10 rounded-lg p-3">
                <p className="font-bold text-yellow-400">1 hr</p>
                <p className="text-xs text-muted-foreground">per Bug</p>
              </div>
              <div className="bg-orange-500/10 rounded-lg p-3">
                <p className="font-bold text-orange-400">30 min</p>
                <p className="text-xs text-muted-foreground">per Performance issue</p>
              </div>
            </div>
          </div>
        </div>
      </GlassCard>

      {/* Total Bar */}
      <GlassCard className="flex flex-wrap items-center gap-6 py-4">
        <div className="text-center">
          <p className="text-4xl font-black text-amber-400">{data?.totalHours ?? '0h'}</p>
          <p className="text-xs text-muted-foreground">Total Estimated Effort</p>
        </div>
        <div className="w-px h-10 bg-border/50" />
        <div className="text-center">
          <p className="text-4xl font-bold">{data?.totalFiles ?? 0}</p>
          <p className="text-xs text-muted-foreground">Files with debt</p>
        </div>
      </GlassCard>

      {/* Per-file breakdown */}
      <div>
        <h2 className="text-lg font-bold mb-4">Per-File Breakdown</h2>
        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Calculating debt...</div>
        ) : data?.files && data.files.length > 0 ? (
          <div className="space-y-3">
            {data.files.map((file) => (
              <GlassCard key={file.path} className="space-y-3">
                <div className="flex items-center gap-3">
                  <FileCode2 className="w-5 h-5 text-amber-500 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm">{file.filename}</p>
                    <p className="text-xs text-muted-foreground truncate">{file.path}</p>
                  </div>
                  <span className="text-lg font-black text-amber-400 shrink-0">{file.totalHours}</span>
                </div>
                <div className="space-y-2 pl-8">
                  {file.items.map((item, i) => (
                    <div key={i} className={`flex items-start gap-2 p-2 rounded-lg ${typeColor[item.type] ?? 'text-muted-foreground bg-muted/20'}`}>
                      <div className="flex-1">
                        <p className="text-xs font-semibold">{item.type} × {item.count} — {item.hours % 1 === 0 ? item.hours + 'h' : (item.hours * 60) + 'min'}</p>
                        <p className="text-xs opacity-75 mt-0.5">{item.guide}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </GlassCard>
            ))}
          </div>
        ) : (
          <GlassCard className="flex flex-col items-center py-12 text-center gap-3">
            <Clock className="w-10 h-10 text-green-500" />
            <p className="font-bold text-green-500">Zero estimated debt! Great work.</p>
          </GlassCard>
        )}
      </div>

      {/* How To Fix It Guide */}
      <div>
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-primary" />
          How to Reduce Tech Debt — Step by Step
        </h2>
        <div className="space-y-3">
          {REMEDIATION_GUIDE.map((g, i) => (
            <GlassCard key={i} className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm shrink-0">{i + 1}</div>
              <div>
                <p className="font-semibold text-sm">{g.step}</p>
                <p className="text-sm text-muted-foreground">{g.detail}</p>
              </div>
            </GlassCard>
          ))}
        </div>
      </div>
    </div>
  )
}
