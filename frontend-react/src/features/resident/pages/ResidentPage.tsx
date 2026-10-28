import { useState } from 'react'
import { Spinner } from '@/shared/ui/Spinner'
import { ErrorMessage } from '@/shared/ui/ErrorMessage'
import { StatusBadge } from '@/shared/ui/StatusBadge'
import { ModuleHeader } from '@/shared/ui/ModuleHeader'
import { BTN_SECONDARY } from '@/shared/ui/buttonStyles'
import { PrintableInvoiceModal, type WaterInvoice } from '@/features/tabwater'
import { useResident } from '../hooks/useResident'

export function ResidentPage() {
  const [selectedInvoice, setSelectedInvoice] = useState<WaterInvoice | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const { residentQuery } = useResident()
  const { data, error, isPending, refetch } = residentQuery

  const filteredInvoices = (data?.invoices ?? []).filter(
    (inv) =>
      inv.inv_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (inv.period_name || '').toLowerCase().includes(searchTerm.toLowerCase()),
  )

  return (
    <section className="space-y-6">
      <ModuleHeader
        badge="พอร์ทัลลูกบ้าน • Self-Service"
        title="Resident Portal (บริการประชาชนและสมุดคู่ฝาก)"
        subtitle="ตรวจสอบข้อมูลมิเตอร์น้ำประปา ใบแจ้งหนี้/ใบเสร็จรับเงิน และสมุดบัญชีเงินฝากธนาคารขยะรีไซเคิล"
      />
      {isPending && <Spinner />}
      {error && <ErrorMessage error={error} onRetry={() => void refetch()} />}
      {data && (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="adminlte-card adminlte-card-primary p-5">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400">บัญชีผู้ใช้งานครัวเรือน</div>
              <div className="mt-1 text-xl font-bold text-slate-900">{data.username}</div>
              <div className="mt-1 text-xs text-slate-500">สมาชิกองค์การบริหารส่วนตำบลห้องแซง</div>
            </div>
            <div className="adminlte-card adminlte-card-info p-5">
              <div className="text-xs font-bold uppercase tracking-wider text-sky-600">มิเตอร์น้ำประปาในชื่อของคุณ</div>
              <div className="mt-1 text-3xl font-extrabold text-slate-900">{data.water_meters.length}</div>
              <div className="mt-1 text-xs text-slate-500">จุดติดตั้งมาตรวัดน้ำประปา</div>
            </div>
            <div className="adminlte-card adminlte-card-success p-5">
              <div className="text-xs font-bold uppercase tracking-wider text-emerald-600">
                สมุดบัญชีธนาคารขยะรีไซเคิล
              </div>
              <div className="mt-1 text-3xl font-extrabold text-slate-900">{data.bank_accounts.length}</div>
              <div className="mt-1 text-xs text-slate-500">บัญชีออมทรัพย์ขยะรีไซเคิล</div>
            </div>
          </div>

          {data.invoices.length > 0 && (
            <div className="adminlte-card overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    ประวัติใบแจ้งหนี้และใบเสร็จค่าน้ำประปา ({filteredInvoices.length})
                  </h2>
                  <p className="text-xs text-slate-500">สามารถกดปุ่ม Print / Receipt เพื่อพิมพ์ใบแจ้งหนี้หรือใบเสร็จรับเงิน</p>
                </div>
                <input
                  type="search"
                  placeholder="ค้นหาเลขที่บิล / รอบบิล..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-56 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-800"
                />
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-5 py-3.5">เลขที่บิล (Invoice No)</th>
                      <th className="px-5 py-3.5">รอบบิล (Period)</th>
                      <th className="px-5 py-3.5">หน่วยน้ำที่ใช้ (m³)</th>
                      <th className="px-5 py-3.5">ยอดรวม (THB)</th>
                      <th className="px-5 py-3.5">สถานะ</th>
                      <th className="px-5 py-3.5">พิมพ์เอกสาร</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredInvoices.map((inv) => (
                      <tr key={inv.id} className="transition-colors hover:bg-slate-50/80">
                        <td className="px-5 py-3.5 font-mono font-semibold text-slate-900">{inv.inv_no}</td>
                        <td className="px-5 py-3.5 text-slate-700">{inv.period_name || '—'}</td>
                        <td className="px-5 py-3.5 font-mono">{inv.water_used}</td>
                        <td className="px-5 py-3.5 font-mono font-semibold text-slate-900">
                          {inv.totalpaid.toFixed(2)}
                        </td>
                        <td className="px-5 py-3.5">
                          <StatusBadge value={inv.status} />
                        </td>
                        <td className="px-5 py-3.5">
                          <button
                            type="button"
                            data-testid={`print-invoice-${inv.id}`}
                            className={BTN_SECONDARY}
                            onClick={() => setSelectedInvoice(inv)}
                          >
                            Print / Receipt
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
      {selectedInvoice && <PrintableInvoiceModal invoice={selectedInvoice} onClose={() => setSelectedInvoice(null)} />}
    </section>
  )
}
