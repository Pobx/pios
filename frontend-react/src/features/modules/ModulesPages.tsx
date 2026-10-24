import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Spinner } from '@/shared/ui/Spinner'
import { ErrorMessage } from '@/shared/ui/ErrorMessage'
import {
  fetchUsers,
  createUser,
  fetchZones,
  createZone,
  linkUserLineAccount,
  fetchResidentOverview,
  fetchInventoryItems,
  createInventoryItem,
  fetchInventoryTransactions,
  createInventoryTransaction,
  decideInventoryTransaction,
  fetchFoodWasteSummary,
  createCompostBatch,
  createWasteLog,
  fetchRecycleItems,
  setRecycleItemPrice,
  fetchRecycleAccounts,
  withdrawRecycleBalance,
  fetchRecycleSubmodules,
  recordRecyclePurchase,
  fetchTabwaterMeters,
  createTabwaterMeter,
  fetchTabwaterPeriods,
  createTabwaterPeriod,
  fetchTabwaterInvoices,
  recordTabwaterReading,
  payTabwaterInvoice,
  exportRowsToCsv,
  type WaterInvoice,
} from './api'

// ---- Shared UI Primitives for Module Pages ----------------------------------

const INPUT_CLS =
  'rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white'
const BTN_PRIMARY =
  'inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-xs shadow-blue-600/20 hover:bg-blue-700'
const BTN_EMERALD =
  'inline-flex items-center justify-center rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-xs shadow-emerald-600/20 hover:bg-emerald-700'
const BTN_AMBER =
  'inline-flex items-center justify-center rounded-xl bg-amber-600 px-4 py-2 text-xs font-semibold text-white shadow-xs shadow-amber-600/20 hover:bg-amber-700'
const BTN_SECONDARY =
  'inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50'

function StatusBadge({ value }: { value: string }) {
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
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${tone}`}>
      {value}
    </span>
  )
}

function ModuleHeader({
  badge,
  title,
  subtitle,
  right,
}: {
  badge: string
  title: string
  subtitle: string
  right?: React.ReactNode
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs">
      <div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 ring-1 ring-blue-600/15">
          {badge}
        </span>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
        <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>
      </div>
      {right && <div className="flex items-center gap-2">{right}</div>}
    </div>
  )
}

// ---- Shared Printable Water Invoice / Receipt Modal -------------------------

export function PrintableInvoiceModal({
  invoice,
  onClose,
}: {
  invoice: WaterInvoice
  onClose: () => void
}) {
  const isPaid = invoice.status === 'paid'
  return (
    <div
      role="dialog"
      aria-label="Printable Water Invoice"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs"
    >
      <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
        <div className="mb-5 flex items-start justify-between border-b border-slate-200 pb-4">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-blue-600">
              OTP Municipal Waterworks
            </div>
            <h2 className="mt-1 text-lg font-bold text-slate-900">
              {isPaid ? 'ใบเสร็จรับเงินค่าน้ำประปา (Official Receipt)' : 'ใบแจ้งหนี้ค่าน้ำประปา (Water Bill)'}
            </h2>
            <p className="text-xs text-slate-500">
              Organization #{invoice.org_id} • Meter #{invoice.meter_id}
            </p>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-xs font-bold uppercase ring-1 ${
              isPaid
                ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/20'
                : 'bg-amber-50 text-amber-700 ring-amber-600/20'
            }`}
          >
            {invoice.status}
          </span>
        </div>

        <dl className="mb-5 grid grid-cols-2 gap-3 rounded-2xl bg-slate-50 p-4 text-sm">
          <div>
            <dt className="text-xs text-slate-500">Invoice / Receipt No.</dt>
            <dd className="font-mono font-bold text-slate-900">{invoice.inv_no}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Billing Period</dt>
            <dd className="font-semibold text-slate-900">{invoice.period_name || `Period #${invoice.period_id}`}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Previous Reading</dt>
            <dd className="font-mono">{invoice.lastmeter}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Current Reading</dt>
            <dd className="font-mono">{invoice.currentmeter}</dd>
          </div>
        </dl>

        <table className="mb-6 w-full border-t border-b border-slate-200 text-sm">
          <tbody className="divide-y divide-slate-100">
            <tr>
              <td className="py-2 text-slate-600">Water Used (m³)</td>
              <td className="py-2 text-right font-semibold">{invoice.water_used} m³</td>
            </tr>
            <tr>
              <td className="py-2 text-slate-600">Water Usage Charge</td>
              <td className="py-2 text-right font-mono">{invoice.paid.toFixed(2)} THB</td>
            </tr>
            <tr>
              <td className="py-2 text-slate-600">Meter Maintenance Fee</td>
              <td className="py-2 text-right font-mono">{invoice.reserve_meter.toFixed(2)} THB</td>
            </tr>
            <tr>
              <td className="py-2 text-slate-600">VAT (7%)</td>
              <td className="py-2 text-right font-mono">{invoice.vat.toFixed(2)} THB</td>
            </tr>
            <tr className="bg-slate-50/80 font-bold text-slate-900">
              <td className="py-3 pl-2">Total Amount</td>
              <td className="py-3 pr-2 text-right font-mono text-base text-blue-700">
                {invoice.totalpaid.toFixed(2)} THB
              </td>
            </tr>
          </tbody>
        </table>

        <div className="flex justify-end gap-2.5">
          <button type="button" className={BTN_SECONDARY} onClick={() => window.print()}>
            Print Now
          </button>
          <button type="button" className={BTN_PRIMARY} onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

