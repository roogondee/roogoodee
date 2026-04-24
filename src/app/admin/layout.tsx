import Link from 'next/link'

export const metadata = { title: 'Admin — รู้ก่อนดี(รู้งี้)' }

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-forest text-white px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/admin" className="font-display text-lg">รู้ก่อน<span className="text-mint italic">ดี</span> <span className="text-white/60 text-sm font-sans font-normal">Admin</span></Link>
          <div className="flex items-center gap-4 text-sm">
            <Link href="/admin" className="text-white/70 hover:text-white transition-colors">Leads</Link>
            <Link href="/admin/analytics" className="text-white/70 hover:text-white transition-colors">📊 Analytics</Link>
            <Link href="/admin/redeem" className="text-white/70 hover:text-white transition-colors">🎟 รับ Voucher</Link>
            <Link href="/admin/deletion-requests" className="text-white/70 hover:text-white transition-colors">🔒 คำขอลบข้อมูล</Link>
          </div>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <Link href="/" className="text-white/70 hover:text-white transition-colors" target="_blank">← เว็บไซต์</Link>
          <a href="/api/admin/logout" className="bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-full transition-colors">ออกจากระบบ</a>
        </div>
      </nav>
      <main className="p-6 max-w-7xl mx-auto">{children}</main>
    </div>
  )
}
