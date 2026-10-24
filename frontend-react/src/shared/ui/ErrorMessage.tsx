import { isAxiosError } from 'axios'

/** Human-readable text for an API error (RFC 7807 `detail`/`title` when present). */
function errorText(error: unknown): string {
  if (isAxiosError(error)) {
    const data = error.response?.data as { detail?: string; title?: string } | undefined
    return data?.detail ?? data?.title ?? error.message
  }
  return error instanceof Error ? error.message : 'Unexpected error'
}

export function ErrorMessage({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  return (
    <div role="alert" className="rounded border border-red-200 bg-red-50 p-4 text-red-800">
      <p className="font-medium">Something went wrong</p>
      <p className="text-sm">{errorText(error)}</p>
      {onRetry && (
        <button className="mt-3 rounded bg-red-700 px-3 py-1 text-white" onClick={onRetry}>
          Retry
        </button>
      )}
    </div>
  )
}
