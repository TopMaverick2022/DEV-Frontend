import { useState, useRef } from 'react'
import Editor from '@monaco-editor/react'
import { GlassCard } from '@/components/shared/glass-components'
import { cn } from '@/lib/utils'
import apiClient from '@/lib/api-client'
import { 
  Play, 
  Save, 
  ShieldCheck, 
  Zap, 
  MessageSquare,
  ChevronDown,
  CheckCircle2,
  AlertCircle,
  Activity,
  Upload,
  Loader2
} from 'lucide-react'

const initialCode = `// DeveloperEv AI Code Reviewer
// Paste your code here or upload a project zip for deep analysis

function calculateTotal(items) {
  let total = 0;
  for (let i = 0; i < items.length; i++) {
    total += items[i].price;
  }
  return total;
}

const checkout = (cart) => {
  const result = calculateTotal(cart);
  console.log("Processing checkout for: ", result);
  // Missing error handling
  return result;
};
`

export function CodeReviewerPage() {
  const [code, setCode] = useState(initialCode)
  const [loading, setLoading] = useState(false)
  const [reviewResult, setReviewResult] = useState<any>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleRunReview = async () => {
    setLoading(true)
    try {
      const response = await apiClient.post('/ai/analyze', {
        code,
        analysisType: 'all'
      })
      setReviewResult(response.data)
    } catch (error) {
      console.error('Review failed', error)
    } finally {
      setLoading(false)
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setLoading(true)
    const formData = new FormData()
    formData.append('project', file)

    try {
      const response = await apiClient.post('/ai/code-review', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })
      setReviewResult(response.data)
    } catch (error) {
      console.error('Project review failed', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6 h-[calc(100vh-160px)] flex flex-col">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">AI Code Reviewer</h1>
          <p className="text-muted-foreground">Professional analysis for performance, security, and best practices.</p>
        </div>
        <div className="flex items-center gap-3">
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            className="hidden" 
            accept=".zip"
          />
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="glass px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-white/10"
          >
            <Upload className="w-4 h-4" /> Upload Zip
          </button>
          <button 
            onClick={handleRunReview}
            disabled={loading}
            className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 shadow-lg shadow-primary/25 hover:opacity-90 disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 ml-1" />} Run AI Review
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
        <GlassCard className="lg:col-span-2 p-0 overflow-hidden border-white/5 flex flex-col">
          <div className="px-4 py-2 border-b border-white/5 flex items-center justify-between bg-card/20">
            <div className="flex items-center gap-4">
              <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                index.js <ChevronDown className="w-3 h-3" />
              </span>
              <span className="text-xs font-medium text-muted-foreground">JavaScript</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] bg-green-500/10 text-green-500 px-2 py-0.5 rounded-full border border-green-500/20">Clean</span>
            </div>
          </div>
          <div className="flex-1">
            <Editor
              height="100%"
              defaultLanguage="javascript"
              defaultValue={initialCode}
              theme="vs-dark"
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                padding: { top: 20 },
                lineNumbers: 'on',
                scrollBeyondLastLine: false,
                automaticLayout: true,
                theme: 'vs-dark',
              }}
              onChange={(value) => setCode(value || '')}
            />
          </div>
        </GlassCard>

        <div className="space-y-6 overflow-y-auto pr-2">
          <GlassCard className="bg-primary/5 border-primary/20">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Zap className="text-primary w-5 h-5" /> Summary
            </h3>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="text-center p-3 glass rounded-xl">
                <p className="text-2xl font-bold">84</p>
                <p className="text-[10px] text-muted-foreground uppercase">Score</p>
              </div>
              <div className="text-center p-3 glass rounded-xl">
                <p className="text-2xl font-bold text-amber-500">2</p>
                <p className="text-[10px] text-muted-foreground uppercase">Issues</p>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Security</span>
                <span className="text-green-500">Perfect</span>
              </div>
              <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                <div className="w-full h-full bg-green-500" />
              </div>
              <div className="flex items-center justify-between text-sm pt-2">
                <span className="text-muted-foreground">Performance</span>
                <span className="text-amber-500">Optimize</span>
              </div>
              <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                <div className="w-[70%] h-full bg-amber-500" />
              </div>
            </div>
          </GlassCard>

          <GlassCard>
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <MessageSquare className="text-blue-500 w-5 h-5" /> Feedback
            </h3>
            <div className="space-y-4">
              <FeedbackItem 
                type="warn"
                title="Potential Loop Performance"
                desc="The for-loop in 'calculateTotal' can be replaced with 'reduce()' for better readability and minor performance gains in modern JS engines."
              />
              <FeedbackItem 
                type="error"
                title="Missing Error Handling"
                desc="Function 'checkout' doesn't handle cases where 'cart' might be null or empty, which could lead to runtime errors."
              />
              <FeedbackItem 
                type="info"
                title="Naming Convention"
                desc="Consider using more descriptive names than 'result' for better maintainability."
              />
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  )
}

function FeedbackItem({ type, title, desc }: any) {
  const Icon = type === 'error' ? AlertCircle : (type === 'warn' ? Zap : CheckCircle2)
  const colors = {
    error: 'text-red-500 bg-red-500/10 border-red-500/20',
    warn: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
    info: 'text-blue-500 bg-blue-500/10 border-blue-500/20'
  }
  
  return (
    <div className={cn("p-4 rounded-xl border flex gap-3", colors[type as keyof typeof colors])}>
      <Icon className="w-5 h-5 shrink-0 mt-0.5" />
      <div>
        <p className="text-sm font-bold capitalize">{title}</p>
        <p className="text-xs mt-1 leading-relaxed opacity-90">{desc}</p>
      </div>
    </div>
  )
}
