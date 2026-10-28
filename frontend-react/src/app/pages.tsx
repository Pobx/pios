import { Link } from 'react-router-dom'
import { useAuth } from '@/features/auth/AuthContext'
import { Can } from '@/features/auth/Can'

interface RadialBubbleItem {
  posClass: string
  title: string
  subtitle: string
  to: string
  pointerColor: string
  iconBg: string
  iconLabel: string
  roles?: string[]
}

// Matches the 9 radial bubbles in otp2025/resources/views/accessmenu.blade.php
const RADIAL_BUBBLES: RadialBubbleItem[] = [
  {
    posClass: 'b1',
    title: 'งานประปา',
    subtitle: 'จดมิเตอร์ • ใบแจ้งหนี้ • รับชำระค่าน้ำ',
    to: '/tabwater',
    pointerColor: 'bg-sky-500',
    iconBg: 'bg-sky-50 text-sky-600 ring-1 ring-sky-500/20',
    iconLabel: '💧',
    roles: ['admin', 'super_admin', 'tabwater_staff', 'finance_staff'],
  },
  {
    posClass: 'b2',
    title: 'ตู้คืนขวดอัตโนมัติ',
    subtitle: 'IoT Reverse Vending Kiosk',
    to: '/recycle?section=kiosks',
    pointerColor: 'bg-cyan-500',
    iconBg: 'bg-cyan-50 text-cyan-600 ring-1 ring-cyan-500/20',
    iconLabel: '🤖',
    roles: ['admin', 'super_admin', 'recycle_bank_staff', 'finance_staff'],
  },
  {
    posClass: 'b3',
    title: 'คลังพัสดุ',
    subtitle: 'เบิกจ่ายวัสดุ • สารเคมีประปา',
    to: '/inventory',
    pointerColor: 'bg-amber-500',
    iconBg: 'bg-amber-50 text-amber-600 ring-1 ring-amber-500/20',
    iconLabel: '📦',
    roles: ['admin', 'super_admin', 'finance_staff'],
  },
  {
    posClass: 'b4',
    title: 'ธนาคารขยะรีไซเคิล',
    subtitle: 'รับซื้อขยะ • สมุดคู่ฝาก • ถอนเงิน',
    to: '/recycle',
    pointerColor: 'bg-emerald-500',
    iconBg: 'bg-emerald-50 text-emerald-600 ring-1 ring-emerald-500/20',
    iconLabel: '♻️',
    roles: ['admin', 'super_admin', 'recycle_bank_staff', 'finance_staff'],
  },
  {
    posClass: 'b5',
    title: 'ค่าจัดการถังขยะรายปี',
    subtitle: 'ทะเบียนถังขยะรายปีครัวเรือน',
    to: '/recycle?section=kiosks',
    pointerColor: 'bg-teal-500',
    iconBg: 'bg-teal-50 text-teal-600 ring-1 ring-teal-500/20',
    iconLabel: '🗑️',
    roles: ['admin', 'super_admin', 'annual_staff', 'recycle_bank_staff', 'finance_staff'],
  },
  {
    posClass: 'b6',
    title: 'กองทุนฌาปนกิจสงเคราะห์',
    subtitle: 'สวัสดิการสมาชิกธนาคารขยะ',
    to: '/recycle?section=kiosks',
    pointerColor: 'bg-rose-500',
    iconBg: 'bg-rose-50 text-rose-600 ring-1 ring-rose-500/20',
    iconLabel: '🤝',
    roles: ['admin', 'super_admin', 'recycle_bank_staff', 'finance_staff'],
  },
  {
    posClass: 'b7',
    title: 'ถังขยะเปียกจากครัวเรือน',
    subtitle: 'ถังหมักรักษ์โลก • คาร์บอนเครดิต TGO',
    to: '/foodwaste',
    pointerColor: 'bg-lime-500',
    iconBg: 'bg-lime-50 text-lime-600 ring-1 ring-lime-500/20',
    iconLabel: '🌱',
    roles: ['admin', 'super_admin', 'foodwaste_staff'],
  },
  {
    posClass: 'b8',
    title: 'พอร์ทัลลูกบ้าน / ออมทรัพย์',
    subtitle: 'ตรวจสอบค่าน้ำ • ใบเสร็จ • เงินสะสม',
    to: '/resident',
    pointerColor: 'bg-blue-500',
    iconBg: 'bg-blue-50 text-blue-600 ring-1 ring-blue-500/20',
    iconLabel: '🏠',
  },
  {
    posClass: 'b9',
    title: 'ผู้ดูแลระบบ',
    subtitle: 'ทะเบียนลูกบ้าน • หมู่บ้าน • LINE OA',
    to: '/users',
    pointerColor: 'bg-indigo-600',
    iconBg: 'bg-indigo-50 text-indigo-600 ring-1 ring-indigo-500/20',
    iconLabel: '⚙️',
    roles: [
      'admin',
      'super_admin',
      'finance_staff',
      'tabwater_staff',
      'recycle_bank_staff',
      'foodwaste_staff',
      'annual_staff',
    ],
  },
]

