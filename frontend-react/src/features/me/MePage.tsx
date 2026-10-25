import { useQuery } from '@tanstack/react-query'
import { Spinner } from '@/shared/ui/Spinner'
import { ErrorMessage } from '@/shared/ui/ErrorMessage'
import { fetchMe } from './api'

export function MePage() {
  const { data, error, isPending, refetch } = useQuery({ queryKey: ['me'], queryFn: fetchMe })
  return (
    <section className="space-y-6">
      <div className="adminlte-card adminlte-card-primary flex flex-wrap items-center justify-between gap-4 p-5">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-md bg-sky-50 px-2.5 py-0.5 text-xs font-bold text-sky-700 ring-1 ring-sky-600/15">
            บัญชีผู้ใช้งาน • OIDC Identity Claims
          </span>
          <h1 className="mt-1.5 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">My profile</h1>
          <p className="text-xs text-slate-500 sm:text-sm">
            ข้อมูลบัญชีผู้ใช้งานและสิทธิ์การเข้าถึงระดับองค์กร (Keycloak RS256)
          </p>
        </div>
      </div>

      {isPending && <Spinner />}
      {error && <ErrorMessage error={error} onRetry={() => void refetch()} />}
      {data && (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="adminlte-card adminlte-card-info p-6 lg:col-span-2">
            <h2 className="mb-4 text-xs font-bold uppercase tracking-wider text-slate-400">Account Details</h2>
            <dl className="grid grid-cols-1 gap-y-4 text-sm sm:grid-cols-[10rem_1fr]">
              <dt className="font-medium text-slate-500">Username</dt>
              <dd className="font-semibold text-slate-900">{data.username}</dd>
              <dt className="font-medium text-slate-500">Subject</dt>
              <dd className="break-all font-mono text-xs text-slate-700">{data.sub}</dd>
              <dt className="font-medium text-slate-500">Roles</dt>
              <dd className="font-semibold text-sky-700">{data.roles.join(', ') || '—'}</dd>
              <dt className="font-medium text-slate-500">Org ID</dt>
              <dd className="font-mono font-semibold text-slate-900">{data.org_id ?? '—'}</dd>
            </dl>
          </div>

          <div className="adminlte-card p-6">
            <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">Token Inspector</h2>
            <p className="mb-4 text-xs text-slate-500">ตรวจสอบข้อมูลดิบที่ได้จาก `/api/v1/me`</p>
            <details className="group">
              <summary className="cursor-pointer rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100">
                Raw response
              </summary>
              <pre className="mt-3 overflow-auto rounded-xl bg-slate-900 p-4 font-mono text-xs text-emerald-300 shadow-inner">
                {JSON.stringify(data, null, 2)}
              </pre>
            </details>
          </div>
        </div>
      )}
    </section>
  )
}
