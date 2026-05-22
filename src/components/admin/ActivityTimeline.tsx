'use client'
import { useEffect, useState } from 'react'

interface Activity {
  id: string
  actor_email: string
  kind: string
  outcome: string | null
  body: string | null
  next_action_at: string | null
  next_action_note: string | null
  created_at: string
}

const KIND_LABEL: Record<string, string> = {
  call: '📞 โทร',
  line: '💬 LINE',
  sms: '✉️ SMS',
  visit: '🏥 มาคลินิก',
  email: '📧 Email',
  note: '📝 บันทึก',
}

const OUTCOME_LABEL: Record<string, { text: string; cls: string }> = {
  reached:             { text: 'คุยได้',           cls: 'bg-green-100 text-green-700' },
  no_answer:           { text: 'ไม่รับ',           cls: 'bg-gray-100 text-gray-600' },
  wrong_number:        { text: 'เบอร์ผิด',         cls: 'bg-red-100 text-red-700' },
  callback_requested:  { text: 'ขอให้โทรกลับ',     cls: 'bg-yellow-100 text-yellow-700' },
  booked:              { text: 'จองคิวแล้ว',       cls: 'bg-blue-100 text-blue-700' },
  not_interested:      { text: 'ไม่สนใจ',          cls: 'bg-gray-200 text-gray-700' },
  customer:            { text: 'เป็นลูกค้าแล้ว',   cls: 'bg-emerald-200 text-emerald-800' },
  other:               { text: 'อื่นๆ',            cls: 'bg-gray-100 text-gray-600' },
}

function fmt(iso: string) {
  return new Date(iso).toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' })
}

function relativeFromNow(iso: string): string {
  const diffMs = new Date(iso).getTime() - Date.now()
  const abs = Math.abs(diffMs)
  const h = Math.round(abs / 3_600_000)
  if (h < 24) return diffMs >= 0 ? `อีก ${h} ชม.` : `${h} ชม.ที่แล้ว`
  const d = Math.round(abs / 86_400_000)
  return diffMs >= 0 ? `อีก ${d} วัน` : `${d} วันที่แล้ว`
}

function defaultDueInDays(days: number): string {
  const d = new Date(Date.now() + days * 86_400_000)
  d.setHours(10, 0, 0, 0)
  return d.toISOString().slice(0, 16)
}

export default function ActivityTimeline({ leadId }: { leadId: string }) {
  const [items, setItems] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [kind, setKind] = useState('call')
  const [outcome, setOutcome] = useState<string>('')
  const [body, setBody] = useState('')
  const [nextAt, setNextAt] = useState<string>('')
  const [nextNote, setNextNote] = useState('')
  const [saving, setSaving] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/leads/${leadId}/activities`, { cache: 'no-store' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'load failed')
      setItems(data.activities || [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'load failed')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [leadId]) // eslint-disable-line react-hooks/exhaustive-deps

  const submit = async () => {
    setSaving(true); setError(null)
    try {
      const res = await fetch(`/api/admin/leads/${leadId}/activities`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind,
          outcome: outcome || null,
          body,
          next_action_at: nextAt || null,
          next_action_note: nextNote || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'save failed')
      setBody(''); setOutcome(''); setNextAt(''); setNextNote('')
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* New activity form */}
      <div className="border border-gray-200 rounded-lg p-4 bg-gray-50 space-y-3">
        <div className="flex items-center gap-2 flex-wrap text-xs">
          <label className="text-gray-500">ช่องทาง</label>
          <select value={kind} onChange={e => setKind(e.target.value)} className="border border-gray-200 rounded px-2 py-1 bg-white">
            {Object.entries(KIND_LABEL).map(([k, label]) => (
              <option key={k} value={k}>{label}</option>
            ))}
          </select>
          <label className="text-gray-500 ml-2">ผลลัพธ์</label>
          <select value={outcome} onChange={e => setOutcome(e.target.value)} className="border border-gray-200 rounded px-2 py-1 bg-white">
            <option value="">—</option>
            {Object.entries(OUTCOME_LABEL).map(([k, { text }]) => (
              <option key={k} value={k}>{text}</option>
            ))}
          </select>
        </div>

        <textarea
          value={body}
          onChange={e => setBody(e.target.value)}
          rows={3}
          placeholder="โน้ตจากการคุย เช่น 'ลูกค้าสนใจ GLP-1 แต่ขอคุยกับสามีก่อน'"
          className="w-full px-3 py-2 border border-gray-200 rounded text-sm outline-none focus:border-forest resize-none bg-white"
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
          <div>
            <label className="text-gray-500 block mb-1">นัดติดต่ออีก</label>
            <div className="flex gap-1 mb-1">
              {[
                { label: 'พรุ่งนี้', d: 1 },
                { label: '+3 วัน', d: 3 },
                { label: '+1 สัปดาห์', d: 7 },
              ].map(p => (
                <button key={p.d} type="button" onClick={() => setNextAt(defaultDueInDays(p.d))}
                  className="px-2 py-1 rounded border border-gray-200 bg-white hover:border-forest text-gray-600">{p.label}</button>
              ))}
            </div>
            <input type="datetime-local" value={nextAt} onChange={e => setNextAt(e.target.value)}
              className="w-full px-2 py-1 border border-gray-200 rounded bg-white" />
          </div>
          <div>
            <label className="text-gray-500 block mb-1">ทำอะไรต่อ</label>
            <input type="text" value={nextNote} onChange={e => setNextNote(e.target.value)}
              placeholder="เช่น 'ส่งราคา + นัดเข้าตรวจ'"
              className="w-full px-2 py-1 border border-gray-200 rounded bg-white" />
          </div>
        </div>

        <div className="flex items-center justify-between">
          {error && <span className="text-xs text-red-600">{error}</span>}
          <button type="button" onClick={submit} disabled={saving}
            className="ml-auto text-xs font-semibold bg-forest text-white px-4 py-1.5 rounded-md hover:bg-sage disabled:opacity-40">
            {saving ? 'กำลังบันทึก…' : 'บันทึก Activity'}
          </button>
        </div>
      </div>

      {/* Timeline */}
      <div>
        {loading ? (
          <p className="text-sm text-gray-400">กำลังโหลด…</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-gray-400">ยังไม่มี activity</p>
        ) : (
          <ol className="space-y-3">
            {items.map(a => {
              const oc = a.outcome ? OUTCOME_LABEL[a.outcome] : null
              return (
                <li key={a.id} className="border-l-2 border-mint pl-3 pb-2">
                  <div className="flex items-center gap-2 flex-wrap text-xs text-gray-500">
                    <span className="font-semibold text-gray-800">{KIND_LABEL[a.kind] || a.kind}</span>
                    {oc && <span className={`px-2 py-0.5 rounded-full font-semibold ${oc.cls}`}>{oc.text}</span>}
                    <span>•</span>
                    <span>{a.actor_email}</span>
                    <span>•</span>
                    <span>{fmt(a.created_at)}</span>
                  </div>
                  {a.body && <p className="text-sm text-gray-700 mt-1 whitespace-pre-wrap">{a.body}</p>}
                  {a.next_action_at && (
                    <p className="text-xs text-blue-700 mt-1">
                      ⏭ ต่อไป: {fmt(a.next_action_at)} ({relativeFromNow(a.next_action_at)})
                      {a.next_action_note && ` — ${a.next_action_note}`}
                    </p>
                  )}
                </li>
              )
            })}
          </ol>
        )}
      </div>
    </div>
  )
}
