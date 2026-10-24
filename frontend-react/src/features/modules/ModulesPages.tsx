import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Spinner } from '@/shared/ui/Spinner'
import { ErrorMessage } from '@/shared/ui/ErrorMessage'
import {
  fetchUsers,
  fetchZones,
  fetchResidentOverview,
  fetchInventoryItems,
  fetchInventoryTransactions,
  decideInventoryTransaction,
  fetchFoodWasteSummary,
  fetchRecycleItems,
  fetchTabwaterMeters,
  fetchTabwaterInvoices,
  payTabwaterInvoice,
} from './api'

// ---- Wave 1.5: Resident Portal Page (Role: user & staff) --------------------

export function ResidentPage() {
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
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </section>
  )
}

// ---- Wave 1.5: Users & Zones Page -------------------------------------------

export function UsersPage() {
  const usersQ = useQuery({ queryKey: ['users'], queryFn: () => fetchUsers({ limit: 50, offset: 0 }) })
  const zonesQ = useQuery({ queryKey: ['zones'], queryFn: fetchZones })

  return (
    <section className="space-y-8">
      <div>
        <h1 className="mb-4 text-2xl font-semibold">Users & Zones</h1>
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

// ---- Wave 2: Inventory Page (with Approve / Reject Actions) -----------------

export function InventoryPage() {
  const qc = useQueryClient()
  const itemsQ = useQuery({ queryKey: ['inventory-items'], queryFn: fetchInventoryItems })
  const txsQ = useQuery({ queryKey: ['inventory-txs'], queryFn: fetchInventoryTransactions })

  const decideMut = useMutation({
    mutationFn: ({ id, decision }: { id: number; decision: 'APPROVED' | 'REJECTED' }) =>
      decideInventoryTransaction(id, { decision }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['inventory-txs'] }),
  })

  return (
    <section className="space-y-8">
      <div>
        <h1 className="mb-4 text-2xl font-semibold">Inventory Management</h1>
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

// ---- Wave 3: FoodWaste & Carbon Emission Page -------------------------------

export function FoodWastePage() {
  const { data, error, isPending, refetch } = useQuery({
    queryKey: ['foodwaste-summary'],
    queryFn: fetchFoodWasteSummary,
  })

  return (
    <section className="space-y-6">
      <h1 className="text-2xl font-semibold">FoodWaste & Carbon Credit</h1>
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

// ---- Wave 4: KeptKaya / Recycle Bank Page -----------------------------------

export function RecycleBankPage() {
  const { data, error, isPending, refetch } = useQuery({
    queryKey: ['recycle-items'],
    queryFn: fetchRecycleItems,
  })

  return (
    <section>
      <h1 className="mb-4 text-2xl font-semibold">Recycle Bank (KeptKaya)</h1>
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
    </section>
  )
}

// ---- Wave 5: Tabwater Page (Water Meters & Invoices + Pay Action) -----------

export function TabwaterPage() {
  const qc = useQueryClient()
  const metersQ = useQuery({ queryKey: ['tabwater-meters'], queryFn: () => fetchTabwaterMeters({ limit: 50, offset: 0 }) })
  const invoicesQ = useQuery({ queryKey: ['tabwater-invoices'], queryFn: () => fetchTabwaterInvoices({ limit: 50, offset: 0 }) })

  const payMut = useMutation({
    mutationFn: (invoiceId: number) => payTabwaterInvoice(invoiceId),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['tabwater-invoices'] }),
  })

  return (
    <section className="space-y-8">
      <div>
        <h1 className="mb-4 text-2xl font-semibold">Tabwater Management</h1>
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
          <h2 className="mb-3 text-lg font-semibold">Water Invoices</h2>
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
                    <td className="px-4 py-2">
                      {inv.status !== 'paid' && (
                        <button
                          className="rounded bg-blue-700 px-2 py-0.5 text-xs text-white"
                          onClick={() => payMut.mutate(inv.id)}
                        >
                          Pay Invoice
                        </button>
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
