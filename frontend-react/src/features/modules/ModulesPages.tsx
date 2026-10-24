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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
    >
      <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl border">
        <div className="mb-4 flex items-start justify-between border-b pb-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              {isPaid ? 'ใบเสร็จรับเงินค่าน้ำประปา (Official Receipt)' : 'ใบแจ้งหนี้ค่าน้ำประปา (Water Bill)'}
            </h2>
            <p className="text-xs text-slate-500">Organization #{invoice.org_id} • Meter #{invoice.meter_id}</p>
          </div>
          <span
            className={`rounded px-2.5 py-0.5 text-xs font-semibold uppercase ${
              isPaid ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
            }`}
          >
            {invoice.status}
          </span>
        </div>

        <dl className="mb-4 grid grid-cols-2 gap-2 text-sm">
          <div>
            <dt className="text-xs text-slate-500">Invoice / Receipt No.</dt>
            <dd className="font-mono font-semibold">{invoice.inv_no}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Billing Period</dt>
            <dd className="font-medium">{invoice.period_name || `Period #${invoice.period_id}`}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Previous Reading</dt>
            <dd>{invoice.lastmeter}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Current Reading</dt>
            <dd>{invoice.currentmeter}</dd>
          </div>
        </dl>

        <table className="mb-4 w-full border-t border-b text-sm">
          <tbody>
            <tr className="border-b">
              <td className="py-1.5 text-slate-600">Water Used (m³)</td>
              <td className="py-1.5 text-right font-medium">{invoice.water_used} m³</td>
            </tr>
            <tr className="border-b">
              <td className="py-1.5 text-slate-600">Water Usage Charge</td>
              <td className="py-1.5 text-right">{invoice.paid.toFixed(2)} THB</td>
            </tr>
            <tr className="border-b">
              <td className="py-1.5 text-slate-600">Meter Maintenance Fee</td>
              <td className="py-1.5 text-right">{invoice.reserve_meter.toFixed(2)} THB</td>
            </tr>
            <tr className="border-b">
              <td className="py-1.5 text-slate-600">VAT (7%)</td>
              <td className="py-1.5 text-right">{invoice.vat.toFixed(2)} THB</td>
            </tr>
            <tr className="font-bold text-slate-900">
              <td className="py-2">Total Amount</td>
              <td className="py-2 text-right text-base">{invoice.totalpaid.toFixed(2)} THB</td>
            </tr>
          </tbody>
        </table>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            className="rounded border px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100"
            onClick={() => window.print()}
          >
            Print Now
          </button>
          <button
            type="button"
            className="rounded bg-slate-800 px-3 py-1.5 text-sm text-white hover:bg-slate-900"
            onClick={onClose}
          >
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
      <h1 className="text-2xl font-semibold">Resident Portal</h1>
      {isPending && <Spinner />}
      {error && <ErrorMessage error={error} onRetry={() => void refetch()} />}
      {data && (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded bg-white p-4 shadow">
              <div className="text-xs text-slate-500">Resident Account</div>
              <div className="text-lg font-semibold">{data.username}</div>
            </div>
            <div className="rounded bg-white p-4 shadow">
              <div className="text-xs text-slate-500">Water Meters</div>
              <div className="text-2xl font-bold">{data.water_meters.length}</div>
            </div>
            <div className="rounded bg-white p-4 shadow">
              <div className="text-xs text-slate-500">Recycle Bank Accounts</div>
              <div className="text-2xl font-bold">{data.bank_accounts.length}</div>
            </div>
          </div>

          {data.invoices.length > 0 && (
            <div className="overflow-x-auto rounded bg-white shadow">
              <table className="w-full text-left text-sm">
                <thead className="border-b bg-slate-100 text-slate-600">
                  <tr>
                    <th className="px-4 py-2">Invoice No</th>
                    <th className="px-4 py-2">Period</th>
                    <th className="px-4 py-2">Units Used</th>
                    <th className="px-4 py-2">Total (THB)</th>
                    <th className="px-4 py-2">Status</th>
                    <th className="px-4 py-2">Receipt</th>
                  </tr>
                </thead>
                <tbody>
                  {data.invoices.map((inv) => (
                    <tr key={inv.id} className="border-b last:border-0">
                      <td className="px-4 py-2 font-mono">{inv.inv_no}</td>
                      <td className="px-4 py-2">{inv.period_name || '—'}</td>
                      <td className="px-4 py-2">{inv.water_used}</td>
                      <td className="px-4 py-2">{inv.totalpaid.toFixed(2)}</td>
                      <td className="px-4 py-2">{inv.status}</td>
                      <td className="px-4 py-2">
                        <button
                          type="button"
                          data-testid={`print-invoice-${inv.id}`}
                          className="rounded border px-2 py-0.5 text-xs text-slate-700 hover:bg-slate-100"
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
    <section className="space-y-8">
      <div>
        <h1 className="mb-4 text-2xl font-semibold">Users & Zones</h1>

        <div className="mb-6 grid gap-4 md:grid-cols-2">
          <form
            aria-label="Create User"
            className="flex flex-wrap items-end gap-2 rounded bg-white p-4 shadow-sm border text-sm"
            onSubmit={(e) => {
              e.preventDefault()
              createUserMut.mutate()
            }}
          >
            <input
              aria-label="New Username"
              className="rounded border px-2 py-1"
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
              placeholder="Username (e.g. user99)"
            />
            <input
              aria-label="First Name"
              className="rounded border px-2 py-1"
              value={newFirstname}
              onChange={(e) => setNewFirstname(e.target.value)}
              placeholder="First Name"
            />
            <input
              aria-label="Last Name"
              className="rounded border px-2 py-1"
              value={newLastname}
              onChange={(e) => setNewLastname(e.target.value)}
              placeholder="Last Name"
            />
            <input
              aria-label="Phone Number"
              className="rounded border px-2 py-1"
              value={newPhone}
              onChange={(e) => setNewPhone(e.target.value)}
              placeholder="Phone"
            />
            <button type="submit" className="rounded bg-emerald-700 px-3 py-1 text-white hover:bg-emerald-800">
              Create User
            </button>
          </form>

          <form
            aria-label="Create Zone"
            className="flex flex-wrap items-end gap-2 rounded bg-white p-4 shadow-sm border text-sm"
            onSubmit={(e) => {
              e.preventDefault()
              createZoneMut.mutate()
            }}
          >
            <input
              aria-label="New Zone Name"
              className="rounded border px-2 py-1"
              value={newZoneName}
              onChange={(e) => setNewZoneName(e.target.value)}
              placeholder="Zone Name (e.g. หมู่ 12)"
            />
            <button type="submit" className="rounded bg-emerald-700 px-3 py-1 text-white hover:bg-emerald-800">
              Create Zone
            </button>
          </form>
        </div>

        <form
          aria-label="Link LINE Account"
          className="mb-6 flex flex-wrap items-end gap-3 rounded bg-white p-4 shadow-sm border text-sm"
          onSubmit={(e) => {
            e.preventDefault()
            linkMut.mutate()
          }}
        >
          <div>
            <label className="block text-xs text-slate-500">User ID</label>
            <input
              aria-label="User ID"
              className="rounded border px-2 py-1"
              value={targetUserId}
              onChange={(e) => setTargetUserId(e.target.value)}
              placeholder="e.g. 1"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500">LINE User ID</label>
            <input
              aria-label="LINE User ID"
              className="rounded border px-2 py-1"
              value={lineUserId}
              onChange={(e) => setLineUserId(e.target.value)}
              placeholder="U1234567890"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500">Staff Verification Code</label>
            <input
              aria-label="Staff Verification Code"
              className="rounded border px-2 py-1"
              value={staffCode}
              onChange={(e) => setStaffCode(e.target.value)}
              placeholder="OTP-1-1-XXXX"
            />
          </div>
          <button type="submit" className="rounded bg-blue-700 px-3 py-1.5 text-white hover:bg-blue-800">
            Link LINE
          </button>
        </form>

        {usersQ.isPending && <Spinner />}
        {usersQ.error && <ErrorMessage error={usersQ.error} onRetry={() => void usersQ.refetch()} />}
        {usersQ.data && (
          <div className="overflow-x-auto rounded bg-white shadow">
            <table className="w-full text-left text-sm">
              <thead className="border-b bg-slate-100 text-slate-600">
                <tr>
                  <th className="px-4 py-2">ID</th>
                  <th className="px-4 py-2">Username</th>
                  <th className="px-4 py-2">Name</th>
                  <th className="px-4 py-2">Phone</th>
                  <th className="px-4 py-2">LINE Status</th>
                  <th className="px-4 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {usersQ.data.map((u) => (
                  <tr key={u.id} className="border-b last:border-0">
                    <td className="px-4 py-2 font-mono">{u.id}</td>
                    <td className="px-4 py-2 font-medium">{u.username}</td>
                    <td className="px-4 py-2">{`${u.prefix}${u.firstname} ${u.lastname}`.trim()}</td>
                    <td className="px-4 py-2">{u.phone || '—'}</td>
                    <td className="px-4 py-2">{u.line_user_id ? 'Linked' : 'Unlinked'}</td>
                    <td className="px-4 py-2">{u.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {zonesQ.data && zonesQ.data.length > 0 && (
        <div>
          <h2 className="mb-3 text-lg font-semibold">Zones ({zonesQ.data.length})</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            {zonesQ.data.map((z) => (
              <div key={z.id} className="rounded bg-white p-3 shadow-sm border">
                <div className="font-medium">{z.zone_name}</div>
                <div className="text-xs text-slate-500">Subzones: {z.subzones.length}</div>
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
    <section className="space-y-8">
      <div>
        <h1 className="mb-4 text-2xl font-semibold">Inventory Management</h1>

        <div className="mb-6 grid gap-4 md:grid-cols-2">
          <form
            aria-label="Add Inventory Item"
            className="flex flex-wrap items-end gap-2 rounded bg-white p-4 shadow-sm border text-sm"
            onSubmit={(e) => {
              e.preventDefault()
              createItemMut.mutate()
            }}
          >
            <input
              aria-label="Item Code"
              className="rounded border px-2 py-1"
              placeholder="Code (e.g. INV-09)"
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
            <input
              aria-label="Item Name"
              className="rounded border px-2 py-1"
              placeholder="Item Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <input
              aria-label="Item Unit"
              className="w-20 rounded border px-2 py-1"
              placeholder="Unit"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
            />
            <input
              aria-label="Min Stock"
              className="w-20 rounded border px-2 py-1"
              placeholder="Min"
              value={minStock}
              onChange={(e) => setMinStock(e.target.value)}
            />
            <button type="submit" className="rounded bg-blue-700 px-3 py-1 text-white hover:bg-blue-800">
              Add Item
            </button>
          </form>

          <form
            aria-label="Create Stock Request"
            className="flex flex-wrap items-end gap-2 rounded bg-white p-4 shadow-sm border text-sm"
            onSubmit={(e) => {
              e.preventDefault()
              createTxMut.mutate()
            }}
          >
            <input
              aria-label="Ref No"
              className="rounded border px-2 py-1"
              placeholder="Ref No (e.g. REQ-01)"
              value={refNo}
              onChange={(e) => setRefNo(e.target.value)}
            />
            <input
              aria-label="Request Item ID"
              className="w-20 rounded border px-2 py-1"
              placeholder="Item ID"
              value={itemId}
              onChange={(e) => setItemId(e.target.value)}
            />
            <input
              aria-label="Quantity"
              className="w-16 rounded border px-2 py-1"
              placeholder="Qty"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
            <input
              aria-label="Purpose"
              className="rounded border px-2 py-1"
              placeholder="Purpose"
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
            />
            <button type="submit" className="rounded bg-slate-800 px-3 py-1 text-white hover:bg-slate-900">
              Request Stock
            </button>
          </form>
        </div>

        {itemsQ.isPending && <Spinner />}
        {itemsQ.error && <ErrorMessage error={itemsQ.error} onRetry={() => void itemsQ.refetch()} />}
        {itemsQ.data && (
          <div className="overflow-x-auto rounded bg-white shadow">
            <table className="w-full text-left text-sm">
              <thead className="border-b bg-slate-100 text-slate-600">
                <tr>
                  <th className="px-4 py-2">Code</th>
                  <th className="px-4 py-2">Name</th>
                  <th className="px-4 py-2">Category</th>
                  <th className="px-4 py-2">Unit</th>
                  <th className="px-4 py-2">Min Stock</th>
                </tr>
              </thead>
              <tbody>
                {itemsQ.data.map((item) => (
                  <tr key={item.id} className="border-b last:border-0">
                    <td className="px-4 py-2 font-mono">{item.code}</td>
                    <td className="px-4 py-2 font-medium">{item.name}</td>
                    <td className="px-4 py-2">{item.category_name}</td>
                    <td className="px-4 py-2">{item.unit}</td>
                    <td className="px-4 py-2">{item.min_stock}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {txsQ.data && txsQ.data.length > 0 && (
        <div>
          <h2 className="mb-3 text-lg font-semibold">Recent Approval Transactions</h2>
          <div className="overflow-x-auto rounded bg-white shadow">
            <table className="w-full text-left text-sm">
              <thead className="border-b bg-slate-100 text-slate-600">
                <tr>
                  <th className="px-4 py-2">Ref No</th>
                  <th className="px-4 py-2">Item</th>
                  <th className="px-4 py-2">Qty</th>
                  <th className="px-4 py-2">Purpose</th>
                  <th className="px-4 py-2">Status</th>
                  <th className="px-4 py-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {txsQ.data.map((tx) => (
                  <tr key={tx.id} className="border-b last:border-0">
                    <td className="px-4 py-2 font-mono">{tx.ref_no}</td>
                    <td className="px-4 py-2">{tx.item_name}</td>
                    <td className="px-4 py-2">{tx.quantity}</td>
                    <td className="px-4 py-2">{tx.purpose}</td>
                    <td className="px-4 py-2">{tx.status}</td>
                    <td className="px-4 py-2 space-x-2">
                      {tx.status.toUpperCase() === 'PENDING' && (
                        <>
                          <button
                            className="rounded bg-emerald-700 px-2 py-0.5 text-xs text-white"
                            onClick={() => decideMut.mutate({ id: tx.id, decision: 'APPROVED' })}
                          >
                            Approve
                          </button>
                          <button
                            className="rounded bg-rose-700 px-2 py-0.5 text-xs text-white"
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
      <h1 className="text-2xl font-semibold">FoodWaste & Carbon Credit</h1>

      <div className="grid gap-4 md:grid-cols-2">
        <form
          aria-label="Open Compost Batch"
          className="flex flex-wrap items-end gap-2 rounded bg-white p-4 shadow-sm border text-sm"
          onSubmit={(e) => {
            e.preventDefault()
            createBatchMut.mutate()
          }}
        >
          <input
            aria-label="Batch Code"
            className="rounded border px-2 py-1"
            placeholder="Batch Code (e.g. FW-2026-09)"
            value={batchCode}
            onChange={(e) => setBatchCode(e.target.value)}
          />
          <button type="submit" className="rounded bg-emerald-700 px-3 py-1 text-white hover:bg-emerald-800">
            New Compost Batch
          </button>
        </form>

        <form
          aria-label="Record Waste Log"
          className="flex flex-wrap items-end gap-2 rounded bg-white p-4 shadow-sm border text-sm"
          onSubmit={(e) => {
            e.preventDefault()
            createLogMut.mutate()
          }}
        >
          <input
            aria-label="Weight (kg)"
            className="w-28 rounded border px-2 py-1"
            placeholder="Weight (kg)"
            value={weightKg}
            onChange={(e) => setWeightKg(e.target.value)}
          />
          <select
            aria-label="Moisture"
            className="rounded border px-2 py-1"
            value={moisture}
            onChange={(e) => setMoisture(e.target.value as 'dry' | 'good' | 'wet')}
          >
            <option value="good">good</option>
            <option value="dry">dry</option>
            <option value="wet">wet</option>
          </select>
          <button type="submit" className="rounded bg-blue-700 px-3 py-1 text-white hover:bg-blue-800">
            Log Waste
          </button>
        </form>
      </div>

      {isPending && <Spinner />}
      {error && <ErrorMessage error={error} onRetry={() => void refetch()} />}
      {data && (
        <>
          <div className="grid gap-4 sm:grid-cols-4">
            <div className="rounded bg-white p-4 shadow">
              <div className="text-xs text-slate-500">Compost Batches</div>
              <div className="text-2xl font-bold">{data.total_batches}</div>
            </div>
            <div className="rounded bg-white p-4 shadow">
              <div className="text-xs text-slate-500">Waste Logs</div>
              <div className="text-2xl font-bold">{data.total_waste_logs}</div>
            </div>
            <div className="rounded bg-white p-4 shadow">
              <div className="text-xs text-slate-500">Total Weight (kg)</div>
              <div className="text-2xl font-bold">{data.total_weight_kg.toFixed(2)}</div>
            </div>
            <div className="rounded bg-white p-4 shadow">
              <div className="text-xs text-slate-500">Carbon Saved (kgCO2e)</div>
              <div className="text-2xl font-bold text-emerald-700">{data.total_carbon_saved_kg.toFixed(2)}</div>
            </div>
          </div>

          <div className="overflow-x-auto rounded bg-white shadow">
            <table className="w-full text-left text-sm">
              <thead className="border-b bg-slate-100 text-slate-600">
                <tr>
                  <th className="px-4 py-2">Batch Code</th>
                  <th className="px-4 py-2">Start Date</th>
                  <th className="px-4 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.batches.map((b) => (
                  <tr key={b.id} className="border-b last:border-0">
                    <td className="px-4 py-2 font-mono">{b.batch_code}</td>
                    <td className="px-4 py-2">{b.start_date}</td>
                    <td className="px-4 py-2">{b.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
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
    <section className="space-y-8">
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Recycle Bank (KeptKaya)</h1>
          {data && data.length > 0 && (
            <button
              type="button"
              onClick={() =>
                exportRowsToCsv(
                  'recycle-items.csv',
                  ['code', 'name', 'group', 'member_price', 'points'],
                  data.map((i) => [i.code, i.name, i.group_name, i.price_for_member, i.point]),
                )
              }
              className="rounded border bg-white px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              Export Items CSV
            </button>
          )}
        </div>

        <form
          aria-label="Record Recycle Purchase"
          className="mb-4 flex flex-wrap items-end gap-2 rounded bg-white p-4 shadow-sm border text-sm"
          onSubmit={(e) => {
            e.preventDefault()
            purchaseMut.mutate()
          }}
        >
          <input
            aria-label="Transaction No"
            className="rounded border px-2 py-1"
            placeholder="Trans No (e.g. KP-2026-01)"
            value={transNo}
            onChange={(e) => setTransNo(e.target.value)}
          />
          <input
            aria-label="Member User ID"
            className="w-20 rounded border px-2 py-1"
            placeholder="User ID"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
          />
          <input
            aria-label="Total Weight"
            className="w-24 rounded border px-2 py-1"
            placeholder="Weight (kg)"
            value={totalWeight}
            onChange={(e) => setTotalWeight(e.target.value)}
          />
          <input
            aria-label="Total Amount"
            className="w-24 rounded border px-2 py-1"
            placeholder="Amount (THB)"
            value={totalAmount}
            onChange={(e) => setTotalAmount(e.target.value)}
          />
          <input
            aria-label="Total Points"
            className="w-20 rounded border px-2 py-1"
            placeholder="Points"
            value={totalPoints}
            onChange={(e) => setTotalPoints(e.target.value)}
          />
          <button type="submit" className="rounded bg-blue-700 px-3 py-1 text-white hover:bg-blue-800">
            Record Purchase
          </button>
        </form>

        <div className="mb-6 grid gap-4 md:grid-cols-2">
          <form
            aria-label="Withdraw Member Balance"
            className="flex flex-wrap items-end gap-2 rounded bg-white p-4 shadow-sm border text-sm"
            onSubmit={(e) => {
              e.preventDefault()
              withdrawMut.mutate()
            }}
          >
            <input
              aria-label="Withdraw Account ID"
              className="w-20 rounded border px-2 py-1"
              placeholder="Acc ID"
              value={withdrawAccId}
              onChange={(e) => setWithdrawAccId(e.target.value)}
            />
            <input
              aria-label="Withdraw Amount"
              className="w-28 rounded border px-2 py-1"
              placeholder="Amount (THB)"
              value={withdrawAmount}
              onChange={(e) => setWithdrawAmount(e.target.value)}
            />
            <input
              aria-label="Withdraw Note"
              className="rounded border px-2 py-1"
              placeholder="Note / Ref"
              value={withdrawNote}
              onChange={(e) => setWithdrawNote(e.target.value)}
            />
            <button type="submit" className="rounded bg-amber-600 px-3 py-1 text-white hover:bg-amber-700">
              Withdraw Balance
            </button>
          </form>

          <form
            aria-label="Update Item Price"
            className="flex flex-wrap items-end gap-2 rounded bg-white p-4 shadow-sm border text-sm"
            onSubmit={(e) => {
              e.preventDefault()
              priceMut.mutate()
            }}
          >
            <input
              aria-label="Price Item ID"
              className="w-20 rounded border px-2 py-1"
              placeholder="Item ID"
              value={priceItemId}
              onChange={(e) => setPriceItemId(e.target.value)}
            />
            <input
              aria-label="Member Price (THB)"
              className="w-28 rounded border px-2 py-1"
              placeholder="Member THB"
              value={memberPrice}
              onChange={(e) => setMemberPrice(e.target.value)}
            />
            <input
              aria-label="Dealer Price (THB)"
              className="w-28 rounded border px-2 py-1"
              placeholder="Dealer THB"
              value={dealerPrice}
              onChange={(e) => setDealerPrice(e.target.value)}
            />
            <input
              aria-label="Item Points"
              className="w-20 rounded border px-2 py-1"
              placeholder="Points"
              value={itemPoint}
              onChange={(e) => setItemPoint(e.target.value)}
            />
            <button type="submit" className="rounded bg-emerald-700 px-3 py-1 text-white hover:bg-emerald-800">
              Set Item Price
            </button>
          </form>
        </div>

        {isPending && <Spinner />}
        {error && <ErrorMessage error={error} onRetry={() => void refetch()} />}
        {data && (
          <div className="overflow-x-auto rounded bg-white shadow">
            <table className="w-full text-left text-sm">
              <thead className="border-b bg-slate-100 text-slate-600">
                <tr>
                  <th className="px-4 py-2">Code</th>
                  <th className="px-4 py-2">Item Name</th>
                  <th className="px-4 py-2">Group</th>
                  <th className="px-4 py-2">Member Price</th>
                  <th className="px-4 py-2">Points</th>
                </tr>
              </thead>
              <tbody>
                {data.map((item) => (
                  <tr key={item.id} className="border-b last:border-0">
                    <td className="px-4 py-2 font-mono">{item.code}</td>
                    <td className="px-4 py-2 font-medium">{item.name}</td>
                    <td className="px-4 py-2">{item.group_name}</td>
                    <td className="px-4 py-2">{item.price_for_member.toFixed(2)}</td>
                    <td className="px-4 py-2">{item.point}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {accountsQ.data && accountsQ.data.length > 0 && (
        <div>
          <h2 className="mb-3 text-lg font-semibold">Member Bank Accounts ({accountsQ.data.length})</h2>
          <div className="overflow-x-auto rounded bg-white shadow">
            <table className="w-full text-left text-sm">
              <thead className="border-b bg-slate-100 text-slate-600">
                <tr>
                  <th className="px-4 py-2">Account No</th>
                  <th className="px-4 py-2">User ID</th>
                  <th className="px-4 py-2">Balance (THB)</th>
                  <th className="px-4 py-2">Points</th>
                  <th className="px-4 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {accountsQ.data.map((acc) => (
                  <tr key={acc.id} className="border-b last:border-0">
                    <td className="px-4 py-2 font-mono">{acc.account_no}</td>
                    <td className="px-4 py-2">{acc.user_id}</td>
                    <td className="px-4 py-2 font-medium">{acc.balance.toFixed(2)}</td>
                    <td className="px-4 py-2">{acc.points}</td>
                    <td className="px-4 py-2">{acc.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {submodulesQ.data && (
        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded bg-white p-4 shadow">
            <h2 className="mb-2 text-base font-semibold">IoT Smart Kiosks ({submodulesQ.data.kiosks.length})</h2>
            {submodulesQ.data.kiosks.length === 0 ? (
              <p className="text-xs text-slate-500">No kiosks registered</p>
            ) : (
              <ul className="space-y-1 text-sm">
                {submodulesQ.data.kiosks.map((k) => (
                  <li key={k.id} className="flex items-center justify-between border-b py-1 last:border-0">
                    <span className="font-medium">{k.name}</span>
                    <span className="text-xs text-slate-600">
                      {k.status} • {k.total_waste_count} items
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded bg-white p-4 shadow">
            <h2 className="mb-2 text-base font-semibold">
              Community Welfare & Annual Trash ({submodulesQ.data.welfare_configs.length} rules /{' '}
              {submodulesQ.data.annual_trash_subscriptions.length} bins)
            </h2>
            {submodulesQ.data.welfare_configs.map((wc) => (
              <div key={wc.id} className="text-sm text-slate-700">
                <div>Default Payout: {wc.default_payout_amount.toFixed(2)} THB</div>
                <div className="text-xs text-slate-500">
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
  const metersQ = useQuery({ queryKey: ['tabwater-meters'], queryFn: () => fetchTabwaterMeters({ limit: 50, offset: 0 }) })
  const invoicesQ = useQuery({ queryKey: ['tabwater-invoices'], queryFn: () => fetchTabwaterInvoices({ limit: 50, offset: 0 }) })
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
    <section className="space-y-8">
      <div>
        <h1 className="mb-4 text-2xl font-semibold">Tabwater Management</h1>

        <div className="mb-4 grid gap-4 md:grid-cols-2">
          <form
            aria-label="Open Billing Period"
            className="flex flex-wrap items-end gap-2 rounded bg-white p-4 shadow-sm border text-sm"
            onSubmit={(e) => {
              e.preventDefault()
              createPeriodMut.mutate()
            }}
          >
            <input
              aria-label="Billing Period Name"
              className="rounded border px-2 py-1"
              placeholder="Period (e.g. 11/2569)"
              value={newPeriodName}
              onChange={(e) => setNewPeriodName(e.target.value)}
            />
            <button type="submit" className="rounded bg-emerald-700 px-3 py-1 text-white hover:bg-emerald-800">
              Open Period
            </button>
            {periodsQ.data && periodsQ.data.length > 0 && (
              <span className="text-xs text-slate-500">
                Active Periods: {periodsQ.data.map((p) => `#${p.id} (${p.period_name})`).slice(0, 3).join(', ')}
              </span>
            )}
          </form>

          <form
            aria-label="Register Water Meter"
            className="flex flex-wrap items-end gap-2 rounded bg-white p-4 shadow-sm border text-sm"
            onSubmit={(e) => {
              e.preventDefault()
              createMeterMut.mutate()
            }}
          >
            <input
              aria-label="Meter Owner User ID"
              className="w-20 rounded border px-2 py-1"
              placeholder="User ID"
              value={newMeterUserId}
              onChange={(e) => setNewMeterUserId(e.target.value)}
            />
            <input
              aria-label="New Meter Number"
              className="w-28 rounded border px-2 py-1"
              placeholder="Meter No"
              value={newMeterNo}
              onChange={(e) => setNewMeterNo(e.target.value)}
            />
            <input
              aria-label="Subscriber Name"
              className="w-32 rounded border px-2 py-1"
              placeholder="Subscriber"
              value={newSubscriberName}
              onChange={(e) => setNewSubscriberName(e.target.value)}
            />
            <input
              aria-label="Meter Address"
              className="w-28 rounded border px-2 py-1"
              placeholder="Address"
              value={newMeterAddr}
              onChange={(e) => setNewMeterAddr(e.target.value)}
            />
            <button type="submit" className="rounded bg-emerald-700 px-3 py-1 text-white hover:bg-emerald-800">
              Register Meter
            </button>
          </form>
        </div>

        <form
          aria-label="Record Meter Reading"
          className="mb-6 flex flex-wrap items-end gap-2 rounded bg-white p-4 shadow-sm border text-sm"
          onSubmit={(e) => {
            e.preventDefault()
            readingMut.mutate()
          }}
        >
          <input
            aria-label="Invoice No"
            className="rounded border px-2 py-1"
            placeholder="Invoice No (e.g. INV-2026-01)"
            value={invNo}
            onChange={(e) => setInvNo(e.target.value)}
          />
          <input
            aria-label="Meter ID"
            className="w-24 rounded border px-2 py-1"
            placeholder="Meter ID"
            value={meterId}
            onChange={(e) => setMeterId(e.target.value)}
          />
          <input
            aria-label="Period ID"
            className="w-24 rounded border px-2 py-1"
            placeholder="Period ID"
            value={periodId}
            onChange={(e) => setPeriodId(e.target.value)}
          />
          <input
            aria-label="Current Meter Reading"
            className="w-32 rounded border px-2 py-1"
            placeholder="Current Reading"
            value={currentMeter}
            onChange={(e) => setCurrentMeter(e.target.value)}
          />
          <button type="submit" className="rounded bg-blue-700 px-3 py-1 text-white hover:bg-blue-800">
            Record Reading & Bill
          </button>
        </form>

        {metersQ.isPending && <Spinner />}
        {metersQ.error && <ErrorMessage error={metersQ.error} onRetry={() => void metersQ.refetch()} />}
        {metersQ.data && (
          <div className="overflow-x-auto rounded bg-white shadow">
            <table className="w-full text-left text-sm">
              <thead className="border-b bg-slate-100 text-slate-600">
                <tr>
                  <th className="px-4 py-2">Meter No</th>
                  <th className="px-4 py-2">Subscriber</th>
                  <th className="px-4 py-2">Address</th>
                  <th className="px-4 py-2">Last Reading</th>
                  <th className="px-4 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {metersQ.data.map((m) => (
                  <tr key={m.meter_id} className="border-b last:border-0">
                    <td className="px-4 py-2 font-mono">{m.meternumber}</td>
                    <td className="px-4 py-2 font-medium">{m.submeter_name}</td>
                    <td className="px-4 py-2">{m.meter_address}</td>
                    <td className="px-4 py-2">{m.last_meter_recording}</td>
                    <td className="px-4 py-2">{m.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {invoicesQ.data && invoicesQ.data.length > 0 && (
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Water Invoices</h2>
            <button
              type="button"
              onClick={() =>
                exportRowsToCsv(
                  'tabwater-invoices.csv',
                  ['inv_no', 'period', 'water_used', 'totalpaid', 'status'],
                  invoicesQ.data.map((i) => [i.inv_no, i.period_name, i.water_used, i.totalpaid, i.status]),
                )
              }
              className="rounded border bg-white px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              Export Invoices CSV
            </button>
          </div>
          <div className="overflow-x-auto rounded bg-white shadow">
            <table className="w-full text-left text-sm">
              <thead className="border-b bg-slate-100 text-slate-600">
                <tr>
                  <th className="px-4 py-2">Invoice No</th>
                  <th className="px-4 py-2">Period</th>
                  <th className="px-4 py-2">Units Used</th>
                  <th className="px-4 py-2">Total (THB)</th>
                  <th className="px-4 py-2">Status</th>
                  <th className="px-4 py-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {invoicesQ.data.map((inv) => (
                  <tr key={inv.id} className="border-b last:border-0">
                    <td className="px-4 py-2 font-mono">{inv.inv_no}</td>
                    <td className="px-4 py-2">{inv.period_name}</td>
                    <td className="px-4 py-2">{inv.water_used}</td>
                    <td className="px-4 py-2">{inv.totalpaid.toFixed(2)}</td>
                    <td className="px-4 py-2">{inv.status}</td>
                    <td className="flex items-center gap-2 px-4 py-2">
                      {inv.status !== 'paid' && (
                        <button
                          className="rounded bg-blue-700 px-2 py-0.5 text-xs text-white"
                          onClick={() => payMut.mutate(inv.id)}
                        >
                          Pay Invoice
                        </button>
                      )}
                      <button
                        type="button"
                        data-testid={`print-invoice-${inv.id}`}
                        className="rounded border px-2 py-0.5 text-xs text-slate-700 hover:bg-slate-100"
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
