import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Loader2 } from 'lucide-react'

export function OAuthCallbackPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  useEffect(() => {
    const token = searchParams.get('token')
    if (token) {
      localStorage.setItem('accessToken', token)
      // Since OAuth2 doesn't always provide a refresh token in this simple setup
      // we just set the access token. If refresh token is needed, backend should provide it too.
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
