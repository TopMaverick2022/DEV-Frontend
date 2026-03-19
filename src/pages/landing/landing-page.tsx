import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { GradientText } from '@/components/shared/glass-components'
import { ArrowRight, Moon, Sun } from 'lucide-react'
import { DevLogo } from '@/components/shared/dev-logo'
import { useTheme } from '@/components/theme-provider'

export function LandingPage() {
  const navigate = useNavigate()
  const { theme, setTheme } = useTheme()

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Background Decorative Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 blur-[120px] rounded-full -z-10 animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full -z-10" />

      {/* Navbar */}
      <nav className="fixed top-0 w-full z-50 border-b border-white/10 glass">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <DevLogo size="md" />
          <div className="hidden md:flex items-center gap-8">
            <button 
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="p-2 hover:bg-accent rounded-full text-muted-foreground transition-colors"
            >
              {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            <button
              onClick={() => navigate('/login')}
              className="text-sm font-medium hover:text-primary transition-colors">
              Sign In
            </button>
            <button
              onClick={() => navigate('/register')}
              className="bg-primary text-primary-foreground px-5 py-2 rounded-full text-sm font-medium hover:opacity-90 transition-opacity flex items-center gap-2">
              Sign Up <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6">
        <div className="container mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <span className="px-4 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold uppercase tracking-wider">
              The Future of Development
            </span>
            <h1 className="text-5xl md:text-7xl font-bold mt-6 mb-8 tracking-tight">
              Evolve Your Code with <br />
              <GradientText>AI Intelligence</GradientText>
            </h1>
            <p className="text-muted-foreground text-lg md:text-xl max-w-2xl mx-auto mb-10">
              The ultimate SaaS platform for modern developers. Analyze, review, and generate production-ready code with the power of advanced AI.
            </p>
            <div className="flex flex-col md:flex-row items-center justify-center gap-4">
              <button
                onClick={() => navigate('/register')}
                className="w-full md:w-auto bg-primary text-primary-foreground px-8 py-3 rounded-full text-lg font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-2">
                Get Started <ArrowRight className="w-5 h-5" />
              </button>
              {/* <button
                onClick={() => navigate('/login')}
                className="w-full md:w-auto border border-border px-8 py-3 rounded-full text-lg font-medium hover:bg-accent transition-colors">
                Sign In
              </button> */}
            </div>
          </motion.div>

        </div>
      </section>
    </div>
  )
}
