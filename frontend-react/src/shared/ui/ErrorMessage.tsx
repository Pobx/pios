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
    <div
      role="alert"
      className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-rose-200 bg-rose-50/90 p-5 text-rose-900 shadow-xs"
    >
      <div className="space-y-1">
        <p className="font-semibold text-rose-900">Something went wrong</p>
        <p className="text-sm text-rose-700">{errorText(error)}</p>
      </div>
      {onRetry && (
        <button
          className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-medium text-white shadow-xs hover:bg-rose-700"
          onClick={onRetry}
        >
          Retry
        </button>
      )}
    </div>
  )
}
