import type { WaterInvoice } from '../types'

export interface PrintableInvoiceModalProps {
  invoice: WaterInvoice
  onClose: () => void
}

export function PrintableInvoiceModal({ invoice, onClose }: PrintableInvoiceModalProps) {
  const isPaid = invoice.status === 'paid'

  return (
    <div
      role="dialog"
      aria-label="Printable Water Invoice"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs"
    >
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
        <div className="mb-5 flex items-start justify-between border-b border-slate-200 pb-4">
          <div className="flex items-center gap-3">
            <img
              src="/logo/ko_envsogo.png"
              alt="Logo"
              className="h-11 w-11 rounded-full border border-slate-200 object-cover"
            />
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-sky-600">
                กิจการประปา อบต.ห้องแซง (OTP Waterworks)
              </div>
              <h2 className="mt-0.5 text-base font-bold text-slate-900">
                {isPaid ? 'ใบเสร็จรับเงินค่าน้ำประปา (Official Receipt)' : 'ใบแจ้งหนี้ค่าน้ำประปา (Water Bill)'}
              </h2>
              <p className="text-xs text-slate-500">
                Organization #{invoice.org_id} • Meter #{invoice.meter_id}
              </p>
            </div>
          </div>
          <span
            className={`rounded-md px-2.5 py-1 text-xs font-bold uppercase ring-1 ${
              isPaid
                ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/20'
                : 'bg-amber-50 text-amber-700 ring-amber-600/20'
            }`}
          >
            {invoice.status}
          </span>
        </div>

        <dl className="mb-5 grid grid-cols-2 gap-3 rounded-xl border border-slate-100 bg-slate-50/80 p-4 text-sm">
          <div>
            <dt className="text-xs text-slate-500">เลขที่ใบแจ้งหนี้ / ใบเสร็จ</dt>
            <dd className="font-mono font-bold text-slate-900">{invoice.inv_no}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">ประจำงวดบิล (Period)</dt>
            <dd className="font-semibold text-slate-900">{invoice.period_name || `Period #${invoice.period_id}`}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">เลขมิเตอร์ครั้งก่อน</dt>
            <dd className="font-mono">{invoice.lastmeter}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">เลขมิเตอร์ครั้งนี้</dt>
            <dd className="font-mono">{invoice.currentmeter}</dd>
          </div>
        </dl>

        <table className="mb-6 w-full border-t border-b border-slate-200 text-sm">
          <tbody className="divide-y divide-slate-100">
            <tr>
              <td className="py-2 text-slate-600">หน่วยน้ำที่ใช้ (Water Used m³)</td>
              <td className="py-2 text-right font-semibold">{invoice.water_used} m³</td>
            </tr>
            <tr>
              <td className="py-2 text-slate-600">ค่าน้ำประปา (Water Charge)</td>
              <td className="py-2 text-right font-mono">{invoice.paid.toFixed(2)} THB</td>
            </tr>
            <tr>
              <td className="py-2 text-slate-600">ค่ารักษามาตรวัดน้ำ (Maintenance Fee)</td>
              <td className="py-2 text-right font-mono">{invoice.reserve_meter.toFixed(2)} THB</td>
            </tr>
            <tr>
              <td className="py-2 text-slate-600">ภาษีมูลค่าเพิ่ม (VAT 7%)</td>
              <td className="py-2 text-right font-mono">{invoice.vat.toFixed(2)} THB</td>
            </tr>
            <tr className="bg-sky-50/60 font-bold text-slate-900">
              <td className="py-3 pl-2">รวมเงินทั้งสิ้น (Total Amount)</td>
              <td className="py-3 pr-2 text-right font-mono text-base text-sky-700">{invoice.totalpaid.toFixed(2)} THB</td>
            </tr>
          </tbody>
        </table>

        <div className="flex items-center justify-between">
          <button
            type="button"
            className="rounded-lg border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50"
            onClick={() => window.print()}
          >
            🖨️ Print Now
          </button>
          <button
            type="button"
            className="rounded-lg bg-slate-900 px-4 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-slate-800"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
