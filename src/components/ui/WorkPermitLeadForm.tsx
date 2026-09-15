'use client'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  track,
  readUtm,
  persistClickId,
  readCookie,
  trackWorkPermitCallClick,
  trackWorkPermitLineClick,
} from '@/lib/analytics/track'
import { useTranslation } from '@/lib/i18n/context'

const WORKER_COUNTS = ['1-5', '6-20', '21-50', '50+']

export default function WorkPermitLeadForm({
  // The homepage hero shows a three-field version — name, phone, headcount —
  // because that is all a cold visitor will fill in above the fold, and
  // headcount is the one answer that separates an employer booking fifty
  // workers from a single walk-in. The landing page keeps every field.
  compact = false,
  position = compact ? 'home_hero' : 'landing',
}: {
  compact?: boolean
  position?: string
} = {}) {
  const searchParams = useSearchParams()
  const { t } = useTranslation()
  const w = t.foreignWorkpermit

  const NATIONALITIES = [
    { value: 'myanmar', label: w.formNatMyanmar, note: 'เมียนมา' },
    { value: 'laos', label: w.formNatLaos, note: 'ลาว' },
    { value: 'vietnam', label: w.formNatVietnam, note: 'เวียดนาม' },
    { value: 'other', label: w.formNatOther, note: 'อื่นๆ' },
  ]

  const [form, setForm] = useState({ first_name: '', phone: '', company: '', worker_count: '', nationality: '', note: '' })
  const [honeypot, setHoneypot] = useState('')
  const [consent, setConsent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    // gclid persisted on mount so a submit later in the session (after the
    // visitor navigates away from the URL that carried it) still forwards it.
    persistClickId('gclid', searchParams?.get('gclid'))
    persistClickId('ttclid', searchParams?.get('ttclid'))
  }, [searchParams])

  const validate = () => {
    const e: Record<string, string> = {}
    if (!form.first_name.trim()) e.first_name = w.formErrName
    if (!/^0\d{8,9}$/.test(form.phone.replace(/[-\s]/g, ''))) e.phone = w.formErrPhone
    if (!consent) e.consent = w.formErrConsent
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    setLoading(true)
    try {
      const utm = readUtm(searchParams)
      // Fall back to the cookie persisted on mount: a visitor who browses to
      // another page before filling this in still has the click id, but the
      // URL no longer carries it, so reading searchParams alone silently lost
      // the attribution on exactly the leads that took time to decide.
      const gclid = searchParams?.get('gclid') || readCookie('gclid')
      const nationalityNote = NATIONALITIES.find(n => n.value === form.nationality)?.note
      // company/worker_count also go to their own columns below. They stay in
      // `note` as well because the sales SOP and the LINE group notification
      // both read `note` — dropping them here would blind the team that calls.
      const note = [
        form.company.trim() && `บริษัท: ${form.company.trim()}`,
        form.worker_count && `จำนวนแรงงาน: ${form.worker_count}`,
        nationalityNote && `สัญชาติ: ${nationalityNote}`,
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
          company: form.company.trim() || undefined,
          worker_count: form.worker_count || undefined,
          source: 'workpermit-landing',
          consent_pdpa: true,
          consent_at: new Date().toISOString(),
          website: honeypot,
          gclid,
          ...utm,
        }),
      })
      const data = await res.json()
      if (!data.success) {
        setErrors({ submit: data.error || w.formErrSubmit })
        return
      }
      setSuccess(true)
      // worker_count rides along so Meta and GA4 can tell a fifty-worker
      // employer apart from a single walk-in without opening the CRM.
      track('workpermit_lead', { service: 'foreign', position, worker_count: form.worker_count || 'unspecified' })
    } catch {
      setErrors({ submit: w.formErrSubmit })
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className={`bg-white rounded-3xl shadow-xl text-center ${compact ? 'p-6' : 'p-7 md:p-10'}`}>
        <div className="text-6xl mb-4">✅</div>
        <h3 className="font-display text-2xl text-forest mb-2">{w.formSuccessTitle}</h3>
        <p className="text-muted text-sm leading-relaxed mb-6">{w.formSuccessBody}</p>
        <a href="tel:0819023540" onClick={() => trackWorkPermitCallClick('form_success')}
          className="flex items-center justify-center gap-2 bg-forest text-white px-6 py-3.5 rounded-full font-bold text-base">
          📞 081-902-3540
        </a>
        <a href="https://line.me/ti/p/@roogondee" target="_blank" rel="noopener noreferrer" onClick={() => trackWorkPermitLineClick('form_success')}
          className="flex items-center justify-center gap-2 bg-[#06C755] text-white px-6 py-3 rounded-full font-bold text-sm mt-2">
          💬 LINE @roogondee
        </a>
      </div>
    )
  }

  const inputClass = (invalid?: boolean) =>
    `w-full px-3 py-2.5 border rounded-xl text-sm outline-none transition-colors ${invalid ? 'border-red-400' : 'border-gray-200 focus:border-mint'}`

  return (
    <div className={`bg-white rounded-3xl shadow-xl ${compact ? 'p-5 md:p-6' : 'p-7 md:p-10'}`}>
      <h3 className={`font-display text-forest mb-1 ${compact ? 'text-lg' : 'text-xl md:text-2xl'}`}>
        {compact ? w.formCompactTitle : w.formTitle}
      </h3>
      <p className={`text-muted text-sm ${compact ? 'mb-4' : 'mb-6'}`}>
        {compact ? w.formCompactSubtitle : w.formSubtitle}
      </p>
      <form onSubmit={handleSubmit} className={compact ? 'space-y-3' : 'space-y-4'}>
        <input type="text" name="website" value={honeypot} onChange={e => setHoneypot(e.target.value)}
          className="absolute -left-[9999px] h-0 w-0 opacity-0" tabIndex={-1} autoComplete="off" aria-hidden="true" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-rtext block mb-1">{w.formName} *</label>
            <input type="text" value={form.first_name} onChange={e => setForm({ ...form, first_name: e.target.value })}
              className={inputClass(!!errors.first_name)} />
            {errors.first_name && <p className="text-red-500 text-xs mt-1">{errors.first_name}</p>}
          </div>
          <div>
            <label className="text-xs font-semibold text-rtext block mb-1">{w.formPhone} *</label>
            <input type="tel" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}
              className={inputClass(!!errors.phone)} />
            {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
          </div>
        </div>
        {!compact && (
          <div>
            <label className="text-xs font-semibold text-rtext block mb-1">{w.formCompany}</label>
            <input type="text" value={form.company} onChange={e => setForm({ ...form, company: e.target.value })}
              className={inputClass()} />
          </div>
        )}
        <div>
          <label className="text-xs font-semibold text-rtext block mb-2">{w.formWorkerCount}</label>
          <div className="grid grid-cols-4 gap-2">
            {WORKER_COUNTS.map(c => (
              <label key={c} className={`flex items-center justify-center px-2 py-2.5 border rounded-xl text-xs md:text-sm cursor-pointer transition-all ${form.worker_count === c ? 'border-amber-500 bg-amber-50 text-forest font-semibold' : 'border-gray-200 hover:border-amber-300'}`}>
                <input type="radio" name={`worker_count_${position}`} value={c} className="hidden" onChange={() => setForm({ ...form, worker_count: c })} />
                {c}
              </label>
            ))}
          </div>
        </div>
        {!compact && (
          <>
            <div>
              <label className="text-xs font-semibold text-rtext block mb-2">{w.formNationality}</label>
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
              <label className="text-xs font-semibold text-rtext block mb-1">{w.formNote}</label>
              <textarea value={form.note} onChange={e => setForm({ ...form, note: e.target.value })}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-mint transition-colors resize-none" rows={2} />
            </div>
          </>
        )}
        <div className="bg-mint/5 border border-mint/20 rounded-xl p-3">
          <label className="flex items-start gap-2 text-xs text-rtext cursor-pointer leading-relaxed">
            <input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-forest shrink-0" />
            <span>
              🔒 {w.formConsent}{' '}
              <Link href="/privacy" target="_blank" rel="noopener noreferrer" className="text-forest underline hover:text-sage">
                {w.formConsentLink}
              </Link>
            </span>
          </label>
          {errors.consent && <p className="text-red-500 text-xs mt-1 ml-6">{errors.consent}</p>}
        </div>
        {errors.submit && <p className="text-red-500 text-sm text-center">{errors.submit}</p>}
        <button type="submit" disabled={loading}
          className="w-full bg-forest text-white py-3.5 rounded-full font-bold text-base hover:bg-sage transition-all hover:-translate-y-0.5 disabled:opacity-70 disabled:translate-y-0 disabled:cursor-not-allowed">
          {loading ? w.formSubmitting : w.formSubmit}
        </button>
      </form>
    </div>
  )
}
