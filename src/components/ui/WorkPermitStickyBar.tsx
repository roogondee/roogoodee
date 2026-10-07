'use client'
import { useTranslation } from '@/lib/i18n/context'
import { trackWorkPermitCallClick, trackWorkPermitLineClick } from '@/lib/analytics/track'

const PHONE_TEL = 'tel:0819023540'
const LINE_URL = 'https://line.me/ti/p/@roogondee'

// Pinned call/LINE pair for mobile. /foreign/workpermit has had one since it
// shipped; the homepage had nothing below the fold, so a visitor who scrolled
// past the hero into the seven other pillars had no way back to the campaign
// CTAs without scrolling up. `position` keeps the two pages distinguishable in
// reporting. LINEFloat hides itself wherever this renders — otherwise there are
// two LINE buttons stacked in the same corner, and only one of them is tracked.
export default function WorkPermitStickyBar({ position }: { position: string }) {
  const { t } = useTranslation()
  const w = t.foreignWorkpermit

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-3 bg-white/95 backdrop-blur border-t border-amber-200 md:hidden flex gap-2">
      <a href={PHONE_TEL} onClick={() => trackWorkPermitCallClick(position)}
        className="flex-1 flex items-center justify-center gap-2 bg-amber-500 text-white py-3.5 rounded-full font-bold text-sm shadow-lg">
        {w.stickyCall}
      </a>
      <a href={LINE_URL} target="_blank" rel="noopener noreferrer" onClick={() => trackWorkPermitLineClick(position)}
        className="flex-1 flex items-center justify-center gap-2 bg-[#06C755] text-white py-3.5 rounded-full font-bold text-sm shadow-lg">
        {w.stickyLine}
      </a>
    </div>
  )
}
