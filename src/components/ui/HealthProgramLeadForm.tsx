'use client'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  track,
  readUtm,
  persistClickId,
  readCookie,
  trackHealthProgramCallClick,
  trackHealthProgramLineClick,
} from '@/lib/analytics/track'
import { useTranslation } from '@/lib/i18n/context'

// Same four bands as WorkPermitLeadForm on purpose: `WORKER_COUNTS` in
// src/app/api/leads/route.ts is a closed set, and anything outside it is
// dropped to null. Reusing the bands also keeps health-program leads
// groupable alongside work-permit leads instead of forming a second,
// incompatible taxonomy in the same column.
const WORKER_COUNTS = ['1-5', '6-20', '21-50', '50+']

// Six checkboxes, one per pillar. There is no `interest` column on `leads`
// and adding one would be a migration, so this rides in `note` — which is
// what the sales SOP and the LINE group notification actually read.
const INTEREST_KEYS = [
  'formInterest1', 'formInterest2', 'formInterest3',
  'formInterest4', 'formInterest5', 'formInterest6',
] as const

// The CRM is read in Thai by the sales team, so the note carries Thai labels
// regardless of which locale the visitor filled the form in.
const INTEREST_NOTES: Record<string, string> = {
  formInterest1: 'ตรวจสุขภาพประจำปี',
  formInterest2: 'วัคซีน',
  formInterest3: 'อบรมสุขศึกษา',
  formInterest4: 'บริการรักษาเบื้องต้น',
  formInterest5: 'สุขภาพจิต',
  formInterest6: 'โภชนาการ',
}

