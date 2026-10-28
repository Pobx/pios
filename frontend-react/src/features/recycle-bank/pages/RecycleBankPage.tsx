import { useState } from 'react'
import { Spinner } from '@/shared/ui/Spinner'
import { ErrorMessage } from '@/shared/ui/ErrorMessage'
import { StatusBadge } from '@/shared/ui/StatusBadge'
import { ModuleHeader } from '@/shared/ui/ModuleHeader'
import { INPUT_CLS, BTN_PRIMARY, BTN_EMERALD, BTN_AMBER, BTN_SECONDARY } from '@/shared/ui/buttonStyles'
import { exportRowsToCsv } from '@/shared/utils/csv'
import { useRecycle } from '../hooks/useRecycle'

export function RecycleBankPage() {
  const { itemsQuery, accountsQuery, submodulesQuery, purchaseMutation, withdrawMutation, priceMutation } = useRecycle()

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

  const filteredItems = (itemsQuery.data ?? []).filter(
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
          itemsQuery.data &&
          itemsQuery.data.length > 0 && (
            <button
              type="button"
              onClick={() =>
                exportRowsToCsv(
                  'recycle-items.csv',
                  ['code', 'name', 'group', 'member_price', 'points'],
                  itemsQuery.data.map((i) => [i.code, i.name, i.group_name, i.price_for_member, i.point]),
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
            purchaseMutation.mutate(
              {
                trans_no: transNo,
                user_id: Number(userId) || 1,
                total_weight: Number(totalWeight),
                total_amount: Number(totalAmount),
                total_points: Number(totalPoints) || 0,
              },
              {
                onSuccess: () => {
                  setTransNo('')
                  setTotalWeight('')
                  setTotalAmount('')
                },
              },
            )
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
            withdrawMutation.mutate(
              {
                account_id: Number(withdrawAccId) || 1,
                amount: Number(withdrawAmount),
                payout_method: 'cash',
                note: withdrawNote,
              },
              {
                onSuccess: () => {
                  setWithdrawAmount('')
                  setWithdrawNote('')
                },
              },
            )
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
            priceMutation.mutate(
              {
                itemId: Number(priceItemId) || 1,
                payload: {
                  price_from_dealer: Number(dealerPrice) || Number(memberPrice),
                  price_for_member: Number(memberPrice),
                  point: Number(itemPoint) || 0,
                },
              },
              {
                onSuccess: () => {
                  setMemberPrice('')
                  setDealerPrice('')
                },
              },
            )
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

      {itemsQuery.isPending && <Spinner />}
      {itemsQuery.error && <ErrorMessage error={itemsQuery.error} onRetry={() => void itemsQuery.refetch()} />}
      {itemsQuery.data && (
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

      {accountsQuery.data && accountsQuery.data.length > 0 && (
        <div className="adminlte-card overflow-hidden">
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="text-base font-bold text-slate-900">
              สมุดบัญชีเงินฝากธนาคารขยะรีไซเคิล ({accountsQuery.data.length})
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
                {accountsQuery.data.map((acc) => (
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

      {submodulesQuery.data && (
        <div className="grid gap-6 md:grid-cols-2">
          <div className="adminlte-card adminlte-card-info p-6">
            <h2 className="mb-3 text-base font-bold text-slate-900">
              ตู้คืนขวดอัตโนมัติ • IoT Smart Kiosks ({submodulesQuery.data.kiosks.length})
            </h2>
            {submodulesQuery.data.kiosks.length === 0 ? (
              <p className="text-xs text-slate-500">No kiosks registered</p>
            ) : (
              <ul className="divide-y divide-slate-100 text-sm">
                {submodulesQuery.data.kiosks.map((k) => (
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
              กองทุนฌาปนกิจ & ค่าถังขยะรายปี ({submodulesQuery.data.welfare_configs.length} rules /{' '}
              {submodulesQuery.data.annual_trash_subscriptions.length} bins)
            </h2>
            {submodulesQuery.data.welfare_configs.map((wc) => (
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
