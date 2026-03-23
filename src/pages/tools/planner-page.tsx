import { useState } from 'react'
import { GlassCard } from '@/components/shared/glass-components'
import { Wand2, Loader2, Sparkles, Copy, CheckCheck } from 'lucide-react'
import apiClient from '@/lib/api-client'

export function PlannerPage() {
  const [feature, setFeature] = useState('')
  const [projectId, setProjectId] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [copied, setCopied] = useState(false)

  const handleGenerate = async () => {
    if (!feature.trim()) return
    setLoading(true)
    setResult(null)
    try {
      const response = await apiClient.post('/ai/project-plan', {
        featureDescription: feature,
        projectId: projectId ? parseInt(projectId) : null,
      })
      setResult(response.data)
    } catch (error: any) {
      setResult({ error: error.response?.data?.message || 'Failed to generate plan. Please try again.' })
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = () => {
    if (!result) return
    navigator.clipboard.writeText(JSON.stringify(result, null, 2))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">AI Project Planner</h1>
        <p className="text-muted-foreground mt-1">Describe a feature and let AI generate a full sprint plan with tasks and dependencies.</p>
      </div>

      <GlassCard>
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Feature Description *</label>
            <textarea
              value={feature}
              onChange={(e) => setFeature(e.target.value)}
              placeholder="e.g., Build a user authentication system with JWT, OAuth2, and password reset functionality..."
              rows={4}
              className="w-full bg-background/50 border border-input rounded-lg px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary placeholder:text-muted-foreground resize-none"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Project ID (optional)</label>
            <input
              type="number"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              placeholder="Link this plan to an existing project ID"
              className="w-full bg-background/50 border border-input rounded-lg px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary placeholder:text-muted-foreground"
            />
          </div>
          <button
            onClick={handleGenerate}
            disabled={loading || !feature.trim()}
            className="bg-primary text-primary-foreground px-6 py-2 rounded-lg text-sm font-medium flex items-center gap-2 hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            Generate Plan
          </button>
        </div>
      </GlassCard>

      {result && (
        <GlassCard>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Wand2 className="w-5 h-5 text-primary" />
              <h3 className="font-bold text-foreground">Generated Plan</h3>
            </div>
            <button onClick={handleCopy} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
              {copied ? <CheckCheck className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copied!' : 'Copy JSON'}
            </button>
          </div>
          {result.error ? (
            <p className="text-destructive text-sm">{result.error}</p>
          ) : (
            <pre className="bg-background/50 rounded-lg p-4 text-xs text-foreground overflow-auto max-h-[500px]">
              {JSON.stringify(result, null, 2)}
            </pre>
          )}
        </GlassCard>
      )}
    </div>
  )
}
