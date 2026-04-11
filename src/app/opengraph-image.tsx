import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'รู้ก่อนดี(รู้งี้) — ปรึกษาสุขภาพ ส่วนตัว ไม่ตัดสิน'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: 'linear-gradient(135deg, #2D4A3E 0%, #4A7C6C 60%, #6BAF9E 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
          <span style={{ fontSize: 64 }}>🌿</span>
          <span style={{ fontSize: 80, color: 'white', fontWeight: 900, letterSpacing: '-2px' }}>
            รู้ก่อนดี(รู้งี้)
          </span>
        </div>
        <div style={{ fontSize: 34, color: 'rgba(255,255,255,0.85)', marginBottom: 32, fontWeight: 400 }}>
          ปรึกษาสุขภาพ ส่วนตัว ไม่ตัดสิน
        </div>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center' }}>
          {['STD & PrEP HIV', 'GLP-1 ลดน้ำหนัก', 'CKD โรคไต', 'แรงงานต่างด้าว'].map(tag => (
            <div
              key={tag}
              style={{
                background: 'rgba(255,255,255,0.15)',
                color: 'white',
                padding: '8px 20px',
                borderRadius: 40,
                fontSize: 22,
                border: '1px solid rgba(255,255,255,0.25)',
              }}
            >
              {tag}
            </div>
          ))}
        </div>
        <div style={{ fontSize: 20, color: 'rgba(255,255,255,0.5)', marginTop: 36 }}>
          roogondee.com
        </div>
      </div>
    ),
    { ...size }
  )
}
