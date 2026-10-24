import { Link, NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '@/features/auth/AuthContext'
import { Can } from '@/features/auth/Can'

const navClass = ({ isActive }: { isActive: boolean }) =>
  isActive ? 'font-medium text-blue-700' : 'text-slate-600 hover:text-slate-900'

export function Layout() {
  const { isAuthenticated, user, login, logout } = useAuth()
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-5xl items-center gap-6 px-4 py-3">
          <Link to="/" className="text-lg font-semibold">OTP</Link>
          <nav aria-label="Main" className="flex gap-4 text-sm">
            <NavLink to="/" end className={navClass}>Home</NavLink>
            {isAuthenticated && <NavLink to="/me" className={navClass}>Me</NavLink>}
            <Can roles={['admin', 'super_admin']}>
              <NavLink to="/organizations" className={navClass}>Organizations</NavLink>
            </Can>
          </nav>
          <div className="ml-auto flex items-center gap-3 text-sm">
            {isAuthenticated && user ? (
              <>
                <span data-testid="user-info">
                  {user.username}
                  {user.roles.length > 0 && <span className="ml-2 text-xs text-slate-500">({user.roles.join(', ')})</span>}
                </span>
                <button className="rounded border px-3 py-1 hover:bg-slate-100" onClick={() => void logout()}>Log out</button>
              </>
            ) : (
              <button className="rounded bg-blue-700 px-3 py-1 text-white hover:bg-blue-800" onClick={() => void login('/')}>Sign in</button>
            )}
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  )
}
