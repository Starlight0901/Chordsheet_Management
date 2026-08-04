import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { safeReturnPath } from '../utils/safeReturnPath'

function AuthLoadingScreen() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-ink-900">
      <div className="text-center">
        <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-ink-600 border-t-gold-400" />
        <p className="text-sm text-ink-400">Loading HymnBook…</p>
      </div>
    </div>
  )
}

export function ProtectedRoute() {
  const { currentUser, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return <AuthLoadingScreen />
  }

  if (!currentUser) {
    const from = `${location.pathname}${location.search}${location.hash}`
    return <Navigate to="/login" replace state={{ from: safeReturnPath(from) }} />
  }

  return <Outlet />
}

export function PublicOnlyRoute() {
  const { currentUser, loading } = useAuth()

  if (loading) {
    return <AuthLoadingScreen />
  }

  if (currentUser) {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}
