import { CERT_VERIFY_URL } from '@/lib/certs/verify-site'

const VERIFY_HOST = CERT_VERIFY_URL.replace(/^https?:\/\//, '')

// What a receiver sees after scanning a W Medical certificate — mirrors the
// status bar + confirmation badge on cert.roogondee.com. Always labelled as a
// sample and uses a placeholder number, never a real certificate. Labels
// default to Thai; the homepage passes translated ones and `compact` (no
// detail rows, which are Thai-specific sample values).
export default function CertVerifyMock({
  compact = false,
  labels = {},
}: {
  compact?: boolean
  labels?: { sample?: string; valid?: string; issuer?: string; confirmed?: string; qrHint?: string }
}) {
  const l = {
    sample: 'ตัวอย่าง',
    valid: 'ใบรับรองแพทย์ใช้ได้',
    issuer: 'ออกโดยโรงพยาบาลดับเบิ้ลยู เมดิคอล',
    confirmed: 'แพทย์รับรองผลแล้ว · ผลตรวจตรงกับรหัสผนึก',
    qrHint: 'QR บนใบผูกกับใบของคุณคนเดียว สแกนด้วยกล้องมือถือได้เลย ไม่ต้องลงแอป',
    ...labels,
  }
  return (
    <div className="relative mx-auto w-full max-w-sm">
      <div className="absolute inset-0 md:-inset-6 bg-mint/20 rounded-[3rem] blur-3xl pointer-events-none" aria-hidden />
      <div className="relative bg-white rounded-[2rem] border border-mint/20 shadow-2xl p-4 animate-float-slow">
        <div className="flex items-center justify-between text-[11px] text-muted px-2 mb-3">
          <span>{VERIFY_HOST}</span>
          <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-semibold">{l.sample}</span>
        </div>
        <div className="rounded-xl bg-[#0f7a4d] text-white px-4 py-3 flex items-center gap-3 mb-3">
          <span className="w-7 h-7 rounded-full bg-white/25 flex items-center justify-center font-bold flex-shrink-0">✓</span>
          <div>
            <div className="text-sm font-semibold">{l.valid}</div>
            <div className="text-[11px] opacity-90">{l.issuer}</div>
          </div>
        </div>
        {!compact && (
          <dl className="text-sm divide-y divide-gray-100">
            {[
              ['เลขที่ใบ', '69900000XX'],
              ['ชนิด', 'ใบรับรองแพทย์ 5 โรค'],
              ['วันที่ตรวจ', '12 ก.ย. 2569'],
              ['สถานะ', 'ยังไม่หมดอายุ'],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-3 py-2">
                <dt className="text-muted">{k}</dt><dd className="text-forest font-medium text-right">{v}</dd>
              </div>
            ))}
          </dl>
        )}
        <div className="mt-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs px-3 py-2">
          ✓ {l.confirmed}
        </div>
        <div className="mt-4 flex items-center gap-3 border-t border-dashed border-gray-200 pt-4">
          <QrGlyph />
          <p className="text-[11px] text-muted leading-relaxed">{l.qrHint}</p>
        </div>
      </div>
    </div>
  )
}

// Decorative QR-like glyph (not a scannable code) so the mock never points
// anywhere real.
function QrGlyph() {
  const cells = '1110111010010111101011100101100111010110010101110111'
  const finders = [[0, 0], [6, 0], [0, 6]]
  return (
    <svg viewBox="0 0 9 9" className="w-14 h-14 flex-shrink-0 text-forest" aria-hidden>
      {finders.map(([x, y]) => (
        <g key={`${x}-${y}`}>
          <rect x={x} y={y} width="3" height="3" fill="currentColor" />
          <rect x={x + 0.6} y={y + 0.6} width="1.8" height="1.8" fill="white" />
          <rect x={x + 1.1} y={y + 1.1} width="0.8" height="0.8" fill="currentColor" />
        </g>
      ))}
      {Array.from(cells).map((c, i) => {
        if (c !== '1') return null
        const x = 3 + (i % 6)
        const y = Math.floor(i / 6)
        if (y > 8 || (x >= 6 && y < 3)) return null
        return <rect key={i} x={x} y={y} width="0.9" height="0.9" fill="currentColor" />
      })}
    </svg>
  )
}