// Matches welcome.blade.php service cards
const WELCOME_SERVICES = [
  {
    title: 'ระบบบริหารงานประปา (Tabwater)',
    desc: 'จดมิเตอร์น้ำประปา คำนวณค่าน้ำอัตราก้าวหน้า + VAT 7% ออกใบแจ้งหนี้/ใบเสร็จรับเงิน และตัดยอดชำระออนไลน์',
    badge: 'Smart Waterworks',
    accent: 'border-t-sky-500',
    icon: '💧',
  },
  {
    title: 'ธนาคารขยะรีไซเคิล (KeptKaya)',
    desc: 'รับซื้อขยะรีไซเคิล สะสมแต้มและยอดเงินฝากสมาชิก เบิกถอนเงินสด และเชื่อมโยงกองทุนสวัสดิการชุมชน',
    badge: 'Recycle Bank',
    accent: 'border-t-emerald-500',
    icon: '♻️',
  },
  {
    title: 'ถังขยะเปียก & คาร์บอนเครดิต (FoodWaste)',
    desc: 'บริหารจัดการรอบถังหมักรักษ์โลก บันทึกน้ำหนักขยะอินทรีย์ และคำนวณการลดก๊าซเรือนกระจกตามมาตรฐาน TGO (kgCO2e)',
    badge: 'Carbon Credit',
    accent: 'border-t-lime-500',
    icon: '🌱',
  },
  {
    title: 'คลังพัสดุและเบิกจ่าย (Inventory)',
    desc: 'ขึ้นทะเบียนวัสดุ อุปกรณ์ และสารเคมีประปา พร้อมระบบสร้างใบขอเบิกพัสดุและอนุมัติหลายขั้นตอน',
    badge: 'Stock & Workflow',
    accent: 'border-t-amber-500',
    icon: '📦',
  },
  {
    title: 'ตู้คืนขวดอัตโนมัติ (IoT Smart Kiosk)',
    desc: 'ติดตามสถานะตู้รับซื้อขวดพลาสติกอัตโนมัติแบบเรียลไทม์ พร้อมสะสมแต้มเข้าบัญชีสมาชิกทันที',
    badge: 'IoT Kiosk',
    accent: 'border-t-cyan-500',
    icon: '🤖',
  },
  {
    title: 'พอร์ทัลลูกบ้าน & LINE Official Account',
    desc: 'บริการตนเองสำหรับประชาชนในการตรวจสอบมิเตอร์น้ำ ใบแจ้งหนี้ พิมพ์ใบเสร็จ และแจ้งเตือนผ่าน LINE OA',
    badge: 'Citizen Portal',
    accent: 'border-t-indigo-500',
    icon: '📱',
  },
]

