'use client'
import { useState } from 'react'

interface Props {
  leadId: string
  initialAttempts?: number
  initialNextFollowup?: string | null
  initialOutcome?: string | null
}

type Channel = 'call' | 'line' | 'sms' | 'email' | 'other'
type Outcome =
  | 'answered' | 'no_answer' | 'voicemail' | 'wrong_number'
  | 'line_sent' | 'sms_sent' | 'email_sent'
  | 'scheduled'

interface ActionConfig {
  label:    string
  icon:     string
  channel:  Channel
  outcome:  Outcome
  followupHoursIfMissing?: number  // auto-suggest follow-up X hours later when user doesn't pick one
}

// Frequent salesperson actions surfaced as one-click buttons. Less-common
// outcomes (wrong_number, email) live in the dropdown to keep the primary
// flow scannable. Each click writes a row to lead_contact_log + bumps
// leads.contact_attempts; "answered"/"scheduled" auto-promote new → contacted.
const QUICK_ACTIONS: ActionConfig[] = [
  { label: 'รับสาย',         icon: '📞', channel: 'call', outcome: 'answered',     followupHoursIfMissing: 48 },
  { label: 'ไม่รับ',          icon: '📵', channel: 'call', outcome: 'no_answer',    followupHoursIfMissing: 4 },
  { label: 'ฝากข้อความเสียง', icon: '📨', channel: 'call', outcome: 'voicemail',    followupHoursIfMissing: 24 },
  { label: 'ส่ง LINE แล้ว',   icon: '💬', channel: 'line', outcome: 'line_sent',    followupHoursIfMissing: 24 },
]

const SECONDARY_OUTCOMES: Array<{ label: string; channel: Channel; outcome: Outcome }> = [
  { label: 'ส่ง SMS แล้ว',         channel: 'sms',   outcome: 'sms_sent' },
  { label: 'ส่งอีเมลแล้ว',         channel: 'email', outcome: 'email_sent' },
  { label: 'เบอร์ผิด / ไม่ใช่คน',   channel: 'call',  outcome: 'wrong_number' },
]

function formatLocal(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleString('th-TH', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

// HTML datetime-local needs YYYY-MM-DDTHH:MM, no seconds, no zone.
function toLocalInput(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export default function LeadQuickActions({
  leadId,
  initialAttempts = 0,
  initialNextFollowup = null,
  initialOutcome = null,
}: Props) {
  const [attempts, setAttempts] = useState(initialAttempts)
  const [nextFollowup, setNextFollowup] = useState<string | null>(initialNextFollowup)
  const [lastOutcome, setLastOutcome] = useState<string | null>(initialOutcome)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showSchedule, setShowSchedule] = useState(false)
  const [scheduleAt, setScheduleAt] = useState<string>(() => {
    const d = new Date()
    d.setHours(d.getHours() + 4)              // default suggestion: 4 hours later
    d.setMinutes(0, 0, 0)
    return toLocalInput(d)
  })
  const [notes, setNotes] = useState('')

  async function logContact(channel: Channel, outcome: Outcome, override?: { next_followup_at?: string | null }) {
    setPending(true)
    setError(null)
    try {
      const config = QUICK_ACTIONS.find(a => a.channel === channel && a.outcome === outcome)
      // For quick actions without an explicit schedule, auto-suggest a sensible
      // next follow-up so the lead doesn't drop off the my-tasks queue.
      let next_followup_at: string | null | undefined = override?.next_followup_at
      if (next_followup_at === undefined && config?.followupHoursIfMissing) {
        const d = new Date()
        d.setHours(d.getHours() + config.followupHoursIfMissing)
        next_followup_at = d.toISOString()
      }

      const res = await fetch(`/api/admin/leads/${leadId}/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel, outcome, notes: notes || undefined, next_followup_at }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'บันทึกไม่สำเร็จ')
        return
      }
      setAttempts(data.contact_attempts ?? attempts + 1)
      setNextFollowup(data.next_followup_at ?? null)
      setLastOutcome(outcome)
      setNotes('')
      setShowSchedule(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'บันทึกไม่สำเร็จ')
    } finally {
      setPending(false)
    }
  }

  async function submitSchedule() {
    if (!scheduleAt) return
    const iso = new Date(scheduleAt).toISOString()
    await logContact('call', 'scheduled', { next_followup_at: iso })
  }

  return (
    <div className="border border-gray-200 rounded-xl p-4 space-y-3 bg-white">
      <div className="flex items-baseline justify-between">
        <h3 className="text-sm font-semibold text-forest">บันทึกการติดต่อ</h3>
        <span className="text-xs text-muted">
          ความพยายาม: <strong>{attempts}</strong>
          {lastOutcome ? <span className="ml-2">· ล่าสุด: {lastOutcome}</span> : null}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {QUICK_ACTIONS.map(a => (
          <button
            key={`${a.channel}-${a.outcome}`}
            disabled={pending}
            onClick={() => logContact(a.channel, a.outcome)}
            className="text-left text-sm bg-mint/10 hover:bg-mint/20 border border-mint/30 rounded-lg px-3 py-2 disabled:opacity-50"
          >
            <span className="mr-1.5">{a.icon}</span>{a.label}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="โน้ตเพิ่มเติม (เช่น 'ลูกค้าสนใจ GLP-1 ขอดูราคาก่อน')"
          rows={2}
          maxLength={1000}
          className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg outline-none focus:border-mint resize-none"
        />

        <div className="flex flex-wrap items-center gap-2">
          <select
            disabled={pending}
            onChange={e => {
              const v = e.target.value
              if (!v) return
              const action = SECONDARY_OUTCOMES[parseInt(v, 10)]
              if (action) logContact(action.channel, action.outcome)
              e.target.value = ''
            }}
            className="text-xs px-2 py-1.5 border border-gray-200 rounded-lg bg-white"
          >
            <option value="">+ ผลลัพธ์อื่นๆ</option>
            {SECONDARY_OUTCOMES.map((o, i) => (
              <option key={o.outcome} value={i}>{o.label}</option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => setShowSchedule(s => !s)}
            disabled={pending}
            className="text-xs px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            🗓 นัดโทรกลับ
          </button>
        </div>

        {showSchedule && (
          <div className="flex items-center gap-2 mt-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <input
              type="datetime-local"
              value={scheduleAt}
              onChange={e => setScheduleAt(e.target.value)}
              className="text-sm px-2 py-1 border border-gray-200 rounded"
            />
            <button
              type="button"
              onClick={submitSchedule}
              disabled={pending || !scheduleAt}
              className="text-xs bg-amber-500 text-white px-3 py-1.5 rounded font-medium disabled:opacity-50"
            >
              บันทึกนัด
            </button>
          </div>
        )}
      </div>

      {nextFollowup && (
        <div className="text-xs bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          🔔 นัดติดตามถัดไป: <strong>{formatLocal(nextFollowup)}</strong>
        </div>
      )}

      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}
