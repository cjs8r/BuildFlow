import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import Auth          from './pages/Auth'
import Dashboard     from './pages/Dashboard'
import ProjectDetail from './pages/ProjectDetail'
import Settings      from './pages/Settings'
import Admin         from './pages/Admin'
import Billing       from './pages/Billing'
import Support       from './pages/Support'
import Navbar        from './components/Navbar'

function Spinner() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

function Protected({ children, adminOnly = false }) {
  const { user, profile, loading, profileReady } = useAuth()

 if (loading) return <Spinner />
if (!user) return <Navigate to="/auth" replace />
if (!profileReady) return <Spinner />

  if (profile?.suspended) return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center max-w-sm">
        <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-7 h-7 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
          </svg>
        </div>
        <h2 className="text-lg font-bold text-charcoal-900 mb-2">Account Suspended</h2>
        <p className="text-charcoal-500 text-sm">Your account has been suspended. Please contact support.</p>
      </div>
    </div>
  )

  if (adminOnly && !profile?.is_admin) return <Navigate to="/" replace />

  return children
}

function AppRoutes() {
  const { user } = useAuth()
  return (
    <Routes>
      <Route path="/auth" element={user ? <Navigate to="/" replace /> : <Auth />} />

      <Route path="/" element={<Protected><Navbar /><Dashboard /></Protected>} />
      <Route path="/projects/:id" element={<Protected><Navbar /><ProjectDetail /></Protected>} />
      <Route path="/settings" element={<Protected><Navbar /><Settings /></Protected>} />
      <Route path="/billing"  element={<Protected><Navbar /><Billing /></Protected>} />
      <Route path="/support"  element={<Protected><Navbar /><Support /></Protected>} />
      <Route path="/admin"    element={<Protected adminOnly><Navbar /><Admin /></Protected>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  )
}
