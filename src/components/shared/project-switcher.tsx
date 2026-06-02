import { useState, useRef, useEffect } from 'react'
import { FolderOpen, ChevronDown, CheckCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { AnimatePresence, motion } from 'framer-motion'
import { Project } from '@/types/project'

interface ProjectSwitcherProps {
  projects: Project[]
  selected: Project | null
  onSelect: (p: Project) => void
}

export function ProjectSwitcher({
  projects,
  selected,
  onSelect
}: ProjectSwitcherProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between gap-2 glass border border-border/50 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-white/10 transition-all duration-200 w-[220px] shrink-0 text-foreground"
      >
        <FolderOpen className="w-4 h-4 text-primary shrink-0" />
        <span className="truncate flex-1 text-left max-w-[140px]">
          {selected?.name ?? 'Select project'}
        </span>
        <ChevronDown className={cn('w-4 h-4 shrink-0 text-muted-foreground transition-transform duration-200', open && 'rotate-180')} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 top-full mt-2 w-64 z-50 bg-card border border-border rounded-xl shadow-2xl shadow-black/30 overflow-hidden"
          >
            <div className="p-1.5 max-h-64 overflow-y-auto">
              {projects.map((p) => (
                <button
                  key={p.id}
                  onClick={() => { onSelect(p); setOpen(false) }}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-left transition-colors',
                    selected?.id === p.id
                      ? 'bg-primary/10 text-primary font-semibold'
                      : 'hover:bg-accent text-foreground'
                  )}
                >
                  <FolderOpen className="w-4 h-4 shrink-0 opacity-60" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{p.name}</p>
                    {p.description && (
                      <p className="truncate text-xs text-muted-foreground">{p.description}</p>
                    )}
                  </div>
                  {selected?.id === p.id && (
                    <CheckCircle className="w-3.5 h-3.5 shrink-0 ml-auto text-primary" />
                  )}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
