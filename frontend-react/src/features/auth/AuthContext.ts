import { createContext, useContext } from 'react'

export interface AuthUser {
  username: string
  roles: string[]
  orgId: number | null
}

export interface AuthState {
  isAuthenticated: boolean
  isLoading: boolean
  error?: Error
  user: AuthUser | null
  login: (returnTo?: string) => Promise<void>
  logout: () => Promise<void>
  getAccessToken: () => string | undefined
}

export const AuthContext = createContext<AuthState | null>(null)

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>')
  return ctx
}
