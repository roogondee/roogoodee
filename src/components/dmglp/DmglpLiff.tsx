'use client'
import { useEffect, useRef, useState } from 'react'
import Script from 'next/script'
import { useSearchParams } from 'next/navigation'
import { LIFF_SDK_URL } from '@/lib/liff-client'
import { HOSPITAL_PHONE, HOSPITAL_PHONE_TEL, SURVEY_ITEMS } from '@/lib/dmglp/config'
import { formatThaiDate } from '@/lib/dmglp/dates'

// Patient LIFF (§7): appointments, symptom survey, programme balance.
// Requires LINE login — the id_token is verified server-side, and the page
// deliberately shows no diagnosis, drug or lab data (§1.5).

type Page = 'appointments' | 'survey' | 'program'
const TYPE_TH: Record<string, string> = { specialist_visit: 'พบแพทย์เฉพาะทาง', followup_visit: 'นัดติดตามผล', line_followup: 'ติดตามทาง LINE', lab_only: 'เจาะเลือด' }

export default function DmglpLiff({ liffId }: { liffId: string }) {
  const sp = useSearchParams()
  const liffState = sp?.get('liff.state')
  const inner = liffState ? new URLSearchParams(liffState.replace(/^\?/, '')) : sp
  const page = (['appointments', 'survey', 'program'].includes(inner?.get('page') || '') ? inner!.get('page') : 'appointments') as Page
  const apptId = inner?.get('appt') || undefined

  const [status, setStatus] = useState<'init' | 'ready' | 'unavailable' | 'login'>('init')
  const [token, setToken] = useState<string | null>(null)
  const loaded = useRef(false)

  async function initLiff() {
    if (!window.liff || !liffId) { setStatus('unavailable'); return }
    try {
      await window.liff.init({ liffId })
      if (!window.liff.isLoggedIn()) { setStatus('login'); (window.liff as unknown as { login: () => void }).login(); return }
      setToken(window.liff.getIDToken())
      setStatus('ready')
    } catch { setStatus('unavailable') }
  }
  useEffect(() => { const t = setTimeout(() => setStatus(s => (s === 'init' ? 'unavailable' : s)), 6000); return () => clearTimeout(t) }, [])

  return (
    <main className="min-h-screen bg-cream p-4">
      <Script src={LIFF_SDK_URL} strategy="afterInteractive" onLoad={() => { if (!loaded.current) { loaded.current = true; initLiff() } }} onError={() => setStatus('unavailable')} />
      <div className="max-w-md mx-auto">
        <header className="mb-4">
          <p className="font-display text-xl text-forest">W Medical · โปรแกรมดูแลสุขภาพ</p>
          <nav className="flex gap-2 mt-2 text-xs">
            {(['appointments', 'survey', 'program'] as Page[]).map(p => (
              <a key={p} href={`?page=${p}${apptId ? `&appt=${apptId}` : ''}`} className={`px-3 py-1 rounded-full ${page === p ? 'bg-forest text-white' : 'bg-white border border-gray-200 text-forest'}`}>
                {p === 'appointments' ? 'นัดหมาย' : p === 'survey' ? 'แบบสอบถาม' : 'สิทธิ์โปรแกรม'}
              </a>
            ))}
          </nav>
        </header>
        {status === 'unavailable' && (
          <div className="bg-white rounded-2xl p-5 text-sm text-gray-600">
            เปิดหน้านี้จากแอป LINE เท่านั้น หากยังไม่ได้ ติดต่อโรงพยาบาล <a href={HOSPITAL_PHONE_TEL} className="text-forest underline">{HOSPITAL_PHONE}</a>
          </div>
        )}
        {(status === 'init' || status === 'login') && <p className="text-sm text-muted">กำลังเชื่อมต่อ LINE...</p>}
        {status === 'ready' && token && (
          page === 'appointments' ? <Appointments token={token} /> : page === 'survey' ? <Survey token={token} apptId={apptId} /> : <Program token={token} />
        )}
      </div>
    </main>
  )
}

