'use client'
import { useState } from 'react'

type Service = 'glp1' | 'std' | 'ckd' | 'foreign' | 'mens'
type Tone = 'informative' | 'urgent' | 'friendly' | 'question'
type Goal = 'awareness' | 'lead'

interface Variant {
  version: string
  caption: string
  hashtags: string[]
}

interface GenResponse {
  ok?: boolean
  ctaUrl?: string
  variants?: Variant[]
  error?: string
}

const SERVICES: { value: Service; label: string }[] = [
  { value: 'glp1',    label: '💉 GLP-1 (ลดน้ำหนัก)' },
  { value: 'std',     label: '🔴 STD / PrEP HIV' },
  { value: 'ckd',     label: '🫘 CKD (โรคไต)' },
  { value: 'foreign', label: '🧪 แรงงานต่างด้าว' },
  { value: 'mens',    label: '🚹 สุขภาพชาย' },
]

const TONES: { value: Tone; label: string }[] = [
  { value: 'informative', label: 'Informative (ข้อมูล)' },
  { value: 'urgent',      label: 'Urgent (เร่งด่วน)' },
  { value: 'friendly',    label: 'Friendly (เป็นเพื่อน)' },
  { value: 'question',    label: 'Question (คำถามดึง engagement)' },
]

const GOALS: { value: Goal; label: string }[] = [
  { value: 'awareness', label: '📢 Awareness (สร้าง brand)' },
  { value: 'lead',      label: '🎯 Lead (รับ voucher)' },
]

interface PostState {
  loading: boolean
  posted?: { id: string; scheduled: boolean }
  error?: string
}

export default function CaptionGenForm() {
  const [service, setService] = useState<Service>('glp1')
  const [tone, setTone] = useState<Tone>('informative')
  const [goal, setGoal] = useState<Goal>('awareness')
  const [topic, setTopic] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<GenResponse | null>(null)
  const [copied, setCopied] = useState<string | null>(null)
  const [postState, setPostState] = useState<Record<string, PostState>>({})
  const [scheduleAt, setScheduleAt] = useState<Record<string, string>>({})

  const submit = async () => {
    setLoading(true)
    setResult(null)
    try {
      const res = await fetch('/api/admin/gen-caption', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ service, tone, goal, topic: topic.trim() || undefined }),
      })
      const json = (await res.json()) as GenResponse
      setResult(json)
    } catch (err) {
      setResult({ error: err instanceof Error ? err.message : 'Network error' })
    } finally {
      setLoading(false)
    }
  }

  const copyVariant = async (v: Variant) => {
    const text = `${v.caption}\n\n${v.hashtags.join(' ')}`
    await navigator.clipboard.writeText(text)
    setCopied(v.version)
    setTimeout(() => setCopied(null), 1500)
  }

  const postVariant = async (v: Variant, schedule: boolean) => {
    if (schedule && !scheduleAt[v.version]) {
      setPostState((s) => ({ ...s, [v.version]: { loading: false, error: 'เลือกเวลานัดก่อน' } }))
      return
    }
    setPostState((s) => ({ ...s, [v.version]: { loading: true } }))
    try {
      const message = `${v.caption}\n\n${v.hashtags.join(' ')}`
      const res = await fetch('/api/admin/fb-post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          link: result?.ctaUrl,
          scheduledAt: schedule ? scheduleAt[v.version] : null,
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        setPostState((s) => ({ ...s, [v.version]: { loading: false, error: json.error || 'Post failed' } }))
        return
      }
      setPostState((s) => ({ ...s, [v.version]: { loading: false, posted: { id: json.id, scheduled: json.scheduled } } }))
    } catch (err) {
      setPostState((s) => ({
        ...s,
        [v.version]: { loading: false, error: err instanceof Error ? err.message : 'Network error' },
      }))
    }
  }

  const minScheduleAt = () => {
    const d = new Date(Date.now() + 11 * 60 * 1000)
    d.setSeconds(0, 0)
    return d.toISOString().slice(0, 16)
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border p-5 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Service</label>
            <select
              value={service}
              onChange={(e) => setService(e.target.value as Service)}
              className="w-full border rounded px-3 py-2 text-sm"
            >
              {SERVICES.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Goal</label>
            <select
              value={goal}
              onChange={(e) => setGoal(e.target.value as Goal)}
              className="w-full border rounded px-3 py-2 text-sm"
            >
              {GOALS.map((g) => (
                <option key={g.value} value={g.value}>{g.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tone</label>
            <select
              value={tone}
              onChange={(e) => setTone(e.target.value as Tone)}
              className="w-full border rounded px-3 py-2 text-sm"
            >
              {TONES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Topic เฉพาะ <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder='เช่น "ลดน้ำหนักหลังคลอด", "PrEP สำหรับคู่รัก", "เบาหวานเสี่ยงไต"'
            className="w-full border rounded px-3 py-2 text-sm"
          />
        </div>
        <button
          onClick={submit}
          disabled={loading}
          className="bg-mint hover:bg-mint/90 disabled:opacity-50 text-white font-medium px-5 py-2 rounded transition-colors"
        >
          {loading ? 'กำลัง gen…' : '✨ Generate Captions'}
        </button>
      </div>

      {result?.error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded p-4 text-sm">
          ❌ {result.error}
        </div>
      )}

      {result?.ctaUrl && (
        <div className="text-xs text-gray-500">
          CTA URL ที่จะใช้: <code className="bg-gray-100 px-1.5 py-0.5 rounded">{result.ctaUrl}</code>
        </div>
      )}

      {result?.variants?.map((v) => (
        <div key={v.version} className="bg-white rounded-lg border p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="font-semibold text-forest">Version {v.version}</div>
            <button
              onClick={() => copyVariant(v)}
              className="text-sm bg-forest text-white px-3 py-1.5 rounded hover:bg-forest/90 transition-colors"
            >
              {copied === v.version ? '✓ Copied!' : '📋 Copy'}
            </button>
          </div>
          <pre className="whitespace-pre-wrap text-sm text-gray-800 font-sans leading-relaxed">
            {v.caption}
          </pre>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {v.hashtags.map((tag) => (
              <span key={tag} className="text-xs bg-mint/10 text-forest px-2 py-0.5 rounded">
                {tag}
              </span>
            ))}
          </div>

          <div className="mt-4 pt-4 border-t flex flex-wrap items-center gap-2">
            <button
              onClick={() => postVariant(v, false)}
              disabled={postState[v.version]?.loading || !!postState[v.version]?.posted}
              className="text-sm bg-blue-600 text-white px-3 py-1.5 rounded hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {postState[v.version]?.loading ? '…' : '📤 Post Now'}
            </button>
            <input
              type="datetime-local"
              min={minScheduleAt()}
              value={scheduleAt[v.version] || ''}
              onChange={(e) => setScheduleAt((s) => ({ ...s, [v.version]: e.target.value }))}
              className="text-sm border rounded px-2 py-1.5"
            />
            <button
              onClick={() => postVariant(v, true)}
              disabled={postState[v.version]?.loading || !!postState[v.version]?.posted}
              className="text-sm bg-mint text-white px-3 py-1.5 rounded hover:bg-mint/90 disabled:opacity-50 transition-colors"
            >
              📅 Schedule
            </button>
            {postState[v.version]?.posted && (
              <span className="text-sm text-green-700">
                ✓ {postState[v.version]?.posted?.scheduled ? 'Scheduled' : 'Posted'} · id={postState[v.version]?.posted?.id}
              </span>
            )}
            {postState[v.version]?.error && (
              <span className="text-sm text-red-600">❌ {postState[v.version]?.error}</span>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
