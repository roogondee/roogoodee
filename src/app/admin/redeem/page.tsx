'use client'
import { useState } from 'react'
import { isRefCode } from '@/lib/refcodes'

// Website ref codes (MC-xxxxx from /medical-certificate, CL-xxxxx from
// /clinic) share this screen with vouchers: staff type whatever the patient
// shows, and the screen routes it. Recording a ref code reports the visit to
// the ad platforms (src/lib/growth/ref-visits.ts).
interface RefInfo {
  code: string
  label: string
  created_at: string
  via_line: boolean
  from_ads: boolean
  visited_at: string | null
}

const SERVICE_LABELS: Record<string, string> = {
  glp1: '💉 GLP-1 (FBS + HbA1c)',
  ckd:  '🫘 CKD (Urine Protein)',
  std:  '🔴 STD (HIV + Syphilis)',
  foreign: '🧪 แรงงานต่างด้าว',
}

const TIER_LABEL: Record<string, string> = {
  urgent: '🚨 URGENT',
  hot:    '🔥 Hot',
  warm:   '⚡ Warm',
  cold:   '❄️ Cold',
}

interface VoucherInfo {
  id: string
  code: string
  service: string
  issued_at: string
  expires_at: string
  redeemed_at: string | null
  redeemed_by: string | null
  lead: {
    id: string
    first_name: string
    last_name?: string
    phone: string
    lead_tier?: string
    lead_score?: number
    status?: string
  } | null
}

