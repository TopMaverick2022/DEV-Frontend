import { useState } from 'react'
import { GlassCard } from '@/components/shared/glass-components'
import { Bug, Loader2, Sparkles, Copy, CheckCheck } from 'lucide-react'
import apiClient from '@/lib/api-client'
import ReactMarkdown from 'react-markdown'

export function DebuggerPage() {
  const [errorLog, setErrorLog] = useState('')
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const handleAnalyze = async () => {
    if (!errorLog.trim() && !code.trim()) return
    setLoading(true)
    setResult(null)
    setError(null)
    try {
      const response = await apiClient.post('/ai/debug', {
        errorLog,
        code,
      })
      setResult(typeof response.data === 'string' ? response.data : JSON.stringify(response.data, null, 2))
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to analyze. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = () => {
    if (!result) return
    navigator.clipboard.writeText(result)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">AI Debugging Assistant</h1>
        <p className="text-muted-foreground mt-1">Paste your error log or code and let AI diagnose and suggest fixes instantly.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GlassCard>
          <h3 className="font-semibold text-foreground mb-4">Error Log</h3>
          <textarea
            value={errorLog}
            onChange={(e) => setErrorLog(e.target.value)}
            placeholder="Paste your error log, stack trace, or exception here..."
            rows={10}
            className="w-full bg-background/50 border border-input rounded-lg px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary placeholder:text-muted-foreground resize-none font-mono"
          />
        </GlassCard>
        <GlassCard>
          <h3 className="font-semibold text-foreground mb-4">Relevant Code (optional)</h3>
          <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Paste the code where the error occurred..."
            rows={10}
            className="w-full bg-background/50 border border-input rounded-lg px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary placeholder:text-muted-foreground resize-none font-mono"
          />
        </GlassCard>
      </div>

      <button
        onClick={handleAnalyze}
        disabled={loading || (!errorLog.trim() && !code.trim())}
        className="bg-primary text-primary-foreground px-6 py-2 rounded-lg text-sm font-medium flex items-center gap-2 hover:opacity-90 disabled:opacity-50 transition-opacity"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
        Analyze & Debug
      </button>

      {error && (
        <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">{error}</div>
      )}

      {result && (
        <GlassCard>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Bug className="w-5 h-5 text-primary" />
              <h3 className="font-bold text-foreground">AI Debug Analysis</h3>
            </div>
            <button onClick={handleCopy} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
              {copied ? <CheckCheck className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <ReactMarkdown>{result}</ReactMarkdown>
          </div>
        </GlassCard>
      )}
    </div>
  )
}
