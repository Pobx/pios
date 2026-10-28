import { useState } from 'react'
import { Spinner } from '@/shared/ui/Spinner'
import { ErrorMessage } from '@/shared/ui/ErrorMessage'
import { StatusBadge } from '@/shared/ui/StatusBadge'
import { ModuleHeader } from '@/shared/ui/ModuleHeader'
import { INPUT_CLS, BTN_PRIMARY, BTN_EMERALD } from '@/shared/ui/buttonStyles'
import { useInventory } from '../hooks/useInventory'

export function InventoryPage() {
  const { itemsQuery, transactionsQuery, createItemMutation, createTransactionMutation, decideMutation } =
    useInventory()

  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [unit, setUnit] = useState('ชิ้น')
  const [minStock, setMinStock] = useState('5')
  const [itemSearch, setItemSearch] = useState('')

  const [refNo, setRefNo] = useState('')
  const [itemId, setItemId] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [purpose, setPurpose] = useState('')

  const filteredItems = (itemsQuery.data ?? []).filter(
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
            createItemMutation.mutate(
              {
                code,
                name,
                unit,
                min_stock: Number(minStock) || 0,
              },
              {
                onSuccess: () => {
                  setCode('')
                  setName('')
                },
              },
            )
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
            createTransactionMutation.mutate(
              {
                ref_no: refNo,
                item_id: Number(itemId),
                requester_id: 1,
                quantity: Number(quantity) || 1,
                purpose,
              },
              {
                onSuccess: () => {
                  setRefNo('')
                  setPurpose('')
                },
              },
            )
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

      {itemsQuery.isPending && <Spinner />}
      {itemsQuery.error && <ErrorMessage error={itemsQuery.error} onRetry={() => void itemsQuery.refetch()} />}
      {itemsQuery.data && (
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

      {transactionsQuery.data && transactionsQuery.data.length > 0 && (
        <div className="adminlte-card overflow-hidden">
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="text-base font-bold text-slate-900">
              รายการคำขอเบิกและอนุมัติพัสดุ (Approval Transactions)
            </h2>
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
                {transactionsQuery.data.map((tx) => (
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
                            onClick={() => decideMutation.mutate({ id: tx.id, payload: { decision: 'APPROVED' } })}
                          >
                            Approve
                          </button>
                          <button
                            className="rounded-lg bg-rose-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-rose-700"
                            onClick={() => decideMutation.mutate({ id: tx.id, payload: { decision: 'REJECTED' } })}
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
