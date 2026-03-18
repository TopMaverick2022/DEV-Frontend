import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { GlassCard, GradientText } from '@/components/shared/glass-components'
import { ArrowRight, Code, Shield, Zap, Sparkles, Activity } from 'lucide-react'

export function LandingPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Background Decorative Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 blur-[120px] rounded-full -z-10 animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full -z-10" />

      {/* Navbar */}
      <nav className="fixed top-0 w-full z-50 border-b border-white/10 glass">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="text-primary" />
            <span className="text-xl font-bold">DeveloperEv</span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            <a href="/login" className="text-sm font-medium hover:text-primary transition-colors">Login</a>
            <button
              onClick={() => navigate('/login')}
              className="bg-primary text-primary-foreground px-5 py-2 rounded-full text-sm font-medium hover:opacity-90 transition-opacity flex items-center gap-2">
              Get Started <ArrowRight className="w-4 h-4" />
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
                className="w-full md:w-auto bg-primary text-primary-foreground px-8 py-3 rounded-full text-lg font-medium hover:opacity-90 transition-opacity">
                Start for Free
              </button>
            </div>
          </motion.div>

        </div>
      </section>
    </div>
  )
}
