import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { tokenStore } from '@/lib/api-client'

export function OAuthCallbackPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  useEffect(() => {
    const token = searchParams.get('token')
    if (token) {
      tokenStore.set(token)
      navigate('/dashboard')
    } else {
      navigate('/login?error=OAuth2 login failed')
    }
  }, [searchParams, navigate])

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
      <Loader2 className="w-12 h-12 text-primary animate-spin" />
      <p className="text-muted-foreground animate-pulse">Completing your sign-in...</p>
    </div>
  )
}
