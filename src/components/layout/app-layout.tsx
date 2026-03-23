import { Sidebar } from './sidebar'
import { motion, AnimatePresence } from 'framer-motion'
import { Moon, Sun, Bell } from 'lucide-react'
import { useTheme } from '@/components/theme-provider'
import { UserNav } from './user-nav'

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { theme, setTheme } = useTheme()

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <Sidebar />
      
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="h-16 border-b border-border/50 flex items-center justify-between px-8 bg-card/30 backdrop-blur-lg z-20 sticky top-0">
          <div className="flex items-center gap-4">
            <h2 className="text-sm font-medium text-muted-foreground">Projects / <span className="text-foreground">DeveloperEv</span></h2>
          </div>
          
          <div className="flex items-center gap-3">
            <button className="p-2 hover:bg-accent rounded-full text-muted-foreground transition-colors">
              <Bell className="w-5 h-5" />
            </button>
            <button 
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="p-2 hover:bg-accent rounded-full text-muted-foreground transition-colors"
            >
              {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            <div className="h-8 w-[1px] bg-border/50 mx-2" />
            <UserNav />
          </div>
        </header>

        <section className="flex-1 overflow-y-auto p-8 relative">
          <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-primary/5 to-transparent -z-10" />
          <AnimatePresence mode="wait">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </section>
      </main>
    </div>
  )
}
