import { useQuery } from '@tanstack/react-query'
import { Spinner } from '@/shared/ui/Spinner'
import { ErrorMessage } from '@/shared/ui/ErrorMessage'
import { fetchOrganizations } from './api'

export function OrganizationsPage() {
  const { data, error, isPending, refetch } = useQuery({ queryKey: ['organizations'], queryFn: fetchOrganizations })
  return (
    <section>
      <h1 className="mb-4 text-2xl font-semibold">Organizations</h1>
      {isPending && <Spinner />}
      {error && <ErrorMessage error={error} onRetry={() => void refetch()} />}
      {data && data.length === 0 && <p className="rounded bg-white p-4 text-slate-600 shadow">No organizations found.</p>}
      {data && data.length > 0 && (
        <div className="overflow-x-auto rounded bg-white shadow">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">List of organizations</caption>
            <thead className="bg-slate-100 text-slate-600">
              <tr>
                <th scope="col" className="px-4 py-2">ID</th>
                <th scope="col" className="px-4 py-2">Code</th>
                <th scope="col" className="px-4 py-2">Name</th>
                <th scope="col" className="px-4 py-2">Type</th>
              </tr>
            </thead>
            <tbody>
              {data.map((o) => (
                <tr key={o.id} className="border-t border-slate-100">
                  <td className="px-4 py-2">{o.id}</td>
                  <td className="px-4 py-2">{o.code}</td>
                  <th scope="row" className="px-4 py-2 font-normal">{o.name}</th>
                  <td className="px-4 py-2">{o.type_id}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
