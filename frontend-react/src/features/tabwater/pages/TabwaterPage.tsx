import { useState } from 'react'
import { Spinner } from '@/shared/ui/Spinner'
import { ErrorMessage } from '@/shared/ui/ErrorMessage'
import { StatusBadge } from '@/shared/ui/StatusBadge'
import { ModuleHeader } from '@/shared/ui/ModuleHeader'
import { INPUT_CLS, BTN_PRIMARY, BTN_EMERALD, BTN_SECONDARY } from '@/shared/ui/buttonStyles'
import { exportRowsToCsv } from '@/shared/utils/csv'
import { useTabwater } from '../hooks/useTabwater'
import { PrintableInvoiceModal } from '../components/PrintableInvoiceModal'
import type { WaterInvoice } from '../types'

export function TabwaterPage() {
  const [selectedInvoice, setSelectedInvoice] = useState<WaterInvoice | null>(null)
  const [meterSearch, setMeterSearch] = useState('')
  const [invoiceSearch, setInvoiceSearch] = useState('')

  const {
    metersQuery,
    invoicesQuery,
    periodsQuery,
    readingMutation,
    createPeriodMutation,
    createMeterMutation,
    payInvoiceMutation,
  } = useTabwater()

  const [invNo, setInvNo] = useState('')
  const [meterId, setMeterId] = useState('1')
  const [periodId, setPeriodId] = useState('1')
  const [currentMeter, setCurrentMeter] = useState('')

  const [newPeriodName, setNewPeriodName] = useState('')
  const [newMeterUserId, setNewMeterUserId] = useState('1')
  const [newMeterNo, setNewMeterNo] = useState('')
  const [newSubscriberName, setNewSubscriberName] = useState('')
  const [newMeterAddr, setNewMeterAddr] = useState('')

  const totalMeters = metersQuery.data?.length ?? 0
  const totalWaterUsed = (invoicesQuery.data ?? []).reduce((acc, i) => acc + i.water_used, 0)
  const totalPaidAmount = (invoicesQuery.data ?? [])
    .filter((i) => i.status === 'paid')
    .reduce((acc, i) => acc + i.totalpaid, 0)
  const unpaidCount = (invoicesQuery.data ?? []).filter((i) => i.status !== 'paid').length

  const filteredMeters = (metersQuery.data ?? []).filter(
    (m) =>
      m.meternumber.toLowerCase().includes(meterSearch.toLowerCase()) ||
      m.submeter_name.toLowerCase().includes(meterSearch.toLowerCase()) ||
      m.meter_address.toLowerCase().includes(meterSearch.toLowerCase()),
  )

  const filteredInvoices = (invoicesQuery.data ?? []).filter(
    (inv) =>
      inv.inv_no.toLowerCase().includes(invoiceSearch.toLowerCase()) ||
      (inv.period_name || '').toLowerCase().includes(invoiceSearch.toLowerCase()),
  )

  return (
    <section className="space-y-6">
      <ModuleHeader
        badge="งานประปา • Municipal Waterworks"
        title="Tabwater Management (ระบบบริหารกิจการประปาหมู่บ้าน)"
        subtitle="ระบบบริหารกิจการประปาหมู่บ้าน เปิดรอบบิลประจำเดือน ขึ้นทะเบียนมิเตอร์ จดเลขมิเตอร์ และรับชำระค่าน้ำประปา"
      />

      {/* Summary Card & KPI Row */}
      <div className="grid gap-4 lg:grid-cols-12">
        <div className="adminlte-card relative overflow-hidden bg-gradient-to-br from-white via-sky-50/50 to-blue-50/40 p-5 lg:col-span-5">
          <div className="relative z-10 flex items-center justify-between gap-4">
            <div className="space-y-2">
              <span className="inline-flex rounded-md bg-sky-100 px-2.5 py-0.5 text-xs font-bold text-sky-800">
                ปีงบประมาณ 2569
              </span>
              <h2 className="text-lg font-bold text-slate-900">สรุปข้อมูลผู้ใช้น้ำประปา อบต.ห้องแซง</h2>
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="rounded-xl border border-slate-200/80 bg-white px-3 py-2">
                  <div className="text-[11px] font-medium text-slate-500">จำนวนผู้ใช้น้ำ (มิเตอร์)</div>
                  <div className="text-xl font-extrabold text-sky-700">{totalMeters} ราย</div>
                </div>
                <div className="rounded-xl border border-slate-200/80 bg-white px-3 py-2">
                  <div className="text-[11px] font-medium text-slate-500">รอบบิลที่เปิดใช้งาน</div>
                  <div className="text-xl font-extrabold text-emerald-700">{periodsQuery.data?.length ?? 1} งวด</div>
                </div>
              </div>
            </div>
            <img
              src="/soft-ui/assets/img/water.png"
              alt="Waterworks Illustration"
              className="hidden h-24 w-24 shrink-0 object-contain sm:block"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:col-span-7">
          <div className="adminlte-card adminlte-card-info p-4">
            <div className="text-xs font-bold text-slate-500">ปริมาณการใช้น้ำรวม</div>
            <div className="mt-1.5 font-mono text-2xl font-extrabold text-slate-900">{totalWaterUsed} m³</div>
            <div className="mt-1 text-[11px] text-sky-600">คำนวณตามอัตราก้าวหน้า</div>
          </div>
          <div className="adminlte-card adminlte-card-success p-4">
            <div className="text-xs font-bold text-slate-500">รับชำระค่าน้ำแล้ว (Paid)</div>
            <div className="mt-1.5 font-mono text-2xl font-extrabold text-emerald-700">
              {totalPaidAmount.toFixed(2)} ฿
            </div>
            <div className="mt-1 text-[11px] text-emerald-600">พร้อมออกใบเสร็จรับเงิน</div>
          </div>
          <div className="adminlte-card adminlte-card-warning col-span-2 p-4 sm:col-span-1">
            <div className="text-xs font-bold text-slate-500">ใบแจ้งหนี้รอชำระ</div>
            <div className="mt-1.5 font-mono text-2xl font-extrabold text-amber-600">{unpaidCount} บิล</div>
            <div className="mt-1 text-[11px] text-slate-500">สถานะรอรับชำระเงิน</div>
          </div>
        </div>
      </div>

      {/* 3 Action Forms */}
      <div className="grid gap-4 lg:grid-cols-3">
        <form
          aria-label="Open Billing Period"
          className="adminlte-card adminlte-card-info flex flex-col justify-between gap-3 p-5"
          onSubmit={(e) => {
            e.preventDefault()
            createPeriodMutation.mutate(
              { period_name: newPeriodName },
              { onSuccess: () => setNewPeriodName('') },
            )
          }}
        >
          <div>
            <h2 className="text-sm font-bold text-slate-900">เปิดรอบบิลประจำเดือน (Open Billing Period)</h2>
            <p className="mb-3 text-xs text-slate-500">สร้างงวดใบแจ้งหนี้ค่าน้ำประปาใหม่</p>
            <input
              aria-label="Billing Period Name"
              className={`w-full ${INPUT_CLS}`}
              placeholder="Period (e.g. 11/2569)"
              value={newPeriodName}
              onChange={(e) => setNewPeriodName(e.target.value)}
            />
            {periodsQuery.data && periodsQuery.data.length > 0 && (
              <div className="mt-2.5 text-xs text-slate-500">
                Active Periods: {periodsQuery.data.map((p) => `#${p.id} (${p.period_name})`).slice(0, 3).join(', ')}
              </div>
            )}
          </div>
          <button type="submit" className={BTN_EMERALD}>
            Open Period
          </button>
        </form>

        <form
          aria-label="Register Water Meter"
          className="adminlte-card adminlte-card-success flex flex-col justify-between gap-3 p-5"
          onSubmit={(e) => {
            e.preventDefault()
            createMeterMutation.mutate(
              {
                user_id: Number(newMeterUserId) || 1,
                meternumber: newMeterNo,
                submeter_name: newSubscriberName,
                meter_address: newMeterAddr,
              },
              {
                onSuccess: () => {
                  setNewMeterNo('')
                  setNewSubscriberName('')
                  setNewMeterAddr('')
                },
              },
            )
          }}
        >
          <div>
            <h2 className="text-sm font-bold text-slate-900">ขึ้นทะเบียนมิเตอร์ใหม่ (Register Water Meter)</h2>
            <p className="mb-3 text-xs text-slate-500">ผูกมิเตอร์น้ำประปาเข้ากับครัวเรือนลูกบ้าน</p>
            <div className="grid grid-cols-2 gap-2.5">
              <input
                aria-label="Meter Owner User ID"
                className={INPUT_CLS}
                placeholder="User ID"
                value={newMeterUserId}
                onChange={(e) => setNewMeterUserId(e.target.value)}
              />
              <input
                aria-label="New Meter Number"
                className={INPUT_CLS}
                placeholder="Meter No"
                value={newMeterNo}
                onChange={(e) => setNewMeterNo(e.target.value)}
              />
              <input
                aria-label="Subscriber Name"
                className={INPUT_CLS}
                placeholder="Subscriber"
                value={newSubscriberName}
                onChange={(e) => setNewSubscriberName(e.target.value)}
              />
              <input
                aria-label="Meter Address"
                className={INPUT_CLS}
                placeholder="Address"
                value={newMeterAddr}
                onChange={(e) => setNewMeterAddr(e.target.value)}
              />
            </div>
          </div>
          <button type="submit" className={BTN_EMERALD}>
            Register Meter
          </button>
        </form>

        <form
          aria-label="Record Meter Reading"
          className="adminlte-card adminlte-card-primary flex flex-col justify-between gap-3 p-5"
          onSubmit={(e) => {
            e.preventDefault()
            readingMutation.mutate(
              {
                inv_no: invNo,
                meter_id: Number(meterId) || 1,
                period_id: Number(periodId) || 1,
                current_meter: Number(currentMeter),
                reserve_fee: 10,
                vat_percent: 7,
              },
              {
                onSuccess: () => {
                  setInvNo('')
                  setCurrentMeter('')
                },
              },
            )
          }}
        >
          <div>
            <h2 className="text-sm font-bold text-slate-900">จดเลขมิเตอร์และออกบิล (Record Reading)</h2>
            <p className="mb-3 text-xs text-slate-500">คำนวณค่าน้ำอัตราก้าวหน้า + ค่าบำรุงมิเตอร์ + VAT 7%</p>
            <div className="grid grid-cols-2 gap-2.5">
              <input
                aria-label="Invoice No"
                className={INPUT_CLS}
                placeholder="Invoice No (e.g. INV-2026-01)"
                value={invNo}
                onChange={(e) => setInvNo(e.target.value)}
              />
              <input
                aria-label="Meter ID"
                className={INPUT_CLS}
                placeholder="Meter ID"
                value={meterId}
                onChange={(e) => setMeterId(e.target.value)}
              />
              <input
                aria-label="Period ID"
                className={INPUT_CLS}
                placeholder="Period ID"
                value={periodId}
                onChange={(e) => setPeriodId(e.target.value)}
              />
              <input
                aria-label="Current Meter Reading"
                className={INPUT_CLS}
                placeholder="Current Reading"
                value={currentMeter}
                onChange={(e) => setCurrentMeter(e.target.value)}
              />
            </div>
          </div>
          <button type="submit" className={BTN_PRIMARY}>
            Record Reading & Bill
          </button>
        </form>
      </div>

      {metersQuery.isPending && <Spinner />}
      {metersQuery.error && <ErrorMessage error={metersQuery.error} onRetry={() => void metersQuery.refetch()} />}
      {metersQuery.data && (
        <div className="adminlte-card overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
            <h2 className="text-base font-bold text-slate-900">ทะเบียนมิเตอร์น้ำประปา ({filteredMeters.length})</h2>
            <input
              type="search"
              placeholder="ค้นหาเลขมิเตอร์ / ชื่อผู้ใช้น้ำ..."
              value={meterSearch}
              onChange={(e) => setMeterSearch(e.target.value)}
              className="w-56 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-800"
            />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-5 py-3.5">เลขมิเตอร์ (Meter No)</th>
                  <th className="px-5 py-3.5">ชื่อผู้ใช้น้ำ (Subscriber)</th>
                  <th className="px-5 py-3.5">ที่อยู่ติดตั้ง (Address)</th>
                  <th className="px-5 py-3.5">เลขมิเตอร์ล่าสุด</th>
                  <th className="px-5 py-3.5">สถานะ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredMeters.map((m) => (
                  <tr key={m.meter_id} className="transition-colors hover:bg-slate-50/80">
                    <td className="px-5 py-3.5 font-mono font-semibold text-sky-700">{m.meternumber}</td>
                    <td className="px-5 py-3.5 font-semibold text-slate-900">{m.submeter_name}</td>
                    <td className="px-5 py-3.5 text-slate-600">{m.meter_address}</td>
                    <td className="px-5 py-3.5 font-mono font-semibold">{m.last_meter_recording}</td>
                    <td className="px-5 py-3.5">
                      <StatusBadge value={m.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {invoicesQuery.data && invoicesQuery.data.length > 0 && (
        <div className="adminlte-card overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-5 py-4">
            <h2 className="text-base font-bold text-slate-900">รายการใบแจ้งหนี้และใบเสร็จรับเงิน (Water Invoices)</h2>
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="search"
                placeholder="ค้นหาเลขที่บิล / รอบบิล..."
                value={invoiceSearch}
                onChange={(e) => setInvoiceSearch(e.target.value)}
                className="w-52 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-800"
              />
              <button
                type="button"
                onClick={() =>
                  exportRowsToCsv(
                    'tabwater-invoices.csv',
                    ['inv_no', 'period', 'water_used', 'totalpaid', 'status'],
                    invoicesQuery.data.map((i) => [i.inv_no, i.period_name || '', i.water_used, i.totalpaid, i.status]),
                  )
                }
                className={BTN_SECONDARY}
              >
                Export Invoices CSV
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-5 py-3.5">เลขที่บิล (Invoice No)</th>
                  <th className="px-5 py-3.5">งวดบิล (Period)</th>
                  <th className="px-5 py-3.5">หน่วยน้ำ (m³)</th>
                  <th className="px-5 py-3.5">รวมทั้งสิ้น (THB)</th>
                  <th className="px-5 py-3.5">สถานะ</th>
                  <th className="px-5 py-3.5">การจัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredInvoices.map((inv) => (
                  <tr key={inv.id} className="transition-colors hover:bg-slate-50/80">
                    <td className="px-5 py-3.5 font-mono font-semibold text-slate-900">{inv.inv_no}</td>
                    <td className="px-5 py-3.5 text-slate-600">{inv.period_name}</td>
                    <td className="px-5 py-3.5 font-mono">{inv.water_used}</td>
                    <td className="px-5 py-3.5 font-mono font-bold text-slate-900">{inv.totalpaid.toFixed(2)}</td>
                    <td className="px-5 py-3.5">
                      <StatusBadge value={inv.status} />
                    </td>
                    <td className="flex items-center gap-2 px-5 py-3.5">
                      {inv.status !== 'paid' && (
                        <button
                          className="rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white shadow-2xs hover:bg-sky-700"
                          onClick={() => payInvoiceMutation.mutate(inv.id)}
                        >
                          Pay Invoice
                        </button>
                      )}
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

      {selectedInvoice && <PrintableInvoiceModal invoice={selectedInvoice} onClose={() => setSelectedInvoice(null)} />}
    </section>
  )
}
