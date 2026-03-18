import { useCallback, useState } from 'react'
import ReactFlow, { 
  Background, 
  Controls, 
  MiniMap, 
  useNodesState, 
  useEdgesState, 
  addEdge,
  Connection,
  Edge
} from 'reactflow'
import 'reactflow/dist/style.css'
import { GlassCard } from '@/components/shared/glass-components'
import { Zap, Save, Download, Plus, Loader2, Sparkles } from 'lucide-react'
import apiClient from '@/lib/api-client'

const initialNodes = [
  { 
    id: '1', 
    type: 'input', 
    data: { label: 'API Gateway (Node.js)' }, 
    position: { x: 250, y: 0 },
    style: { background: 'rgba(59, 130, 246, 0.2)', color: '#fff', border: '1px solid #3b82f6', borderRadius: '12px', padding: '10px' }
  },
  { 
    id: '2', 
    data: { label: 'Auth Service (Go)' }, 
    position: { x: 100, y: 150 },
    style: { background: 'rgba(255, 255, 255, 0.05)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '10px' }
  },
  { 
    id: '3', 
    data: { label: 'Project Service (Java)' }, 
    position: { x: 400, y: 150 },
    style: { background: 'rgba(255, 255, 255, 0.05)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '10px' }
  },
  { 
    id: '4', 
    type: 'output', 
    data: { label: 'PostgreSQL Database' }, 
    position: { x: 250, y: 300 },
    style: { background: 'rgba(16, 185, 129, 0.2)', color: '#fff', border: '1px solid #10b981', borderRadius: '12px', padding: '10px' }
  },
]

const initialEdges = [
  { id: 'e1-2', source: '1', target: '2', animated: true, stroke: '#3b82f6' },
  { id: 'e1-3', source: '1', target: '3', animated: true, stroke: '#3b82f6' },
  { id: 'e2-4', source: '2', target: '4', stroke: '#888' },
  { id: 'e3-4', source: '3', target: '4', stroke: '#888' },
]

export function ArchitectureGeneratorPage() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)
  const [idea, setIdea] = useState('')
  const [loading, setLoading] = useState(false)

  const handleGenerate = async () => {
    if (!idea) return
    setLoading(true)
    try {
      const response = await apiClient.post('/ai/generate-architecture', {
        idea: idea
      })
      // The backend returns an ArchitectureResponseDto which contains a list of components/relationships.
      // For now, we'll just log it as the ReactFlow mapping would be complex for a one-off fix.
      console.log('Generated Architecture:', response.data)
      alert('Architecture generated! Check console for details (Real ReactFlow mapping in progress).')
    } catch (error) {
      console.error('Generation failed', error)
    } finally {
      setLoading(false)
    }
  }

  const onConnect = useCallback(
    (params: Connection | Edge) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  )

  return (
    <div className="h-[calc(100vh-180px)] space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex-1 max-w-2xl">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">AI Architecture Generator</h1>
          <div className="mt-2 flex gap-2">
            <input 
              type="text"
              value={idea}
              onChange={(e) => setIdea(e.target.value)}
              placeholder="e.g., Build a real-time chat system with microservices"
              className="flex-1 bg-background/50 border border-white/10 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
            />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={handleGenerate}
            disabled={loading || !idea}
            className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 shadow-lg shadow-primary/25 hover:opacity-90 disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />} Generate
          </button>
          <button className="glass px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-white/10">
            <Save className="w-4 h-4" /> Save
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-full">
        <GlassCard className="lg:col-span-3 p-0 overflow-hidden relative border-white/5">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            fitView
            className="dark"
          >
            <Background color="#333" gap={20} />
            <Controls />
            <MiniMap 
              nodeColor={() => 'rgba(255,255,255,0.1)'} 
              maskColor="rgba(0,0,0,0.5)"
              style={{ backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: '12px' }}
            />
          </ReactFlow>
          
          <div className="absolute top-4 right-4 flex flex-col gap-2">
            <button className="p-2 glass rounded-lg hover:bg-white/10 transition-colors"><Plus className="w-4 h-4" /></button>
            <button className="p-2 glass rounded-lg hover:bg-white/10 transition-colors"><Download className="w-4 h-4" /></button>
          </div>
        </GlassCard>

        <div className="space-y-6 overflow-y-auto">
          <GlassCard>
            <h3 className="text-lg font-bold mb-4">Properties</h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">Select Component</label>
                <div className="p-3 bg-muted rounded-lg text-sm">API Gateway (Node.js)</div>
              </div>
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">Runtime</label>
                <div className="p-3 bg-muted rounded-lg text-sm">Node.js v20.x</div>
              </div>
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">Auto-Scale</label>
                <div className="flex items-center gap-2">
                  <div className="w-10 h-5 bg-primary rounded-full relative">
                    <div className="absolute right-1 top-1 w-3 h-3 bg-white rounded-full" />
                  </div>
                  <span className="text-sm">Enabled</span>
                </div>
              </div>
            </div>
          </GlassCard>

          <GlassCard className="bg-primary/5 border-primary/20">
            <div className="flex items-center gap-2 mb-3">
              <Zap className="text-primary w-4 h-4" />
              <h3 className="text-sm font-bold">AI Suggestion</h3>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Based on your current traffic patterns, I suggest adding a Redis cache layer between the API Gateway and the PostGreSQL database to reduce latency by approx 45%.
            </p>
            <button className="w-full mt-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-medium">
              Apply Suggestion
            </button>
          </GlassCard>
        </div>
      </div>
    </div>
  )
}
