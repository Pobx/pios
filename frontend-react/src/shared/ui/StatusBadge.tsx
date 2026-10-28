interface StatusBadgeProps {
  value: string
  className?: string
}

export function StatusBadge({ value, className = '' }: StatusBadgeProps) {
  const v = (value || '').toLowerCase()
  const tone =
    v === 'active' || v === 'paid' || v === 'approved' || v === 'completed' || v === 'linked'
      ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/20'
      : v === 'pending' || v === 'invoice' || v === 'filling'
        ? 'bg-amber-50 text-amber-700 ring-amber-600/20'
        : v === 'rejected' || v === 'deleted' || v === 'cut'
          ? 'bg-rose-50 text-rose-700 ring-rose-600/20'
          : 'bg-slate-100 text-slate-700 ring-slate-500/15'

  return (
    <span
      className={`inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-semibold ring-1 ${tone} ${className}`}
    >
      {value}
    </span>
  )
}
