import { useState } from 'react'
import { motion } from 'framer-motion'
import { GlassCard } from '@/components/shared/glass-components'
import { Activity, ArrowRight, Lock, Mail, Loader2, CheckCircle2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { authService } from '@/features/auth/auth-service'
import PasswordChecklist from '@/components/shared/password-checklist'

export function ForgotPasswordPage() {
  const [step, setStep] = useState<'email' | 'reset'>('email')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [formErrors, setFormErrors] = useState({ email: '', code: '', newPassword: '' });

  const validate = (currentStep: 'email' | 'reset') => {
    const errors = { email: '', code: '', newPassword: '' };
    if (currentStep === 'email') {
      if (!email) errors.email = 'Email is required.';
    } else {
      if (!code) errors.code = 'Reset code is required.';
      if (!newPassword) errors.newPassword = 'New password is required.';
    }
    setFormErrors(errors);
    return Object.values(errors).every(x => x === '');
  }

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate('email')) {
      return;
    }
    setLoading(true)
    setError(null)
    try {
      await authService.forgotPassword({ email })
      setStep('reset')
      setSuccess('Verification code sent to your email.')
    } catch (err: any) {
      setError(err.message || 'Failed to send reset code.')
    } finally {
      setLoading(false)
    }
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate('reset')) {
      return;
    }
    setLoading(true)
    setError(null)
    try {
      await authService.resetPassword({ email, code, newPassword })
      setStep('reset')
      setSuccess('Password reset successfully. You can now login.')
    } catch (err: any) {
      if (err.message) {
        if (err.message.includes('Password must')) {
          setError('Please ensure your new password meets all criteria below.');
        } else if (err.message.includes('already used')) {
          setError('You cannot use a password you have used recently. Please choose a new one.');
        } else {
          setError(err.message || 'Failed to reset password.')
        }
      } else {
        setError('Failed to reset password.')
      }
    } finally {
      setLoading(false)
    }
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
          <h2 className="text-2xl font-bold mb-2 text-foreground">
            {step === 'email' ? 'Forgot Password' : 'Reset Password'}
          </h2>
          <p className="text-muted-foreground mb-8 text-sm">
            {step === 'email' 
              ? "Enter your email address and we'll send you a code to reset your password."
              : "Enter the code sent to your email and your new password."}
          </p>

          {error && (
            <div className="mb-4 p-3 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-sm">
              {error}
            </div>
          )}

          {success && !error && (
            <div className="mb-4 p-3 rounded-md bg-primary/10 border border-primary/20 text-primary text-sm flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" /> {success}
            </div>
          )}

          {step === 'email' ? (
            <form className="space-y-4" onSubmit={handleRequestReset}>
              <div className="space-y-2">
                <label className="text-sm font-medium leading-none text-foreground" htmlFor="email">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <input
                    className={`flex h-10 w-full rounded-md border border-input bg-background/50 px-9 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 text-foreground ${formErrors.email ? 'border-destructive' : ''}`}
                    id="email"
                    placeholder="name@example.com"
                    type="email"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setFormErrors({...formErrors, email: ''}) }}
                    required
                  />
                </div>
                {formErrors.email && <p className="text-sm text-destructive mt-1">{formErrors.email}</p>}
              </div>

              <button 
                type="submit"
                disabled={loading}
                className="w-full bg-primary text-primary-foreground py-2 rounded-md font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Send Reset Code"} <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          ) : (
            <form className="space-y-4" onSubmit={handleResetPassword}>
              <div className="space-y-2">
                <label className="text-sm font-medium leading-none text-foreground" htmlFor="code">
                  Reset Code
                </label>
                <input
                  className={`flex h-10 w-full rounded-md border border-input bg-background/50 px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 text-foreground ${formErrors.code ? 'border-destructive' : ''}`}
                  id="code"
                  placeholder="Enter 6-digit code"
                  type="text"
                  value={code}
                  onChange={(e) => { setCode(e.target.value); setFormErrors({...formErrors, code: ''}) }}
                  required
                />
                {formErrors.code && <p className="text-sm text-destructive mt-1">{formErrors.code}</p>}
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium leading-none text-foreground" htmlFor="newPassword">
                  New Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <input
                    className={`flex h-10 w-full rounded-md border border-input bg-background/50 px-9 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 text-foreground ${formErrors.newPassword ? 'border-destructive' : ''}`}
                    id="newPassword"
                    type="password"
                    value={newPassword}
                    onChange={(e) => { setNewPassword(e.target.value); setFormErrors({...formErrors, newPassword: ''}) }}
                    required
                  />
                </div>
                {formErrors.newPassword && <p className="text-sm text-destructive mt-1">{formErrors.newPassword}</p>}
                <PasswordChecklist password={newPassword} />
              </div>

              <button 
                type="submit"
                disabled={loading}
                className="w-full bg-primary text-primary-foreground py-2 rounded-md font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Reset Password"} <ArrowRight className="w-4 h-4" />
              </button>

              {success === "Password reset successfully. You can now login." && (
                 <div className="mt-4 text-center">
                    <Link to="/login" className="text-primary hover:underline font-medium">Click here to Sign In</Link>
                 </div>
              )}
            </form>
          )}

          <div className="mt-8 text-center text-sm text-muted-foreground">
            Back to <Link to="/login" className="text-primary hover:underline font-medium">Sign in</Link>
          </div>
        </GlassCard>
      </motion.div>
    </div>
  )
}
