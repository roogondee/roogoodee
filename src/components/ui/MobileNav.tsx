'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV_LINKS = [
  { href: '/', label: 'หน้าแรก' },
  { href: '/std', label: '🔴 STD & PrEP HIV' },
  { href: '/glp1', label: '💉 GLP-1 ลดน้ำหนัก' },
  { href: '/ckd', label: '🫘 CKD Clinic โรคไต' },
  { href: '/foreign', label: '🧪 ตรวจแรงงานต่างด้าว' },
  { href: '/tools', label: '🧮 เครื่องคำนวณสุขภาพ' },
  { href: '/ask', label: '💬 ถามผู้เชี่ยวชาญ' },
  { href: '/blog', label: '📚 บทความสุขภาพ' },
]

export default function MobileNav() {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  // Close on route change
  useEffect(() => { setOpen(false) }, [pathname])

  // Prevent body scroll when open
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  return (
    <>
      {/* Fixed hamburger button — top-right on mobile, sits beside each page's own nav */}
      <button
        onClick={() => setOpen(o => !o)}
        className="fixed top-3.5 right-20 z-50 md:hidden flex flex-col justify-center items-center w-9 h-9 gap-1.5 rounded-lg bg-cream/80 hover:bg-mint/10 transition-colors backdrop-blur-sm"
        aria-label={open ? 'ปิดเมนู' : 'เปิดเมนู'}
      >
        <span className={`block w-5 h-0.5 bg-forest transition-all duration-300 ${open ? 'rotate-45 translate-y-2' : ''}`} />
        <span className={`block w-5 h-0.5 bg-forest transition-all duration-300 ${open ? 'opacity-0' : ''}`} />
        <span className={`block w-5 h-0.5 bg-forest transition-all duration-300 ${open ? '-rotate-45 -translate-y-2' : ''}`} />
      </button>

      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Drawer */}
      <div className={`fixed top-0 right-0 z-50 h-full w-72 bg-white shadow-2xl transform transition-transform duration-300 ease-in-out md:hidden ${open ? 'translate-x-0' : 'translate-x-full'}`}>
        {/* Drawer header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-mint/15">
          <div className="font-display text-xl text-forest">รู้ก่อน<span className="text-mint italic">ดี</span></div>
          <button onClick={() => setOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-muted text-lg transition-colors">✕</button>
        </div>

        {/* Nav links */}
        <nav className="px-4 py-5 space-y-1 overflow-y-auto h-full pb-32">
          {NAV_LINKS.map(link => (
            <Link
              key={link.href}
              href={link.href}
              className={`block px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                pathname === link.href
                  ? 'bg-forest/10 text-forest font-semibold'
                  : 'text-muted hover:bg-mint/10 hover:text-forest'
              }`}
            >
              {link.label}
            </Link>
          ))}

          {/* CTA in drawer */}
          <div className="pt-4 border-t border-mint/15 mt-4 space-y-2">
            <Link href="/contact" className="block text-center bg-forest text-white px-6 py-3 rounded-full text-sm font-bold hover:bg-sage transition-all">
              📝 ปรึกษาฟรี
            </Link>
            <a href="https://line.me/ti/p/@roogondee" target="_blank" rel="noopener noreferrer"
              className="block text-center bg-[#06C755] text-white px-6 py-3 rounded-full text-sm font-bold hover:bg-[#00B04B] transition-all">
              💬 LINE @roogondee
            </a>
          </div>
        </nav>
      </div>
    </>
  )
}
