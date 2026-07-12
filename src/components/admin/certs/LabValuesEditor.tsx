'use client'

import type { LabAnalyte, AnalyteFlag } from '@/lib/lab/types'

const FLAGS: AnalyteFlag[] = ['N', 'H', 'L', 'HH', 'LL', 'A', 'unknown']
const FLAG_TH: Record<AnalyteFlag, string> = {
  N: 'ปกติ', H: 'สูง', L: 'ต่ำ', HH: 'สูงมาก', LL: 'ต่ำมาก', A: 'ผิดปกติ', unknown: '-',
}

export interface LabRow {
  test_name: string
  value: string
  unit?: string
  reference_range?: string
  flag: AnalyteFlag
}

export default function LabValuesEditor({ rows, onChange }: { rows: LabRow[]; onChange: (rows: LabRow[]) => void }) {
  function update(i: number, patch: Partial<LabRow>) {
    onChange(rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)))
  }
  function add() {
    onChange([...rows, { test_name: '', value: '', unit: '', reference_range: '', flag: 'N' }])
  }
  function remove(i: number) {
    onChange(rows.filter((_, idx) => idx !== i))
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="text-sm text-gray-600">ผลตรวจทางห้องปฏิบัติการ (Lab)</label>
        <button type="button" onClick={add} className="text-xs text-forest hover:underline">+ เพิ่มรายการ</button>
      </div>
      {rows.length === 0 && <p className="text-xs text-gray-400">ยังไม่มีรายการ lab</p>}
      <div className="space-y-2">
        {rows.map((r, i) => (
          <div key={i} className="grid grid-cols-12 gap-2 items-center">
            <input value={r.test_name} onChange={(e) => update(i, { test_name: e.target.value })} placeholder="รายการ เช่น FBS" className="col-span-3 border rounded-lg px-2 py-1.5 text-sm" />
            <input value={r.value} onChange={(e) => update(i, { value: e.target.value })} placeholder="ผล" className="col-span-2 border rounded-lg px-2 py-1.5 text-sm" />
            <input value={r.unit ?? ''} onChange={(e) => update(i, { unit: e.target.value })} placeholder="หน่วย" className="col-span-2 border rounded-lg px-2 py-1.5 text-sm" />
            <input value={r.reference_range ?? ''} onChange={(e) => update(i, { reference_range: e.target.value })} placeholder="ค่าอ้างอิง" className="col-span-2 border rounded-lg px-2 py-1.5 text-sm" />
            <select value={r.flag} onChange={(e) => update(i, { flag: e.target.value as AnalyteFlag })} className="col-span-2 border rounded-lg px-1 py-1.5 text-sm">
              {FLAGS.map((f) => <option key={f} value={f}>{FLAG_TH[f]}</option>)}
            </select>
            <button type="button" onClick={() => remove(i)} className="col-span-1 text-red-400 hover:text-red-600 text-lg">×</button>
          </div>
        ))}
      </div>
    </div>
  )
}

export function toAnalytes(rows: LabRow[]): LabAnalyte[] {
  return rows.filter((r) => r.test_name.trim() && r.value.trim()).map((r) => {
    const numeric = Number(r.value.replace(/[<>~=,]/g, ''))
    return {
      test_name: r.test_name.trim(),
      canonical: r.test_name.trim().toLowerCase().replace(/[^a-z0-9]/g, '') || undefined,
      value: r.value.trim(),
      numeric_value: Number.isNaN(numeric) ? undefined : numeric,
      unit: r.unit?.trim() || undefined,
      reference_range: r.reference_range?.trim() || undefined,
      flag: r.flag,
    }
  })
}
