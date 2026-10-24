import { Link, NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '@/features/auth/AuthContext'
import { Can } from '@/features/auth/Can'

const navClass = ({ isActive }: { isActive: boolean }) =>
  isActive
    ? 'inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs shadow-blue-600/25 transition-all'
    : 'inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-all'

export function Layout() {
  const { isAuthenticated, user, login, logout } = useAuth()
  const initial = user?.username?.charAt(0)?.toUpperCase() ?? 'U'

  return (
    <div className="flex min-h-screen flex-col text-slate-900">
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-4 px-4 py-3 sm:px-6">
          <Link to="/" className="group flex items-center gap-2.5 pr-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-teal-500 text-sm font-extrabold text-white shadow-sm shadow-blue-600/25">
              OTP
            </span>
            <div className="hidden sm:block">
              <div className="text-sm font-bold tracking-tight text-slate-900 group-hover:text-blue-600">
                Smart Municipality
              </div>
              <div className="text-[11px] font-medium text-slate-500">ระบบบริการท้องถิ่นอัจฉริยะ</div>
            </div>
          </Link>

          <nav aria-label="Main" className="flex flex-wrap items-center gap-1 text-sm">
            <NavLink to="/" end className={navClass}>
              Home
            </NavLink>
            {isAuthenticated && (
              <NavLink to="/me" className={navClass}>
                Me
              </NavLink>
            )}
            {isAuthenticated && (
              <NavLink to="/resident" className={navClass}>
                Resident Portal
              </NavLink>
            )}
            <Can roles={['admin', 'super_admin']}>
              <NavLink to="/organizations" className={navClass}>
                Organizations
              </NavLink>
            </Can>
            <Can
              roles={[
                'admin',
                'super_admin',
                'finance_staff',
                'tabwater_staff',
                'recycle_bank_staff',
                'foodwaste_staff',
                'annual_staff',
              ]}
            >
              <NavLink to="/users" className={navClass}>
                Users
              </NavLink>
            </Can>
            <Can roles={['admin', 'super_admin', 'finance_staff']}>
              <NavLink to="/inventory" className={navClass}>
                Inventory
              </NavLink>
            </Can>
            <Can roles={['admin', 'super_admin', 'foodwaste_staff']}>
              <NavLink to="/foodwaste" className={navClass}>
                FoodWaste
              </NavLink>
            </Can>
            <Can roles={['admin', 'super_admin', 'recycle_bank_staff', 'finance_staff']}>
              <NavLink to="/recycle" className={navClass}>
                Recycle Bank
              </NavLink>
            </Can>
            <Can roles={['admin', 'super_admin', 'tabwater_staff', 'finance_staff']}>
              <NavLink to="/tabwater" className={navClass}>
                Tabwater
              </NavLink>
            </Can>
          </nav>

          <div className="ml-auto flex items-center gap-3 text-sm">
            {isAuthenticated && user ? (
              <div className="flex items-center gap-2.5 rounded-2xl border border-slate-200/80 bg-slate-50/80 py-1 pr-1.5 pl-2.5">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">
                  {initial}
                </span>
                <span data-testid="user-info" className="text-xs font-semibold text-slate-800">
                  {user.username}
                  {user.roles.length > 0 && (
                    <span className="ml-1.5 rounded-md bg-blue-50 px-1.5 py-0.5 text-[11px] font-medium text-blue-700 ring-1 ring-blue-600/15">
                      ({user.roles.join(', ')})
                    </span>
                  )}
                </span>
                <button
                  className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200"
                  onClick={() => void logout()}
                >
                  Log out
                </button>
              </div>
            ) : (
              <button
                className="rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm shadow-blue-600/25 hover:from-blue-700 hover:to-indigo-700"
                onClick={() => void login('/')}
              >
                Sign in
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6">
        <Outlet />
      </main>

      <footer className="mt-12 border-t border-slate-200/70 bg-white/70 py-4 text-xs text-slate-500 backdrop-blur-xs">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-4 sm:px-6">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <span className="font-medium text-slate-700">OTP Municipal Platform v2.0</span>
            <span>• Go + React + PostgreSQL 16 + Keycloak OIDC</span>
          </div>
          <div>Multi-Tenant Row-Level Security (RLS) Enabled</div>
        </div>
      </footer>
    </div>
  )
}