export default function RedeemPage() {
  const [code, setCode] = useState('')
  const [staffName, setStaffName] = useState('')
  const [loading, setLoading] = useState(false)
  const [voucher, setVoucher] = useState<VoucherInfo | null>(null)
  const [expired, setExpired] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [ref, setRef] = useState<RefInfo | null>(null)

  const reset = () => {
    setVoucher(null); setExpired(false); setError(null); setSuccess(false); setRef(null)
  }

  const lookup = async (e: React.FormEvent) => {
    e.preventDefault()
    reset()
    if (!code.trim()) return
    setLoading(true)
    try {
      if (isRefCode(code)) {
        const res = await fetch(`/api/admin/ref-codes/${encodeURIComponent(code.trim())}`)
        const data = await res.json()
        if (!res.ok) { setError(data.error || 'ไม่พบรหัสอ้างอิง'); return }
        setRef(data.ref)
        return
      }
      const res = await fetch(`/api/admin/vouchers/${encodeURIComponent(code.trim())}`)
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'ไม่พบ voucher'); return }
      setVoucher(data.voucher)
      setExpired(!!data.expired)
    } catch {
      setError('เกิดข้อผิดพลาดในการเชื่อมต่อ')
    } finally { setLoading(false) }
  }

  const redeem = async () => {
    if (!voucher) return
    setError(null)
    if (!staffName.trim()) { setError('กรุณากรอกชื่อพนักงาน'); return }
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/vouchers/${encodeURIComponent(voucher.code)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ staff_name: staffName.trim() }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'mark redeemed ไม่สำเร็จ'); return }
      setSuccess(true)
      setVoucher({
        ...voucher,
        redeemed_at: data.redeemed_at,
        redeemed_by: staffName.trim(),
        lead: voucher.lead ? { ...voucher.lead, status: 'visited' } : null,
      })
    } catch {
      setError('เกิดข้อผิดพลาดในการเชื่อมต่อ')
    } finally { setLoading(false) }
  }

  const recordRefVisit = async () => {
    if (!ref) return
    setError(null)
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/ref-codes/${encodeURIComponent(ref.code)}`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'บันทึกไม่สำเร็จ'); return }
      setSuccess(true)
      setRef({ ...ref, visited_at: data.visited_at })
    } catch {
      setError('เกิดข้อผิดพลาดในการเชื่อมต่อ')
    } finally { setLoading(false) }
  }

  const reused = !!voucher?.redeemed_at && !success
  const usable = voucher && !voucher.redeemed_at && !expired

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div>
        <h1 className="font-display text-2xl text-forest mb-1">🎟 รับ Voucher</h1>
        <p className="text-sm text-gray-500">สำหรับพนักงาน โรงพยาบาลพันธมิตร — กรอกรหัส voucher หรือรหัสอ้างอิงจากเว็บ (MC-… / CL-…) ของลูกค้า</p>
      </div>

      <form onSubmit={lookup} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 space-y-4">
        <div>
          <label className="text-xs font-semibold text-gray-700 block mb-1">รหัส Voucher / รหัสอ้างอิง</label>
          <input
            type="text"
            value={code}
            onChange={e => setCode(e.target.value.toUpperCase())}
            placeholder="RGD-GLP1-A3X9K2"
            className="w-full px-4 py-3 border border-gray-200 rounded-lg font-mono text-lg outline-none focus:border-forest"
            autoFocus
          />
        </div>
        <button
          type="submit"
          disabled={loading || !code.trim()}
          className="w-full bg-forest text-white py-3 rounded-lg font-semibold hover:bg-sage transition-colors disabled:opacity-50"
        >
          {loading ? 'กำลังค้นหา…' : 'ค้นหา voucher'}
        </button>
      </form>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm">
          ❌ {error}
        </div>
      )}

      {ref && (
        <div className={`bg-white rounded-xl shadow-sm border p-6 space-y-4 ${
          success ? 'border-green-300' : ref.visited_at ? 'border-amber-300' : 'border-gray-200'
        }`}>
          <div className="flex items-center justify-between">
            <span className="font-mono text-lg font-bold text-forest">{ref.code}</span>
            {success && <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700 font-bold">✓ บันทึกแล้ว</span>}
            {!success && ref.visited_at && <span className="text-xs px-2 py-1 rounded-full bg-amber-100 text-amber-700 font-bold">⚠ บันทึกไปแล้ว</span>}
            {!ref.visited_at && <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700 font-bold">รหัสอ้างอิงจากเว็บ</span>}
          </div>
          <dl className="text-sm space-y-2">
            <Row label="มาจากหน้า" value={ref.label} />
            <Row label="เปิดหน้าเว็บเมื่อ" value={new Date(ref.created_at).toLocaleString('th-TH')} />
            <Row label="ทัก LINE แล้ว" value={ref.via_line ? 'ใช่' : 'ยัง (โทรหรือเดินเข้ามาเอง)'} />
            <Row label="มาจากโฆษณา" value={ref.from_ads ? 'ใช่' : 'ไม่ใช่ / ไม่ทราบ'} />
            {ref.visited_at && <Row label="บันทึกว่ามาเมื่อ" value={new Date(ref.visited_at).toLocaleString('th-TH')} />}
          </dl>
          {!ref.visited_at && (
            <div className="border-t border-gray-100 pt-4 space-y-2">
              <p className="text-xs text-gray-500">
                ไม่ใช่ voucher ส่วนลด — บันทึกเพื่อให้ระบบรู้ว่าคนที่มาจากเว็บมาตรวจจริง ไม่มีผลกับค่าบริการ
              </p>
              <button
                type="button"
                onClick={recordRefVisit}
                disabled={loading}
                className="w-full bg-green-600 text-white py-3 rounded-lg font-bold hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                {loading ? 'กำลังบันทึก…' : '✓ บันทึกว่าผู้รับบริการมาแล้ว'}
              </button>
            </div>
          )}
          {(success || ref.visited_at) && (
            <button
              type="button"
              onClick={() => { setCode(''); reset() }}
              className="w-full mt-2 text-sm text-forest hover:underline"
            >
              ค้นหารหัสอื่น
            </button>
          )}
        </div>
      )}

      {voucher && (
        <div className={`bg-white rounded-xl shadow-sm border p-6 space-y-4 ${
          success ? 'border-green-300' : reused ? 'border-amber-300' : expired ? 'border-red-300' : 'border-gray-200'
        }`}>
          <div className="flex items-center justify-between">
            <span className="font-mono text-lg font-bold text-forest">{voucher.code}</span>
            {success && <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700 font-bold">✓ บันทึกแล้ว</span>}
            {reused && <span className="text-xs px-2 py-1 rounded-full bg-amber-100 text-amber-700 font-bold">⚠ ใช้ไปแล้ว</span>}
            {expired && !voucher.redeemed_at && <span className="text-xs px-2 py-1 rounded-full bg-red-100 text-red-700 font-bold">หมดอายุ</span>}
            {usable && <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700 font-bold">พร้อมใช้</span>}
          </div>

          <dl className="text-sm space-y-2">
            <Row label="บริการ" value={SERVICE_LABELS[voucher.service] || voucher.service} />
            <Row label="ออกเมื่อ" value={new Date(voucher.issued_at).toLocaleString('th-TH')} />
            <Row label="หมดอายุ" value={new Date(voucher.expires_at).toLocaleString('th-TH')} />
            {voucher.redeemed_at && (
              <>
                <Row label="ใช้เมื่อ" value={new Date(voucher.redeemed_at).toLocaleString('th-TH')} />
                <Row label="พนักงาน" value={voucher.redeemed_by || '-'} />
              </>
            )}
          </dl>

          {voucher.lead && (
            <div className="border-t border-gray-100 pt-4 space-y-2">
              <p className="text-xs font-semibold uppercase text-gray-500 tracking-wider">ข้อมูลลูกค้า</p>
              <Row label="ชื่อ" value={`${voucher.lead.first_name} ${voucher.lead.last_name || ''}`.trim()} />
              <Row label="เบอร์" value={<a href={`tel:${voucher.lead.phone}`} className="text-forest underline font-mono">{voucher.lead.phone}</a>} />
              {voucher.lead.lead_tier && (
                <Row label="Tier" value={`${TIER_LABEL[voucher.lead.lead_tier] || voucher.lead.lead_tier}${typeof voucher.lead.lead_score === 'number' ? ` · score ${voucher.lead.lead_score}` : ''}`} />
              )}
            </div>
          )}

          {usable && (
            <div className="border-t border-gray-100 pt-4 space-y-3">
              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">ชื่อพนักงานที่รับ voucher *</label>
                <input
                  type="text"
                  value={staffName}
                  onChange={e => setStaffName(e.target.value)}
                  placeholder="เช่น คุณสมชาย"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg outline-none focus:border-forest text-sm"
                />
              </div>
              <button
                type="button"
                onClick={redeem}
                disabled={loading || !staffName.trim()}
                className="w-full bg-green-600 text-white py-3 rounded-lg font-bold hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                {loading ? 'กำลังบันทึก…' : '✓ ยืนยันรับ Voucher'}
              </button>
            </div>
          )}

          {(success || reused || expired) && (
            <button
              type="button"
              onClick={() => { setCode(''); setStaffName(''); reset() }}
              className="w-full mt-2 text-sm text-forest hover:underline"
            >
              ค้นหา voucher อื่น
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex">
      <dt className="w-24 text-gray-500 shrink-0">{label}</dt>
      <dd className="text-gray-800">{value}</dd>
    </div>
  )
}
