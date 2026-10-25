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

// ---- Shared AdminLTE / Soft-UI White Theme Primitives -----------------------

const INPUT_CLS =
  'rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-sky-600 focus:bg-white'
const BTN_PRIMARY =
  'inline-flex items-center justify-center rounded-lg bg-sky-600 px-4 py-2 text-xs font-bold text-white shadow-2xs hover:bg-sky-700'
const BTN_EMERALD =
  'inline-flex items-center justify-center rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-2xs hover:bg-emerald-700'
const BTN_AMBER =
  'inline-flex items-center justify-center rounded-lg bg-amber-500 px-4 py-2 text-xs font-bold text-white shadow-2xs hover:bg-amber-600'
const BTN_SECONDARY =
  'inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50'

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
    <span className={`inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-semibold ring-1 ${tone}`}>
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
              <td className="py-3 pr-2 text-right font-mono text-base text-sky-700">
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
  const [searchTerm, setSearchTerm] = useState('')
  const { data, error, isPending, refetch } = useQuery({
    queryKey: ['resident-overview'],
    queryFn: fetchResidentOverview,
  })

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
  const [userSearch, setUserSearch] = useState('')

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

  const filteredUsers = (usersQ.data ?? []).filter(
    (u) =>
      u.username.toLowerCase().includes(userSearch.toLowerCase()) ||
      `${u.prefix}${u.firstname} ${u.lastname}`.toLowerCase().includes(userSearch.toLowerCase()) ||
      (u.phone || '').includes(userSearch),
  )

  return (
    <section className="space-y-6">
      <ModuleHeader
        badge="ผู้ดูแลระบบ • ตั้งค่าผู้ใช้งานและพื้นที่"
        title="Users & Zones (ทะเบียนสมาชิก หมู่บ้าน และ LINE OA)"
        subtitle="จัดการทะเบียนลูกบ้าน หมู่บ้าน/เขตพื้นที่บริการ และการผูกบัญชี LINE Official Account แบบยืนยันตัวตน"
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <form
          aria-label="Create User"
          className="adminlte-card adminlte-card-success flex flex-col justify-between gap-3 p-5"
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
          className="adminlte-card adminlte-card-info flex flex-col justify-between gap-3 p-5"
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
          className="adminlte-card adminlte-card-primary flex flex-col justify-between gap-3 p-5"
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
        <div className="adminlte-card overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
            <h2 className="text-base font-bold text-slate-900">รายชื่อผู้ใช้งาน ({filteredUsers.length})</h2>
            <input
              type="search"
              placeholder="ค้นหาชื่อ / Username / เบอร์โทร..."
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              className="w-60 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-800"
            />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-5 py-3.5">ID</th>
                  <th className="px-5 py-3.5">Username</th>
                  <th className="px-5 py-3.5">ชื่อ-นามสกุล (Name)</th>
                  <th className="px-5 py-3.5">เบอร์โทรศัพท์</th>
                  <th className="px-5 py-3.5">LINE Status</th>
                  <th className="px-5 py-3.5">สถานะ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.map((u) => (
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
          <h2 className="text-base font-bold text-slate-900">เขตพื้นที่ / หมู่บ้าน ({zonesQ.data.length})</h2>
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {zonesQ.data.map((z) => (
              <div key={z.id} className="adminlte-card flex items-center justify-between p-4">
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
  const [itemSearch, setItemSearch] = useState('')

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

  const filteredItems = (itemsQ.data ?? []).filter(
    (it) =>
      it.code.toLowerCase().includes(itemSearch.toLowerCase()) ||
      it.name.toLowerCase().includes(itemSearch.toLowerCase()),
  )

  return (
    <section className="space-y-6">
      <ModuleHeader
        badge="คลังพัสดุ • Stock & Approval Workflow"
        title="Inventory Management (ระบบบริหารคลังพัสดุและเบิกจ่าย)"
        subtitle="ระบบบริหารคลังพัสดุ เคมีภัณฑ์ประปา และการขอเบิกจ่ายพร้อมขั้นตอนอนุมัติ"
      />

      <div className="grid gap-4 md:grid-cols-2">
        <form
          aria-label="Add Inventory Item"
          className="adminlte-card adminlte-card-primary flex flex-col justify-between gap-3 p-5"
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
          className="adminlte-card adminlte-card-warning flex flex-col justify-between gap-3 p-5"
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
        <div className="adminlte-card overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
            <h2 className="text-base font-bold text-slate-900">ทะเบียนรายการพัสดุ ({filteredItems.length})</h2>
            <input
              type="search"
              placeholder="ค้นหารหัส / ชื่อพัสดุ..."
              value={itemSearch}
              onChange={(e) => setItemSearch(e.target.value)}
              className="w-56 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-800"
            />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-5 py-3.5">รหัสพัสดุ (Code)</th>
                  <th className="px-5 py-3.5">รายการพัสดุ (Name)</th>
                  <th className="px-5 py-3.5">หมวดหมู่</th>
                  <th className="px-5 py-3.5">หน่วยนับ</th>
                  <th className="px-5 py-3.5">จำนวนขั้นต่ำ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredItems.map((item) => (
                  <tr key={item.id} className="transition-colors hover:bg-slate-50/80">
                    <td className="px-5 py-3.5 font-mono font-semibold text-sky-700">{item.code}</td>
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
        <div className="adminlte-card overflow-hidden">
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="text-base font-bold text-slate-900">รายการคำขอเบิกและอนุมัติพัสดุ (Approval Transactions)</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-5 py-3.5">เลขที่อ้างอิง</th>
                  <th className="px-5 py-3.5">รายการพัสดุ</th>
                  <th className="px-5 py-3.5">จำนวน</th>
                  <th className="px-5 py-3.5">วัตถุประสงค์</th>
                  <th className="px-5 py-3.5">สถานะ</th>
                  <th className="px-5 py-3.5">การอนุมัติ</th>
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
            createBatchMut.mutate()
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
            <div className="adminlte-card adminlte-card-info p-5">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400">รอบถังหมักทั้งหมด</div>
              <div className="mt-1 text-3xl font-extrabold text-slate-900">{data.total_batches}</div>
            </div>
            <div className="adminlte-card adminlte-card-primary p-5">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400">จำนวนครั้งที่บันทึก</div>
              <div className="mt-1 text-3xl font-extrabold text-slate-900">{data.total_waste_logs}</div>
            </div>
            <div className="adminlte-card adminlte-card-warning p-5">
              <div className="text-xs font-bold uppercase tracking-wider text-amber-600">น้ำหนักขยะเปียกรวม (kg)</div>
              <div className="mt-1 font-mono text-3xl font-extrabold text-slate-900">
                {data.total_weight_kg.toFixed(2)}
              </div>
            </div>
            <div className="adminlte-card adminlte-card-success bg-emerald-50/40 p-5">
              <div className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                คาร์บอนเครดิตสะสม (kgCO2e)
              </div>
              <div className="mt-1 font-mono text-3xl font-extrabold text-emerald-700">
                {data.total_carbon_saved_kg.toFixed(2)}
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
  const [recycleSearch, setRecycleSearch] = useState('')

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

  const filteredItems = (data ?? []).filter(
    (item) =>
      item.code.toLowerCase().includes(recycleSearch.toLowerCase()) ||
      item.name.toLowerCase().includes(recycleSearch.toLowerCase()) ||
      item.group_name.toLowerCase().includes(recycleSearch.toLowerCase()),
  )

  return (
    <section className="space-y-6">
      <ModuleHeader
        badge="ธนาคารขยะรีไซเคิล • KeptKaya & IoT Kiosks"
        title="Recycle Bank (KeptKaya)"
        subtitle="ระบบรับซื้อขยะรีไซเคิล สมุดบัญชีเงินฝาก/แต้มสะสม การเบิกถอนเงิน ตู้คืนขวดอัตโนมัติ และกองทุนสวัสดิการชุมชน"
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
          className="adminlte-card adminlte-card-primary flex flex-col justify-between gap-3 p-5"
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
          className="adminlte-card adminlte-card-warning flex flex-col justify-between gap-3 p-5"
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
          className="adminlte-card adminlte-card-success flex flex-col justify-between gap-3 p-5"
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
        <div className="adminlte-card overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
            <h2 className="text-base font-bold text-slate-900">
              รายการขยะรีไซเคิลและราคารับซื้อ ({filteredItems.length})
            </h2>
            <input
              type="search"
              placeholder="ค้นหารหัส / ชื่อขยะรีไซเคิล..."
              value={recycleSearch}
              onChange={(e) => setRecycleSearch(e.target.value)}
              className="w-56 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-800"
            />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-5 py-3.5">รหัส (Code)</th>
                  <th className="px-5 py-3.5">ประเภทขยะรีไซเคิล (Item Name)</th>
                  <th className="px-5 py-3.5">หมวดหมู่ (Group)</th>
                  <th className="px-5 py-3.5">ราคารับซื้อสมาชิก (THB)</th>
                  <th className="px-5 py-3.5">แต้มสะสม (Points)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredItems.map((item) => (
                  <tr key={item.id} className="transition-colors hover:bg-slate-50/80">
                    <td className="px-5 py-3.5 font-mono font-semibold text-emerald-700">{item.code}</td>
                    <td className="px-5 py-3.5 font-semibold text-slate-900">{item.name}</td>
                    <td className="px-5 py-3.5 text-slate-600">{item.group_name}</td>
                    <td className="px-5 py-3.5 font-mono font-semibold text-slate-900">
                      {item.price_for_member.toFixed(2)}
                    </td>
                    <td className="px-5 py-3.5 font-mono text-sky-700">{item.point}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {accountsQ.data && accountsQ.data.length > 0 && (
        <div className="adminlte-card overflow-hidden">
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="text-base font-bold text-slate-900">
              สมุดบัญชีเงินฝากธนาคารขยะรีไซเคิล ({accountsQ.data.length})
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-5 py-3.5">เลขที่บัญชี (Account No)</th>
                  <th className="px-5 py-3.5">รหัสสมาชิก (User ID)</th>
                  <th className="px-5 py-3.5">ยอดเงินคงเหลือ (THB)</th>
                  <th className="px-5 py-3.5">แต้มสะสม (Points)</th>
                  <th className="px-5 py-3.5">สถานะ</th>
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
          <div className="adminlte-card adminlte-card-info p-6">
            <h2 className="mb-3 text-base font-bold text-slate-900">
              ตู้คืนขวดอัตโนมัติ • IoT Smart Kiosks ({submodulesQ.data.kiosks.length})
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

          <div className="adminlte-card adminlte-card-success p-6">
            <h2 className="mb-3 text-base font-bold text-slate-900">
              กองทุนฌาปนกิจ & ค่าถังขยะรายปี ({submodulesQ.data.welfare_configs.length} rules /{' '}
              {submodulesQ.data.annual_trash_subscriptions.length} bins)
            </h2>
            {submodulesQ.data.welfare_configs.map((wc) => (
              <div key={wc.id} className="rounded-xl border border-slate-100 bg-slate-50 p-3.5 text-sm text-slate-700">
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

// ---- Wave 5: Tabwater Page (Matches otp2025/resources/views/dashboard.blade.php) ---

export function TabwaterPage() {
  const qc = useQueryClient()
  const [selectedInvoice, setSelectedInvoice] = useState<WaterInvoice | null>(null)
  const [meterSearch, setMeterSearch] = useState('')
  const [invoiceSearch, setInvoiceSearch] = useState('')

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

  const totalMeters = metersQ.data?.length ?? 0
  const totalWaterUsed = (invoicesQ.data ?? []).reduce((acc, i) => acc + i.water_used, 0)
  const totalPaidAmount = (invoicesQ.data ?? [])
    .filter((i) => i.status === 'paid')
    .reduce((acc, i) => acc + i.totalpaid, 0)
  const unpaidCount = (invoicesQ.data ?? []).filter((i) => i.status !== 'paid').length

  const filteredMeters = (metersQ.data ?? []).filter(
    (m) =>
      m.meternumber.toLowerCase().includes(meterSearch.toLowerCase()) ||
      m.submeter_name.toLowerCase().includes(meterSearch.toLowerCase()) ||
      m.meter_address.toLowerCase().includes(meterSearch.toLowerCase()),
  )

  const filteredInvoices = (invoicesQ.data ?? []).filter(
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

      {/* ====================================================================
          Summary Card & KPI Row (matches otp2025/resources/views/dashboard.blade.php)
         ==================================================================== */}
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
                  <div className="text-xl font-extrabold text-emerald-700">{periodsQ.data?.length ?? 1} งวด</div>
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

      {/* ====================================================================
          3 Action Forms (Open Period, Register Meter, Record Reading)
         ==================================================================== */}
      <div className="grid gap-4 lg:grid-cols-3">
        <form
          aria-label="Open Billing Period"
          className="adminlte-card adminlte-card-info flex flex-col justify-between gap-3 p-5"
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
          className="adminlte-card adminlte-card-success flex flex-col justify-between gap-3 p-5"
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
          className="adminlte-card adminlte-card-primary flex flex-col justify-between gap-3 p-5"
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

      {invoicesQ.data && invoicesQ.data.length > 0 && (
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
                    invoicesQ.data.map((i) => [i.inv_no, i.period_name, i.water_used, i.totalpaid, i.status]),
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