async function call<T>(body: Record<string, unknown>): Promise<{ ok: boolean; status: number; data: T & { error?: string; message?: string } }> {
  const res = await fetch('/api/dmglp/liff', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  return { ok: res.ok, status: res.status, data: await res.json().catch(() => ({})) }
}

function NotLinked({ message }: { message?: string }) {
  return <div className="bg-white rounded-2xl p-5 text-sm text-gray-700">{message || 'ยังไม่พบข้อมูลของคุณ'} <a href={HOSPITAL_PHONE_TEL} className="text-forest underline block mt-2">โทร {HOSPITAL_PHONE}</a></div>
}

function Appointments({ token }: { token: string }) {
  const [d, setD] = useState<{ first_name?: string; appointments?: Array<{ id: string; template_code: string | null; type: string; scheduled_date: string; status: string }>; message?: string } | null>(null)
  const [err, setErr] = useState<string | null>(null)
  useEffect(() => { call<typeof d>({ action: 'appointments', id_token: token }).then(r => (r.ok ? setD(r.data) : setErr(r.data?.message || 'ไม่สามารถโหลดข้อมูล'))) }, [token])
  if (err) return <NotLinked message={err} />
  if (!d) return <p className="text-sm text-muted">กำลังโหลด...</p>
  return (
    <div className="bg-white rounded-2xl p-5">
      <p className="text-sm text-gray-600 mb-3">สวัสดีคุณ{d.first_name} — นัดหมายที่กำลังจะถึง</p>
      {(d.appointments ?? []).length === 0 ? <p className="text-sm text-gray-400">ไม่มีนัดที่กำลังจะถึง</p> : (
        <ul className="divide-y divide-gray-100">
          {(d.appointments ?? []).map(a => (
            <li key={a.id} className="py-3 flex justify-between items-center">
              <div><div className="font-semibold text-forest">{formatThaiDate(a.scheduled_date)}</div><div className="text-xs text-gray-500">{TYPE_TH[a.type] || a.type}{a.status === 'missed' ? ' · ไม่ได้มาตามนัด กรุณาติดต่อเลื่อนนัด' : ''}</div></div>
              {a.type !== 'line_followup' && <a href={`?page=survey&appt=${a.id}`} className="text-xs text-forest underline">ตอบแบบสอบถาม</a>}
            </li>
          ))}
        </ul>
      )}
      <p className="text-xs text-gray-400 mt-4">เลื่อนนัด / สอบถาม: ตอบกลับในแชท LINE หรือโทร <a href={HOSPITAL_PHONE_TEL} className="underline">{HOSPITAL_PHONE}</a></p>
    </div>
  )
}

function Survey({ token, apptId }: { token: string; apptId?: string }) {
  const [answers, setAnswers] = useState<Record<string, boolean>>({})
  const [free, setFree] = useState('')
  const [result, setResult] = useState<{ red_flag: boolean; message: string } | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setErr(null)
    const r = await call<{ red_flag: boolean; message: string }>({ action: 'survey', id_token: token, appointment_id: apptId, answers, free_text: free })
    setBusy(false)
    if (r.ok) setResult(r.data); else setErr(r.data?.message || 'ส่งไม่สำเร็จ')
  }
  if (err) return <NotLinked message={err} />
  if (result) {
    return (
      <div className={`rounded-2xl p-5 ${result.red_flag ? 'bg-red-50 border border-red-200' : 'bg-white'}`}>
        <p className={`text-sm ${result.red_flag ? 'text-red-800 font-semibold' : 'text-gray-700'}`}>{result.message}</p>
        {result.red_flag && <a href={HOSPITAL_PHONE_TEL} className="mt-4 block text-center bg-red-600 text-white py-3 rounded-full font-bold">โทร {HOSPITAL_PHONE}</a>}
      </div>
    )
  }
  return (
    <form onSubmit={submit} className="bg-white rounded-2xl p-5 space-y-3">
      <p className="text-sm text-gray-600">ช่วงนี้มีอาการต่อไปนี้หรือไม่ (ติ๊กที่มี)</p>
      {SURVEY_ITEMS.map(i => (
        <label key={i.key} className="flex items-start gap-2 text-sm">
          <input type="checkbox" checked={!!answers[i.key]} onChange={e => setAnswers(a => ({ ...a, [i.key]: e.target.checked }))} className="mt-1" />
          <span>{i.labelTh}</span>
        </label>
      ))}
      <textarea value={free} onChange={e => setFree(e.target.value)} rows={2} placeholder="อาการอื่น ๆ หรือคำถาม" className="w-full border border-gray-200 rounded-lg p-2 text-sm" />
      <button disabled={busy} className="w-full bg-forest text-white py-3 rounded-full font-bold disabled:opacity-50">{busy ? 'กำลังส่ง...' : 'ส่งแบบสอบถาม'}</button>
      <p className="text-xs text-gray-400">หากมีอาการรุนแรง ไม่ต้องรอ — โทร <a href={HOSPITAL_PHONE_TEL} className="underline">{HOSPITAL_PHONE}</a> ทันที</p>
    </form>
  )
}

function Program({ token }: { token: string }) {
  const [d, setD] = useState<{ program: { tier: string; expires_at: string; balance: Array<{ item_code: string; entitled: number; used: number; remaining: number }> } | null; message?: string } | null>(null)
  const [err, setErr] = useState<string | null>(null)
  useEffect(() => { call<typeof d>({ action: 'program', id_token: token }).then(r => (r.ok ? setD(r.data) : setErr(r.data?.message || 'ไม่สามารถโหลดข้อมูล'))) }, [token])
  if (err) return <NotLinked message={err} />
  if (!d) return <p className="text-sm text-muted">กำลังโหลด...</p>
  if (!d.program) return <div className="bg-white rounded-2xl p-5 text-sm text-gray-600">ยังไม่มีแพ็กเกจที่ใช้งานอยู่ (ชำระรายครั้ง)</div>
  const LABEL: Record<string, string> = { 'SVC-SPEC': 'พบแพทย์เฉพาะทาง', 'SVC-FU': 'นัดติดตามผล', 'LAB-BASE': 'แล็บชุดเริ่มต้น', 'LAB-Q3M': 'แล็บเดือนที่ 3', 'LAB-Q6M': 'แล็บเดือนที่ 6', 'SVC-TANITA': 'วัดองค์ประกอบร่างกาย', 'SVC-NUTRI': 'นักกำหนดอาหาร', 'SVC-CGM': 'CGM 14 วัน' }
  return (
    <div className="bg-white rounded-2xl p-5">
      <p className="font-semibold text-forest">แพ็กเกจ {d.program.tier}</p>
      <p className="text-xs text-gray-500 mb-3">ใช้ได้ถึง {formatThaiDate(d.program.expires_at)}</p>
      <ul className="text-sm divide-y divide-gray-100">
        {d.program.balance.map(b => <li key={b.item_code} className="py-2 flex justify-between"><span>{LABEL[b.item_code] || b.item_code}</span><span className={b.remaining ? 'font-semibold' : 'text-gray-400'}>เหลือ {b.remaining}/{b.entitled}</span></li>)}
      </ul>
    </div>
  )
}
