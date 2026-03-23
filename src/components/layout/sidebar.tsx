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
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import { DevLogo } from '@/components/shared/dev-logo'

const groups = [
  {
    label: 'AI Assistants',
    icon: Wand2,
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
    icon: ShieldCheck,
    items: [
      { icon: ShieldCheck, label: 'Security',         path: '/security' },
      { icon: Zap,         label: 'Performance',      path: '/performance' },
      { icon: FileText,    label: 'Docs Gen',         path: '/docs' },
      { icon: Activity,    label: 'Health Dashboard', path: '/health' },
    ],
  },
]

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const location = useLocation()
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(
    Object.fromEntries(groups.map(g => [g.label, false]))
  )

  const toggleGroup = (label: string) =>
    setOpenGroups(prev => ({ ...prev, [label]: !prev[label] }))

  return (
    <motion.aside
      animate={{ width: collapsed ? 64 : 256 }}
      transition={{ duration: 0.25, ease: 'easeInOut' }}
      className="border-r bg-card/50 backdrop-blur-xl h-screen flex flex-col sticky top-0 overflow-hidden shrink-0"
    >
      {/* Logo + Toggle */}
      <div className="px-3 flex items-center border-b border-border/50 h-16 gap-2">
        {collapsed
          ? <div className="flex-1 flex justify-center">
              <DevLogo size="sm" showIcon={true} showText={false} />
            </div>
          : <div className="flex-1 min-w-0">
              <DevLogo size="md" showIcon={true} />
            </div>
        }
        <button
          onClick={onToggle}
          className="shrink-0 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed
            ? <PanelLeftOpen className="w-4 h-4" />
            : <PanelLeftClose className="w-4 h-4" />
          }
        </button>
      </div>

      {/* Nav */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden py-4 px-2">
        <nav className="space-y-1">

          {/* Dashboard */}
          <NavItem
            icon={LayoutDashboard}
            label="Dashboard"
            path="/dashboard"
            isActive={location.pathname === '/dashboard'}
            collapsed={collapsed}
          />

          {/* Groups */}
          {groups.map(group => {
            const isOpen = openGroups[group.label]
            const hasActive = group.items.some(i => i.path === location.pathname)
            const GroupIcon = group.icon

            if (collapsed) {
              // Icon-only: show group icon as a tooltip-style button, no expand
              return (
                <div key={group.label}>
                  <div className={cn(
                    'px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-center mt-3',
                    hasActive ? 'text-primary' : 'text-muted-foreground'
                  )}>
                    <div className="w-full h-[1px] bg-border/50" />
                  </div>
                  {group.items.map(item => (
                    <NavItem
                      key={item.path}
                      icon={item.icon}
                      label={item.label}
                      path={item.path}
                      isActive={location.pathname === item.path}
                      collapsed={collapsed}
                    />
                  ))}
                </div>
              )
            }

            return (
              <div key={group.label} className="mt-3">
                <button
                  onClick={() => toggleGroup(group.label)}
                  className={cn(
                    'w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors',
                    hasActive
                      ? 'text-primary'
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                  )}
                >
                  <div className="flex items-center gap-2">
                    <GroupIcon className="w-3.5 h-3.5" />
                    {group.label}
                  </div>
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
                            collapsed={false}
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

      {/* Bottom: Settings */}
      <div className="p-3 border-t border-border/50">
        <NavItem
          icon={Settings}
          label="Settings"
          path="/settings"
          isActive={location.pathname === '/settings'}
          collapsed={collapsed}
        />
      </div>
    </motion.aside>
  )
}

function NavItem({
  icon: Icon,
  label,
  path,
  isActive,
  collapsed,
}: {
  icon: React.ElementType
  label: string
  path: string
  isActive: boolean
  collapsed: boolean
}) {
  return (
    <motion.div whileHover={{ x: collapsed ? 0 : 4 }} title={collapsed ? label : undefined}>
      <Link
        to={path}
        className={cn(
          'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 group',
          collapsed && 'justify-center px-2',
          isActive
            ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20'
            : 'hover:bg-accent hover:text-accent-foreground text-muted-foreground'
        )}
      >
        <Icon className={cn('w-4 h-4 shrink-0', isActive ? 'text-primary-foreground' : 'group-hover:text-primary')} />
        {!collapsed && <span className="truncate">{label}</span>}
      </Link>
    </motion.div>
  )
}
