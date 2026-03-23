import { useState } from 'react'
import { GlassCard } from '@/components/shared/glass-components'
import { ShieldCheck, Loader2, Sparkles, Copy, CheckCheck, AlertTriangle } from 'lucide-react'
import apiClient from '@/lib/api-client'
import ReactMarkdown from 'react-markdown'

export function SecurityPage() {
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const handleScan = async () => {
    if (!code.trim()) return
    setLoading(true)
    setResult(null)
    setError(null)
    try {
      const response = await apiClient.post('/ai/security-scan', { code })
      setResult(typeof response.data === 'string' ? response.data : JSON.stringify(response.data, null, 2))
    } catch (err: any) {
      setError(err.response?.data?.message || 'Security scan failed. Please try again.')
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
      <div className="flex items-start gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Security Scanner</h1>
          <p className="text-muted-foreground mt-1">Detect vulnerabilities, injection risks, and security anti-patterns in your code using AI.</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 border border-amber-500/20 rounded-full mt-1">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
          <span className="text-xs font-medium text-amber-500">Security Tool</span>
        </div>
      </div>

      <GlassCard>
        <h3 className="font-semibold text-foreground mb-4">Code to Scan</h3>
        <textarea
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Paste your code for a security analysis — SQL queries, API handlers, authentication logic..."
          rows={14}
          className="w-full bg-background/50 border border-input rounded-lg px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary placeholder:text-muted-foreground resize-none font-mono"
        />
        <div className="mt-4">
          <button
            onClick={handleScan}
            disabled={loading || !code.trim()}
            className="bg-primary text-primary-foreground px-6 py-2 rounded-lg text-sm font-medium flex items-center gap-2 hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            Run Security Scan
          </button>
        </div>
      </GlassCard>

      {error && (
        <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">{error}</div>
      )}

      {result && (
        <GlassCard>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-primary" />
              <h3 className="font-bold text-foreground">Security Report</h3>
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
