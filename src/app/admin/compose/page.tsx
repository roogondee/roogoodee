'use client'

import { useState } from 'react'

type Service = 'glp1' | 'std' | 'ckd' | 'foreign'
type Target = 'blog' | 'feed' | 'story' | 'line'

const SERVICE_LABEL: Record<Service, string> = {
  glp1: 'GLP-1 ลดน้ำหนัก',
  std: 'STD / PrEP HIV',
  ckd: 'ตรวจไต CKD',
  foreign: 'แรงงานต่างด้าว',
}

export default function ComposePage() {
  const [service, setService] = useState<Service>('glp1')
  const [imageUrl, setImageUrl] = useState('')
  const [uploading, setUploading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [headline, setHeadline] = useState('')
  const [subline, setSubline] = useState('')
  const [caption, setCaption] = useState('')
  const [cta, setCta] = useState('')
  const [targets, setTargets] = useState<Record<Target, boolean>>({ blog: true, feed: true, story: true, line: false })
  const [fullArticle, setFullArticle] = useState(true)
  const [err, setErr] = useState('')
  const [results, setResults] = useState<Record<string, { ok: boolean; data?: unknown; error?: string }> | null>(null)

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setErr(''); setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/admin/compose/upload', { method: 'POST', body: fd })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'upload failed')
      setImageUrl(json.url)
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e))
    } finally {
      setUploading(false)
    }
  }

  async function handleGenerate() {
    if (!imageUrl) { setErr('อัปโหลดรูปก่อน'); return }
    setErr(''); setGenerating(true); setResults(null)
    try {
      const res = await fetch('/api/admin/compose/caption', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ imageUrl, service }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'gen failed')
      setHeadline(json.headline); setSubline(json.subline); setCaption(json.caption); setCta(json.cta)
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e))
    } finally {
      setGenerating(false)
    }
  }

  async function handlePublish() {
    if (!imageUrl || !headline || !subline || !caption) { setErr('กรอกข้อมูลให้ครบ'); return }
    const picked = (Object.keys(targets) as Target[]).filter(t => targets[t])
    if (picked.length === 0) { setErr('เลือก target อย่างน้อย 1 อัน'); return }
    setErr(''); setPublishing(true); setResults(null)
    try {
      const res = await fetch('/api/admin/compose/publish', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ imageUrl, service, headline, subline, caption, cta, targets: picked, fullArticle }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'publish failed')
      setResults(json.results)
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e))
    } finally {
      setPublishing(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold text-forest">Compose — อัปโหลดรูป + AI Caption</h1>
      <p className="text-sm text-gray-600">อัปโหลด 1 รูป → AI gen caption → ลง Blog / FB Feed / FB Story พร้อมกัน</p>

      <section className="bg-white rounded-xl p-5 border border-gray-100 space-y-4">
        <div>
          <label className="block text-sm font-semibold mb-1">บริการ</label>
          <select value={service} onChange={e => setService(e.target.value as Service)} className="border rounded px-3 py-2 w-full">
            {(Object.keys(SERVICE_LABEL) as Service[]).map(k => <option key={k} value={k}>{SERVICE_LABEL[k]}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-sm font-semibold mb-1">รูปภาพ</label>
          <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleUpload} disabled={uploading} />
          {uploading && <p className="text-xs text-gray-500 mt-1">กำลังอัปโหลด...</p>}
          {imageUrl && (
            <div className="mt-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imageUrl} alt="preview" className="max-h-64 rounded border" />
              <p className="text-xs text-gray-500 mt-1 break-all">{imageUrl}</p>
            </div>
          )}
        </div>

        <button
          onClick={handleGenerate}
          disabled={!imageUrl || generating}
          className="bg-forest text-white px-4 py-2 rounded disabled:opacity-50"
        >
          {generating ? 'กำลังให้ AI คิด caption...' : 'Gen caption ด้วย AI'}
        </button>
      </section>

      <section className="bg-white rounded-xl p-5 border border-gray-100 space-y-3">
        <h2 className="font-semibold">Caption (แก้ได้ก่อน publish)</h2>
        <div>
          <label className="block text-xs text-gray-600 mb-1">Headline (4–8 คำ — แสดงบน Story cover)</label>
          <input value={headline} onChange={e => setHeadline(e.target.value)} className="border rounded px-3 py-2 w-full" />
        </div>
        <div>
          <label className="block text-xs text-gray-600 mb-1">Subline</label>
          <input value={subline} onChange={e => setSubline(e.target.value)} className="border rounded px-3 py-2 w-full" />
        </div>
        <div>
          <label className="block text-xs text-gray-600 mb-1">Caption (ลง Feed + blog excerpt)</label>
          <textarea value={caption} onChange={e => setCaption(e.target.value)} rows={5} className="border rounded px-3 py-2 w-full" />
        </div>
        <div>
          <label className="block text-xs text-gray-600 mb-1">CTA</label>
          <input value={cta} onChange={e => setCta(e.target.value)} className="border rounded px-3 py-2 w-full" />
        </div>
      </section>

      <section className="bg-white rounded-xl p-5 border border-gray-100 space-y-3">
        <h2 className="font-semibold">ลงที่ไหน</h2>
        {(['blog', 'feed', 'story', 'line'] as Target[]).map(t => (
          <label key={t} className="flex items-center gap-2">
            <input type="checkbox" checked={targets[t]} onChange={e => setTargets(s => ({ ...s, [t]: e.target.checked }))} />
            <span>
              {t === 'blog' && 'Blog post (roogondee.com/blog)'}
              {t === 'feed' && 'FB Page feed (รูป + caption)'}
              {t === 'story' && 'FB Page Story (รูป 9:16)'}
              {t === 'line' && 'LINE OA broadcast (Flex message ถึง followers ทุกคน)'}
            </span>
          </label>
        ))}
        {targets.blog && (
          <label className="flex items-center gap-2 mt-2 pt-3 border-t border-gray-100">
            <input type="checkbox" checked={fullArticle} onChange={e => setFullArticle(e.target.checked)} />
            <span className="text-sm">ให้ AI ขยาย caption เป็นบทความเต็ม 400-700 คำ (แนะนำ — SEO ดีกว่า)</span>
          </label>
        )}
        <button
          onClick={handlePublish}
          disabled={publishing}
          className="bg-mint text-white px-4 py-2 rounded font-semibold disabled:opacity-50"
        >
          {publishing ? 'กำลัง publish...' : 'Publish ทั้งหมด'}
        </button>
      </section>

      {err && <div className="bg-red-50 border border-red-200 text-red-700 rounded p-3 text-sm">{err}</div>}

      {results && (
        <section className="bg-white rounded-xl p-5 border border-gray-100">
          <h2 className="font-semibold mb-2">ผลลัพธ์</h2>
          <pre className="text-xs bg-gray-50 p-3 rounded overflow-auto">{JSON.stringify(results, null, 2)}</pre>
        </section>
      )}
    </div>
  )
}
