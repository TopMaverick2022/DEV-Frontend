import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from '@/components/theme-provider'
import { LandingPage } from '@/pages/landing/landing-page'
import { LoginPage } from '@/pages/auth/login-page'
import { RegisterPage } from '@/pages/auth/register-page'
import { ForgotPasswordPage } from '@/pages/auth/forgot-password-page'
import { OAuthCallbackPage } from '@/pages/auth/oauth-callback-page'
import { DashboardPage } from '@/pages/dashboard/dashboard-page'
import { ArchitectureGeneratorPage } from '@/pages/tools/architecture-page'
import { CodeReviewerPage } from '@/pages/tools/code-reviewer-page'
import { AppLayout } from '@/components/layout/app-layout'

const queryClient = new QueryClient()

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="dark" storageKey="developer-ev-theme">
        <BrowserRouter
          future={{
            v7_startTransition: true,
            v7_relativeSplatPath: true,
          }}
        >
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/oauth/callback" element={<OAuthCallbackPage />} />
            <Route path="/dashboard" element={<AppLayout><DashboardPage /></AppLayout>} />
            <Route path="/architecture" element={<AppLayout><ArchitectureGeneratorPage /></AppLayout>} />
            <Route path="/reviewer" element={<AppLayout><CodeReviewerPage /></AppLayout>} />
            
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>
  )
}

export default App
