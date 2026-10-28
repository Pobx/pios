import { useState } from 'react'
import { Spinner } from '@/shared/ui/Spinner'
import { ErrorMessage } from '@/shared/ui/ErrorMessage'
import { StatusBadge } from '@/shared/ui/StatusBadge'
import { ModuleHeader } from '@/shared/ui/ModuleHeader'
import { INPUT_CLS, BTN_PRIMARY, BTN_EMERALD } from '@/shared/ui/buttonStyles'
import { useUsers } from '../hooks/useUsers'

export function UsersPage() {
  const { usersQuery, zonesQuery, createUserMutation, createZoneMutation, linkLineMutation } = useUsers()

  const [targetUserId, setTargetUserId] = useState('')
  const [lineUserId, setLineUserId] = useState('')
  const [staffCode, setStaffCode] = useState('')

  const [newUsername, setNewUsername] = useState('')
  const [newFirstname, setNewFirstname] = useState('')
  const [newLastname, setNewLastname] = useState('')
  const [newPhone, setNewPhone] = useState('')
  const [newZoneName, setNewZoneName] = useState('')
  const [userSearch, setUserSearch] = useState('')

  const filteredUsers = (usersQuery.data ?? []).filter(
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
            createUserMutation.mutate(
              {
                username: newUsername,
                prefix: 'คุณ',
                firstname: newFirstname,
                lastname: newLastname,
                phone: newPhone,
              },
              {
                onSuccess: () => {
                  setNewUsername('')
                  setNewFirstname('')
                  setNewLastname('')
                  setNewPhone('')
                },
              },
            )
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
            createZoneMutation.mutate(
              { zone_name: newZoneName },
              { onSuccess: () => setNewZoneName('') },
            )
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
            linkLineMutation.mutate(
              {
                userId: Number(targetUserId),
                payload: {
                  line_user_id: lineUserId,
                  verification_mode: 'staff_code',
                  verification_code: staffCode,
                },
              },
              {
                onSuccess: () => {
                  setTargetUserId('')
                  setLineUserId('')
                  setStaffCode('')
                },
              },
            )
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

      {usersQuery.isPending && <Spinner />}
      {usersQuery.error && <ErrorMessage error={usersQuery.error} onRetry={() => void usersQuery.refetch()} />}
      {usersQuery.data && (
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

      {zonesQuery.data && zonesQuery.data.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-base font-bold text-slate-900">เขตพื้นที่ / หมู่บ้าน ({zonesQuery.data.length})</h2>
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {zonesQuery.data.map((z) => (
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
