'use client'

export default function ExportCSV() {
  const handleExport = async () => {
    const res = await fetch('/api/admin/leads/export')
    if (!res.ok) return alert('Export ไม่สำเร็จ')
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `leads-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <button
      onClick={handleExport}
      className="flex items-center gap-2 bg-white border border-gray-200 text-gray-700 text-xs font-semibold px-4 py-2 rounded-full hover:border-forest hover:text-forest transition-colors"
    >
      ⬇️ Export CSV
    </button>
  )
}
