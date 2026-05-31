import { SERVICES } from '@/types'
import type { LabUpsell } from '@/lib/lab/types'

export default function LabUpsellCards({ upsell }: { upsell: LabUpsell[] }) {
  if (!upsell?.length) return null
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {upsell.map((u, i) =>
        u.kind === 'clinical_followup' ? (
          <div key={i} className="rounded-xl border border-mint/30 bg-mint/5 p-4">
            <div className="text-xs font-semibold text-sage mb-1">ตรวจเพิ่มเติม (มาตรฐาน)</div>
            <div className="font-semibold text-forest">{u.title}</div>
            <ul className="list-disc list-inside text-sm text-gray-700 mt-1">
              {u.recommended_tests.map((t, j) => <li key={j}>{t}</li>)}
            </ul>
            <p className="text-xs text-gray-600 mt-2">{u.reason}</p>
            <p className="text-xs text-gray-400 mt-1">📍 {u.location}</p>
          </div>
        ) : (
          <div key={i} className="rounded-xl border border-forest/15 bg-white p-4">
            <div className="text-xs font-semibold text-sage mb-1">บริการแนะนำ</div>
            <div className="font-semibold text-forest">{SERVICES[u.service]?.name ?? u.service}</div>
            <p className="text-xs text-gray-600 mt-1">{u.reason}</p>
            {u.voucher_hint && <p className="text-xs text-mint font-medium mt-2">🎟 {u.voucher_hint}</p>}
          </div>
        )
      )}
    </div>
  )
}
