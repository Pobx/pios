import { Link } from 'react-router-dom'
import { useAuth } from '@/features/auth/AuthContext'
import { Can } from '@/features/auth/Can'

export function HomePage() {
  const { isAuthenticated, user, login } = useAuth()
  return (
    <section className="max-w-2xl">
      <h1 className="mb-2 text-3xl font-semibold">OTP</h1>
      <p className="mb-6 text-slate-600">Organization management portal. Sign in with your organization account to continue.</p>
      {isAuthenticated ? (
        <div className="space-y-3">
          <p>Signed in as <strong>{user?.username}</strong>.</p>
          <ul className="list-inside list-disc">
            <li><Link className="text-blue-700 underline" to="/me">My profile</Link></li>
            <Can roles={['admin', 'super_admin']}>
              <li><Link className="text-blue-700 underline" to="/organizations">Organizations</Link></li>
            </Can>
          </ul>
        </div>
      ) : (
        <button className="rounded bg-blue-700 px-4 py-2 text-white hover:bg-blue-800" onClick={() => void login('/me')}>
          Sign in
        </button>
      )}
    </section>
  )
}

export function ForbiddenPage() {
  return (
    <section role="alert">
      <h1 className="mb-2 text-3xl font-semibold">403 — Forbidden</h1>
      <p className="mb-4 text-slate-600">You do not have permission to view this page.</p>
      <Link className="text-blue-700 underline" to="/">Back to home</Link>
    </section>
  )
}

export function NotFoundPage() {
  return (
    <section>
      <h1 className="mb-2 text-3xl font-semibold">404 — Not found</h1>
      <p className="mb-4 text-slate-600">The page you are looking for does not exist.</p>
      <Link className="text-blue-700 underline" to="/">Back to home</Link>
    </section>
  )
}
