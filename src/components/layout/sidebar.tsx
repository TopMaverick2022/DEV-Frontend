import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Layers,
  Wand2,
  Code2,
  Search,
  Bug,
  ShieldCheck,
  Zap,
  FileText,
  Activity,
  Settings,
  ChevronDown,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import { DevLogo } from '@/components/shared/dev-logo'

const groups = [
  {
    label: 'AI Assistants',
    items: [
      { icon: Wand2,  label: 'Project Planner',  path: '/planner' },
      { icon: Layers, label: 'Architecture Gen',  path: '/architecture' },
      { icon: Code2,  label: 'Code Reviewer',     path: '/reviewer' },
      { icon: Search, label: 'Code Explainer',    path: '/explainer' },
      { icon: Bug,    label: 'Debugger',           path: '/debugger' },
    ],
  },
  {
    label: 'Analysis',
    items: [
      { icon: ShieldCheck, label: 'Security',          path: '/security' },
      { icon: Zap,         label: 'Performance',       path: '/performance' },
      { icon: FileText,    label: 'Docs Gen',          path: '/docs' },
      { icon: Activity,    label: 'Health Dashboard',  path: '/health' },
    ],
  },
]

export function Sidebar() {
  const location = useLocation()
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})

  const toggle = (label: string) =>
    setCollapsed(prev => ({ ...prev, [label]: !prev[label] }))

  return (
    <aside className="w-64 border-r bg-card/50 backdrop-blur-xl h-screen flex flex-col sticky top-0 overflow-y-auto">
      <div className="p-6 pb-2">
        <DevLogo size="md" className="mb-8" />

        <nav className="space-y-1">
          {/* Dashboard — standalone, always visible */}
          <NavItem
            icon={LayoutDashboard}
            label="Dashboard"
            path="/dashboard"
            isActive={location.pathname === '/dashboard'}
          />

          {/* Collapsible groups */}
          {groups.map(group => {
            const isOpen = !collapsed[group.label]
            const hasActive = group.items.some(i => i.path === location.pathname)

            return (
              <div key={group.label} className="mt-3">
                <button
                  onClick={() => toggle(group.label)}
                  className={cn(
                    'w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors',
                    hasActive
                      ? 'text-primary'
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                  )}
                >
                  {group.label}
                  <ChevronDown
                    className={cn(
                      'w-3.5 h-3.5 transition-transform duration-200',
                      isOpen ? 'rotate-0' : '-rotate-90'
                    )}
                  />
                </button>

                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2, ease: 'easeInOut' }}
                      className="overflow-hidden"
                    >
                      <div className="mt-1 space-y-1 pl-2 border-l border-border/50 ml-3">
                        {group.items.map(item => (
                          <NavItem
                            key={item.path}
                            icon={item.icon}
                            label={item.label}
                            path={item.path}
                            isActive={location.pathname === item.path}
                          />
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )
          })}
        </nav>
      </div>

      <div className="mt-auto p-4 border-t border-border/50">
        <button className="flex items-center gap-3 px-3 py-2 w-full text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg">
          <Settings className="w-4 h-4" />
          <span>Settings</span>
        </button>
      </div>
    </aside>
  )
}

function NavItem({
  icon: Icon,
  label,
  path,
  isActive,
}: {
  icon: React.ElementType
  label: string
  path: string
  isActive: boolean
}) {
  return (
    <motion.div whileHover={{ x: 4 }}>
      <Link
        to={path}
        className={cn(
          'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 group',
          isActive
            ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20'
            : 'hover:bg-accent hover:text-accent-foreground text-muted-foreground'
        )}
      >
        <Icon className={cn('w-4 h-4 shrink-0', isActive ? 'text-primary-foreground' : 'group-hover:text-primary')} />
        <span>{label}</span>
      </Link>
    </motion.div>
  )
}
