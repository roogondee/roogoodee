import { buildChartSeries } from '@/lib/lab/chart'
import type { AnalyteTimeline } from '@/lib/lab/types'

const FOREST = '#1B4332'
const MINT = '#52B788'
const RED = '#dc2626'

// Inline-SVG line chart for one analyte across visits. Server component (no JS).
export default function LabTimelineChart({ t }: { t: AnalyteTimeline }) {
  const series = buildChartSeries(t, { width: 320, height: 150, padding: 28 })
  if (!series) {
    return <p className="text-xs text-gray-400">ค่านี้ยังไม่มีข้อมูลตัวเลขพอจะวาดกราฟ</p>
  }
  return (
    <svg width={series.width} height={series.height} className="overflow-visible">
      {series.refBand && (
        <rect
          x={28}
          y={Math.min(series.refBand.yTop, series.refBand.yBottom)}
          width={series.width - 56}
          height={Math.abs(series.refBand.yBottom - series.refBand.yTop)}
          fill={MINT}
          fillOpacity={0.12}
        />
      )}
      {series.targetLine && (
        <line x1={28} y1={series.targetLine.y} x2={series.width - 28} y2={series.targetLine.y}
          stroke={MINT} strokeWidth={1} strokeDasharray="4 3" />
      )}
      <polyline points={series.polyline} fill="none" stroke={FOREST} strokeWidth={1.6} />
      {series.points.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r={3} fill={p.abnormal ? RED : MINT} />
          <text x={p.x} y={p.y - 7} fontSize={8} textAnchor="middle" fill="#555">{p.value}</text>
        </g>
      ))}
      {series.projection && (
        <g>
          <circle cx={series.projection.x} cy={series.projection.y} r={3} fill="#999" />
          <text x={series.projection.x} y={series.projection.y - 7} fontSize={8} textAnchor="middle" fill="#999">
            ~{series.projection.value}
          </text>
        </g>
      )}
      {series.xTicks.map((tk, i) => (
        <text key={i} x={tk.pos} y={series.height - 6} fontSize={7} textAnchor="middle" fill="#999">{tk.label}</text>
      ))}
    </svg>
  )
}
