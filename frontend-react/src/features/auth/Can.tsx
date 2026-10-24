import type { ReactNode } from 'react'
import { useAuth } from './AuthContext'
import { hasAnyRole } from './jwt'

/** Render children only when the current user has any of the given roles. */
export function Can({ roles, children, fallback = null }: { roles: readonly string[]; children: ReactNode; fallback?: ReactNode }) {
  const { user } = useAuth()
  return <>{user && hasAnyRole(user.roles, roles) ? children : fallback}</>
}
