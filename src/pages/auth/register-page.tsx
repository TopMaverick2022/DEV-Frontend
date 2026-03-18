import { useState } from 'react'
import { motion } from 'framer-motion'
import { GlassCard } from '@/components/shared/glass-components'
import { Activity, ArrowRight, Github, User, Lock, Mail, Loader2, CheckCircle2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { authService } from '@/features/auth/auth-service'

export function RegisterPage() {
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [verificationCode, setVerificationCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      await authService.register({ username, email, password })
      setSuccess(true)
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleLogin = () => {
    window.location.href = 'http://localhost:8080/oauth2/authorization/google'
  }

  const handleGithubLogin = () => {
    window.location.href = 'http://localhost:8080/oauth2/authorization/github'
  }

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    setVerifying(true)
    setError(null)

    try {
      await authService.verifyEmail({ email, code: verificationCode })
      navigate('/login')
    } catch (err: any) {
      setError(err.message || 'Verification failed. Please check your code.')
    } finally {
      setVerifying(false)
    }
  }

  const handleResendCode = async () => {
    setLoading(true)
    setError(null)
    try {
      await authService.resendVerification(email);
      alert('Verification code resent!')
    } catch (err: any) {
      setError(err.message || 'Failed to resend code.')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6 relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/10 blur-[100px] rounded-full -z-10" />
        <GlassCard className="w-full max-w-md">
          <div className="text-center mb-8">
            <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-6" />
            <h2 className="text-2xl font-bold mb-2 text-foreground">Verify Your Email</h2>
            <p className="text-muted-foreground text-sm">
              We've sent a 6-digit verification code to <br/>
              <span className="text-foreground font-medium">{email}</span>
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-sm text-center">
              {error}
            </div>
          )}

          <form onSubmit={handleVerify} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none text-foreground" htmlFor="code">
                Verification Code
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <input
                  className="flex h-12 w-full rounded-md border border-input bg-background/50 px-9 py-2 text-center text-xl font-bold tracking-[0.5em] ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 text-foreground"
                  id="code"
                  placeholder="000000"
                  type="text"
                  maxLength={6}
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  required
                />
              </div>
            </div>

            <button 
              type="submit"
              disabled={verifying}
              className="w-full bg-primary text-primary-foreground h-10 rounded-md font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {verifying ? <Loader2 className="w-4 h-4 animate-spin" /> : "Verify & Continue"}
            </button>
          </form>

          <div className="mt-8 text-center text-sm">
            <p className="text-muted-foreground">
              Didn't receive the code?{' '}
              <button 
                onClick={handleResendCode}
                disabled={loading}
                className="text-primary hover:underline font-medium disabled:opacity-50"
              >
                Resend code
              </button>
            </p>
          </div>
        </GlassCard>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/10 blur-[100px] rounded-full -z-10" />
      
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md"
      >
        <div className="flex items-center justify-center gap-2 mb-8">
          <Activity className="text-primary w-8 h-8" />
          <span className="text-3xl font-bold text-foreground">DeveloperEv</span>
        </div>

        <GlassCard className="w-full">
          <h2 className="text-2xl font-bold mb-2 text-foreground">Create Account</h2>
          <p className="text-muted-foreground mb-8 text-sm">Join the next generation of developer tools.</p>

          {error && (
            <div className="mb-4 p-3 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-sm">
              {error}
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none text-foreground" htmlFor="username">
                Username
              </label>
              <div className="relative">
                <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <input
                  className="flex h-10 w-full rounded-md border border-input bg-background/50 px-9 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 text-foreground"
                  id="username"
                  placeholder="Choose a username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium leading-none text-foreground" htmlFor="email">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <input
                  className="flex h-10 w-full rounded-md border border-input bg-background/50 px-9 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 text-foreground"
                  id="email"
                  placeholder="name@example.com"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none text-foreground" htmlFor="password">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <input
                  className="flex h-10 w-full rounded-md border border-input bg-background/50 px-9 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 text-foreground"
                  id="password"
                  type="password"
                  placeholder="Min 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">
                Must include uppercase, lowercase, number and special character.
              </p>
            </div>

            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-primary-foreground py-2 rounded-md font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Sign Up"} <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <button 
              onClick={handleGithubLogin}
              className="w-full glass py-2 rounded-md font-medium hover:bg-white/10 transition-colors flex items-center justify-center gap-2"
            >
              <Github className="w-4 h-4" /> Github
            </button>
            <button 
              onClick={handleGoogleLogin}
              className="w-full glass py-2 rounded-md font-medium hover:bg-white/10 transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.92 3.2-1.92 4.28-1.2 1.2-3.08 2.4-6.08 2.4-4.84 0-8.72-3.92-8.72-8.72s3.88-8.72 8.72-8.72c2.6 0 4.5 1.04 5.92 2.36l2.32-2.32C18.44 1.36 15.76 0 12.48 0 6.44 0 1.56 4.88 1.56 10.92s4.88 10.92 10.92 10.92c3.28 0 5.76-1.08 7.64-3.04 1.96-1.96 2.56-4.76 2.56-7.08 0-.52-.04-1.04-.12-1.6h-10.08z"/>
              </svg>
              Google
            </button>
          </div>

          <p className="mt-8 text-center text-sm text-muted-foreground">
            Already have an account? <a href="/login" className="text-primary hover:underline font-medium">Sign in</a>
          </p>
        </GlassCard>
      </motion.div>
    </div>
  )
}
