import type { ReactNode } from 'react'

export interface ModuleHeaderProps {
  badge: string
  title: string
  subtitle: string
  right?: ReactNode
}

export function ModuleHeader({ badge, title, subtitle, right }: ModuleHeaderProps) {
  return (
    <div className="adminlte-card adminlte-card-primary flex flex-wrap items-center justify-between gap-4 p-5">
      <div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-md bg-sky-50 px-2.5 py-0.5 text-xs font-bold text-sky-700 ring-1 ring-sky-600/15">
            {badge}
          </span>
          <span className="text-xs font-medium text-slate-400">• องค์การบริหารส่วนตำบลห้องแซง (HSG1:PIOS)</span>
        </div>
        <h1 className="mt-1.5 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">{title}</h1>
        <p className="mt-0.5 text-xs text-slate-500 sm:text-sm">{subtitle}</p>
      </div>
      {right && <div className="flex items-center gap-2">{right}</div>}
    </div>
  )
}
