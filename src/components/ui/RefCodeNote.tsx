// The visitor's website ref code (MC-xxxxx / CL-xxxxx), shown under the
// contact buttons. LINE already carries it in the pre-filled message; this
// is for the caller and the walk-in, who read it out or show the screen.
// Renders nothing until the code exists.
export default function RefCodeNote({ refCode, className = '' }: { refCode: string | null; className?: string }) {
  if (!refCode) return null
  return (
    <p className={`text-xs text-muted mt-3 ${className}`}>
      รหัสอ้างอิงของคุณ{' '}
      <span className="font-mono font-bold text-forest bg-white border border-mint/30 rounded px-1.5 py-0.5 tracking-wider">{refCode}</span>
      {' '}— แจ้งรหัสนี้ตอนโทรหรือมาถึงโรงพยาบาล (ทัก LINE แล้วรหัสจะส่งไปให้อัตโนมัติ)
    </p>
  )
}
