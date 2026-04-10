import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'ไม่พบหน้านี้ (404) — รู้ก่อนดี',
}

export default function NotFound() {
  return (
    <main className="min-h-screen bg-cream flex flex-col items-center justify-center px-6 text-center">
      <div className="text-7xl mb-6">🌿</div>
      <h1 className="font-display text-5xl md:text-6xl text-forest mb-4">404</h1>
      <p className="text-xl text-forest font-semibold mb-2">ไม่พบหน้านี้</p>
      <p className="text-muted text-sm md:text-base mb-10 max-w-sm leading-relaxed">
        ขออภัยค่ะ หน้าที่คุณกำลังมองหาอาจถูกย้ายหรือไม่มีอยู่ในระบบ
      </p>
      <div className="flex flex-col sm:flex-row gap-3">
        <Link href="/" className="bg-forest text-white px-8 py-3.5 rounded-full text-sm font-bold hover:bg-sage transition-all shadow-lg">
          ← กลับหน้าแรก
        </Link>
        <Link href="/contact" className="border-2 border-forest text-forest px-8 py-3.5 rounded-full text-sm font-bold hover:bg-forest hover:text-white transition-all">
          💬 ปรึกษาฟรี
        </Link>
      </div>

      <div className="mt-14 flex flex-wrap justify-center gap-3 max-w-md">
        {[
          { href: '/std', label: '🔴 STD & PrEP' },
          { href: '/glp1', label: '💉 GLP-1' },
          { href: '/ckd', label: '🫘 CKD โรคไต' },
          { href: '/tools', label: '🧮 เครื่องคำนวณ' },
          { href: '/ask', label: '💬 ถามผู้เชี่ยวชาญ' },
          { href: '/blog', label: '📚 บทความ' },
        ].map(l => (
          <Link key={l.href} href={l.href} className="text-xs font-medium text-sage bg-mint/10 border border-mint/20 px-4 py-2 rounded-full hover:bg-mint/20 transition-colors">
            {l.label}
          </Link>
        ))}
      </div>
    </main>
  )
}
