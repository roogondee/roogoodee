import type { RiskLevel } from '@/lib/lab/types'

const COLOR: Record<RiskLevel, string> = {
  green: 'bg-green-600',
  yellow: 'bg-amber-500',
  red: 'bg-red-600',
}
const LABEL: Record<RiskLevel, string> = {
  green: 'ปกติดี',
  yellow: 'ควรติดตาม',
  red: 'ควรพบแพทย์',
}

export default function HealthScoreBadge({ score, risk }: { score: number; risk: RiskLevel }) {
  return (
    <div className={`${COLOR[risk]} text-white rounded-2xl px-5 py-3 text-center min-w-[110px]`}>
      <div className="text-3xl font-bold leading-none">{score}</div>
      <div className="text-[11px] opacity-90 mt-1">คะแนนสุขภาพ</div>
      <div className="text-xs font-semibold mt-0.5">{LABEL[risk]}</div>
    </div>
  )
}
