import { useState } from 'react'
import { Spinner } from '@/shared/ui/Spinner'
import { ErrorMessage } from '@/shared/ui/ErrorMessage'
import { StatusBadge } from '@/shared/ui/StatusBadge'
import { ModuleHeader } from '@/shared/ui/ModuleHeader'
import { INPUT_CLS, BTN_PRIMARY, BTN_EMERALD } from '@/shared/ui/buttonStyles'
import { useFoodWaste } from '../hooks/useFoodWaste'

export function FoodWastePage() {
  const { summaryQuery, createBatchMutation, createWasteLogMutation } = useFoodWaste()

  const [batchCode, setBatchCode] = useState('')
  const [weightKg, setWeightKg] = useState('')
  const [moisture, setMoisture] = useState<'dry' | 'good' | 'wet'>('good')

  return (
    <section className="space-y-6">
      <ModuleHeader
        badge="ถังขยะเปียกครัวเรือน • TGO Carbon Credit"
        title="FoodWaste & Carbon Credit (ถังขยะเปียกและคาร์บอนเครดิต)"
        subtitle="บริหารจัดการถังหมักรักษ์โลก บันทึกปริมาณขยะอินทรีย์ และคำนวณการลดก๊าซเรือนกระจก (kgCO2e)"
      />

      <div className="grid gap-4 md:grid-cols-2">
        <form
          aria-label="Open Compost Batch"
          className="adminlte-card adminlte-card-success flex flex-col justify-between gap-3 p-5"
          onSubmit={(e) => {
            e.preventDefault()
            createBatchMutation.mutate(
              { user_id: 1, batch_code: batchCode },
              { onSuccess: () => setBatchCode('') },
            )
          }}
        >
          <div>
            <h2 className="text-sm font-bold text-slate-900">เปิดรอบถังหมักใหม่ (Open Compost Batch)</h2>
            <p className="mb-3 text-xs text-slate-500">กำหนดรหัสรอบการหมักขยะอินทรีย์ประจำครัวเรือน</p>
            <input
              aria-label="Batch Code"
              className={`w-full ${INPUT_CLS}`}
              placeholder="Batch Code (e.g. FW-2026-09)"
              value={batchCode}
              onChange={(e) => setBatchCode(e.target.value)}
            />
          </div>
          <button type="submit" className={BTN_EMERALD}>
            New Compost Batch
          </button>
        </form>

        <form
          aria-label="Record Waste Log"
          className="adminlte-card adminlte-card-primary flex flex-col justify-between gap-3 p-5"
          onSubmit={(e) => {
            e.preventDefault()
            createWasteLogMutation.mutate(
              {
                user_id: 1,
                weight_kg: Number(weightKg),
                moisture,
              },
              { onSuccess: () => setWeightKg('') },
            )
          }}
        >
          <div>
            <h2 className="text-sm font-bold text-slate-900">บันทึกน้ำหนักขยะเปียก (Record Waste Log)</h2>
            <p className="mb-3 text-xs text-slate-500">คำนวณคาร์บอนเครดิตอัตโนมัติตามค่า Emission Factor</p>
            <div className="grid grid-cols-2 gap-2.5">
              <input
                aria-label="Weight (kg)"
                className={INPUT_CLS}
                placeholder="Weight (kg)"
                value={weightKg}
                onChange={(e) => setWeightKg(e.target.value)}
              />
              <select
                aria-label="Moisture"
                className={INPUT_CLS}
                value={moisture}
                onChange={(e) => setMoisture(e.target.value as 'dry' | 'good' | 'wet')}
              >
                <option value="good">good</option>
                <option value="dry">dry</option>
                <option value="wet">wet</option>
              </select>
            </div>
          </div>
          <button type="submit" className={BTN_PRIMARY}>
            Log Waste
          </button>
        </form>
      </div>

      {summaryQuery.isPending && <Spinner />}
      {summaryQuery.error && (
        <ErrorMessage error={summaryQuery.error} onRetry={() => void summaryQuery.refetch()} />
      )}
      {summaryQuery.data && (
        <>
          <div className="grid gap-4 sm:grid-cols-4">
            <div className="adminlte-card adminlte-card-info p-5">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400">รอบถังหมักทั้งหมด</div>
              <div className="mt-1 text-3xl font-extrabold text-slate-900">{summaryQuery.data.total_batches}</div>
            </div>
            <div className="adminlte-card adminlte-card-primary p-5">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400">จำนวนครั้งที่บันทึก</div>
              <div className="mt-1 text-3xl font-extrabold text-slate-900">{summaryQuery.data.total_waste_logs}</div>
            </div>
            <div className="adminlte-card adminlte-card-warning p-5">
              <div className="text-xs font-bold uppercase tracking-wider text-amber-600">น้ำหนักขยะเปียกรวม (kg)</div>
              <div className="mt-1 font-mono text-3xl font-extrabold text-slate-900">
                {summaryQuery.data.total_weight_kg.toFixed(2)}
              </div>
            </div>
            <div className="adminlte-card adminlte-card-success bg-emerald-50/40 p-5">
              <div className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                คาร์บอนเครดิตสะสม (kgCO2e)
              </div>
              <div className="mt-1 font-mono text-3xl font-extrabold text-emerald-700">
                {summaryQuery.data.total_carbon_saved_kg.toFixed(2)}
              </div>
            </div>
          </div>

          <div className="adminlte-card overflow-hidden">
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className="text-base font-bold text-slate-900">รายการรอบถังหมักรักษ์โลก (Compost Batches)</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-5 py-3.5">รหัสรอบถังหมัก (Batch Code)</th>
                    <th className="px-5 py-3.5">วันที่เริ่มต้น (Start Date)</th>
                    <th className="px-5 py-3.5">สถานะ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {summaryQuery.data.batches.map((b) => (
                    <tr key={b.id} className="transition-colors hover:bg-slate-50/80">
                      <td className="px-5 py-3.5 font-mono font-semibold text-slate-900">{b.batch_code}</td>
                      <td className="px-5 py-3.5 text-slate-600">{b.start_date}</td>
                      <td className="px-5 py-3.5">
                        <StatusBadge value={b.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </section>
  )
}
