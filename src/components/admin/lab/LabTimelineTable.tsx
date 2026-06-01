import type { AnalyteTimeline, Direction } from '@/lib/lab/types'

const DIR: Record<Direction, { icon: string; cls: string }> = {
  improved: { icon: '↑ ดีขึ้น', cls: 'text-green-600' },
  worsened: { icon: '↓ แย่ลง', cls: 'text-red-600' },
  stable: { icon: '→ คงที่', cls: 'text-gray-500' },
  unknown: { icon: '—', cls: 'text-gray-400' },
}

export default function LabTimelineTable({ analytes }: { analytes: AnalyteTimeline[] }) {
  if (!analytes.length) return <p className="text-sm text-gray-400">ยังไม่มีข้อมูลเปรียบเทียบ</p>
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-gray-500 border-b">
            <th className="py-2 pr-3">รายการ</th>
            <th className="py-2 pr-3">ล่าสุด</th>
            <th className="py-2 pr-3">เปลี่ยนแปลง</th>
            <th className="py-2 pr-3">แนวโน้ม</th>
            <th className="py-2">ครั้งที่ตรวจ</th>
          </tr>
        </thead>
        <tbody>
          {analytes.map((t) => {
            const last = t.points[t.points.length - 1]
            const dir = DIR[t.direction]
            return (
              <tr key={t.canonical} className="border-b border-gray-100">
                <td className="py-2 pr-3 font-medium text-forest">
                  {t.test_name}
                  {t.crossed_into_abnormal && <span className="ml-1 text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded">เริ่มผิดปกติ</span>}
                  {t.crossed_into_normal && <span className="ml-1 text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded">กลับสู่ปกติ</span>}
                </td>
                <td className="py-2 pr-3">{last.value}{t.unit ? ` ${t.unit}` : ''}</td>
                <td className="py-2 pr-3">
                  {t.latest_delta != null ? (
                    <span>{t.latest_delta > 0 ? '+' : ''}{t.latest_delta}{t.latest_pct_change != null ? ` (${t.latest_pct_change > 0 ? '+' : ''}${t.latest_pct_change}%)` : ''}</span>
                  ) : '—'}
                </td>
                <td className={`py-2 pr-3 font-medium ${dir.cls}`}>{dir.icon}</td>
                <td className="py-2 text-gray-500">{t.points.length}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
