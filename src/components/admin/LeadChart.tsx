'use client'

interface DayCount {
  date: string
  count: number
}

export default function LeadChart({ data }: { data: DayCount[] }) {
  const max = Math.max(...data.map(d => d.count), 1)

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <h2 className="font-semibold text-gray-800 mb-6">Lead รายวัน (30 วันล่าสุด)</h2>
      <div className="flex items-end gap-1 h-32">
        {data.map((d, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
            <div
              className="w-full bg-forest/80 rounded-t hover:bg-forest transition-colors cursor-default"
              style={{ height: `${(d.count / max) * 100}%`, minHeight: d.count > 0 ? '4px' : '2px' }}
            />
            {/* Tooltip */}
            <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 hidden group-hover:block bg-forest text-white text-xs px-2 py-1 rounded whitespace-nowrap z-10">
              {d.date}: {d.count} lead
            </div>
          </div>
        ))}
      </div>
      <div className="flex justify-between text-xs text-gray-400 mt-2">
        <span>{data[0]?.date}</span>
        <span>{data[data.length - 1]?.date}</span>
      </div>
    </div>
  )
}