export default function HealthProgramLeadForm({
  position = 'health_program_landing',
}: { position?: string } = {}) {
  const searchParams = useSearchParams()
  const { t } = useTranslation()
  const h = t.foreignHealthProgram

  const [form, setForm] = useState({ first_name: '', phone: '', company: '', worker_count: '', note: '' })
  const [interests, setInterests] = useState<string[]>([])
  const [honeypot, setHoneypot] = useState('')
  const [consent, setConsent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    persistClickId('gclid', searchParams?.get('gclid'))
    persistClickId('ttclid', searchParams?.get('ttclid'))
  }, [searchParams])

  const toggleInterest = (key: string) =>
    setInterests(prev => (prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]))

  const validate = () => {
    const e: Record<string, string> = {}
    if (!form.first_name.trim()) e.first_name = h.formErrName
    if (!/^0\d{8,9}$/.test(form.phone.replace(/[-\s]/g, ''))) e.phone = h.formErrPhone
    if (!consent) e.consent = h.formErrConsent
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    setLoading(true)
    try {
      const utm = readUtm(searchParams)
      // Cookie fallback: a visitor who browses to another page before filling
      // this in still has the click id, but the URL no longer carries it.
      const gclid = searchParams?.get('gclid') || readCookie('gclid')
      const interestNote = interests.map(k => INTEREST_NOTES[k]).filter(Boolean).join(', ')
      const note = [
        form.company.trim() && `บริษัท: ${form.company.trim()}`,
        form.worker_count && `จำนวนแรงงาน: ${form.worker_count}`,
        interestNote && `สนใจ: ${interestNote}`,
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
          source: 'health-program-landing',
          consent_pdpa: true,
          consent_at: new Date().toISOString(),
          website: honeypot,
          gclid,
          ...utm,
        }),
      })
      const data = await res.json()
      if (!data.success) {
        setErrors({ submit: data.error || h.formErrSubmit })
        return
      }
      setSuccess(true)
      track('healthprogram_lead', {
        service: 'foreign',
        position,
        worker_count: form.worker_count || 'unspecified',
        interests: interests.length ? interests.map(k => INTEREST_NOTES[k]).join(',') : 'unspecified',
      })
    } catch {
      setErrors({ submit: h.formErrSubmit })
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="bg-white rounded-3xl shadow-xl text-center p-7 md:p-10">
        <div className="text-6xl mb-4">✅</div>
        <h3 className="font-display text-2xl text-forest mb-2">{h.formSuccessTitle}</h3>
        <p className="text-muted text-sm leading-relaxed mb-6">{h.formSuccessDesc}</p>
        <a href="tel:0819023540" onClick={() => trackHealthProgramCallClick('form_success')}
          className="flex items-center justify-center gap-2 bg-forest text-white px-6 py-3.5 rounded-full font-bold text-base">
          📞 081-902-3540
        </a>
        <a href="https://line.me/ti/p/@roogondee" target="_blank" rel="noopener noreferrer"
          onClick={() => trackHealthProgramLineClick('form_success')}
          className="flex items-center justify-center gap-2 bg-[#06C755] text-white px-6 py-3 rounded-full font-bold text-sm mt-2">
          💬 LINE @roogondee
        </a>
      </div>
    )
  }

  const inputClass = (invalid?: boolean) =>
    `w-full px-3 py-2.5 border rounded-xl text-sm outline-none transition-colors ${invalid ? 'border-red-400' : 'border-gray-200 focus:border-mint'}`

  return (
    <div className="bg-white rounded-3xl shadow-xl p-7 md:p-10">
      <h3 className="font-display text-forest mb-1 text-xl md:text-2xl">{h.formTitle}</h3>
      <p className="text-muted text-sm mb-6">{h.formDesc}</p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input type="text" name="website" value={honeypot} onChange={e => setHoneypot(e.target.value)}
          className="absolute -left-[9999px] h-0 w-0 opacity-0" tabIndex={-1} autoComplete="off" aria-hidden="true" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-rtext block mb-1">{h.formName} *</label>
            <input type="text" value={form.first_name} onChange={e => setForm({ ...form, first_name: e.target.value })}
              placeholder={h.formNamePh} className={inputClass(!!errors.first_name)} />
            {errors.first_name && <p className="text-red-500 text-xs mt-1">{errors.first_name}</p>}
          </div>
          <div>
            <label className="text-xs font-semibold text-rtext block mb-1">{h.formPhone} *</label>
            <input type="tel" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}
              placeholder={h.formPhonePh} className={inputClass(!!errors.phone)} />
            {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
          </div>
        </div>
        <div>
          <label className="text-xs font-semibold text-rtext block mb-1">{h.formCompany}</label>
          <input type="text" value={form.company} onChange={e => setForm({ ...form, company: e.target.value })}
            placeholder={h.formCompanyPh} className={inputClass()} />
        </div>
        <div>
          <label className="text-xs font-semibold text-rtext block mb-2">{h.formWorkerCount}</label>
          <div className="grid grid-cols-4 gap-2">
            {WORKER_COUNTS.map(c => (
              <label key={c} className={`flex items-center justify-center px-2 py-2.5 border rounded-xl text-xs md:text-sm cursor-pointer transition-all ${form.worker_count === c ? 'border-amber-500 bg-amber-50 text-forest font-semibold' : 'border-gray-200 hover:border-amber-300'}`}>
                <input type="radio" name={`worker_count_${position}`} value={c} className="hidden"
                  onChange={() => setForm({ ...form, worker_count: c })} />
                {c}
              </label>
            ))}
          </div>
        </div>
        <div>
          <label className="text-xs font-semibold text-rtext block mb-2">{h.formInterest}</label>
          <div className="flex flex-wrap gap-2">
            {INTEREST_KEYS.map(key => (
              <label key={key} className={`px-3 py-2 border rounded-full text-xs cursor-pointer transition-all ${interests.includes(key) ? 'border-amber-500 bg-amber-50 text-forest font-semibold' : 'border-gray-200 hover:border-amber-300'}`}>
                <input type="checkbox" checked={interests.includes(key)} className="hidden"
                  onChange={() => toggleInterest(key)} />
                {h[key]}
              </label>
            ))}
          </div>
        </div>
        <div>
          <label className="text-xs font-semibold text-rtext block mb-1">{h.formNote}</label>
          <textarea value={form.note} onChange={e => setForm({ ...form, note: e.target.value })}
            placeholder={h.formNotePh}
            className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-mint transition-colors resize-none" rows={2} />
        </div>
        <div className="bg-mint/5 border border-mint/20 rounded-xl p-3">
          <label className="flex items-start gap-2 text-xs text-rtext cursor-pointer leading-relaxed">
            <input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-forest shrink-0" />
            <span>
              🔒 {h.formConsent}{' '}
              <Link href="/privacy" target="_blank" rel="noopener noreferrer" className="text-forest underline hover:text-sage">
                {h.formConsentLink}
              </Link>
            </span>
          </label>
          {errors.consent && <p className="text-red-500 text-xs mt-1 ml-6">{errors.consent}</p>}
        </div>
        {errors.submit && <p className="text-red-500 text-sm text-center">{errors.submit}</p>}
        <button type="submit" disabled={loading}
          className="w-full bg-forest text-white py-3.5 rounded-full font-bold text-base hover:bg-sage transition-all hover:-translate-y-0.5 disabled:opacity-70 disabled:translate-y-0 disabled:cursor-not-allowed">
          {loading ? h.formSubmitting : h.formSubmit}
        </button>
      </form>
    </div>
  )
}
