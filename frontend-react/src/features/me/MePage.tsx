import { useQuery } from '@tanstack/react-query'
import { Spinner } from '@/shared/ui/Spinner'
import { ErrorMessage } from '@/shared/ui/ErrorMessage'
import { fetchMe } from './api'

export function MePage() {
  const { data, error, isPending, refetch } = useQuery({ queryKey: ['me'], queryFn: fetchMe })
  return (
    <section>
      <h1 className="mb-4 text-2xl font-semibold">My profile</h1>
      {isPending && <Spinner />}
      {error && <ErrorMessage error={error} onRetry={() => void refetch()} />}
      {data && (
        <>
          <dl className="grid max-w-lg grid-cols-[8rem_1fr] gap-y-2 rounded bg-white p-4 shadow">
            <dt className="text-slate-500">Username</dt><dd>{data.username}</dd>
            <dt className="text-slate-500">Subject</dt><dd className="break-all">{data.sub}</dd>
            <dt className="text-slate-500">Roles</dt><dd>{data.roles.join(', ') || '—'}</dd>
            <dt className="text-slate-500">Org ID</dt><dd>{data.org_id ?? '—'}</dd>
          </dl>
          <details className="mt-4">
            <summary className="cursor-pointer text-sm text-slate-600">Raw response</summary>
            <pre className="mt-2 overflow-auto rounded bg-slate-900 p-3 text-xs text-slate-100">{JSON.stringify(data, null, 2)}</pre>
          </details>
        </>
      )}
    </section>
  )
}
