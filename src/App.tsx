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
import { ProjectsPage } from '@/pages/projects/projects-page'
import { PlannerPage } from '@/pages/tools/planner-page'
import { DebuggerPage } from '@/pages/tools/debugger-page'
import { ExplainerPage } from '@/pages/tools/explainer-page'
import { SecurityPage } from '@/pages/tools/security-page'
import { PerformancePage } from '@/pages/tools/performance-page'
import { DocsPage } from '@/pages/tools/docs-page'
import { AppLayout } from '@/components/layout/app-layout'
import { SmoothScrollProvider } from './components/shared/smooth-scroll-provider'
import { AuthProvider } from '@/features/auth/auth-context'

const queryClient = new QueryClient()

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="dark" storageKey="developer-ev-theme">
        <AuthProvider>
          <BrowserRouter
              future={{
                v7_startTransition: true,
                v7_relativeSplatPath: true,
              }}
            >
            <Routes>
              {/* Public routes */}
              <Route path="/" element={<SmoothScrollProvider><LandingPage /></SmoothScrollProvider>} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/oauth/callback" element={<OAuthCallbackPage />} />

              {/* App routes - all inside AppLayout */}
              <Route path="/dashboard" element={<AppLayout><DashboardPage /></AppLayout>} />
              <Route path="/projects" element={<AppLayout><ProjectsPage /></AppLayout>} />
              <Route path="/planner" element={<AppLayout><PlannerPage /></AppLayout>} />
              <Route path="/architecture" element={<AppLayout><ArchitectureGeneratorPage /></AppLayout>} />
              <Route path="/reviewer" element={<AppLayout><CodeReviewerPage /></AppLayout>} />
              <Route path="/explainer" element={<AppLayout><ExplainerPage /></AppLayout>} />
              <Route path="/debugger" element={<AppLayout><DebuggerPage /></AppLayout>} />
              <Route path="/security" element={<AppLayout><SecurityPage /></AppLayout>} />
              <Route path="/performance" element={<AppLayout><PerformancePage /></AppLayout>} />
              <Route path="/docs" element={<AppLayout><DocsPage /></AppLayout>} />
              <Route path="/health" element={<AppLayout><DashboardPage /></AppLayout>} />

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  )
}

export default App
