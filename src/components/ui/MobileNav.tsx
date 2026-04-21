'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTranslation } from '@/lib/i18n/context'
import LanguageSwitcher from './LanguageSwitcher'
import { track } from '@/lib/analytics/track'

export default function MobileNav() {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()
  const { t } = useTranslation()

  const NAV_LINKS = [
    { href: '/', label: t.common.home },
    { href: '/std', label: t.nav.std },
    { href: '/glp1', label: t.nav.glp1 },
    { href: '/ckd', label: t.nav.ckd },
    { href: '/foreign', label: t.nav.foreign },
    { href: '/tools', label: t.nav.tools },
    { href: '/ask', label: t.nav.ask },
    { href: '/blog', label: t.nav.blog },
  ]

  useEffect(() => { setOpen(false) }, [pathname])
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  return (
    <>
      <button
        onClick={() => setOpen(o => !o)}
        className="fixed top-3.5 right-20 z-50 md:hidden flex flex-col justify-center items-center w-9 h-9 gap-1.5 rounded-lg bg-cream/80 hover:bg-mint/10 transition-colors backdrop-blur-sm"
        aria-label={open ? t.common.closeMenu : t.common.openMenu}
      >
        <span className={`block w-5 h-0.5 bg-forest transition-all duration-300 ${open ? 'rotate-45 translate-y-2' : ''}`} />
        <span className={`block w-5 h-0.5 bg-forest transition-all duration-300 ${open ? 'opacity-0' : ''}`} />
        <span className={`block w-5 h-0.5 bg-forest transition-all duration-300 ${open ? '-rotate-45 -translate-y-2' : ''}`} />
      </button>

      {open && (
        <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm md:hidden" onClick={() => setOpen(false)} />
      )}

      <div className={`fixed top-0 right-0 z-50 h-full w-72 bg-white shadow-2xl transform transition-transform duration-300 ease-in-out md:hidden ${open ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="flex items-center justify-between px-6 py-5 border-b border-mint/15">
          <div className="font-display text-xl text-forest">{t.common.brandName}</div>
          <button onClick={() => setOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-muted text-lg transition-colors">✕</button>
        </div>

        <nav className="px-4 py-5 space-y-1 overflow-y-auto h-full pb-32">
          {/* Language switcher in drawer */}
          <div className="px-4 py-2 mb-2">
            <LanguageSwitcher />
          </div>

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

          <div className="pt-4 border-t border-mint/15 mt-4 space-y-2">
            <Link href="/contact" className="block text-center bg-forest text-white px-6 py-3 rounded-full text-sm font-bold hover:bg-sage transition-all">
              📝 {t.common.consultFree}
            </Link>
            <a href="https://line.me/ti/p/@roogondee" target="_blank" rel="noopener noreferrer"
              onClick={() => track('ClickLINE', { location: 'mobile_nav' })}
              className="block text-center bg-[#06C755] text-white px-6 py-3 rounded-full text-sm font-bold hover:bg-[#00B04B] transition-all">
              💬 LINE @roogondee
            </a>
          </div>
        </nav>
      </div>
    </>
  )
}
