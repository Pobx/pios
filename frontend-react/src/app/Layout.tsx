import { useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/features/auth/AuthContext'
import { Can } from '@/features/auth/Can'

interface TreeSubItem {
  code: string
  label: string
  to: string
}

interface TreeGroup {
  id: string
  title: string
  iconBg: string
  items: TreeSubItem[]
}

const MODULE_TITLES: Record<string, { th: string; en: string; badge: string }> = {
  '/': { th: 'หน้าเมนูหลัก (Access Menu)', en: 'Home', badge: 'PI-OS Hub' },
  '/tabwater': { th: 'ระบบบริหารงานประปาหมู่บ้าน', en: 'Tabwater Management', badge: 'งานประปา' },
  '/recycle': { th: 'ระบบธนาคารขยะรีไซเคิล & ตู้คืนขวด', en: 'Recycle Bank (KeptKaya)', badge: 'ธนาคารขยะ' },
  '/foodwaste': { th: 'ระบบถังขยะเปียกครัวเรือน & คาร์บอนเครดิต', en: 'FoodWaste & Carbon', badge: 'ขยะเปียก' },
  '/inventory': { th: 'ระบบบริหารคลังพัสดุและเบิกจ่าย', en: 'Inventory Management', badge: 'คลังพัสดุ' },
  '/users': { th: 'จัดการทะเบียนผู้ใช้งาน หมู่บ้าน และ LINE OA', en: 'Users & Zones', badge: 'ผู้ดูแลระบบ' },
  '/organizations': { th: 'จัดการองค์กรปกครองส่วนท้องถิ่น (Multi-Tenant)', en: 'Organizations', badge: 'Super Admin' },
  '/resident': { th: 'พอร์ทัลลูกบ้านและสมุดคู่ฝากดิจิทัล', en: 'Resident Portal', badge: 'พอร์ทัลลูกบ้าน' },
  '/me': { th: 'ข้อมูลผู้ใช้งานและสิทธิ์การเข้าถึง (OIDC)', en: 'My Profile', badge: 'บัญชีของฉัน' },
}

function getModuleTreeGroups(pathname: string): TreeGroup[] {
  if (pathname.startsWith('/tabwater')) {
    return [
      {
        id: 'tw-invoice',
        title: 'จัดการใบแจ้งหนี้',
        iconBg: 'bg-sky-500 text-white',
        items: [
          { code: 'IV', label: 'ออกใบแจ้งหนี้ / จดมิเตอร์', to: '/tabwater?section=reading' },
          { code: 'OW', label: 'รายการใบแจ้งหนี้ค่าน้ำ', to: '/tabwater?section=invoices' },
        ],
      },
      {
        id: 'tw-payment',
        title: 'จัดการใบเสร็จรับเงิน',
        iconBg: 'bg-emerald-500 text-white',
        items: [{ code: 'PM', label: 'รับชำระค่าน้ำประปา', to: '/tabwater?section=invoices' }],
      },
      {
        id: 'tw-admin',
        title: 'ผู้ดูแลระบบประปา',
        iconBg: 'bg-blue-600 text-white',
        items: [
          { code: 'B', label: 'เปิดรอบบิลประจำเดือน', to: '/tabwater?section=period' },
          { code: 'M', label: 'ทะเบียนมิเตอร์น้ำประปา', to: '/tabwater?section=meters' },
        ],
      },
    ]
  }
  if (pathname.startsWith('/recycle')) {
    return [
      {
        id: 'kp-bank',
        title: 'ธนาคารขยะรีไซเคิล',
        iconBg: 'bg-emerald-600 text-white',
        items: [
          { code: 'P', label: 'รับซื้อขยะรีไซเคิล', to: '/recycle?section=purchase' },
          { code: 'W', label: 'ถอนเงินสะสมสมาชิก', to: '/recycle?section=withdraw' },
          { code: 'I', label: 'ราคารับซื้อ & ประเภทขยะ', to: '/recycle?section=items' },
          { code: 'A', label: 'สมุดบัญชีเงินฝากสมาชิก', to: '/recycle?section=accounts' },
        ],
      },
      {
        id: 'kp-kiosk',
        title: 'ตู้คืนขวด & สวัสดิการ',
        iconBg: 'bg-teal-500 text-white',
        items: [
          { code: 'K', label: 'ตู้คืนขวดอัตโนมัติ (IoT Kiosk)', to: '/recycle?section=kiosks' },
          { code: 'F', label: 'กองทุนฌาปนกิจ & ถังขยะรายปี', to: '/recycle?section=kiosks' },
        ],
      },
    ]
  }
  if (pathname.startsWith('/foodwaste')) {
    return [
      {
        id: 'fw-menu',
        title: 'ถังขยะเปียกครัวเรือน',
        iconBg: 'bg-lime-600 text-white',
        items: [
          { code: 'B', label: 'เปิดรอบถังหมักรักษ์โลก', to: '/foodwaste?section=batch' },
          { code: 'L', label: 'บันทึกน้ำหนักขยะอินทรีย์', to: '/foodwaste?section=log' },
          { code: 'C', label: 'รายงานคาร์บอนเครดิต (TGO)', to: '/foodwaste?section=summary' },
        ],
      },
    ]
  }
  if (pathname.startsWith('/inventory')) {
    return [
      {
        id: 'inv-menu',
        title: 'บริหารคลังพัสดุ',
        iconBg: 'bg-amber-500 text-white',
        items: [
          { code: 'IT', label: 'ขึ้นทะเบียนพัสดุ/เคมีภัณฑ์', to: '/inventory?section=items' },
          { code: 'RQ', label: 'สร้างใบขอเบิกพัสดุ', to: '/inventory?section=request' },
          { code: 'AP', label: 'คิวอนุมัติเบิกจ่ายพัสดุ', to: '/inventory?section=approvals' },
        ],
      },
    ]
  }
  if (pathname.startsWith('/users')) {
    return [
      {
        id: 'usr-menu',
        title: 'ตั้งค่าผู้ใช้งาน & พื้นที่',
        iconBg: 'bg-indigo-600 text-white',
        items: [
          { code: 'U', label: 'ลงทะเบียนลูกบ้านใหม่', to: '/users?section=create-user' },
          { code: 'Z', label: 'จัดการหมู่บ้าน / เขตพื้นที่', to: '/users?section=zones' },
          { code: 'LN', label: 'ผูกบัญชี LINE Official Account', to: '/users?section=line' },
        ],
      },
    ]
  }
  return []
}

const topNavLinkClass = ({ isActive }: { isActive: boolean }) =>
  isActive
    ? 'inline-flex items-center gap-1.5 rounded-lg bg-sky-50 px-2.5 py-1.5 text-xs font-bold text-sky-700 ring-1 ring-sky-600/20 transition-all'
    : 'inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-all'

export function Layout() {
  const { isAuthenticated, user, login, logout } = useAuth()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({})

  const isHomeRoute = location.pathname === '/'
  const showAdminSidebar = isAuthenticated && !isHomeRoute
  const currentMeta = MODULE_TITLES[location.pathname] ?? {
    th: 'ระบบบริหารจัดการองค์กรปกครองส่วนท้องถิ่น',
    en: 'OTP Platform',
    badge: 'Module',
  }
  const treeGroups = getModuleTreeGroups(location.pathname)
  const initial = user?.username?.charAt(0)?.toUpperCase() ?? 'U'

  const toggleGroup = (id: string) => {
    setOpenGroups((prev) => ({ ...prev, [id]: !(prev[id] ?? true) }))
  }

  return (
    <div className="flex min-h-screen bg-[#f8fafc] text-slate-800">
      {/* ====================================================================
          AdminLTE 3 / Soft-UI White Vertical Sidebar (on module pages)
          Matches otp2025/resources/views/layouts/admin1_navigation.blade.php
         ==================================================================== */}
      {showAdminSidebar && sidebarOpen && (
        <aside
          id="sidenav-main"
          aria-label="Module Sidebar"
          className="sticky top-0 z-30 hidden h-screen w-68 shrink-0 flex-col border-r border-slate-200/90 bg-white shadow-xs lg:flex"
        >
          {/* Brand Logo Header */}
          <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4">
            <img
              src="/logo/ko_envsogo.png"
              alt="Envsogo Logo"
              className="h-10 w-10 rounded-full border border-slate-200 object-cover p-0.5 shadow-2xs"
            />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-bold text-slate-900">อบต.ห้องแซง</div>
              <div className="truncate text-[11px] font-medium text-sky-600">HSG1:PIOS • Envsogo</div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-3.5 py-4">
            {/* Primary CTA: กลับไปหน้าเมนูหลัก (accessmenu) */}
            <div className="mb-4">
              <Link
                to="/"
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-600 to-blue-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm shadow-sky-600/20 hover:from-sky-700 hover:to-blue-700"
              >
                <span>⬅</span>
                <span>หน้าเมนูหลัก (Access Menu)</span>
              </Link>
            </div>

            {/* Active Module Context Submenus (AdminLTE nav-treeview) */}
            {treeGroups.length > 0 && (
              <div className="mb-5">
                <div className="mb-2 px-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  เมนูประจำระบบ ({currentMeta.badge})
                </div>
                <ul className="space-y-1.5">
                  <li>
                    <Link
                      to={location.pathname}
                      className={`flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-bold transition-all ${
                        !location.search
                          ? 'bg-sky-50 text-sky-700 ring-1 ring-sky-500/20'
                          : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-sky-600 text-[11px] font-bold text-white shadow-2xs">
                        DB
                      </span>
                      <span>แดชบอร์ดภาพรวม</span>
                    </Link>
                  </li>

                  {treeGroups.map((group) => {
                    const isOpen = openGroups[group.id] ?? true
                    return (
                      <li key={group.id} className="rounded-xl border border-slate-100 bg-slate-50/50 p-1">
                        <button
                          type="button"
                          onClick={() => toggleGroup(group.id)}
                          className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-xs font-bold text-slate-800 hover:bg-white"
                        >
                          <span className="flex items-center gap-2">
                            <span
                              className={`flex h-6 w-6 items-center justify-center rounded-lg text-[11px] font-bold shadow-2xs ${group.iconBg}`}
                            >
                              {group.title.slice(0, 1)}
                            </span>
                            <span>{group.title}</span>
                          </span>
                          <span className="text-[10px] text-slate-400">{isOpen ? '▾' : '▸'}</span>
                        </button>
                        {isOpen && (
                          <ul className="mt-1 space-y-0.5 pl-2">
                            {group.items.map((sub) => {
                              const active = location.pathname + location.search === sub.to
                              return (
                                <li key={sub.code + sub.label}>
                                  <Link
                                    to={sub.to}
                                    className={`flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs transition-colors ${
                                      active
                                        ? 'bg-white font-bold text-sky-700 shadow-2xs ring-1 ring-slate-200/80'
                                        : 'font-medium text-slate-600 hover:bg-white hover:text-slate-900'
                                    }`}
                                  >
                                    <span className="sidenav-mini-icon">{sub.code}</span>
                                    <span className="truncate">{sub.label}</span>
                                  </Link>
                                </li>
                              )
                            })}
                          </ul>
                        )}
                      </li>
                    )
                  })}
                </ul>
              </div>
            )}

            {/* Role-filtered Module Switcher inside Sidebar */}
            <div>
              <div className="mb-2 px-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                สลับระบบงานตามสิทธิ์ (Role Modules)
              </div>
              <ul className="space-y-1 text-xs">
                <Can roles={['admin', 'super_admin', 'tabwater_staff', 'finance_staff']}>
                  <li>
                    <NavLink
                      to="/tabwater"
                      className={({ isActive }) =>
                        `flex items-center gap-2.5 rounded-xl px-3 py-2 font-semibold transition-all ${
                          isActive
                            ? 'bg-sky-50 text-sky-700 ring-1 ring-sky-600/15'
                            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                        }`
                      }
                    >
                      <span className="sidenav-mini-icon">TW</span>
                      <span>งานประปาหมู่บ้าน</span>
                    </NavLink>
                  </li>
                </Can>
                <Can roles={['admin', 'super_admin', 'recycle_bank_staff', 'finance_staff']}>
                  <li>
                    <NavLink
                      to="/recycle"
                      className={({ isActive }) =>
                        `flex items-center gap-2.5 rounded-xl px-3 py-2 font-semibold transition-all ${
                          isActive
                            ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/15'
                            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                        }`
                      }
                    >
                      <span className="sidenav-mini-icon">KP</span>
                      <span>ธนาคารขยะรีไซเคิล</span>
                    </NavLink>
                  </li>
                </Can>
                <Can roles={['admin', 'super_admin', 'foodwaste_staff']}>
                  <li>
                    <NavLink
                      to="/foodwaste"
                      className={({ isActive }) =>
                        `flex items-center gap-2.5 rounded-xl px-3 py-2 font-semibold transition-all ${
                          isActive
                            ? 'bg-lime-50 text-lime-700 ring-1 ring-lime-600/15'
                            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                        }`
                      }
                    >
                      <span className="sidenav-mini-icon">FW</span>
                      <span>ถังขยะเปียกครัวเรือน</span>
                    </NavLink>
                  </li>
                </Can>
                <Can roles={['admin', 'super_admin', 'finance_staff']}>
                  <li>
                    <NavLink
                      to="/inventory"
                      className={({ isActive }) =>
                        `flex items-center gap-2.5 rounded-xl px-3 py-2 font-semibold transition-all ${
                          isActive
                            ? 'bg-amber-50 text-amber-700 ring-1 ring-amber-600/15'
                            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                        }`
                      }
                    >
                      <span className="sidenav-mini-icon">IV</span>
                      <span>คลังพัสดุและเบิกจ่าย</span>
                    </NavLink>
                  </li>
                </Can>
                <Can
                  roles={[
                    'admin',
                    'super_admin',
                    'finance_staff',
                    'tabwater_staff',
                    'recycle_bank_staff',
                    'foodwaste_staff',
                    'annual_staff',
                  ]}
                >
                  <li>
                    <NavLink
                      to="/users"
                      className={({ isActive }) =>
                        `flex items-center gap-2.5 rounded-xl px-3 py-2 font-semibold transition-all ${
                          isActive
                            ? 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-600/15'
                            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                        }`
                      }
                    >
                      <span className="sidenav-mini-icon">US</span>
                      <span>ผู้ใช้งานและเขตพื้นที่</span>
                    </NavLink>
                  </li>
                </Can>
                <Can roles={['admin', 'super_admin']}>
                  <li>
                    <NavLink
                      to="/organizations"
                      className={({ isActive }) =>
                        `flex items-center gap-2.5 rounded-xl px-3 py-2 font-semibold transition-all ${
                          isActive
                            ? 'bg-blue-50 text-blue-700 ring-1 ring-blue-600/15'
                            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                        }`
                      }
                    >
                      <span className="sidenav-mini-icon">OR</span>
                      <span>จัดการองค์กร (อปท.)</span>
                    </NavLink>
                  </li>
                </Can>
                <li>
                  <NavLink
                    to="/resident"
                    className={({ isActive }) =>
                      `flex items-center gap-2.5 rounded-xl px-3 py-2 font-semibold transition-all ${
                        isActive
                          ? 'bg-sky-50 text-sky-700 ring-1 ring-sky-600/15'
                          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                      }`
                    }
                  >
                    <span className="sidenav-mini-icon">RS</span>
                    <span>พอร์ทัลลูกบ้าน</span>
                  </NavLink>
                </li>
              </ul>
            </div>
          </div>

          {/* Sidebar Footer User Card */}
          {user && (
            <div className="border-t border-slate-100 bg-slate-50/60 p-3.5">
              <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-sky-100 text-xs font-bold text-sky-700">
                  {initial}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-xs font-bold text-slate-900">{user.username}</div>
                  <div className="truncate text-[11px] text-slate-500">
                    สิทธิ์: {user.roles.join(', ') || 'user'}
                  </div>
                </div>
              </div>
            </div>
          )}
        </aside>
      )}

      {/* ====================================================================
          Main Content Column (AdminLTE Top Header + Breadcrumb + Content)
         ==================================================================== */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/95 backdrop-blur-md">
          <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center gap-3 px-4 py-2.5 sm:px-6">
            {/* Sidebar PushMenu Toggle (when inside a module) */}
            {showAdminSidebar && (
              <button
                type="button"
                aria-label="Toggle Sidebar"
                onClick={() => setSidebarOpen((v) => !v)}
                className="hidden h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 lg:inline-flex"
                title="ย่อ/ขยายแถบเมนูด้านซ้าย"
              >
                ☰
              </button>
            )}

            {/* Brand / Breadcrumb */}
            <div className="flex items-center gap-2.5 pr-2">
              <Link to="/" className="group flex items-center gap-2">
                <img
                  src="/logo/ko_envsogo.png"
                  alt="OTP Logo"
                  className="h-8 w-8 rounded-full border border-slate-200 object-cover"
                />
                <div className="hidden sm:block">
                  <div className="text-xs font-extrabold tracking-tight text-slate-900 group-hover:text-sky-600">
                    PI-OS • อบต.ห้องแซง
                  </div>
                  <div className="text-[10px] font-medium text-slate-500">
                    หน้าหลัก / <span className="font-semibold text-sky-700">{currentMeta.th}</span>
                  </div>
                </div>
              </Link>
            </div>

            {/* Accessible Main Navigation (Role-Gated, Preserved for E2E & Quick Jump) */}
            <nav aria-label="Main" className="flex flex-wrap items-center gap-1 text-xs">
              <NavLink to="/" end className={topNavLinkClass}>
                Home
              </NavLink>
              {isAuthenticated && (
                <NavLink to="/me" className={topNavLinkClass}>
                  Me
                </NavLink>
              )}
              {isAuthenticated && (
                <NavLink to="/resident" className={topNavLinkClass}>
                  Resident Portal
                </NavLink>
              )}
              <Can roles={['admin', 'super_admin']}>
                <NavLink to="/organizations" className={topNavLinkClass}>
                  Organizations
                </NavLink>
              </Can>
              <Can
                roles={[
                  'admin',
                  'super_admin',
                  'finance_staff',
                  'tabwater_staff',
                  'recycle_bank_staff',
                  'foodwaste_staff',
                  'annual_staff',
                ]}
              >
                <NavLink to="/users" className={topNavLinkClass}>
                  Users
                </NavLink>
              </Can>
              <Can roles={['admin', 'super_admin', 'finance_staff']}>
                <NavLink to="/inventory" className={topNavLinkClass}>
                  Inventory
                </NavLink>
              </Can>
              <Can roles={['admin', 'super_admin', 'foodwaste_staff']}>
                <NavLink to="/foodwaste" className={topNavLinkClass}>
                  FoodWaste
                </NavLink>
              </Can>
              <Can roles={['admin', 'super_admin', 'recycle_bank_staff', 'finance_staff']}>
                <NavLink to="/recycle" className={topNavLinkClass}>
                  Recycle Bank
                </NavLink>
              </Can>
              <Can roles={['admin', 'super_admin', 'tabwater_staff', 'finance_staff']}>
                <NavLink to="/tabwater" className={topNavLinkClass}>
                  Tabwater
                </NavLink>
              </Can>
            </nav>

            {/* Right User Info & Sign in / Log out */}
            <div className="ml-auto flex items-center gap-2.5 text-sm">
              {isAuthenticated && user ? (
                <div className="flex items-center gap-2 rounded-xl border border-slate-200/90 bg-slate-50/90 py-1 pr-1.5 pl-2.5">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-sky-100 text-[11px] font-bold text-sky-700">
                    {initial}
                  </span>
                  <span data-testid="user-info" className="text-xs font-semibold text-slate-800">
                    {user.username}
                    {user.roles.length > 0 && (
                      <span className="ml-1.5 rounded-md bg-white px-1.5 py-0.5 text-[10px] font-semibold text-sky-700 ring-1 ring-slate-200">
                        ({user.roles.join(', ')})
                      </span>
                    )}
                  </span>
                  <button
                    className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 shadow-2xs hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700"
                    onClick={() => void logout()}
                  >
                    Log out
                  </button>
                </div>
              ) : (
                <button
                  className="rounded-xl bg-sky-600 px-4 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-sky-700"
                  onClick={() => void login('/')}
                >
                  Sign in
                </button>
              )}
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6">
          <Outlet />
        </main>

        <footer className="mt-8 border-t border-slate-200/80 bg-white py-3.5 text-xs text-slate-500">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-4 sm:px-6">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span className="font-semibold text-slate-700">PI-OS • Envsogo Municipal Platform</span>
              <span>• องค์การบริหารส่วนตำบลห้องแซง (HSG1:PIOS)</span>
            </div>
            <div>Multi-Tenant Row-Level Security (RLS) • Clean White Edition</div>
          </div>
        </footer>
      </div>
    </div>
  )
}
