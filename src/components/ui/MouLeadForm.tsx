'use client'
import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useTranslation } from '@/lib/i18n/context'
import { track, readUtm, persistClickId } from '@/lib/analytics/track'

const WORKER_COUNTS = ['1-5', '6-20', '21-50', '50+']
// Native-script labels shown to all locales so workers can self-identify.
const NATIONALITIES = [
  { value: 'myanmar', label: 'พม่า (မြန်မာ)' },
  { value: 'cambodia', label: 'กัมพูชา (កម្ពុជា)' },
  { value: 'laos', label: 'ลาว (ລາວ)' },
  { value: 'vietnam', label: 'เวียดนาม (Việt Nam)' },
  { value: 'other', label: 'อื่นๆ / Other' },
]
const NAT_NOTE_LABEL: Record<string, string> = {
  myanmar: 'พม่า', cambodia: 'กัมพูชา', laos: 'ลาว', vietnam: 'เวียดนาม', other: 'อื่นๆ',
}

export function trackCallClick(position: string) {
  track('mou_call_click', { service: 'foreign', position })
  try { window.fbq?.('trackCustom', 'CallClick', { content_category: 'foreign_mou', position }) } catch {}
}

export default function MouLeadForm() {
  const { t } = useTranslation()
  const m = t.foreignMou
  const searchParams = useSearchParams()
  const viewedRef = useRef(false)

  const [form, setForm] = useState({ first_name: '', phone: '', company: '', worker_count: '', nationality: '', note: '' })
  const [honeypot, setHoneypot] = useState('')
  const [consent, setConsent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (viewedRef.current) return
    viewedRef.current = true
    track('mou_landing_view', { service: 'foreign' })
    persistClickId('ttclid', searchParams?.get('ttclid'))
  }, [searchParams])

  const validate = () => {
    const e: Record<string, string> = {}
    if (!form.first_name.trim()) e.first_name = m.errorName
    if (!/^0\d{8,9}$/.test(form.phone.replace(/[-\s]/g, ''))) e.phone = m.errorPhone
    if (!consent) e.consent = m.errorConsent
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    setLoading(true)
    try {
      const utm = readUtm(searchParams)
      const note = [
        form.company.trim() && `บริษัท: ${form.company.trim()}`,
        form.worker_count && `จำนวนแรงงาน: ${form.worker_count}`,
        form.nationality && `สัญชาติ: ${NAT_NOTE_LABEL[form.nationality] || form.nationality}`,
        form.note.trim(),
      ].filter(Boolean).join(' | ')
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service: 'foreign',
          first_name: form.first_name.trim(),
          phone: form.phone.replace(/[-\s]/g, ''),
          note,
          source: 'mou-landing',
          consent_pdpa: true,
          consent_at: new Date().toISOString(),
          website: honeypot,
          ...utm,
        }),
      })
      const data = await res.json()
      if (!data.success) {
        setErrors({ submit: data.error || m.errorGeneral })
        return
      }
      setSuccess(true)
      const eventId = `mou-${data.id ?? Date.now()}`
      track('mou_lead_submit', { service: 'foreign' })
      try {
        window.fbq?.('track', 'Lead', { content_category: 'foreign_mou', content_name: 'MOU Lead Form' }, { eventID: eventId })
      } catch {}
      try {
        window.ttq?.track('SubmitForm', {
          content_id: eventId,
          content_name: 'MOU Lead',
          content_type: 'lead',
        }, { event_id: eventId })
      } catch {}
    } catch {
      setErrors({ submit: m.errorGeneral })
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="bg-white rounded-3xl p-7 md:p-10 shadow-xl text-center">
        <div className="text-6xl mb-4">✅</div>
        <h3 className="font-display text-2xl text-forest mb-2">{m.successTitle}</h3>
        <p className="text-muted text-sm leading-relaxed mb-6">{m.successDesc}</p>
        <a href="tel:0819023540" onClick={() => trackCallClick('form_success')}
          className="flex items-center justify-center gap-2 bg-forest text-white px-6 py-3.5 rounded-full font-bold text-base">
          📞 081-902-3540
        </a>
        <a href="https://line.me/ti/p/@roogondee" target="_blank" rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 bg-[#06C755] text-white px-6 py-3 rounded-full font-bold text-sm mt-2">
          💬 LINE @roogondee
        </a>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-3xl p-7 md:p-10 shadow-xl">
      <h3 className="font-display text-xl md:text-2xl text-forest mb-1">{m.formTitle}</h3>
      <p className="text-muted text-sm mb-6">{m.formDesc}</p>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Honeypot — hidden from humans, bots fill it in */}
        <input type="text" name="website" value={honeypot} onChange={e => setHoneypot(e.target.value)}
          className="absolute -left-[9999px] h-0 w-0 opacity-0" tabIndex={-1} autoComplete="off" aria-hidden="true" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-rtext block mb-1">{m.fieldName} *</label>
            <input type="text" value={form.first_name} onChange={e => setForm({ ...form, first_name: e.target.value })}
              className={`w-full px-3 py-2.5 border rounded-xl text-sm outline-none transition-colors ${errors.first_name ? 'border-red-400' : 'border-gray-200 focus:border-mint'}`} />
            {errors.first_name && <p className="text-red-500 text-xs mt-1">{errors.first_name}</p>}
          </div>
          <div>
            <label className="text-xs font-semibold text-rtext block mb-1">{m.fieldPhone} *</label>
            <input type="tel" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}
              className={`w-full px-3 py-2.5 border rounded-xl text-sm outline-none transition-colors ${errors.phone ? 'border-red-400' : 'border-gray-200 focus:border-mint'}`} />
            {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
          </div>
        </div>
        <div>
          <label className="text-xs font-semibold text-rtext block mb-1">{m.fieldCompany}</label>
          <input type="text" value={form.company} onChange={e => setForm({ ...form, company: e.target.value })}
            className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-mint transition-colors" />
        </div>
        <div>
          <label className="text-xs font-semibold text-rtext block mb-2">{m.fieldWorkerCount}</label>
          <div className="grid grid-cols-4 gap-2">
            {WORKER_COUNTS.map(c => (
              <label key={c} className={`flex items-center justify-center px-2 py-2.5 border rounded-xl text-xs md:text-sm cursor-pointer transition-all ${form.worker_count === c ? 'border-amber-500 bg-amber-50 text-forest font-semibold' : 'border-gray-200 hover:border-amber-300'}`}>
                <input type="radio" name="worker_count" value={c} className="hidden" onChange={() => setForm({ ...form, worker_count: c })} />
                {c}
              </label>
            ))}
          </div>
        </div>
        <div>
          <label className="text-xs font-semibold text-rtext block mb-2">{m.fieldNationality}</label>
          <div className="flex flex-wrap gap-2">
            {NATIONALITIES.map(n => (
              <label key={n.value} className={`px-3 py-2 border rounded-full text-xs cursor-pointer transition-all ${form.nationality === n.value ? 'border-amber-500 bg-amber-50 text-forest font-semibold' : 'border-gray-200 hover:border-amber-300'}`}>
                <input type="radio" name="nationality" value={n.value} className="hidden" onChange={() => setForm({ ...form, nationality: n.value })} />
                {n.label}
              </label>
            ))}
          </div>
        </div>
        <div>
          <label className="text-xs font-semibold text-rtext block mb-1">{m.fieldNote}</label>
          <textarea value={form.note} onChange={e => setForm({ ...form, note: e.target.value })}
            className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-mint transition-colors resize-none" rows={2} />
        </div>
        <div className="bg-mint/5 border border-mint/20 rounded-xl p-3">
          <label className="flex items-start gap-2 text-xs text-rtext cursor-pointer leading-relaxed">
            <input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-forest shrink-0" />
            <span>
              🔒 {t.contact.pdpaConsent}{' '}
              <Link href="/privacy" target="_blank" rel="noopener noreferrer" className="text-forest underline hover:text-sage">
                {t.common.privacyPolicy}
              </Link>
            </span>
          </label>
          {errors.consent && <p className="text-red-500 text-xs mt-1 ml-6">{errors.consent}</p>}
        </div>
        {errors.submit && <p className="text-red-500 text-sm text-center">{errors.submit}</p>}
        <button type="submit" disabled={loading}
          className="w-full bg-forest text-white py-3.5 rounded-full font-bold text-base hover:bg-sage transition-all hover:-translate-y-0.5 disabled:opacity-70 disabled:translate-y-0 disabled:cursor-not-allowed">
          {loading ? m.submitting : m.submit}
        </button>
      </form>
    </div>
  )
}
