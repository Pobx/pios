export function Spinner({ label = 'Loading…' }: { label?: string }) {
  return (
    <div
      role="status"
      className="flex items-center justify-center gap-3 rounded-2xl border border-slate-200/70 bg-white/80 p-10 text-sm font-medium text-slate-600 shadow-xs backdrop-blur-xs"
    >
      <span
        className="h-5 w-5 animate-spin rounded-full border-2 border-blue-200 border-t-blue-600"
        aria-hidden="true"
      />
      <span>{label}</span>
    </div>
  )
}
