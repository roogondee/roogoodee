'use client'
import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useTranslation } from '@/lib/i18n/context'
import LanguageSwitcher from '@/components/ui/LanguageSwitcher'

export default function ContactPage() {
  const { t } = useTranslation()
  const searchParams = useSearchParams()
  const [form, setForm] = useState({ service: '', first_name: '', last_name: '', phone: '', age: '', gender: '', note: '' })

  const SERVICES = [
    { value: 'std',     label: t.contact.serviceStd },
    { value: 'glp1',   label: t.contact.serviceGlp1 },
    { value: 'ckd',    label: t.contact.serviceCkd },
    { value: 'foreign',label: t.contact.serviceForeign },
  ]

  useEffect(() => {
    const s = searchParams.get('service')
    if (s && ['std', 'glp1', 'ckd', 'foreign'].includes(s)) {
      setForm(prev => ({ ...prev, service: s }))
    }
  }, [searchParams])
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validate = () => {
    const e: Record<string, string> = {}
    if (!form.first_name.trim()) e.first_name = t.contact.errorFirstName
    if (!/^0\d{8,9}$/.test(form.phone.replace(/[-\s]/g, ''))) e.phone = t.contact.errorPhone
    if (!form.service) e.service = t.contact.errorService
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    setLoading(true)
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (data.success) setSuccess(true)
      else setErrors({ submit: data.error || t.contact.errorGeneral })
    } catch {
      setErrors({ submit: t.contact.errorRetry })
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-forest via-sage to-mint flex items-center justify-center p-5 md:p-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 max-w-4xl w-full items-center">
        {/* Left — info (hidden on mobile, shown on md+) */}
        <div className="text-white hidden md:block">
          <Link href="/" className="flex items-center gap-2 text-white/70 text-sm mb-8 hover:text-white transition-colors">← {t.common.backToHome}</Link>
          <h1 className="font-display text-5xl leading-tight mb-4">{t.contact.title}<br/><em className="text-leaf">{t.contact.titleHighlight}</em></h1>
          <p className="text-white/70 leading-relaxed mb-8">{t.contact.desc}</p>
          <ul className="space-y-3">
            {[['🔒', t.contact.trustSafe],['💬', t.contact.trustFree],['⚡', t.contact.trustFast],['🌿', t.contact.trustNoJudge]].map(([icon,text]) => (
              <li key={text} className="flex items-center gap-3 text-sm text-white/80 border-b border-white/10 pb-3">
                <span>{icon}</span>{text}
              </li>
            ))}
          </ul>
          <div className="mt-8">
            <LanguageSwitcher />
          </div>
        </div>

        {/* Form */}
        <div className="bg-white rounded-3xl p-7 md:p-10 shadow-2xl w-full">
          {/* Mobile back link */}
          <Link href="/" className="flex items-center gap-2 text-muted text-sm mb-4 hover:text-forest transition-colors md:hidden">← {t.common.backToHome}</Link>

          {success ? (
            <div className="text-center py-8">
              <div className="text-6xl mb-4">✅</div>
              <h3 className="font-display text-2xl text-forest mb-2">{t.contact.successTitle}</h3>
              <p className="text-muted text-sm leading-relaxed mb-6">{t.contact.successDesc}</p>
              <a href="https://line.me/ti/p/@roogondee" target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 bg-[#06C755] text-white px-6 py-3 rounded-full font-bold text-sm">
                💬 {t.contact.successLine}
              </a>
              <a href="tel:0819023540" className="flex items-center justify-center gap-2 bg-forest text-white px-6 py-3 rounded-full font-bold text-sm mt-2">
                📞 {t.contact.successCall}
              </a>
            </div>
          ) : (
            <>
              <div className="inline-flex items-center gap-2 bg-mint/10 border border-mint/20 text-sage px-3 py-1.5 rounded-full text-xs font-semibold mb-4">🌿 {t.contact.formTag}</div>
              <h2 className="font-display text-xl md:text-2xl text-forest mb-1">{t.contact.formTitle}</h2>
              <p className="text-muted text-sm mb-5 md:mb-6">{t.contact.formDesc}</p>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-rtext block mb-1">{t.contact.firstName} *</label>
                    <input type="text" placeholder={t.contact.firstNamePlaceholder} value={form.first_name} onChange={e => setForm({...form, first_name: e.target.value})}
                      className={`w-full px-3 py-2.5 border rounded-xl text-sm outline-none transition-colors ${errors.first_name ? 'border-red-400' : 'border-gray-200 focus:border-mint'}`} />
                    {errors.first_name && <p className="text-red-500 text-xs mt-1">{errors.first_name}</p>}
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-rtext block mb-1">{t.contact.lastName}</label>
                    <input type="text" placeholder={t.contact.lastNamePlaceholder} value={form.last_name} onChange={e => setForm({...form, last_name: e.target.value})}
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-mint transition-colors" />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-rtext block mb-1">{t.contact.phone} *</label>
                  <input type="tel" placeholder={t.contact.phonePlaceholder} value={form.phone} onChange={e => setForm({...form, phone: e.target.value})}
                    className={`w-full px-3 py-2.5 border rounded-xl text-sm outline-none transition-colors ${errors.phone ? 'border-red-400' : 'border-gray-200 focus:border-mint'}`} />
                  {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
                </div>
                <div>
                  <label className="text-xs font-semibold text-rtext block mb-2">{t.contact.serviceInterest} *</label>
                  <div className="grid grid-cols-2 gap-2">
                    {SERVICES.map(s => (
                      <label key={s.value} className={`flex items-center gap-2 px-3 py-2.5 border rounded-xl text-xs md:text-sm cursor-pointer transition-all ${form.service === s.value ? 'border-sage bg-mint/8 text-forest font-semibold' : 'border-gray-200 hover:border-mint'}`}>
                        <input type="radio" name="service" value={s.value} className="hidden" onChange={() => setForm({...form, service: s.value})} />
                        {s.label}
                      </label>
                    ))}
                  </div>
                  {errors.service && <p className="text-red-500 text-xs mt-1">{errors.service}</p>}
                </div>
                <div>
                  <label className="text-xs font-semibold text-rtext block mb-1">{t.contact.additionalNote}</label>
                  <textarea placeholder={t.contact.notePlaceholder} value={form.note} onChange={e => setForm({...form, note: e.target.value})}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-mint transition-colors resize-none" rows={3} />
                </div>
                {errors.submit && <p className="text-red-500 text-sm text-center">{errors.submit}</p>}
                <button type="submit" disabled={loading}
                  className="w-full bg-forest text-white py-3.5 rounded-full font-bold text-base hover:bg-sage transition-all hover:-translate-y-0.5 disabled:opacity-70 disabled:translate-y-0 flex items-center justify-center gap-2">
                  {loading ? t.contact.submitting : t.contact.submitButton}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </main>
  )
}
