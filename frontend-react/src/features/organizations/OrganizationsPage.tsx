import { useQuery } from '@tanstack/react-query'
import { Spinner } from '@/shared/ui/Spinner'
import { ErrorMessage } from '@/shared/ui/ErrorMessage'
import { fetchOrganizations } from './api'

export function OrganizationsPage() {
  const { data, error, isPending, refetch } = useQuery({ queryKey: ['organizations'], queryFn: fetchOrganizations })
  return (
    <section className="space-y-6">
      <div className="adminlte-card adminlte-card-primary flex flex-wrap items-center justify-between gap-4 p-5">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-md bg-sky-50 px-2.5 py-0.5 text-xs font-bold text-sky-700 ring-1 ring-sky-600/15">
            Super Admin • Multi-Tenant Directory
          </span>
          <h1 className="mt-1.5 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">Organizations</h1>
          <p className="text-xs text-slate-500 sm:text-sm">
            รายชื่อองค์กรปกครองส่วนท้องถิ่นและหน่วยงานภายใต้ระบบ Multi-Tenant (PostgreSQL RLS)
          </p>
        </div>
        {data && (
          <div className="rounded-xl border border-slate-200/80 bg-slate-50 px-4 py-2 text-right">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Active Tenants</div>
            <div className="text-xl font-extrabold text-sky-700">{data.length}</div>
          </div>
        )}
      </div>

      {isPending && <Spinner />}
      {error && <ErrorMessage error={error} onRetry={() => void refetch()} />}
      {data && data.length === 0 && (
        <p className="adminlte-card p-8 text-center text-sm text-slate-600">No organizations found.</p>
      )}
      {data && data.length > 0 && (
        <div className="adminlte-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">List of organizations</caption>
              <thead className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th scope="col" className="px-5 py-3.5">ID</th>
                  <th scope="col" className="px-5 py-3.5">รหัสองค์กร (Code)</th>
                  <th scope="col" className="px-5 py-3.5">ชื่อองค์กรปกครองส่วนท้องถิ่น (Name)</th>
                  <th scope="col" className="px-5 py-3.5">ประเภท (Type)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.map((o) => (
                  <tr key={o.id} className="transition-colors hover:bg-slate-50/80">
                    <td className="px-5 py-3.5 font-mono text-xs text-slate-500">{o.id}</td>
                    <td className="px-5 py-3.5">
                      <span className="inline-flex rounded-md bg-sky-50 px-2.5 py-0.5 font-mono text-xs font-bold text-sky-700 ring-1 ring-sky-600/15">
                        {o.code}
                      </span>
                    </td>
                    <th scope="row" className="px-5 py-3.5 font-semibold text-slate-900">
                      {o.name}
                    </th>
                    <td className="px-5 py-3.5 text-slate-600">{o.type_id}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  )
}
