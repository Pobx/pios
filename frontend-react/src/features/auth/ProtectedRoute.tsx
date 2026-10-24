import { useEffect, useRef } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { Spinner } from '@/shared/ui/Spinner'
import { useAuth } from './AuthContext'
import { hasAnyRole } from './jwt'

/** Requires a signed-in user; otherwise starts the OIDC login (once). */
export function ProtectedRoute() {
  const { isAuthenticated, isLoading, error, login } = useAuth()
  const location = useLocation()
  const started = useRef(false)

  const needsLogin = !isLoading && !isAuthenticated && !error
  useEffect(() => {
    if (needsLogin && !started.current) {
      started.current = true
      void login(location.pathname + location.search)
    }
  }, [needsLogin, login, location.pathname, location.search])

  if (isLoading) return <Spinner label="Checking session…" />
  if (error) {
    return (
      <div role="alert" className="mx-auto max-w-md rounded border border-red-200 bg-red-50 p-4 text-red-800">
        <p className="font-medium">Sign-in failed</p>
        <p className="text-sm">{error.message}</p>
        <button className="mt-3 rounded bg-red-700 px-3 py-1 text-white" onClick={() => void login('/')}>
          Try again
        </button>
      </div>
    )
  }
  if (!isAuthenticated) return <Spinner label="Redirecting to sign-in…" />
  return <Outlet />
}

/** Nest inside ProtectedRoute: renders children only if the user has any of `roles`. */
export function RequireRole({ roles }: { roles: readonly string[] }) {
  const { user } = useAuth()
  return user && hasAnyRole(user.roles, roles) ? <Outlet /> : <Navigate to="/403" replace />
}
