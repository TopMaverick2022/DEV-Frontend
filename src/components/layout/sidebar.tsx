import { useNavigate, Link, useLocation } from 'react-router-dom'
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
  ChevronRight
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'
import { DevLogo } from '@/components/shared/dev-logo'

const menuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
  { type: 'header', label: 'AI Assistants' },
  { icon: Wand2, label: 'Project Planner', path: '/planner' },
  { icon: Layers, label: 'Architecture Gen', path: '/architecture' },
  { icon: Code2, label: 'Code Reviewer', path: '/reviewer' },
  { icon: Search, label: 'Code Explainer', path: '/explainer' },
  { icon: Bug, label: 'Debugger', path: '/debugger' },
  { type: 'header', label: 'Analysis' },
  { icon: ShieldCheck, label: 'Security', path: '/security' },
  { icon: Zap, label: 'Performance', path: '/performance' },
  { icon: FileText, label: 'Docs Gen', path: '/docs' },
  { icon: Activity, label: 'Health Dashboard', path: '/health' },
]

export function Sidebar() {
  const location = useLocation()
  
  return (
    <aside className="w-64 border-r bg-card/50 backdrop-blur-xl h-screen flex flex-col sticky top-0 overflow-y-auto">
      <div className="p-6 pb-2">
        <DevLogo size="md" className="mb-8" />

        <nav className="space-y-1">
          {menuItems.map((item, index) => {
            if (item.type === 'header') {
              return (
                <div key={index} className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-4">
                  {item.label}
                </div>
              )
            }

            const Icon = item.icon!
            const isActive = location.pathname === item.path
            
            return (
              <motion.div
                key={index}
                whileHover={{ x: 4 }}
              >
                <Link
                  to={item.path || '#'}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 group",
                    isActive 
                      ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" 
                      : "hover:bg-accent hover:text-accent-foreground text-muted-foreground"
                  )}
                >
                  <Icon className={cn("w-4 h-4", isActive ? "text-primary-foreground" : "group-hover:text-primary")} />
                  <span>{item.label}</span>
                  <ChevronRight className={cn("w-3 h-3 ml-auto opacity-0 group-hover:opacity-100 transition-opacity", isActive && "opacity-100")} />
                </Link>
              </motion.div>
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