// ---- Wave 1.5: Resident Portal Page (Role: user & staff) --------------------

export function ResidentPage() {
  const [selectedInvoice, setSelectedInvoice] = useState<WaterInvoice | null>(null)
  const { data, error, isPending, refetch } = useQuery({
    queryKey: ['resident-overview'],
    queryFn: fetchResidentOverview,
  })

  return (
    <section className="space-y-6">
      <ModuleHeader
        badge="Self-Service Portal"
        title="Resident Portal"
        subtitle="ระบบตรวจสอบมิเตอร์น้ำประปา ใบแจ้งหนี้/ใบเสร็จรับเงิน และสมุดบัญชีธนาคารขยะของลูกบ้าน"
      />
      {isPending && <Spinner />}
      {error && <ErrorMessage error={error} onRetry={() => void refetch()} />}
      {data && (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">Resident Account</div>
              <div className="mt-1 text-xl font-bold text-slate-900">{data.username}</div>
              <div className="mt-1 text-xs text-slate-500">บัญชีผู้ใช้งานครัวเรือน</div>
            </div>
            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
              <div className="text-xs font-semibold uppercase tracking-wider text-sky-600">Water Meters</div>
              <div className="mt-1 text-3xl font-extrabold text-slate-900">{data.water_meters.length}</div>
              <div className="mt-1 text-xs text-slate-500">มิเตอร์น้ำประปาที่ลงทะเบียน</div>
            </div>
            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
              <div className="text-xs font-semibold uppercase tracking-wider text-emerald-600">
                Recycle Bank Accounts
              </div>
              <div className="mt-1 text-3xl font-extrabold text-slate-900">{data.bank_accounts.length}</div>
              <div className="mt-1 text-xs text-slate-500">สมุดบัญชีธนาคารขยะรีไซเคิล</div>
            </div>
          </div>

          {data.invoices.length > 0 && (
            <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs">
              <div className="border-b border-slate-100 px-5 py-4">
                <h2 className="text-base font-bold text-slate-900">ประวัติใบแจ้งหนี้และใบเสร็จค่าน้ำประปา</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-5 py-3.5">Invoice No</th>
                      <th className="px-5 py-3.5">Period</th>
                      <th className="px-5 py-3.5">Units Used</th>
                      <th className="px-5 py-3.5">Total (THB)</th>
                      <th className="px-5 py-3.5">Status</th>
                      <th className="px-5 py-3.5">Receipt</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.invoices.map((inv) => (
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

// ---- Wave 1.5: Users & Zones Page (with LINE Linking Form) ------------------

export function UsersPage() {
  const qc = useQueryClient()
  const usersQ = useQuery({ queryKey: ['users'], queryFn: () => fetchUsers({ limit: 50, offset: 0 }) })
  const zonesQ = useQuery({ queryKey: ['zones'], queryFn: fetchZones })

  const [targetUserId, setTargetUserId] = useState('')
  const [lineUserId, setLineUserId] = useState('')
  const [staffCode, setStaffCode] = useState('')

  const [newUsername, setNewUsername] = useState('')
  const [newFirstname, setNewFirstname] = useState('')
  const [newLastname, setNewLastname] = useState('')
  const [newPhone, setNewPhone] = useState('')
  const [newZoneName, setNewZoneName] = useState('')

  const linkMut = useMutation({
    mutationFn: () =>
      linkUserLineAccount(Number(targetUserId), {
        line_user_id: lineUserId,
        verification_mode: 'staff_code',
        verification_code: staffCode,
      }),
    onSuccess: () => {
      setTargetUserId('')
      setLineUserId('')
      setStaffCode('')
      void qc.invalidateQueries({ queryKey: ['users'] })
    },
  })

  const createUserMut = useMutation({
    mutationFn: () =>
      createUser({
        username: newUsername,
        prefix: 'คุณ',
        firstname: newFirstname,
        lastname: newLastname,
        phone: newPhone,
      }),
    onSuccess: () => {
      setNewUsername('')
      setNewFirstname('')
      setNewLastname('')
      setNewPhone('')
      void qc.invalidateQueries({ queryKey: ['users'] })
    },
  })

  const createZoneMut = useMutation({
    mutationFn: () => createZone({ zone_name: newZoneName }),
    onSuccess: () => {
      setNewZoneName('')
      void qc.invalidateQueries({ queryKey: ['zones'] })
    },
  })

  return (
    <section className="space-y-6">
      <ModuleHeader
        badge="Wave 1.5 • Master Data & LINE OA"
        title="Users & Zones"
        subtitle="จัดการทะเบียนลูกบ้าน หมู่บ้าน/เขตพื้นที่บริการ และการผูกบัญชี LINE Official Account แบบยืนยันตัวตน"
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <form
          aria-label="Create User"
          className="flex flex-col justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs"
          onSubmit={(e) => {
            e.preventDefault()
            createUserMut.mutate()
          }}
        >
          <div>
            <h2 className="text-sm font-bold text-slate-900">ลงทะเบียนลูกบ้านใหม่ (Create User)</h2>
            <p className="mb-3 text-xs text-slate-500">เพิ่มรายชื่อผู้ใช้งานเข้าสู่องค์กรปัจจุบัน</p>
            <div className="grid grid-cols-2 gap-2.5">
              <input
                aria-label="New Username"
                className={INPUT_CLS}
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                placeholder="Username (e.g. user99)"
              />
              <input
                aria-label="Phone Number"
                className={INPUT_CLS}
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                placeholder="Phone"
              />
              <input
                aria-label="First Name"
                className={INPUT_CLS}
                value={newFirstname}
                onChange={(e) => setNewFirstname(e.target.value)}
                placeholder="First Name"
              />
              <input
                aria-label="Last Name"
                className={INPUT_CLS}
                value={newLastname}
                onChange={(e) => setNewLastname(e.target.value)}
                placeholder="Last Name"
              />
            </div>
          </div>
          <button type="submit" className={BTN_EMERALD}>
            Create User
          </button>
        </form>

        <form
          aria-label="Create Zone"
          className="flex flex-col justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs"
          onSubmit={(e) => {
            e.preventDefault()
            createZoneMut.mutate()
          }}
        >
          <div>
            <h2 className="text-sm font-bold text-slate-900">เพิ่มเขตพื้นที่ / หมู่บ้าน (Create Zone)</h2>
            <p className="mb-3 text-xs text-slate-500">สร้างโซนบริหารจัดการน้ำประปาและขยะ</p>
            <input
              aria-label="New Zone Name"
              className={`w-full ${INPUT_CLS}`}
              value={newZoneName}
              onChange={(e) => setNewZoneName(e.target.value)}
              placeholder="Zone Name (e.g. หมู่ 12)"
            />
          </div>
          <button type="submit" className={BTN_EMERALD}>
            Create Zone
          </button>
        </form>

        <form
          aria-label="Link LINE Account"
          className="flex flex-col justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs"
          onSubmit={(e) => {
            e.preventDefault()
            linkMut.mutate()
          }}
        >
          <div>
            <h2 className="text-sm font-bold text-slate-900">ผูกบัญชี LINE OA (Ownership Verified)</h2>
            <p className="mb-3 text-xs text-slate-500">ยืนยันรหัสเจ้าหน้าที่เพื่อเชื่อม LINE User ID</p>
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="mb-1 block text-[11px] font-medium text-slate-500">User ID</label>
                <input
                  aria-label="User ID"
                  className={`w-full ${INPUT_CLS}`}
                  value={targetUserId}
                  onChange={(e) => setTargetUserId(e.target.value)}
                  placeholder="e.g. 1"
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-medium text-slate-500">LINE User ID</label>
                <input
                  aria-label="LINE User ID"
                  className={`w-full ${INPUT_CLS}`}
                  value={lineUserId}
                  onChange={(e) => setLineUserId(e.target.value)}
                  placeholder="U1234567890"
                />
              </div>
              <div className="col-span-2">
                <label className="mb-1 block text-[11px] font-medium text-slate-500">Staff Verification Code</label>
                <input
                  aria-label="Staff Verification Code"
                  className={`w-full ${INPUT_CLS}`}
                  value={staffCode}
                  onChange={(e) => setStaffCode(e.target.value)}
                  placeholder="OTP-1-1-XXXX"
                />
              </div>
            </div>
          </div>
          <button type="submit" className={BTN_PRIMARY}>
            Link LINE
          </button>
        </form>
      </div>

      {usersQ.isPending && <Spinner />}
      {usersQ.error && <ErrorMessage error={usersQ.error} onRetry={() => void usersQ.refetch()} />}
      {usersQ.data && (
        <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <h2 className="text-base font-bold text-slate-900">รายชื่อผู้ใช้งาน ({usersQ.data.length})</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-5 py-3.5">ID</th>
                  <th className="px-5 py-3.5">Username</th>
                  <th className="px-5 py-3.5">Name</th>
                  <th className="px-5 py-3.5">Phone</th>
                  <th className="px-5 py-3.5">LINE Status</th>
                  <th className="px-5 py-3.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {usersQ.data.map((u) => (
                  <tr key={u.id} className="transition-colors hover:bg-slate-50/80">
                    <td className="px-5 py-3.5 font-mono text-xs text-slate-500">{u.id}</td>
                    <td className="px-5 py-3.5 font-semibold text-slate-900">{u.username}</td>
                    <td className="px-5 py-3.5 text-slate-700">{`${u.prefix}${u.firstname} ${u.lastname}`.trim()}</td>
                    <td className="px-5 py-3.5 font-mono text-xs text-slate-600">{u.phone || '—'}</td>
                    <td className="px-5 py-3.5">
                      <StatusBadge value={u.line_user_id ? 'Linked' : 'Unlinked'} />
                    </td>
                    <td className="px-5 py-3.5">
                      <StatusBadge value={u.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {zonesQ.data && zonesQ.data.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-bold text-slate-900">Zones ({zonesQ.data.length})</h2>
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {zonesQ.data.map((z) => (
              <div
                key={z.id}
                className="flex items-center justify-between rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs"
              >
                <div>
                  <div className="font-semibold text-slate-900">{z.zone_name}</div>
                  <div className="text-xs text-slate-500">Subzones: {z.subzones.length}</div>
                </div>
                <StatusBadge value={z.status || 'active'} />
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}

// ---- Wave 2: Inventory Page (Create Item + Request + Approve/Reject) --------

export function InventoryPage() {
  const qc = useQueryClient()
  const itemsQ = useQuery({ queryKey: ['inventory-items'], queryFn: fetchInventoryItems })
  const txsQ = useQuery({ queryKey: ['inventory-txs'], queryFn: fetchInventoryTransactions })

  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [unit, setUnit] = useState('ชิ้น')
  const [minStock, setMinStock] = useState('5')

  const createItemMut = useMutation({
    mutationFn: () =>
      createInventoryItem({
        code,
        name,
        unit,
        min_stock: Number(minStock) || 0,
      }),
    onSuccess: () => {
      setCode('')
      setName('')
      void qc.invalidateQueries({ queryKey: ['inventory-items'] })
    },
  })

  const [refNo, setRefNo] = useState('')
  const [itemId, setItemId] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [purpose, setPurpose] = useState('')

  const createTxMut = useMutation({
    mutationFn: () =>
      createInventoryTransaction({
        ref_no: refNo,
        item_id: Number(itemId),
        requester_id: 1,
        quantity: Number(quantity) || 1,
        purpose,
      }),
    onSuccess: () => {
      setRefNo('')
      setPurpose('')
      void qc.invalidateQueries({ queryKey: ['inventory-txs'] })
    },
  })

  const decideMut = useMutation({
    mutationFn: ({ id, decision }: { id: number; decision: 'APPROVED' | 'REJECTED' }) =>
      decideInventoryTransaction(id, { decision }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['inventory-txs'] }),
  })

  return (
    <section className="space-y-6">
      <ModuleHeader
        badge="Wave 2 • Stock & Approval Workflow"
        title="Inventory Management"
        subtitle="ระบบบริหารคลังพัสดุ เคมีภัณฑ์ประปา และการขอเบิกจ่ายพร้อมขั้นตอนอนุมัติ"
      />

      <div className="grid gap-4 md:grid-cols-2">
        <form
          aria-label="Add Inventory Item"
          className="flex flex-col justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs"
          onSubmit={(e) => {
            e.preventDefault()
            createItemMut.mutate()
          }}
        >
          <div>
            <h2 className="text-sm font-bold text-slate-900">เพิ่มรายการพัสดุใหม่ (Add Inventory Item)</h2>
            <p className="mb-3 text-xs text-slate-500">ขึ้นทะเบียนวัสดุ อุปกรณ์ หรือสารเคมีประปา</p>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              <input
                aria-label="Item Code"
                className={INPUT_CLS}
                placeholder="Code (e.g. INV-09)"
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
              <input
                aria-label="Item Name"
                className={INPUT_CLS}
                placeholder="Item Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <input
                aria-label="Item Unit"
                className={INPUT_CLS}
                placeholder="Unit"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
              />
              <input
                aria-label="Min Stock"
                className={INPUT_CLS}
                placeholder="Min"
                value={minStock}
                onChange={(e) => setMinStock(e.target.value)}
              />
            </div>
          </div>
          <button type="submit" className={BTN_PRIMARY}>
            Add Item
          </button>
        </form>

        <form
          aria-label="Create Stock Request"
          className="flex flex-col justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs"
          onSubmit={(e) => {
            e.preventDefault()
            createTxMut.mutate()
          }}
        >
          <div>
            <h2 className="text-sm font-bold text-slate-900">สร้างใบขอเบิกพัสดุ (Create Stock Request)</h2>
            <p className="mb-3 text-xs text-slate-500">ส่งคำขอเบิกวัสดุเข้าสู่คิวรออนุมัติ</p>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              <input
                aria-label="Ref No"
                className={INPUT_CLS}
                placeholder="Ref No (e.g. REQ-01)"
                value={refNo}
                onChange={(e) => setRefNo(e.target.value)}
              />
              <input
                aria-label="Request Item ID"
                className={INPUT_CLS}
                placeholder="Item ID"
                value={itemId}
                onChange={(e) => setItemId(e.target.value)}
              />
              <input
                aria-label="Quantity"
                className={INPUT_CLS}
                placeholder="Qty"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
              <input
                aria-label="Purpose"
                className={INPUT_CLS}
                placeholder="Purpose"
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
              />
            </div>
          </div>
          <button type="submit" className={BTN_EMERALD}>
            Request Stock
          </button>
        </form>
      </div>

      {itemsQ.isPending && <Spinner />}
      {itemsQ.error && <ErrorMessage error={itemsQ.error} onRetry={() => void itemsQ.refetch()} />}
      {itemsQ.data && (
        <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs">
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="text-base font-bold text-slate-900">ทะเบียนรายการพัสดุ ({itemsQ.data.length})</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-5 py-3.5">Code</th>
                  <th className="px-5 py-3.5">Name</th>
                  <th className="px-5 py-3.5">Category</th>
                  <th className="px-5 py-3.5">Unit</th>
                  <th className="px-5 py-3.5">Min Stock</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {itemsQ.data.map((item) => (
                  <tr key={item.id} className="transition-colors hover:bg-slate-50/80">
                    <td className="px-5 py-3.5 font-mono font-semibold text-blue-700">{item.code}</td>
                    <td className="px-5 py-3.5 font-semibold text-slate-900">{item.name}</td>
                    <td className="px-5 py-3.5 text-slate-600">{item.category_name}</td>
                    <td className="px-5 py-3.5 text-slate-600">{item.unit}</td>
                    <td className="px-5 py-3.5 font-mono font-semibold">{item.min_stock}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {txsQ.data && txsQ.data.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs">
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="text-base font-bold text-slate-900">Recent Approval Transactions</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-5 py-3.5">Ref No</th>
                  <th className="px-5 py-3.5">Item</th>
                  <th className="px-5 py-3.5">Qty</th>
                  <th className="px-5 py-3.5">Purpose</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {txsQ.data.map((tx) => (
                  <tr key={tx.id} className="transition-colors hover:bg-slate-50/80">
                    <td className="px-5 py-3.5 font-mono font-semibold text-slate-900">{tx.ref_no}</td>
                    <td className="px-5 py-3.5 font-medium text-slate-800">{tx.item_name}</td>
                    <td className="px-5 py-3.5 font-mono">{tx.quantity}</td>
                    <td className="px-5 py-3.5 text-slate-600">{tx.purpose}</td>
                    <td className="px-5 py-3.5">
                      <StatusBadge value={tx.status} />
                    </td>
                    <td className="space-x-2 px-5 py-3.5">
                      {tx.status.toUpperCase() === 'PENDING' && (
                        <>
                          <button
                            className="rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-emerald-700"
                            onClick={() => decideMut.mutate({ id: tx.id, decision: 'APPROVED' })}
                          >
                            Approve
                          </button>
                          <button
                            className="rounded-lg bg-rose-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-rose-700"
                            onClick={() => decideMut.mutate({ id: tx.id, decision: 'REJECTED' })}
                          >
                            Reject
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  )
}

// ---- Wave 3: FoodWaste & Carbon Emission Page (with Batch & Waste Log Forms) -

export function FoodWastePage() {
  const qc = useQueryClient()
  const { data, error, isPending, refetch } = useQuery({
    queryKey: ['foodwaste-summary'],
    queryFn: fetchFoodWasteSummary,
  })

  const [batchCode, setBatchCode] = useState('')
  const [weightKg, setWeightKg] = useState('')
  const [moisture, setMoisture] = useState<'dry' | 'good' | 'wet'>('good')

  const createBatchMut = useMutation({
    mutationFn: () => createCompostBatch({ user_id: 1, batch_code: batchCode }),
    onSuccess: () => {
      setBatchCode('')
      void qc.invalidateQueries({ queryKey: ['foodwaste-summary'] })
    },
  })

  const createLogMut = useMutation({
    mutationFn: () =>
      createWasteLog({
        user_id: 1,
        weight_kg: Number(weightKg),
        moisture,
      }),
    onSuccess: () => {
      setWeightKg('')
      void qc.invalidateQueries({ queryKey: ['foodwaste-summary'] })
    },
  })

  return (
    <section className="space-y-6">
      <ModuleHeader
        badge="Wave 3 • Organic Compost & TGO Carbon Credit"
        title="FoodWaste & Carbon Credit"
        subtitle="บริหารจัดการถังหมักรักษ์โลก บันทึกปริมาณขยะอินทรีย์ และคำนวณการลดก๊าซเรือนกระจก (kgCO2e)"
      />

      <div className="grid gap-4 md:grid-cols-2">
        <form
          aria-label="Open Compost Batch"
          className="flex flex-col justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs"
          onSubmit={(e) => {
            e.preventDefault()
            createBatchMut.mutate()
          }}
        >
          <div>
            <h2 className="text-sm font-bold text-slate-900">เปิดรอบถังหมักใหม่ (Open Compost Batch)</h2>
            <p className="mb-3 text-xs text-slate-500">กำหนดรหัสรอบการหมักขยะอินทรีย์</p>
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
          className="flex flex-col justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs"
          onSubmit={(e) => {
            e.preventDefault()
            createLogMut.mutate()
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

      {isPending && <Spinner />}
      {error && <ErrorMessage error={error} onRetry={() => void refetch()} />}
      {data && (
        <>
          <div className="grid gap-4 sm:grid-cols-4">
            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">Compost Batches</div>
              <div className="mt-1 text-3xl font-extrabold text-slate-900">{data.total_batches}</div>
            </div>
            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">Waste Logs</div>
              <div className="mt-1 text-3xl font-extrabold text-slate-900">{data.total_waste_logs}</div>
            </div>
            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
              <div className="text-xs font-semibold uppercase tracking-wider text-blue-600">Total Weight (kg)</div>
              <div className="mt-1 font-mono text-3xl font-extrabold text-slate-900">
                {data.total_weight_kg.toFixed(2)}
              </div>
            </div>
            <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50/60 p-5 shadow-xs">
              <div className="text-xs font-bold uppercase tracking-wider text-emerald-700">Carbon Saved (kgCO2e)</div>
              <div className="mt-1 font-mono text-3xl font-extrabold text-emerald-700">
                {data.total_carbon_saved_kg.toFixed(2)}
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs">
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className="text-base font-bold text-slate-900">รายการรอบถังหมัก (Compost Batches)</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-5 py-3.5">Batch Code</th>
                    <th className="px-5 py-3.5">Start Date</th>
                    <th className="px-5 py-3.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.batches.map((b) => (
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

// ---- Wave 4: KeptKaya / Recycle Bank Page (with Purchase Form & Accounts) ----

export function RecycleBankPage() {
  const qc = useQueryClient()
  const { data, error, isPending, refetch } = useQuery({
    queryKey: ['recycle-items'],
    queryFn: fetchRecycleItems,
  })
  const accountsQ = useQuery({
    queryKey: ['recycle-accounts'],
    queryFn: fetchRecycleAccounts,
  })
  const submodulesQ = useQuery({
    queryKey: ['recycle-submodules'],
    queryFn: fetchRecycleSubmodules,
  })

  const [transNo, setTransNo] = useState('')
  const [userId, setUserId] = useState('1')
  const [totalWeight, setTotalWeight] = useState('')
  const [totalAmount, setTotalAmount] = useState('')
  const [totalPoints, setTotalPoints] = useState('10')

  const [withdrawAccId, setWithdrawAccId] = useState('1')
  const [withdrawAmount, setWithdrawAmount] = useState('')
  const [withdrawNote, setWithdrawNote] = useState('')

  const [priceItemId, setPriceItemId] = useState('1')
  const [memberPrice, setMemberPrice] = useState('')
  const [dealerPrice, setDealerPrice] = useState('')
  const [itemPoint, setItemPoint] = useState('10')

  const purchaseMut = useMutation({
    mutationFn: () =>
      recordRecyclePurchase({
        trans_no: transNo,
        user_id: Number(userId) || 1,
        total_weight: Number(totalWeight),
        total_amount: Number(totalAmount),
        total_points: Number(totalPoints) || 0,
      }),
    onSuccess: () => {
      setTransNo('')
      setTotalWeight('')
      setTotalAmount('')
      void qc.invalidateQueries({ queryKey: ['recycle-accounts'] })
    },
  })

  const withdrawMut = useMutation({
    mutationFn: () =>
      withdrawRecycleBalance({
        account_id: Number(withdrawAccId) || 1,
        amount: Number(withdrawAmount),
        payout_method: 'cash',
        note: withdrawNote,
      }),
    onSuccess: () => {
      setWithdrawAmount('')
      setWithdrawNote('')
      void qc.invalidateQueries({ queryKey: ['recycle-accounts'] })
    },
  })

  const priceMut = useMutation({
    mutationFn: () =>
      setRecycleItemPrice(Number(priceItemId) || 1, {
        price_from_dealer: Number(dealerPrice) || Number(memberPrice),
        price_for_member: Number(memberPrice),
        point: Number(itemPoint) || 0,
      }),
    onSuccess: () => {
      setMemberPrice('')
      setDealerPrice('')
      void qc.invalidateQueries({ queryKey: ['recycle-items'] })
    },
  })

  return (
    <section className="space-y-6">
      <ModuleHeader
        badge="Wave 4 • KeptKaya Recycle Bank & IoT Kiosks"
        title="Recycle Bank (KeptKaya)"
        subtitle="ระบบรับซื้อขยะรีไซเคิล สมุดบัญชีเงินฝาก/แต้มสะสม การเบิกถอนเงิน ตู้ Kiosk อัจฉริยะ และกองทุนสวัสดิการชุมชน"
        right={
          data &&
          data.length > 0 && (
            <button
              type="button"
              onClick={() =>
                exportRowsToCsv(
                  'recycle-items.csv',
                  ['code', 'name', 'group', 'member_price', 'points'],
                  data.map((i) => [i.code, i.name, i.group_name, i.price_for_member, i.point]),
                )
              }
              className={BTN_SECONDARY}
            >
              Export Items CSV
            </button>
          )
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <form
          aria-label="Record Recycle Purchase"
          className="flex flex-col justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs"
          onSubmit={(e) => {
            e.preventDefault()
            purchaseMut.mutate()
          }}
        >
          <div>
            <h2 className="text-sm font-bold text-slate-900">บันทึกรับซื้อขยะ (Record Purchase)</h2>
            <p className="mb-3 text-xs text-slate-500">เพิ่มยอดเงินสะสมและแต้มเข้าบัญชีสมาชิก</p>
            <div className="grid grid-cols-2 gap-2.5">
              <input
                aria-label="Transaction No"
                className={`col-span-2 ${INPUT_CLS}`}
                placeholder="Trans No (e.g. KP-2026-01)"
                value={transNo}
                onChange={(e) => setTransNo(e.target.value)}
              />
              <input
                aria-label="Member User ID"
                className={INPUT_CLS}
                placeholder="User ID"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
              />
              <input
                aria-label="Total Weight"
                className={INPUT_CLS}
                placeholder="Weight (kg)"
                value={totalWeight}
                onChange={(e) => setTotalWeight(e.target.value)}
              />
              <input
                aria-label="Total Amount"
                className={INPUT_CLS}
                placeholder="Amount (THB)"
                value={totalAmount}
                onChange={(e) => setTotalAmount(e.target.value)}
              />
              <input
                aria-label="Total Points"
                className={INPUT_CLS}
                placeholder="Points"
                value={totalPoints}
                onChange={(e) => setTotalPoints(e.target.value)}
              />
            </div>
          </div>
          <button type="submit" className={BTN_PRIMARY}>
            Record Purchase
          </button>
        </form>

        <form
          aria-label="Withdraw Member Balance"
          className="flex flex-col justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs"
          onSubmit={(e) => {
            e.preventDefault()
            withdrawMut.mutate()
          }}
        >
          <div>
            <h2 className="text-sm font-bold text-slate-900">ถอนเงินสะสมสมาชิก (Withdraw Balance)</h2>
            <p className="mb-3 text-xs text-slate-500">หักยอดเงินฝากและบันทึกใบคำขอถอนเงินสด</p>
            <div className="grid grid-cols-2 gap-2.5">
              <input
                aria-label="Withdraw Account ID"
                className={INPUT_CLS}
                placeholder="Acc ID"
                value={withdrawAccId}
                onChange={(e) => setWithdrawAccId(e.target.value)}
              />
              <input
                aria-label="Withdraw Amount"
                className={INPUT_CLS}
                placeholder="Amount (THB)"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
              />
              <input
                aria-label="Withdraw Note"
                className={`col-span-2 ${INPUT_CLS}`}
                placeholder="Note / Ref"
                value={withdrawNote}
                onChange={(e) => setWithdrawNote(e.target.value)}
              />
            </div>
          </div>
          <button type="submit" className={BTN_AMBER}>
            Withdraw Balance
          </button>
        </form>

        <form
          aria-label="Update Item Price"
          className="flex flex-col justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs"
          onSubmit={(e) => {
            e.preventDefault()
            priceMut.mutate()
          }}
        >
          <div>
            <h2 className="text-sm font-bold text-slate-900">ปรับราคารับซื้อขยะ (Update Item Price)</h2>
            <p className="mb-3 text-xs text-slate-500">กำหนดราคารับซื้อสมาชิก/ร้านค้าและแต้มต่อหน่วย</p>
            <div className="grid grid-cols-2 gap-2.5">
              <input
                aria-label="Price Item ID"
                className={INPUT_CLS}
                placeholder="Item ID"
                value={priceItemId}
                onChange={(e) => setPriceItemId(e.target.value)}
              />
              <input
                aria-label="Item Points"
                className={INPUT_CLS}
                placeholder="Points"
                value={itemPoint}
                onChange={(e) => setItemPoint(e.target.value)}
              />
              <input
                aria-label="Member Price (THB)"
                className={INPUT_CLS}
                placeholder="Member THB"
                value={memberPrice}
                onChange={(e) => setMemberPrice(e.target.value)}
              />
              <input
                aria-label="Dealer Price (THB)"
                className={INPUT_CLS}
                placeholder="Dealer THB"
                value={dealerPrice}
                onChange={(e) => setDealerPrice(e.target.value)}
              />
            </div>
          </div>
          <button type="submit" className={BTN_EMERALD}>
            Set Item Price
          </button>
        </form>
      </div>

      {isPending && <Spinner />}
      {error && <ErrorMessage error={error} onRetry={() => void refetch()} />}
      {data && (
        <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs">
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="text-base font-bold text-slate-900">รายการขยะรีไซเคิลและราคารับซื้อ ({data.length})</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-5 py-3.5">Code</th>
                  <th className="px-5 py-3.5">Item Name</th>
                  <th className="px-5 py-3.5">Group</th>
                  <th className="px-5 py-3.5">Member Price</th>
                  <th className="px-5 py-3.5">Points</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.map((item) => (
                  <tr key={item.id} className="transition-colors hover:bg-slate-50/80">
                    <td className="px-5 py-3.5 font-mono font-semibold text-emerald-700">{item.code}</td>
                    <td className="px-5 py-3.5 font-semibold text-slate-900">{item.name}</td>
                    <td className="px-5 py-3.5 text-slate-600">{item.group_name}</td>
                    <td className="px-5 py-3.5 font-mono font-semibold text-slate-900">
                      {item.price_for_member.toFixed(2)}
                    </td>
                    <td className="px-5 py-3.5 font-mono text-blue-700">{item.point}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {accountsQ.data && accountsQ.data.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs">
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="text-base font-bold text-slate-900">Member Bank Accounts ({accountsQ.data.length})</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-5 py-3.5">Account No</th>
                  <th className="px-5 py-3.5">User ID</th>
                  <th className="px-5 py-3.5">Balance (THB)</th>
                  <th className="px-5 py-3.5">Points</th>
                  <th className="px-5 py-3.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {accountsQ.data.map((acc) => (
                  <tr key={acc.id} className="transition-colors hover:bg-slate-50/80">
                    <td className="px-5 py-3.5 font-mono font-semibold text-slate-900">{acc.account_no}</td>
                    <td className="px-5 py-3.5 font-mono text-slate-600">{acc.user_id}</td>
                    <td className="px-5 py-3.5 font-mono font-bold text-emerald-700">{acc.balance.toFixed(2)}</td>
                    <td className="px-5 py-3.5 font-mono">{acc.points}</td>
                    <td className="px-5 py-3.5">
                      <StatusBadge value={acc.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {submodulesQ.data && (
        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs">
            <h2 className="mb-3 text-base font-bold text-slate-900">
              IoT Smart Kiosks ({submodulesQ.data.kiosks.length})
            </h2>
            {submodulesQ.data.kiosks.length === 0 ? (
              <p className="text-xs text-slate-500">No kiosks registered</p>
            ) : (
              <ul className="divide-y divide-slate-100 text-sm">
                {submodulesQ.data.kiosks.map((k) => (
                  <li key={k.id} className="flex items-center justify-between py-2.5">
                    <span className="font-semibold text-slate-900">{k.name}</span>
                    <span className="text-xs font-medium text-slate-600">
                      {k.status} • {k.total_waste_count} items
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs">
            <h2 className="mb-3 text-base font-bold text-slate-900">
              Community Welfare & Annual Trash ({submodulesQ.data.welfare_configs.length} rules /{' '}
              {submodulesQ.data.annual_trash_subscriptions.length} bins)
            </h2>
            {submodulesQ.data.welfare_configs.map((wc) => (
              <div key={wc.id} className="rounded-xl bg-slate-50 p-3.5 text-sm text-slate-700">
                <div className="font-semibold text-slate-900">
                  Default Payout: {wc.default_payout_amount.toFixed(2)} THB
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  Min Active: {wc.min_months_active} months • Min Weight: {wc.min_total_weight} kg
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}

// ---- Wave 5: Tabwater Page (Meter Reading Form + Meters & Invoices + Pay) ---

export function TabwaterPage() {
  const qc = useQueryClient()
  const [selectedInvoice, setSelectedInvoice] = useState<WaterInvoice | null>(null)
  const metersQ = useQuery({
    queryKey: ['tabwater-meters'],
    queryFn: () => fetchTabwaterMeters({ limit: 50, offset: 0 }),
  })
  const invoicesQ = useQuery({
    queryKey: ['tabwater-invoices'],
    queryFn: () => fetchTabwaterInvoices({ limit: 50, offset: 0 }),
  })
  const periodsQ = useQuery({ queryKey: ['tabwater-periods'], queryFn: fetchTabwaterPeriods })

  const [invNo, setInvNo] = useState('')
  const [meterId, setMeterId] = useState('1')
  const [periodId, setPeriodId] = useState('1')
  const [currentMeter, setCurrentMeter] = useState('')

  const [newPeriodName, setNewPeriodName] = useState('')
  const [newMeterUserId, setNewMeterUserId] = useState('1')
  const [newMeterNo, setNewMeterNo] = useState('')
  const [newSubscriberName, setNewSubscriberName] = useState('')
  const [newMeterAddr, setNewMeterAddr] = useState('')

  const readingMut = useMutation({
    mutationFn: () =>
      recordTabwaterReading({
        inv_no: invNo,
        meter_id: Number(meterId) || 1,
        period_id: Number(periodId) || 1,
        current_meter: Number(currentMeter),
        reserve_fee: 10,
        vat_percent: 7,
      }),
    onSuccess: () => {
      setInvNo('')
      setCurrentMeter('')
      void qc.invalidateQueries({ queryKey: ['tabwater-meters'] })
      void qc.invalidateQueries({ queryKey: ['tabwater-invoices'] })
    },
  })

  const createPeriodMut = useMutation({
    mutationFn: () => createTabwaterPeriod({ period_name: newPeriodName }),
    onSuccess: () => {
      setNewPeriodName('')
      void qc.invalidateQueries({ queryKey: ['tabwater-periods'] })
    },
  })

  const createMeterMut = useMutation({
    mutationFn: () =>
      createTabwaterMeter({
        user_id: Number(newMeterUserId) || 1,
        meternumber: newMeterNo,
        submeter_name: newSubscriberName,
        meter_address: newMeterAddr,
      }),
    onSuccess: () => {
      setNewMeterNo('')
      setNewSubscriberName('')
      setNewMeterAddr('')
      void qc.invalidateQueries({ queryKey: ['tabwater-meters'] })
    },
  })

  const payMut = useMutation({
    mutationFn: (invoiceId: number) => payTabwaterInvoice(invoiceId),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['tabwater-invoices'] }),
  })

  return (
    <section className="space-y-6">
      <ModuleHeader
        badge="Wave 5 • Municipal Waterworks & Progressive Billing"
        title="Tabwater Management"
        subtitle="ระบบบริหารกิจการประปาหมู่บ้าน เปิดรอบบิลประจำเดือน ขึ้นทะเบียนมิเตอร์ จดเลขมิเตอร์ และรับชำระค่าน้ำประปา"
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <form
          aria-label="Open Billing Period"
          className="flex flex-col justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs"
          onSubmit={(e) => {
            e.preventDefault()
            createPeriodMut.mutate()
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
            {periodsQ.data && periodsQ.data.length > 0 && (
              <div className="mt-2.5 text-xs text-slate-500">
                Active Periods: {periodsQ.data.map((p) => `#${p.id} (${p.period_name})`).slice(0, 3).join(', ')}
              </div>
            )}
          </div>
          <button type="submit" className={BTN_EMERALD}>
            Open Period
          </button>
        </form>

        <form
          aria-label="Register Water Meter"
          className="flex flex-col justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs"
          onSubmit={(e) => {
            e.preventDefault()
            createMeterMut.mutate()
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
          className="flex flex-col justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs"
          onSubmit={(e) => {
            e.preventDefault()
            readingMut.mutate()
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

      {metersQ.isPending && <Spinner />}
      {metersQ.error && <ErrorMessage error={metersQ.error} onRetry={() => void metersQ.refetch()} />}
      {metersQ.data && (
        <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs">
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="text-base font-bold text-slate-900">ทะเบียนมิเตอร์น้ำประปา ({metersQ.data.length})</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-5 py-3.5">Meter No</th>
                  <th className="px-5 py-3.5">Subscriber</th>
                  <th className="px-5 py-3.5">Address</th>
                  <th className="px-5 py-3.5">Last Reading</th>
                  <th className="px-5 py-3.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {metersQ.data.map((m) => (
                  <tr key={m.meter_id} className="transition-colors hover:bg-slate-50/80">
                    <td className="px-5 py-3.5 font-mono font-semibold text-blue-700">{m.meternumber}</td>
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

      {invoicesQ.data && invoicesQ.data.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-5 py-4">
            <h2 className="text-base font-bold text-slate-900">Water Invoices</h2>
            <button
              type="button"
              onClick={() =>
                exportRowsToCsv(
                  'tabwater-invoices.csv',
                  ['inv_no', 'period', 'water_used', 'totalpaid', 'status'],
                  invoicesQ.data.map((i) => [i.inv_no, i.period_name, i.water_used, i.totalpaid, i.status]),
                )
              }
              className={BTN_SECONDARY}
            >
              Export Invoices CSV
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-5 py-3.5">Invoice No</th>
                  <th className="px-5 py-3.5">Period</th>
                  <th className="px-5 py-3.5">Units Used</th>
                  <th className="px-5 py-3.5">Total (THB)</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invoicesQ.data.map((inv) => (
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
                          className="rounded-xl bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-2xs hover:bg-blue-700"
                          onClick={() => payMut.mutate(inv.id)}
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
