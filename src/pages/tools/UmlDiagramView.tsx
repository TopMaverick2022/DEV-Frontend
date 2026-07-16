import React, { useState, useEffect, useRef } from 'react'
import mermaid from 'mermaid'
import { toPng } from 'html-to-image'
import jsPDF from 'jspdf'
import { Download, Loader2, Sparkles, Trash2, Edit2, Save } from 'lucide-react'
import apiClient from '@/lib/api-client'
import { useProject } from '@/features/projects/project-context'
import { JointJsDiagram } from './JointJsDiagram'

interface UmlDiagramDto {
  id: number;
  projectId: number;
  name: string;
  type: string;
  mermaidCode: string;
}

export function UmlDiagramView() {
  const { selectedProject } = useProject()
  const [diagrams, setDiagrams] = useState<UmlDiagramDto[]>([])
  const [selectedDiagram, setSelectedDiagram] = useState<UmlDiagramDto | null>(null)
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [umlType, setUmlType] = useState('sequenceDiagram')
  const [name, setName] = useState('')
  const [context, setContext] = useState('')
  const [editingCode, setEditingCode] = useState(false)
  const [tempCode, setTempCode] = useState('')

  const mermaidRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    mermaid.initialize({ startOnLoad: true, theme: 'dark' })
  }, [])

  useEffect(() => {
    if (selectedProject?.id) {
      fetchDiagrams()
    }
  }, [selectedProject?.id])

  useEffect(() => {
    if (selectedDiagram && selectedDiagram.type !== 'useCaseDiagram' && mermaidRef.current && !editingCode) {
      try {
        mermaidRef.current.innerHTML = ''
        mermaid.render(`mermaid-${selectedDiagram.id}`, selectedDiagram.mermaidCode).then(({ svg }) => {
          if (mermaidRef.current) mermaidRef.current.innerHTML = svg
        })
      } catch (err) {
        console.error("Mermaid syntax error", err)
      }
    }
  }, [selectedDiagram, editingCode])

  const fetchDiagrams = async () => {
    setLoading(true)
    try {
      const { data } = await apiClient.get<UmlDiagramDto[]>(`/ai/uml/project/${selectedProject?.id}`)
      setDiagrams(data)
      if (data.length > 0 && !selectedDiagram) setSelectedDiagram(data[0])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleGenerate = async () => {
    if (!name.trim()) return
    setGenerating(true)
    try {
      const { data } = await apiClient.post<UmlDiagramDto>('/ai/uml/generate', {
        projectId: selectedProject?.id,
        name,
        type: umlType,
        context
      })
      setDiagrams([...diagrams, data])
      setSelectedDiagram(data)
      setName('')
      setContext('')
    } catch (err) {
      console.error(err)
    } finally {
      setGenerating(false)
    }
  }

  const handleDelete = async (id: number) => {
    try {
      await apiClient.delete(`/ai/uml/${id}`)
      setDiagrams(diagrams.filter(d => d.id !== id))
      if (selectedDiagram?.id === id) setSelectedDiagram(null)
    } catch (err) {
      console.error(err)
    }
  }

  const handleUpdateCode = async () => {
    if (!selectedDiagram) return
    try {
      const { data } = await apiClient.put<UmlDiagramDto>(`/ai/uml/${selectedDiagram.id}`, { mermaidCode: tempCode })
      setDiagrams(diagrams.map(d => d.id === data.id ? data : d))
      setSelectedDiagram(data)
      setEditingCode(false)
    } catch (err) {
      console.error(err)
    }
  }

  const doExportPdf = async () => {
    if (!mermaidRef.current || !selectedDiagram) return
    const dataUrl = await toPng(mermaidRef.current, { backgroundColor: '#0f172a', pixelRatio: 2 })
    const pdf = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' })
    pdf.setFillColor(15, 23, 42)
    pdf.rect(0, 0, 841.89, 595.28, 'F')
    pdf.setTextColor(248, 250, 252)
    pdf.setFontSize(16)
    pdf.text(selectedDiagram.name, 36, 40)
    pdf.addImage(dataUrl, 'PNG', 36, 60, 770, 480, '', 'FAST')
    pdf.save(`uml-${selectedDiagram.name}.pdf`)
  }

  return (
    <div className="flex gap-4 h-[600px] border border-border rounded-xl bg-card overflow-hidden">
      {/* Sidebar */}
      <div className="w-64 border-r border-border bg-muted/20 p-4 flex flex-col gap-4 overflow-y-auto custom-scrollbar">
        <h3 className="font-bold text-sm">Saved Diagrams</h3>
        {loading ? <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /> : (
          <div className="space-y-2">
            {diagrams.map(d => (
              <div key={d.id} className={`flex items-center justify-between p-2 rounded-lg border cursor-pointer transition-colors ${selectedDiagram?.id === d.id ? 'bg-primary/10 border-primary/50' : 'bg-background border-border hover:bg-muted/50'}`} onClick={() => { setSelectedDiagram(d); setEditingCode(false); }}>
                <div>
                  <div className="text-xs font-bold truncate max-w-[140px]">{d.name}</div>
                  <div className="text-[10px] text-muted-foreground">{d.type}</div>
                </div>
                <button onClick={(e) => { e.stopPropagation(); handleDelete(d.id); }} className="p-1 hover:text-red-400 text-muted-foreground rounded hover:bg-red-500/10"><Trash2 className="w-3 h-3" /></button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 p-4 flex flex-col gap-4 overflow-hidden">
        {/* Generator Controls */}
        <div className="flex items-start gap-2 bg-muted/20 p-3 rounded-lg border border-border">
          <div className="flex flex-col gap-2 flex-1">
            <div className="flex gap-2">
              <input value={name} onChange={e => setName(e.target.value)} placeholder="Diagram Name (e.g. User Login Flow)" className="flex-1 bg-background border border-border rounded px-3 py-1.5 text-sm" />
              <select value={umlType} onChange={e => setUmlType(e.target.value)} className="bg-background border border-border rounded px-3 py-1.5 text-sm">
                <option value="sequenceDiagram">Sequence Diagram</option>
                <option value="classDiagram">Class Diagram</option>
                <option value="erDiagram">ER Diagram</option>
                <option value="stateDiagram-v2">State Diagram</option>
                <option value="useCaseDiagram">Use Case Diagram</option>
              </select>
            </div>
            <textarea value={context} onChange={e => setContext(e.target.value)} placeholder="Additional context (optional)..." rows={1} className="w-full bg-background border border-border rounded px-3 py-1.5 text-sm resize-none" />
          </div>
          <button onClick={handleGenerate} disabled={generating || !name.trim()} className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 h-full">
            {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />} Generate
          </button>
        </div>

        {/* View / Edit */}
        {selectedDiagram ? (
          <div className="flex-1 bg-background border border-border rounded-lg relative flex flex-col min-h-0">
            <div className="flex items-center justify-between p-2 border-b border-border bg-muted/10 shrink-0">
              <span className="text-xs font-bold px-2">{selectedDiagram.name}</span>
              <div className="flex gap-2">
                {editingCode ? (
                  <>
                    <button onClick={() => setEditingCode(false)} className="text-xs px-2 py-1 bg-muted rounded hover:bg-muted/80">Cancel</button>
                    <button onClick={handleUpdateCode} className="text-xs px-2 py-1 bg-primary text-primary-foreground flex items-center gap-1 rounded hover:bg-primary/90"><Save className="w-3 h-3" /> Save Code</button>
                  </>
                ) : (
                  <>
                    <button onClick={() => { setTempCode(selectedDiagram.mermaidCode); setEditingCode(true); }} className="text-xs px-2 py-1 border border-border rounded hover:bg-muted flex items-center gap-1">
                      <Edit2 className="w-3 h-3" /> Edit {selectedDiagram.type === 'useCaseDiagram' ? 'JSON' : 'Mermaid'}
                    </button>
                    {selectedDiagram.type !== 'useCaseDiagram' && (
                      <button onClick={doExportPdf} className="text-xs px-2 py-1 border border-border rounded hover:bg-muted flex items-center gap-1"><Download className="w-3 h-3" /> Export PDF</button>
                    )}
                  </>
                )}
              </div>
            </div>
            <div className="flex-1 overflow-auto custom-scrollbar relative bg-[#0f172a] p-4 flex items-center justify-center">
              {editingCode ? (
                <textarea value={tempCode} onChange={e => setTempCode(e.target.value)} className="w-full h-full bg-[#1e293b] text-white p-4 font-mono text-sm resize-none rounded outline-none" />
              ) : (
                selectedDiagram.type === 'useCaseDiagram' ? (
                  <JointJsDiagram jsonGraph={selectedDiagram.mermaidCode} />
                ) : (
                  <div ref={mermaidRef} className="max-w-full" />
                )
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground border border-dashed rounded-lg bg-muted/10">
            Select a diagram or generate a new one.
          </div>
        )}
      </div>
    </div>
  )
}
