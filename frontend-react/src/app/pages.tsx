import { Link } from 'react-router-dom'
import { useAuth } from '@/features/auth/AuthContext'
import { Can } from '@/features/auth/Can'

const FEATURE_CARDS = [
  {
    title: 'ประปาหมู่บ้าน (Tabwater)',
    desc: 'จดมิเตอร์น้ำประปา คำนวณอัตราก้าวหน้า + VAT 7% ออกใบแจ้งหนี้/ใบเสร็จ และตัดชำระเงิน',
    badge: 'Wave 5',
    color: 'from-sky-500 to-blue-600',
    to: '/tabwater',
  },
  {
    title: 'ธนาคารขยะรีไซเคิล (KeptKaya)',
    desc: 'รับซื้อขยะรีไซเคิล สะสมแต้ม/ยอดเงินฝาก ถอนเงินสด ตู้ Kiosk IoT และกองทุนสวัสดิการชุมชน',
    badge: 'Wave 4',
    color: 'from-emerald-500 to-teal-600',
    to: '/recycle',
  },
  {
    title: 'ขยะเปียก & คาร์บอนเครดิต (FoodWaste)',
    desc: 'จัดการรอบถังหมักรักษ์โลก บันทึกน้ำหนักขยะอินทรีย์ และคำนวณการลดก๊าซเรือนกระจก (kgCO2e)',
    badge: 'Wave 3',
    color: 'from-lime-500 to-emerald-600',
    to: '/foodwaste',
  },
  {
    title: 'คลังพัสดุและเบิกจ่าย (Inventory)',
    desc: 'ทะเบียนวัสดุ/เคมีภัณฑ์ประปา คำขอเบิกจ่าย และระบบอนุมัติหลายขั้นตอน (Multi-step Approval)',
    badge: 'Wave 2',
    color: 'from-amber-500 to-orange-600',
    to: '/inventory',
  },
]

export function HomePage() {
  const { isAuthenticated, user, login } = useAuth()
  return (
    <section className="space-y-8">
      <div className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 p-8 text-white shadow-xl sm:p-12">
        <div className="relative z-10 max-w-3xl space-y-5">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-400/30 bg-blue-500/15 px-3.5 py-1 text-xs font-semibold text-blue-200">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            Smart Local Government & Environmental Platform
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">OTP</h1>
          <p className="text-base leading-relaxed text-slate-300 sm:text-lg">
            Organization management portal. Sign in with your organization account to continue.
            แพลตฟอร์มบริหารจัดการองค์กรปกครองส่วนท้องถิ่น ประปาหมู่บ้าน ธนาคารขยะรีไซเคิล และสิ่งแวดล้อมครบวงจร
          </p>

          {isAuthenticated ? (
            <div className="space-y-4 pt-2">
              <div className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-4 py-2 text-sm backdrop-blur-xs">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                <span>
                  Signed in as <strong className="font-bold text-white">{user?.username}</strong>.
                </span>
              </div>
              <ul className="flex flex-wrap gap-3">
                <li>
                  <Link
                    className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 shadow-sm hover:bg-blue-50"
                    to="/me"
                  >
                    My profile
                  </Link>
                </li>
                <li>
                  <Link
                    className="inline-flex items-center gap-2 rounded-xl border border-white/25 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/20"
                    to="/resident"
                  >
                    Resident Portal
                  </Link>
                </li>
                <Can roles={['admin', 'super_admin']}>
                  <li>
                    <Link
                      className="inline-flex items-center gap-2 rounded-xl border border-blue-400/40 bg-blue-600/80 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-600"
                      to="/organizations"
                    >
                      Organizations
                    </Link>
                  </li>
                </Can>
              </ul>
            </div>
          ) : (
            <div className="pt-2">
              <button
                className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-blue-500 to-teal-400 px-6 py-3 text-sm font-bold text-slate-950 shadow-lg shadow-blue-500/25 hover:from-blue-400 hover:to-teal-300"
                onClick={() => void login('/me')}
              >
                Sign in
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {FEATURE_CARDS.map((card) => (
          <div
            key={card.title}
            className="group relative flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs transition-all hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md"
          >
            <div>
              <div className="mb-3 flex items-center justify-between">
                <span
                  className={`inline-flex rounded-lg bg-gradient-to-r ${card.color} px-2.5 py-1 text-[11px] font-bold text-white shadow-2xs`}
                >
                  {card.badge}
                </span>
              </div>
              <h2 className="mb-2 text-base font-bold text-slate-900 group-hover:text-blue-600">{card.title}</h2>
              <p className="text-xs leading-relaxed text-slate-600">{card.desc}</p>
            </div>
            {isAuthenticated && (
              <div className="mt-4 border-t border-slate-100 pt-3">
                <Link to={card.to} className="text-xs font-semibold text-blue-600 hover:text-blue-800">
                  เข้าสู่โมดูล →
                </Link>
              </div>
            )}
          </div>
        ))}
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
        className="inline-flex rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
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
        className="inline-flex rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        to="/"
      >
        Back to home
      </Link>
    </section>
  )
}
