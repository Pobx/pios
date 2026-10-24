import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { AuthContext, type AuthState } from './AuthContext'
import { ProtectedRoute, RequireRole } from './ProtectedRoute'
import { Can } from './Can'

function makeAuth(overrides: Partial<AuthState> = {}): AuthState {
  return {
    isAuthenticated: false,
    isLoading: false,
    user: null,
    login: vi.fn().mockResolvedValue(undefined),
    logout: vi.fn().mockResolvedValue(undefined),
    getAccessToken: () => undefined,
    ...overrides,
  }
}

function renderGuarded(auth: AuthState, initialPath = '/secret') {
  return render(
    <AuthContext.Provider value={auth}>
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route path="/403" element={<div>Forbidden 403</div>} />
          <Route element={<ProtectedRoute />}>
            <Route path="/secret" element={<div>Secret content</div>} />
            <Route element={<RequireRole roles={['admin', 'super_admin']} />}>
              <Route path="/admin" element={<div>Admin area</div>} />
            </Route>
          </Route>
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  )
}

describe('ProtectedRoute & role guards', () => {
  it('shows spinner while session is loading and does not redirect', () => {
    const auth = makeAuth({ isLoading: true })
    renderGuarded(auth)
    expect(screen.getByRole('status')).toHaveTextContent(/checking session/i)
    expect(auth.login).not.toHaveBeenCalled()
  })

  it('triggers login with return path when unauthenticated', () => {
    const auth = makeAuth({ isAuthenticated: false })
    renderGuarded(auth, '/secret?tab=1')
    expect(auth.login).toHaveBeenCalledTimes(1)
    expect(auth.login).toHaveBeenCalledWith('/secret?tab=1')
    expect(screen.queryByText('Secret content')).not.toBeInTheDocument()
  })

  it('renders child route when authenticated', () => {
    const auth = makeAuth({
      isAuthenticated: true,
      user: { username: 'user1', roles: ['user'], orgId: 1 },
    })
    renderGuarded(auth, '/secret')
    expect(screen.getByText('Secret content')).toBeInTheDocument()
    expect(auth.login).not.toHaveBeenCalled()
  })

  it('redirects to /403 when authenticated user lacks required role', () => {
    const auth = makeAuth({
      isAuthenticated: true,
      user: { username: 'user1', roles: ['user'], orgId: 1 },
    })
    renderGuarded(auth, '/admin')
    expect(screen.getByText('Forbidden 403')).toBeInTheDocument()
    expect(screen.queryByText('Admin area')).not.toBeInTheDocument()
  })

  it('allows access when authenticated user has one of required roles', () => {
    const auth = makeAuth({
      isAuthenticated: true,
      user: { username: 'admin1', roles: ['admin'], orgId: 1 },
    })
    renderGuarded(auth, '/admin')
    expect(screen.getByText('Admin area')).toBeInTheDocument()
  })

  it('<Can> renders children only when user has matching role', () => {
    const userAuth = makeAuth({
      isAuthenticated: true,
      user: { username: 'user1', roles: ['user'], orgId: 1 },
    })
    const { rerender } = render(
      <AuthContext.Provider value={userAuth}>
        <Can roles={['admin']} fallback={<span>no-access</span>}>
          <span>admin-only</span>
        </Can>
      </AuthContext.Provider>,
    )
    expect(screen.getByText('no-access')).toBeInTheDocument()
    expect(screen.queryByText('admin-only')).not.toBeInTheDocument()

    const adminAuth = makeAuth({
      isAuthenticated: true,
      user: { username: 'admin1', roles: ['admin'], orgId: 1 },
    })
    rerender(
      <AuthContext.Provider value={adminAuth}>
        <Can roles={['admin']} fallback={<span>no-access</span>}>
          <span>admin-only</span>
        </Can>
      </AuthContext.Provider>,
    )
    expect(screen.getByText('admin-only')).toBeInTheDocument()
  })
})
