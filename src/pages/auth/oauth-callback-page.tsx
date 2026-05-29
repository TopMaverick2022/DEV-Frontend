import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { tokenStore } from '@/lib/api-client'
import { useAuth } from '@/features/auth/auth-context'

function parseJwt(token: string) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
}

export function OAuthCallbackPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { login } = useAuth()

  useEffect(() => {
    const token = searchParams.get('token')
    if (token) {
      const payload = parseJwt(token)
      if (payload && payload.sub) {
        login({ username: payload.sub, accessToken: token })
      } else {
        tokenStore.set(token)
      }
      navigate('/dashboard')
    } else {
      navigate('/login?error=OAuth2 login failed')
    }
  }, [searchParams, navigate, login])

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
      <Loader2 className="w-12 h-12 text-primary animate-spin" />
      <p className="text-muted-foreground animate-pulse">Completing your sign-in...</p>
    </div>
  )
}