export function HomePage() {
  const { isAuthenticated, user, login, logout } = useAuth()
  const userRoles = user?.roles ?? []

  const canAccessBubble = (allowedRoles?: string[]) => {
    if (!allowedRoles || allowedRoles.length === 0) return true
    return allowedRoles.some((r) => userRoles.includes(r))
  }

  // ==========================================================================
  // Authenticated View: otp2025/resources/views/accessmenu.blade.php
  // Modern Minimal Dashboard Hub + 1-Click Action Bar + Role-Filtered Grid
  // ==========================================================================
  if (isAuthenticated) {
    return (
      <section className="space-y-6">
        {/* Modern Minimal Greeting & 1-Click Action Bar (Low Friction) */}
        <div className="rounded-3xl border border-slate-200/90 bg-white p-5 shadow-xs sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-3 py-0.5 text-xs font-bold text-sky-700">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <span>HSG1:PIOS • องค์การบริหารส่วนตำบลห้องแซง</span>
              </div>
              <h2 className="mt-2 text-xl font-extrabold text-slate-900 tracking-tight sm:text-2xl">
                สวัสดี, {user?.username} 👋
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                สิทธิ์การใช้งาน:{' '}
                <span className="font-semibold text-slate-800">{userRoles.join(', ') || 'user'}</span> •
                เข้าถึงระบบงานได้รวดเร็วใน 1 คลิก
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Link
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-800 hover:bg-sky-50 hover:text-sky-700 transition-all"
                to="/me"
              >
                👤 My profile
              </Link>
              <Link
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-800 hover:bg-sky-50 hover:text-sky-700 transition-all"
                to="/resident"
              >
                🏠 Resident Portal
              </Link>
              <Can roles={['admin', 'super_admin']}>
                <Link
                  className="inline-flex items-center gap-1.5 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-semibold text-sky-700 hover:bg-sky-100 transition-all"
                  to="/organizations"
                >
                  🏛️ Organizations
                </Link>
              </Can>
              <button
                type="button"
                onClick={() => void logout()}
                className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50/70 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100 transition-all"
              >
                ออกจากระบบ
              </button>
            </div>
          </div>

          {/* 1-Click Quick Action Shortcuts (ตามบทบาทเพื่อลดขั้นตอนทำงาน) */}
          <div className="mt-4">
            <div className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              ⚡ ภารกิจด่วน 1-Click Shortcuts (ใช้งานบ่อย)
            </div>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 lg:grid-cols-6">
              <Can roles={['admin', 'super_admin', 'tabwater_staff', 'finance_staff']}>
                <Link
                  to="/tabwater?section=reading"
                  className="flex flex-col rounded-2xl border border-sky-100 bg-sky-50/60 p-3 text-left transition-all hover:border-sky-300 hover:bg-sky-50 hover:shadow-2xs"
                >
                  <span className="text-xl mb-1">💧</span>
                  <span className="text-xs font-bold text-slate-900">จดมิเตอร์น้ำ</span>
                  <span className="text-[10px] text-slate-500">บันทึกเลขอ่านเร็ว</span>
                </Link>
              </Can>

              <Can roles={['admin', 'super_admin', 'tabwater_staff', 'finance_staff']}>
                <Link
                  to="/tabwater?section=invoices"
                  className="flex flex-col rounded-2xl border border-blue-100 bg-blue-50/60 p-3 text-left transition-all hover:border-blue-300 hover:bg-blue-50 hover:shadow-2xs"
                >
                  <span className="text-xl mb-1">🧾</span>
                  <span className="text-xs font-bold text-slate-900">รับชำระค่าน้ำ</span>
                  <span className="text-[10px] text-slate-500">ออกบิล & ใบเสร็จ</span>
                </Link>
              </Can>

              <Can roles={['admin', 'super_admin', 'recycle_bank_staff', 'finance_staff']}>
                <Link
                  to="/recycle?section=purchase"
                  className="flex flex-col rounded-2xl border border-emerald-100 bg-emerald-50/60 p-3 text-left transition-all hover:border-emerald-300 hover:bg-emerald-50 hover:shadow-2xs"
                >
                  <span className="text-xl mb-1">♻️</span>
                  <span className="text-xs font-bold text-slate-900">รับซื้อขยะรีไซเคิล</span>
                  <span className="text-[10px] text-slate-500">ชั่งน้ำหนัก & เข้าบัญชี</span>
                </Link>
              </Can>

              <Can roles={['admin', 'super_admin', 'foodwaste_staff']}>
                <Link
                  to="/foodwaste?section=log"
                  className="flex flex-col rounded-2xl border border-lime-100 bg-lime-50/60 p-3 text-left transition-all hover:border-lime-300 hover:bg-lime-50 hover:shadow-2xs"
                >
                  <span className="text-xl mb-1">🌱</span>
                  <span className="text-xs font-bold text-slate-900">บันทึกขยะเปียก</span>
                  <span className="text-[10px] text-slate-500">ถังหมักรักษ์โลก</span>
                </Link>
              </Can>

              <Can roles={['admin', 'super_admin', 'finance_staff']}>
                <Link
                  to="/inventory?section=approvals"
                  className="flex flex-col rounded-2xl border border-amber-100 bg-amber-50/60 p-3 text-left transition-all hover:border-amber-300 hover:bg-amber-50 hover:shadow-2xs"
                >
                  <span className="text-xl mb-1">📦</span>
                  <span className="text-xs font-bold text-slate-900">คิวอนุมัติพัสดุ</span>
                  <span className="text-[10px] text-slate-500">เบิกจ่ายสารเคมี/ท่อ</span>
                </Link>
              </Can>

              <Link
                to="/resident"
                className="flex flex-col rounded-2xl border border-indigo-100 bg-indigo-50/60 p-3 text-left transition-all hover:border-indigo-300 hover:bg-indigo-50 hover:shadow-2xs"
              >
                <span className="text-xl mb-1">🏠</span>
                <span className="text-xs font-bold text-slate-900">พอร์ทัลลูกบ้าน</span>
                <span className="text-[10px] text-slate-500">สมุดเงินฝากดิจิทัล</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Existing Radial Bubble Stage (Desktop Radial / Mobile Responsive Grid) */}
        <div className="accessmenu-stage p-6 sm:p-8 lg:p-10">
          <div className="grid items-center gap-8 lg:grid-cols-12">
            {/* Left Organization Info Panel (matches accessmenu.blade.php col-md-4) */}
            <div className="space-y-5 lg:col-span-5">
              <div className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50/90 px-3.5 py-1 text-xs font-bold text-sky-700">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <span>PI-OS • Envsogo Smart Municipality</span>
              </div>

              <div>
                <div className="accessmenu-org-code text-2xl font-extrabold tracking-wider text-sky-600 sm:text-3xl">
                  HSG1:PIOS
                </div>
                <h1 className="sr-only">OTP</h1>
                <div className="accessmenu-org-name mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">
                  องค์การบริหารส่วนตำบลห้องแซง
                </div>
                <p className="mt-1.5 text-sm font-medium text-slate-500">
                  ตำบลห้องแซง อำเภอเลิงนกท่า จังหวัดยโสธร
                </p>
              </div>

              {/* User Role & Identity Card */}
              <div className="rounded-2xl border border-slate-200/90 bg-white/95 p-4 shadow-xs">
                <div className="flex items-center gap-3">
                  <img
                    src="/logo/ko_envsogo.png"
                    alt="Organization Emblem"
                    className="h-12 w-12 rounded-full border border-slate-200 object-cover p-0.5"
                  />
                  <div>
                    <div className="text-xs text-slate-500">
                      Signed in as <strong className="font-bold text-slate-900">{user?.username}</strong>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {userRoles.map((r) => (
                        <span
                          key={r}
                          className="rounded-md bg-sky-50 px-2 py-0.5 text-[11px] font-bold text-sky-700 ring-1 ring-sky-600/20"
                        >
                          {r}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <p className="mt-3 text-xs leading-relaxed text-slate-500">
                  เลือกเมนูระบบงานจากวงล้อด้านขวา ระบบจะเปิดใช้งานเฉพาะโมดูลที่ตรงกับสิทธิ์ (Role) ของคุณโดยอัตโนมัติ
                </p>
              </div>
            </div>

            {/* Right Radial Bubble Hub (matches accessmenu.blade.php col-md-8) */}
            <div className="lg:col-span-7">
              {/* Desktop Radial Arc View */}
              <div className="hidden xl:block">
                <div className="accessmenu-hub-wrapper">
                  <div className="accessmenu-ring-1" />
                  <div className="accessmenu-ring-2" />

                  <div className="accessmenu-main-circle">
                    <img
                      src="/logo/ko_envsogo.png"
                      alt="อบต.ห้องแซง"
                      className="h-32 w-32 rounded-full object-contain"
                    />
                    <span className="mt-2 rounded-full bg-sky-50 px-3 py-0.5 text-[11px] font-bold text-sky-700 ring-1 ring-sky-500/20">
                      เลือกเมนูระบบงาน
                    </span>
                  </div>

                  {RADIAL_BUBBLES.map((b) => {
                    const allowed = canAccessBubble(b.roles)
                    return (
                      <Link
                        key={b.posClass}
                        to={allowed ? b.to : '#'}
                        aria-disabled={!allowed}
                        className={`accessmenu-bubble-container ${b.posClass} ${!allowed ? 'a-disbled' : ''}`}
                      >
                        <div className={`accessmenu-pointer ${b.pointerColor}`} />
                        <div className="accessmenu-bubble">
                          <span
                            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-base ${b.iconBg}`}
                          >
                            {b.iconLabel}
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-xs font-bold text-slate-900">{b.title}</div>
                            <div className="truncate text-[10px] font-normal text-slate-500">{b.subtitle}</div>
                          </div>
                          {!allowed && (
                            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-semibold text-slate-500">
                              ไม่มีสิทธิ์
                            </span>
                          )}
                        </div>
                      </Link>
                    )
                  })}
                </div>
              </div>

              {/* Tablet / Mobile Responsive Bubble List Fallback */}
              <div className="grid gap-3 sm:grid-cols-2 xl:hidden">
                {RADIAL_BUBBLES.map((b) => {
                  const allowed = canAccessBubble(b.roles)
                  return (
                    <Link
                      key={b.posClass}
                      to={allowed ? b.to : '#'}
                      aria-disabled={!allowed}
                      className={`flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3.5 shadow-2xs transition-all hover:border-sky-300 ${
                        !allowed ? 'a-disbled' : ''
                      }`}
                    >
                      <span
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg ${b.iconBg}`}
                      >
                        {b.iconLabel}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-bold text-slate-900">{b.title}</div>
                        <div className="truncate text-xs text-slate-500">{b.subtitle}</div>
                      </div>
                    </Link>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </section>
    )
  }

  // ==========================================================================
  // Anonymous View: otp2025/resources/views/welcome.blade.php
  // Clean White Theme Landing Page
  // ==========================================================================
  return (
    <section className="space-y-10">
      <div className="relative overflow-hidden rounded-3xl border border-slate-200/90 bg-gradient-to-br from-white via-sky-50/40 to-emerald-50/30 p-8 shadow-sm sm:p-12">
        <div className="grid items-center gap-8 lg:grid-cols-12">
          <div className="space-y-5 lg:col-span-7">
            <div className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-white px-3.5 py-1 text-xs font-bold text-sky-700 shadow-2xs">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span>PI-OS | ระบบบริหารจัดการองค์กรปกครองส่วนท้องถิ่นดิจิทัล</span>
            </div>

            <div className="space-y-2">
              <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">OTP</h1>
              <p className="text-xl font-bold text-sky-700 sm:text-2xl">
                ยกระดับการบริหารจัดการ องค์กรปกครองส่วนท้องถิ่นยุคดิจิทัล
              </p>
            </div>

            <p className="text-sm leading-relaxed text-slate-600 sm:text-base">
              ระบบสารสนเทศเพื่อการบริหารจัดการประปาหมู่บ้าน ธนาคารขยะรีไซเคิล ถังขยะเปียกครัวเรือน คลังพัสดุ
              และบริการประชาชนครบวงจร ช่วยลดขั้นตอนการทำงาน เพิ่มความโปร่งใส และตรวจสอบได้ในที่เดียว
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                className="inline-flex items-center gap-2 rounded-2xl bg-sky-600 px-6 py-3 text-sm font-bold text-white shadow-md shadow-sky-600/20 hover:bg-sky-700"
                onClick={() => void login('/me')}
              >
                <span>Sign in</span>
                <span>→</span>
              </button>
              <span className="text-xs font-medium text-slate-500">
                เข้าสู่ระบบด้วยบัญชีองค์กร (Keycloak Single Sign-On)
              </span>
            </div>
          </div>

          <div className="flex justify-center lg:col-span-5">
            <div className="relative flex flex-col items-center rounded-3xl border border-slate-200/80 bg-white p-6 text-center shadow-md">
              <img
                src="/logo/ko_envsogo.png"
                alt="Envsogo Logo"
                className="h-32 w-32 rounded-full border-4 border-sky-50 object-contain shadow-xs"
              />
              <div className="mt-3 text-base font-bold text-slate-900">องค์การบริหารส่วนตำบลห้องแซง</div>
              <div className="text-xs font-medium text-slate-500">อำเภอเลิงนกท่า จังหวัดยโสธร (HSG1:PIOS)</div>
              <div className="mt-3 flex flex-wrap justify-center gap-1.5">
                <span className="rounded-full bg-sky-50 px-2.5 py-0.5 text-[11px] font-semibold text-sky-700">
                  Smart Water
                </span>
                <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700">
                  KeptKaya Bank
                </span>
                <span className="rounded-full bg-lime-50 px-2.5 py-0.5 text-[11px] font-semibold text-lime-700">
                  Carbon Credit
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 6 Municipal Services Grid (matches welcome.blade.php #services) */}
      <div className="space-y-4">
        <div className="text-center">
          <h2 className="text-xl font-bold text-slate-900">ระบบงานบริการหลักขององค์กรปกครองส่วนท้องถิ่น</h2>
          <p className="text-xs text-slate-500">
            ออกแบบตามโครงสร้างการทำงานจริงของเจ้าหน้าที่ อปท. และประชาชนในพื้นที่
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {WELCOME_SERVICES.map((srv) => (
            <div
              key={srv.title}
              className={`flex flex-col justify-between rounded-2xl border border-slate-200/80 border-t-4 ${srv.accent} bg-white p-6 shadow-xs transition-all hover:-translate-y-0.5 hover:shadow-md`}
            >
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 text-xl ring-1 ring-slate-200/70">
                    {srv.icon}
                  </span>
                  <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-700">
                    {srv.badge}
                  </span>
                </div>
                <h3 className="mb-1.5 text-base font-bold text-slate-900">{srv.title}</h3>
                <p className="text-xs leading-relaxed text-slate-600">{srv.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export function ForbiddenPage() {
  return (
    <section
      role="alert"
      className="mx-auto max-w-lg rounded-3xl border border-amber-200 bg-white p-8 text-center shadow-sm"
    >
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-xl font-bold text-amber-700">
        !
      </div>
      <h1 className="mb-2 text-2xl font-bold text-slate-900">403 — Forbidden</h1>
      <p className="mb-6 text-sm text-slate-600">You do not have permission to view this page.</p>
      <Link
        className="inline-flex rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700"
        to="/"
      >
        Back to home
      </Link>
    </section>
  )
}

export function NotFoundPage() {
  return (
    <section className="mx-auto max-w-lg rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-xl font-bold text-slate-700">
        404
      </div>
      <h1 className="mb-2 text-2xl font-bold text-slate-900">404 — Not found</h1>
      <p className="mb-6 text-sm text-slate-600">The page you are looking for does not exist.</p>
      <Link
        className="inline-flex rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700"
        to="/"
      >
        Back to home
      </Link>
    </section>
  )
}
