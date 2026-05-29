import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Moon, Sun, Sparkles, Terminal, Play, Pause, Volume2, VolumeX } from 'lucide-react'
import { DevLogo } from '@/components/shared/dev-logo'
import { useTheme } from '@/components/theme-provider'
import { FeatureScrollReveal } from '@/components/shared/feature-scroll-reveal'
import { MagneticButton } from '@/components/shared/magnetic-button'
import { AnimatedBackground } from '@/components/shared/animated-background'
import { useAuth } from '@/features/auth/auth-context'
import { UserNav } from '@/components/layout/user-nav'
import { useRef, useState } from 'react'

// Import video asset
import demoVideo from '@/assets/where_are_the_texts_of_my_webs.mp4'

export function LandingPage() {
  const navigate = useNavigate()
  const { theme, setTheme } = useTheme()
  const { isAuthenticated } = useAuth()
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isPlaying, setIsPlaying] = useState(true)
  const [isMuted, setIsMuted] = useState(true)

  const togglePlay = () => {
    if (!videoRef.current) return
    if (isPlaying) {
      videoRef.current.pause()
    } else {
      videoRef.current.play()
    }
    setIsPlaying(!isPlaying)
  }

  const toggleMute = () => {
    if (!videoRef.current) return
    videoRef.current.muted = !isMuted
    setIsMuted(!isMuted)
  }

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/20 overflow-x-hidden">
      <AnimatedBackground />

      {/* Navbar with exact glass styling */}
      <nav className="fixed top-0 w-full z-50 border-b border-border/40 bg-background/50 backdrop-blur-xl supports-[backdrop-filter]:bg-background/20">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <DevLogo size="md" />
          <div className="hidden md:flex items-center gap-8">
            <button 
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="p-2 hover:bg-white/10 rounded-full text-muted-foreground hover:text-foreground transition-all duration-300"
            >
              {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            
            {isAuthenticated ? (
              <UserNav />
            ) : (
              <>
                <button
                  onClick={() => navigate('/login')}
                  className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                  Sign In
                </button>
                <button
                  onClick={() => navigate('/register')}
                  className="bg-primary/90 text-primary-foreground px-5 py-2 rounded-full text-sm font-semibold hover:bg-primary hover:shadow-[0_0_20px_rgba(124,58,237,0.5)] transition-all duration-300 flex items-center gap-2">
                  Sign Up <ArrowRight className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-28 pb-20 px-6 relative z-10">

        <div className="container mx-auto relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="flex flex-col items-center text-center pt-20 pb-16"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-sm font-medium text-primary mb-8 tracking-wide">
              <Sparkles className="w-4 h-4" />
              <span>Next-Gen Developer Execution System</span>
            </div>
            
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold mb-6 tracking-tight max-w-4xl leading-[1.1] text-foreground">
              Evolve Your Code with <br />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500">
                AI Intelligence
              </span>
            </h1>
            
            <p className="text-xl md:text-2xl text-muted-foreground mb-10 max-w-2xl leading-relaxed mx-auto">
              The ultimate all-in-one AI execution platform. From dynamic architecture planning to automated debugging, DeveloperEv accelerates your entire development lifecycle.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center gap-4 w-full justify-center mb-16">
              <MagneticButton
                onClick={() => navigate(isAuthenticated ? '/dashboard' : '/register')}
                className="w-full sm:w-auto relative group overflow-hidden bg-primary text-primary-foreground px-8 py-3 rounded-full text-base font-bold transition-all duration-300 hover:shadow-[0_0_40px_rgba(124,58,237,0.5)] flex items-center justify-center gap-2">
                <span className="relative z-10 flex items-center gap-2">
                  <Terminal className="w-4 h-4" /> Start Executing
                </span>
                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-in-out" />
              </MagneticButton>
            </div>

            {/* Video Showcase Card with Watermark Crop */}
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 0.2 }}
              className="w-full max-w-5xl mx-auto rounded-2xl overflow-hidden glass border border-border/80 shadow-2xl relative group/video"
            >
              {/* Aspect Ratio Box with inner crop */}
              <div className="relative w-full aspect-video overflow-hidden bg-black/40">
                {/* 
                  To crop the watermark (usually bottom right or top/bottom edges), 
                  we scale the video slightly (e.g., scale-105) and shift it up slightly
                  so the bottom watermark is cut off by the overflow-hidden parent.
                */}
                <video
                  ref={videoRef}
                  src={demoVideo}
                  className="w-full h-full object-cover scale-[1.08] origin-top"
                  autoPlay
                  loop
                  muted={isMuted}
                  playsInline
                />

                {/* Glass controls overlay on hover */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30 opacity-0 group-hover/video:opacity-100 transition-opacity duration-300 flex flex-col justify-between p-4">
                  <div className="flex justify-between items-center w-full">
                    <span className="text-xs font-semibold bg-primary/20 backdrop-blur-md border border-primary/30 text-primary px-3 py-1.5 rounded-full flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 animate-pulse" /> Live Product Demo
                    </span>
                  </div>

                  <div className="flex justify-between items-center w-full">
                    <button
                      onClick={togglePlay}
                      className="p-3 bg-white/10 hover:bg-white/20 border border-white/20 backdrop-blur-md rounded-full text-white transition-all transform active:scale-95"
                    >
                      {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 fill-white" />}
                    </button>

                    <button
                      onClick={toggleMute}
                      className="p-3 bg-white/10 hover:bg-white/20 border border-white/20 backdrop-blur-md rounded-full text-white transition-all transform active:scale-95"
                    >
                      {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {/* Subtle top border glow */}
                <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/40 to-transparent pointer-events-none" />
              </div>
            </motion.div>

          </motion.div>
        </div>
      </section>

      {/* Feature Scroll Reveal Section */}
      <section className="py-24 px-6 relative z-10 w-full overflow-hidden bg-background/50">
        <div className="w-full max-w-4xl mx-auto text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-4 text-foreground">
            Complete Engineering Mastery
          </h2>
          <p className="text-muted-foreground text-lg md:text-xl">
            Seven intelligent tools seamlessly integrated into one powerful platform to revolutionize your workflow from idea to deployment.
          </p>
        </div>
        
        {/* The new Zig-Zag Scroll Revealed Component */}
        <FeatureScrollReveal />
      </section>
      
      {/* Bottom fade out gradient */}
      <div className="h-40 w-full bg-gradient-to-t from-background to-transparent absolute bottom-0 pointer-events-none" />
    </div>
  )
}

