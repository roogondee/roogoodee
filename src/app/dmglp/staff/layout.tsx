import Link from 'next/link'
import { getDmglpUser } from '@/lib/dmglp/roles'
import { can, type Permission } from '@/lib/dmglp/roles'
import { ROLE_LABELS_TH } from '@/lib/dmglp/config'

export const metadata = { title: 'DMGLP Staff — W Medical', robots: { index: false, follow: false } }
export const dynamic = 'force-dynamic'

// Role-based navigation (§3, §7). The middleware already requires an admin
// session; a signed-in user with no program role sees the "no role" screen.
const NAV: Array<{ href: string; label: string; perm: Permission }> = [
  { href: '/dmglp/staff/today', label: 'วันนี้', perm: 'appointments.read' },
  { href: '/dmglp/staff/leads', label: 'Leads', perm: 'leads.read' },
  { href: '/dmglp/staff/patients', label: 'ผู้ป่วย', perm: 'patients.read' },
  { href: '/dmglp/staff/tasks', label: 'งาน', perm: 'tasks.read' },
  { href: '/dmglp/staff/alerts', label: 'แจ้งเตือน', perm: 'alerts.read' },
  { href: '/dmglp/staff/pharmacy/dispense', label: 'จ่ายยา', perm: 'pharmacy.read' },
  { href: '/dmglp/staff/pharmacy/inventory', label: 'สต็อกยา', perm: 'pharmacy.read' },
  { href: '/dmglp/staff/pharmacy/fridge', label: 'ตู้เย็น', perm: 'pharmacy.read' },
  { href: '/dmglp/staff/pharmacy/reconcile', label: 'นับสต็อก', perm: 'pharmacy.read' },
  { href: '/dmglp/staff/finance/programs', label: 'โปรแกรม', perm: 'finance.read' },
  { href: '/dmglp/staff/finance/installments', label: 'งวดชำระ', perm: 'finance.read' },
  { href: '/dmglp/staff/partners', label: 'พาร์ตเนอร์', perm: 'finance.read' },
  { href: '/dmglp/staff/marketing/conversions', label: 'Conversions', perm: 'marketing.read' },
  { href: '/dmglp/staff/dashboard', label: 'Dashboard', perm: 'dashboard.read' },
  { href: '/dmglp/staff/settings/prices', label: 'ราคา', perm: 'settings.read' },
  { href: '/dmglp/staff/settings/rules', label: 'เกณฑ์', perm: 'settings.read' },
  { href: '/dmglp/staff/audit', label: 'Audit', perm: 'audit.read' },
]

export default async function DmglpStaffLayout({ children }: { children: React.ReactNode }) {
  const user = await getDmglpUser()

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-forest text-white px-4 md:px-6 py-3">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-4">
            <Link href="/dmglp/staff" className="font-display text-lg">W Medical <span className="text-mint">DM / GLP-1</span></Link>
            {user && (
              <span className="text-xs bg-white/10 px-2 py-1 rounded-full">
                {user.name || user.email} · {ROLE_LABELS_TH[user.role]}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 text-sm">
            {user?.canManageStaff && <Link href="/dmglp/staff/settings/staff" className="text-white/70 hover:text-white">ทีมงาน</Link>}
            <Link href="/admin" className="text-white/70 hover:text-white">Admin</Link>
            <a href="/api/admin/logout" className="bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-full">ออกจากระบบ</a>
          </div>
        </div>
        {user && (
          <div className="max-w-7xl mx-auto mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
            {NAV.filter(n => can(user.role, n.perm)).map(n => (
              <Link key={n.href} href={n.href} className="text-white/70 hover:text-white transition-colors">{n.label}</Link>
            ))}
          </div>
        )}
      </nav>
      <main className="p-4 md:p-6 max-w-7xl mx-auto">
        {user ? children : (
          <div className="max-w-md mx-auto mt-12 bg-white rounded-xl p-6 border border-gray-200 text-center">
            <p className="text-forest font-semibold mb-1">ยังไม่มีสิทธิ์ในระบบ DM / GLP-1</p>
            <p className="text-sm text-gray-500">ให้ manager กำหนดบทบาท (แพทย์ / เภสัชกร / พยาบาล / แอดมิน / การเงิน / การตลาด) ที่ Settings → ทีมงาน</p>
          </div>
        )}
      </main>
    </div>
  )
}
