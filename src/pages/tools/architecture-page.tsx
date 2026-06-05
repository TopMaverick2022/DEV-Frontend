import { useCallback, useState, useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import ReactFlow, {
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  NodeTypes,
  Handle,
  Position,
  MarkerType,
  BackgroundVariant,
} from 'reactflow'
import 'reactflow/dist/style.css'
import {
  Zap, Download, Loader2, Sparkles, Server, Database,
  ArrowRight, Code2, BookOpen, FileJson, RefreshCw, Info, X,
  Image as ImageIcon, FileText, ChevronDown, GitBranch,
} from 'lucide-react'
import apiClient from '@/lib/api-client'
import { toPng, toJpeg } from 'html-to-image'
import jsPDF from 'jspdf'

// ── Types ────────────────────────────────────────────────────────────────────
interface ServiceDto { name: string; description: string; database?: string }
interface ApiDto     { method: string; endpoint: string; description: string }
interface EventDto   { name: string; producer: string; consumer: string }
interface ArchData   { services: ServiceDto[]; apis: ApiDto[]; events: EventDto[] }

// ── Colour palette ───────────────────────────────────────────────────────────
const PALETTE = [
  { bg: '#3b82f618', border: '#3b82f6' },
  { bg: '#8b5cf618', border: '#8b5cf6' },
  { bg: '#10b98118', border: '#10b981' },
  { bg: '#f5973518', border: '#f59735' },
  { bg: '#ec489918', border: '#ec4899' },
  { bg: '#22d3ee18', border: '#22d3ee' },
  { bg: '#a855f718', border: '#a855f7' },
  { bg: '#f4364618', border: '#f43646' },
]

// ── Custom Node ───────────────────────────────────────────────────────────────
function ServiceNode({ data }: { data: any }) {
  const c = PALETTE[data.colorIdx % PALETTE.length]
  const isSelected = data.selected
  return (
    <>
      <Handle
        type="target"
        position={Position.Top}
        style={{ background: c.border, width: 10, height: 10, border: '2px solid #0f172a' }}
      />
      <div
        style={{
          width: 180,
          padding: '10px 14px',
          borderRadius: 14,
          background: c.bg,
          border: `2px solid ${isSelected ? '#fff' : c.border}`,
          boxSizing: 'border-box',
          boxShadow: isSelected ? `0 0 0 3px ${c.border}40` : `0 2px 8px rgba(0,0,0,0.3)`,
          transition: 'box-shadow 0.15s',
        }}
      >
        {/* Header with icon */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
          <div style={{
            width: 22, height: 22, borderRadius: 6, background: c.border + '30',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <svg viewBox="0 0 24 24" fill="none" stroke={c.border} strokeWidth="2" width="13" height="13">
              <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
              <line x1="8" y1="21" x2="16" y2="21" />
              <line x1="12" y1="17" x2="12" y2="21" />
            </svg>
          </div>
          <span style={{
            fontWeight: 700, fontSize: 12, color: c.border,
            lineHeight: 1.25, wordBreak: 'break-word', flex: 1,
          }}>
            {data.name}
          </span>
        </div>

        {/* Database badge */}
        {data.database && !['null', 'None', 'none', 'N/A'].includes(data.database) && (
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.3)',
            borderRadius: 6, padding: '2px 7px', marginTop: 2,
          }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" width="9" height="9">
              <ellipse cx="12" cy="5" rx="9" ry="3" />
              <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
              <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
            </svg>
            <span style={{ fontSize: 9, color: '#10b981', fontWeight: 600, lineHeight: 1.3, maxWidth: 120, wordBreak: 'break-word' }}>
              {data.database}
            </span>
          </div>
        )}
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        style={{ background: c.border, width: 10, height: 10, border: '2px solid #0f172a' }}
      />
    </>
  )
}

const nodeTypes: NodeTypes = { serviceNode: ServiceNode }

// ── Fuzzy-match service names (case-insensitive, trimmed) ───────────────────
function normalise(s: string) { return s.trim().toLowerCase() }

function buildNodesAndEdges(data: ArchData) {
  const nameMap = new Map<string, string>() // normalised → original
  data.services.forEach(s => nameMap.set(normalise(s.name), s.name))

  const resolve = (raw: string) => nameMap.get(normalise(raw)) ?? null

  // ── Smart grid layout ────────────────────────────────────────────────────
  const cols   = Math.min(4, Math.ceil(Math.sqrt(data.services.length)))
  const xGap   = 240
  const yGap   = 190
  const xStart = 80
  const yStart = 60

  const nodes: Node[] = data.services.map((srv, i) => ({
    id:   srv.name,
    type: 'serviceNode',
    data: { name: srv.name, database: srv.database, description: srv.description, colorIdx: i, raw: srv, selected: false },
    position: { x: (i % cols) * xGap + xStart, y: Math.floor(i / cols) * yGap + yStart },
  }))

  const edges: Edge[] = (data.events || [])
    .map((evt, i) => {
      const src = resolve(evt.producer)
      const tgt = resolve(evt.consumer)
      if (!src || !tgt) return null
      const c = PALETTE[i % PALETTE.length]
      return {
        id:             `e-${src}-${tgt}-${i}`,
        source:         src,
        target:         tgt,
        label:          evt.name,
        animated:       true,
        labelStyle:     { fontSize: 9, fill: '#aaa', fontWeight: 600 },
        labelBgStyle:   { fill: '#0f172a', fillOpacity: 0.85, rx: 4, ry: 4 },
        labelBgPadding: [4, 6] as [number, number],
        style:          { stroke: c.border, strokeWidth: 1.5 },
        markerEnd:      { type: MarkerType.ArrowClosed, color: c.border, width: 14, height: 14 },
      } as Edge
    })
    .filter(Boolean) as Edge[]

  return { nodes, edges }
}

// ── Method colour helper ─────────────────────────────────────────────────────
function methodColor(method: string) {
  switch (method) {
    case 'GET':    return '#10b981'
    case 'POST':   return '#3b82f6'
    case 'PUT':    return '#f59735'
    case 'PATCH':  return '#a855f7'
    default:       return '#f43646'
  }
}

// ── PDF Export (diagram + full text data) ────────────────────────────────────
async function exportFullPdf(
  diagramEl: HTMLElement,
  archData: ArchData,
  filename = 'architecture',
) {
  // 1. Capture the diagram as PNG
  const diagramDataUrl = await toPng(diagramEl, {
    backgroundColor: '#0f172a',
    pixelRatio: 2,
    skipFonts: false,
  })
  const diagramImg = new Image()
  diagramImg.src = diagramDataUrl
  await new Promise(r => { diagramImg.onload = r })

  // A4 landscape dimensions in px (72dpi for jsPDF 'pt' mode)
  const pageW = 841.89 // A4 landscape width  (pt)
  const pageH = 595.28 // A4 landscape height (pt)
  const margin = 36
  const contentW = pageW - margin * 2

  const pdf = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' })

  // ── Page 1: Diagram ──────────────────────────────────────────────────────
  // Dark background
  pdf.setFillColor(15, 23, 42)
  pdf.rect(0, 0, pageW, pageH, 'F')

  // Title
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(18)
  pdf.setTextColor(248, 250, 252)
  pdf.text('AI Architecture Diagram', margin, margin + 14)

  // Stats line
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(9)
  pdf.setTextColor(148, 163, 184)
  pdf.text(
    `Services: ${archData.services.length}   •   API Endpoints: ${archData.apis.length}   •   Event Flows: ${archData.events.length}`,
    margin, margin + 28,
  )

  // Diagram image
  const diagramY = margin + 40
  const maxDiagramH = pageH - diagramY - margin
  const aspect = diagramImg.naturalWidth / diagramImg.naturalHeight
  let dW = contentW
  let dH = dW / aspect
  if (dH > maxDiagramH) { dH = maxDiagramH; dW = dH * aspect }
  const dX = margin + (contentW - dW) / 2
  pdf.addImage(diagramDataUrl, 'PNG', dX, diagramY, dW, dH)

  // ── Page 2: Service Details ──────────────────────────────────────────────
  pdf.addPage()
  pdf.setFillColor(15, 23, 42)
  pdf.rect(0, 0, pageW, pageH, 'F')

  let curY = margin + 16

  // Section title
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(14)
  pdf.setTextColor(248, 250, 252)
  pdf.text('Service Details', margin, curY)
  curY += 20

  const colW = (contentW - 12) / 2
  let col = 0
  let colY = curY

  for (const svc of archData.services) {
    const xOff = margin + col * (colW + 12)

    // Card background
    pdf.setFillColor(30, 41, 59)
    pdf.setDrawColor(51, 65, 85)
    pdf.roundedRect(xOff, colY, colW, 56, 4, 4, 'FD')

    // Service name
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(9)
    pdf.setTextColor(248, 250, 252)
    pdf.text(svc.name, xOff + 8, colY + 13)

    // Description — wrapped
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(7.5)
    pdf.setTextColor(148, 163, 184)
    const lines = pdf.splitTextToSize(svc.description, colW - 16)
    pdf.text(lines.slice(0, 2), xOff + 8, colY + 24)

    // Database badge
    if (svc.database && !['null', 'None', 'none', 'N/A'].includes(svc.database)) {
      pdf.setFillColor(16, 185, 129, 0.15)
      pdf.setDrawColor(16, 185, 129)
      pdf.roundedRect(xOff + 8, colY + 42, colW - 16, 10, 2, 2, 'FD')
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(6.5)
      pdf.setTextColor(16, 185, 129)
      pdf.text(`DB: ${svc.database}`, xOff + 12, colY + 49)
    }

    colY += 64

    // Switch columns if near bottom
    if (colY + 64 > pageH - margin) {
      col++
      colY = curY
      if (col > 1) {
        pdf.addPage()
        pdf.setFillColor(15, 23, 42)
        pdf.rect(0, 0, pageW, pageH, 'F')
        curY = margin + 16
        colY = curY
        col = 0
      }
    }
  }

  // ── Page 3: API Endpoints ────────────────────────────────────────────────
  pdf.addPage()
  pdf.setFillColor(15, 23, 42)
  pdf.rect(0, 0, pageW, pageH, 'F')

  curY = margin + 16

  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(14)
  pdf.setTextColor(248, 250, 252)
  pdf.text('API Endpoints', margin, curY)
  curY += 20

  // Table header
  const colWidths = [60, 180, contentW - 60 - 180 - 8]
  const headers = ['Method', 'Endpoint', 'Description']
  let tableX = margin
  pdf.setFillColor(30, 41, 59)
  pdf.rect(tableX, curY, contentW, 14, 'F')

  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(7)
  pdf.setTextColor(148, 163, 184)
  let hx = tableX + 6
  headers.forEach((h, i) => {
    pdf.text(h, hx, curY + 9)
    hx += colWidths[i] + 4
  })
  curY += 18

  for (const api of archData.apis) {
    if (curY + 18 > pageH - margin) {
      pdf.addPage()
      pdf.setFillColor(15, 23, 42)
      pdf.rect(0, 0, pageW, pageH, 'F')
      curY = margin + 10
    }

    const rowH = 16
    pdf.setFillColor(22, 32, 48)
    pdf.setDrawColor(51, 65, 85)
    pdf.rect(margin, curY, contentW, rowH, 'FD')

    // Method badge
    const mc = methodColor(api.method)
    const rgb = parseInt(mc.slice(1), 16)
    pdf.setFillColor((rgb >> 16) & 0xff, (rgb >> 8) & 0xff, rgb & 0xff, 0.2)
    pdf.roundedRect(margin + 4, curY + 3, 48, 10, 2, 2, 'F')
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(6.5)
    pdf.setTextColor((rgb >> 16) & 0xff, (rgb >> 8) & 0xff, rgb & 0xff)
    pdf.text(api.method, margin + 4 + 24 - pdf.getTextWidth(api.method) / 2, curY + 10)

    // Endpoint
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(7)
    pdf.setTextColor(200, 210, 230)
    pdf.text(api.endpoint, margin + colWidths[0] + 8, curY + 10, { maxWidth: colWidths[1] })

    // Description
    pdf.setTextColor(148, 163, 184)
    const descX = margin + colWidths[0] + colWidths[1] + 12
    pdf.text(api.description, descX, curY + 10, { maxWidth: colWidths[2] - 4 })

    curY += rowH + 2
  }

  // ── Page 4: Flow Explanation ─────────────────────────────────────────────
  pdf.addPage()
  pdf.setFillColor(15, 23, 42)
  pdf.rect(0, 0, pageW, pageH, 'F')

  curY = margin + 16

  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(14)
  pdf.setTextColor(248, 250, 252)
  pdf.text('Flow Explanation', margin, curY)
  curY += 20

  archData.events.forEach((evt, idx) => {
    if (curY + 28 > pageH - margin) {
      pdf.addPage()
      pdf.setFillColor(15, 23, 42)
      pdf.rect(0, 0, pageW, pageH, 'F')
      curY = margin + 16
    }

    // Step number circle bg
    pdf.setFillColor(139, 92, 246, 0.15)
    pdf.setDrawColor(139, 92, 246)
    pdf.circle(margin + 8, curY + 8, 8, 'FD')
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(7)
    pdf.setTextColor(139, 92, 246)
    const label = String(idx + 1)
    pdf.text(label, margin + 8 - pdf.getTextWidth(label) / 2, curY + 11)

    // Row background
    pdf.setFillColor(30, 41, 59)
    pdf.setDrawColor(51, 65, 85)
    pdf.roundedRect(margin + 20, curY, contentW - 20, 22, 3, 3, 'FD')

    // Producer → consumer
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(8)
    pdf.setTextColor(248, 250, 252)
    pdf.text(evt.producer, margin + 28, curY + 9)
    pdf.setTextColor(99, 102, 241)
    pdf.text('→', margin + 28 + pdf.getTextWidth(evt.producer) + 4, curY + 9)
    pdf.setTextColor(248, 250, 252)
    const arrowW = pdf.getTextWidth('→')
    pdf.text(evt.consumer, margin + 28 + pdf.getTextWidth(evt.producer) + 4 + arrowW + 4, curY + 9)

    // Event name
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(7)
    pdf.setTextColor(148, 163, 184)
    pdf.text(evt.name, margin + 28, curY + 18)

    curY += 28
  })

  pdf.save(`${filename}.pdf`)
}

// ── Export (diagram only) ────────────────────────────────────────────────────
type ExportFormat = 'png' | 'jpeg' | 'webp'

const EXPORT_OPTS = {
  backgroundColor: '#0f172a',
  pixelRatio: 2,
  skipFonts: false,
}

async function exportDiagramImage(el: HTMLElement, format: ExportFormat, filename = 'architecture') {
  let dataUrl: string
  if (format === 'jpeg') {
    dataUrl = await toJpeg(el, { ...EXPORT_OPTS, quality: 0.92 })
  } else {
    dataUrl = await toPng(el, EXPORT_OPTS)
  }
  const a = document.createElement('a')
  a.href = dataUrl
  a.download = `${filename}.${format}`
  a.click()
}

// ── Component ─────────────────────────────────────────────────────────────────
export function ArchitectureGeneratorPage() {
  const location    = useLocation()
  const initialIdea = (location.state as any)?.prompt || ''

  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const [idea,         setIdea]        = useState(initialIdea)
  const [loading,      setLoading]     = useState(false)
  const [archData,     setArchData]    = useState<ArchData | null>(null)
  const [selectedSvc,  setSelectedSvc] = useState<ServiceDto | null>(null)
  const [hasAutoGen,   setHasAutoGen]  = useState(false)
  const [exportOpen,   setExportOpen]  = useState(false)
  const [exporting,    setExporting]   = useState(false)

  const canvasRef = useRef<HTMLDivElement>(null)

  // ── Generate ──────────────────────────────────────────────────────────────
  const handleGenerate = useCallback(async (override?: string) => {
    const q = typeof override === 'string' ? override : idea
    if (!q.trim()) return
    setLoading(true); setSelectedSvc(null)
    try {
      const { data } = await apiClient.post<ArchData>('/ai/generate-architecture', { idea: q })
      setArchData(data)
      const { nodes: n, edges: e } = buildNodesAndEdges(data)
      setNodes(n); setEdges(e)
    } catch (e) {
      console.error('Architecture generation failed', e)
    } finally {
      setLoading(false)
    }
  }, [idea, setNodes, setEdges])

  useEffect(() => {
    if (initialIdea && !hasAutoGen) { setHasAutoGen(true); handleGenerate(initialIdea) }
  }, [initialIdea, hasAutoGen, handleGenerate])

  const onConnect = useCallback(
    (p: Connection | Edge) => setEdges(e => addEdge(p, e)),
    [setEdges],
  )

  const onNodeClick = useCallback((_: any, node: Node) => {
    setSelectedSvc((node.data as any).raw ?? null)
  }, [])

  const handleClear = () => { setArchData(null); setNodes([]); setEdges([]); setIdea(''); setSelectedSvc(null) }

  const handleExport = async (fmt: ExportFormat) => {
    if (!canvasRef.current) return
    setExporting(true); setExportOpen(false)
    try { await exportDiagramImage(canvasRef.current, fmt) } finally { setExporting(false) }
  }

  const handleExportPdf = async () => {
    if (!canvasRef.current || !archData) return
    setExporting(true); setExportOpen(false)
    try { await exportFullPdf(canvasRef.current, archData) } finally { setExporting(false) }
  }

  const exportJSON = () => {
    if (!archData) return
    const blob = new Blob([JSON.stringify(archData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'architecture.json'; a.click()
    URL.revokeObjectURL(url); setExportOpen(false)
  }

  const flowLines = archData?.events?.map((e, i) => ({ ...e, n: i + 1 })) ?? []

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-4 pb-8">

      {/* ── Title bar ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 shrink-0">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold tracking-tight">AI Architecture Generator</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Describe your system → AI generates an interactive architecture diagram you can export.
          </p>
        </div>
        {archData && (
          <div className="flex items-center gap-2 flex-wrap shrink-0">
            {[
              { icon: <Server className="w-3 h-3" />,      label: 'Services',    v: archData.services.length },
              { icon: <Code2 className="w-3 h-3" />,       label: 'Endpoints',   v: archData.apis.length },
              { icon: <GitBranch className="w-3 h-3" />,   label: 'Flows',       v: archData.events.length },
            ].map(s => (
              <div key={s.label} className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border border-border bg-muted/30">
                {s.icon}
                <span className="text-muted-foreground">{s.label}</span>
                <span className="font-bold text-foreground">{s.v}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Prompt bar ─────────────────────────────────────────────────────── */}
      <div className="flex gap-2 shrink-0">
        <textarea
          value={idea}
          onChange={e => setIdea(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleGenerate() } }}
          placeholder="Describe your system, e.g. 'E-commerce platform with Auth, Product Catalog, Cart, Orders, Payment, Notifications services'  (Enter to generate)"
          rows={2}
          className="flex-1 bg-background border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary text-foreground resize-none"
        />
        <div className="flex flex-col gap-2 shrink-0">
          {/* Generate */}
          <button
            onClick={() => handleGenerate()}
            disabled={loading || !idea.trim()}
            className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold shadow-lg shadow-primary/25 hover:opacity-90 disabled:opacity-50 transition-all whitespace-nowrap"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {loading ? 'Generating…' : 'Generate'}
          </button>

          {/* Export + Clear */}
          {archData && (
            <div className="flex gap-2">
              <div className="relative flex-1">
                <button
                  onClick={() => setExportOpen(v => !v)}
                  disabled={exporting}
                  className="w-full flex items-center justify-center gap-1.5 px-3 py-2 border border-border rounded-xl text-sm font-medium hover:bg-muted/50 transition-colors whitespace-nowrap"
                >
                  {exporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                  Export
                  <ChevronDown className="w-3 h-3 ml-0.5" />
                </button>

                {exportOpen && (
                  <div className="absolute right-0 top-full mt-1 z-50 bg-popover border border-border rounded-2xl shadow-2xl min-w-[200px] overflow-hidden">
                    <div className="px-3 py-2 border-b border-border">
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Export Diagram As</p>
                    </div>
                    {(['png', 'jpeg', 'webp'] as ExportFormat[]).map(fmt => (
                      <button
                        key={fmt}
                        onClick={() => handleExport(fmt)}
                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted/60 transition-colors text-left"
                      >
                        <ImageIcon className="w-4 h-4 text-blue-500 shrink-0" />
                        <span className="font-bold text-sm uppercase">{fmt}</span>
                        <span className="text-xs text-muted-foreground ml-auto">Image</span>
                      </button>
                    ))}
                    {/* PDF — includes all details */}
                    <button
                      onClick={handleExportPdf}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted/60 transition-colors text-left"
                    >
                      <FileText className="w-4 h-4 text-red-500 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <span className="font-bold text-sm uppercase">PDF</span>
                        <span className="block text-[9px] text-muted-foreground leading-tight">Full report with all details</span>
                      </div>
                    </button>
                    <div className="border-t border-border">
                      <button
                        onClick={exportJSON}
                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted/60 transition-colors text-left"
                      >
                        <FileJson className="w-4 h-4 text-green-500 shrink-0" />
                        <span className="font-bold text-sm uppercase">JSON</span>
                        <span className="text-xs text-muted-foreground ml-auto">Data</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <button
                onClick={handleClear}
                title="Clear and start over"
                className="flex items-center justify-center px-3 py-2 border border-border rounded-xl hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Body ──────────────────────────────────────────────────────────── */}
      {loading ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-border bg-muted/10" style={{ minHeight: 420 }}>
          <div className="relative">
            <Loader2 className="w-12 h-12 animate-spin text-primary" />
            <Sparkles className="w-5 h-5 text-primary absolute -top-1 -right-1 animate-pulse" />
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold text-foreground">AI is designing your architecture…</p>
            <p className="text-xs text-muted-foreground mt-0.5">This usually takes 10–20 seconds</p>
          </div>
        </div>

      ) : !archData ? (
        <div className="flex flex-col items-center justify-center gap-5 rounded-2xl border-2 border-dashed border-border bg-muted/5" style={{ minHeight: 420 }}>
          <div className="p-5 rounded-2xl bg-primary/10 border border-primary/20">
            <Sparkles className="w-10 h-10 text-primary" />
          </div>
          <div className="text-center space-y-1.5 max-w-sm">
            <p className="font-bold text-lg text-foreground">No architecture yet</p>
            <p className="text-sm text-muted-foreground">Describe your system above and press <kbd className="px-1.5 py-0.5 text-xs bg-muted rounded border border-border font-mono">Enter</kbd> or click <strong>Generate</strong>.</p>
            <p className="text-xs text-muted-foreground/60 mt-2">Coming from the Planner? The plan is auto-filled and generated for you.</p>
          </div>
        </div>

      ) : (
        /*
         * ── 3-zone layout ───────────────────────────────────────────────────
         * The outer wrapper scrolls vertically so all three zones are reachable.
         *
         * Zone 1 (top):    [Diagram — flex-1]  |  [Service Details — w-64]
         * Zone 2 (bottom): [API Endpoints]  |  [Flow Explanation]  (full width)
         */
        <div className="flex flex-col gap-4">

          {/* ── Zone 1: Diagram + Service Details side-by-side ── */}
          <div className="flex gap-4" style={{ minHeight: 420 }}>

            {/* Diagram — takes all space except the side panel */}
            <div
              ref={canvasRef}
              className="flex-1 min-w-0 rounded-2xl border border-slate-700 overflow-hidden"
              style={{ height: 420, background: '#0f172a' }}
            >
              <ReactFlow
                nodes={nodes}
                edges={edges}
                nodeTypes={nodeTypes}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onNodeClick={onNodeClick}
                onPaneClick={() => setSelectedSvc(null)}
                fitView
                fitViewOptions={{ padding: 0.25 }}
                proOptions={{ hideAttribution: true }}
              >
                <Background variant={BackgroundVariant.Dots} color="#334155" gap={22} size={1.2} />
                <Controls style={{ background: 'rgba(15,23,42,0.9)', borderColor: '#334155', borderRadius: 10 }} />
              </ReactFlow>
            </div>

            {/* Service Details panel — fixed width, independent scroll */}
            <div className="w-64 shrink-0 rounded-2xl border border-border bg-card p-4 overflow-y-auto custom-scrollbar" style={{ height: 420 }}>
              <div className="flex items-center gap-2 mb-3">
                <div className="p-1.5 rounded-lg bg-primary/10 border border-primary/20">
                  <Info className="w-3.5 h-3.5 text-primary" />
                </div>
                <h3 className="text-sm font-bold">{selectedSvc ? selectedSvc.name : 'Service Details'}</h3>
                {selectedSvc && (
                  <button onClick={() => setSelectedSvc(null)} className="ml-auto text-muted-foreground hover:text-foreground p-0.5 rounded hover:bg-muted/50 transition-colors">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {selectedSvc ? (
                <div className="space-y-3">
                  <div>
                    <p className="text-[9px] uppercase font-bold text-muted-foreground tracking-wider mb-1">Role</p>
                    <p className="text-xs text-foreground/80 leading-relaxed">{selectedSvc.description}</p>
                  </div>
                  {selectedSvc.database && !['null', 'None', 'none', 'N/A'].includes(selectedSvc.database) && (
                    <div className="flex items-center gap-2 px-2.5 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                      <Database className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">{selectedSvc.database}</span>
                    </div>
                  )}
                  {(() => {
                    const related = archData.events.filter(
                      e => e.producer === selectedSvc.name || e.consumer === selectedSvc.name
                    )
                    if (!related.length) return null
                    return (
                      <div>
                        <p className="text-[9px] uppercase font-bold text-muted-foreground tracking-wider mb-1.5">Connected Events</p>
                        <div className="space-y-1.5">
                          {related.map((e, i) => (
                            <div key={i} className="flex items-start gap-2 text-[10px]">
                              <ArrowRight className="w-3 h-3 shrink-0 mt-0.5 text-primary" />
                              <span>
                                <strong>{e.name}</strong>
                                {' '}
                                <span className="text-muted-foreground">
                                  {e.producer === selectedSvc.name ? `→ ${e.consumer}` : `← ${e.producer}`}
                                </span>
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })()}
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-[10px] text-muted-foreground mb-3">Click a node on the diagram to see its details, or browse all services below.</p>
                  {archData.services.map((svc, i) => {
                    const c = PALETTE[i % PALETTE.length]
                    return (
                      <button
                        key={svc.name}
                        onClick={() => setSelectedSvc(svc)}
                        className="w-full text-left p-2.5 rounded-xl border transition-colors hover:bg-muted/30"
                        style={{ borderColor: c.border + '40', background: c.bg }}
                      >
                        <div className="flex items-center gap-2 mb-0.5">
                          <div style={{ width: 8, height: 8, borderRadius: '50%', background: c.border, flexShrink: 0 }} />
                          <span className="text-xs font-bold" style={{ color: c.border }}>{svc.name}</span>
                        </div>
                        <p className="text-[10px] text-muted-foreground leading-snug line-clamp-2 pl-3.5">{svc.description}</p>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* ── Zone 2: API Endpoints + Flow Explanation (separate, full width) ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 shrink-0">

            {/* API Endpoints */}
            <div className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
                  <Zap className="w-3.5 h-3.5 text-amber-500" />
                </div>
                <h3 className="text-sm font-bold">API Endpoints</h3>
                <span className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400">
                  {archData.apis.length}
                </span>
              </div>
              {archData.apis.length > 0 ? (
                <div className="space-y-2 max-h-[280px] overflow-y-auto custom-scrollbar pr-1">
                  {archData.apis.map((api, i) => (
                    <div key={i} className="p-2.5 rounded-xl border border-border bg-muted/20">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded font-mono shrink-0 ${
                          api.method === 'GET'    ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' :
                          api.method === 'POST'   ? 'bg-blue-500/20 text-blue-600 dark:text-blue-400' :
                          api.method === 'PUT'    ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400' :
                          api.method === 'PATCH'  ? 'bg-violet-500/20 text-violet-600 dark:text-violet-400' :
                          'bg-red-500/20 text-red-600 dark:text-red-400'
                        }`}>{api.method}</span>
                        <span className="text-[10px] font-mono text-foreground/80 break-all">{api.endpoint}</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground leading-snug">{api.description}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-muted-foreground">
                  <Code2 className="w-7 h-7 mx-auto mb-2 opacity-30" />
                  <p className="text-xs">No API endpoints generated.</p>
                </div>
              )}
            </div>

            {/* Flow Explanation */}
            <div className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-1.5 rounded-lg bg-violet-500/10 border border-violet-500/20">
                  <BookOpen className="w-3.5 h-3.5 text-violet-500" />
                </div>
                <h3 className="text-sm font-bold">Flow Explanation</h3>
                <span className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-600 dark:text-violet-400">
                  {flowLines.length} steps
                </span>
              </div>
              {flowLines.length > 0 ? (
                <div className="space-y-2.5 max-h-[280px] overflow-y-auto custom-scrollbar pr-1">
                  {flowLines.map((e, i) => (
                    <div key={i} className="flex items-start gap-2.5">
                      <span className="text-[9px] font-bold shrink-0 mt-0.5 w-4 h-4 rounded-full bg-violet-500/15 text-violet-500 flex items-center justify-center border border-violet-500/30">
                        {e.n}
                      </span>
                      <div className="text-[11px] text-muted-foreground leading-relaxed">
                        <span className="font-semibold text-foreground/80">{e.producer}</span>
                        <span className="mx-1 text-primary">→</span>
                        <span className="font-semibold text-foreground/80">{e.consumer}</span>
                        <span className="block text-[10px] text-muted-foreground/70">{e.name}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-muted-foreground">
                  <GitBranch className="w-7 h-7 mx-auto mb-2 opacity-30" />
                  <p className="text-xs">Event flows between services will be listed here after generation.</p>
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      {/* click-away for export dropdown */}
      {exportOpen && <div className="fixed inset-0 z-40" onClick={() => setExportOpen(false)} />}
    </div>
  )
}
