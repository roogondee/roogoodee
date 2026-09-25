// Small presentational pieces shared by the DMGLP staff pages. Server-safe
// (no hooks) so pages can stay server components.
import Link from 'next/link'
import type { ReactNode } from 'react'
import { formatThaiDate, formatThaiDateTime } from '@/lib/dmglp/dates'

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 mb-5">
      <div>
        <h1 className="font-display text-2xl text-forest">{title}</h1>
        {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
      </div>
      {actions && <div className="flex gap-2">{actions}</div>}
    </div>
  )
}

export function Flash({ searchParams }: { searchParams?: { ok?: string; err?: string } }) {
  if (!searchParams?.ok && !searchParams?.err) return null
  const err = !!searchParams.err
  return (
    <div className={`mb-4 rounded-xl border px-4 py-3 text-sm ${err ? 'bg-red-50 border-red-200 text-red-700' : 'bg-emerald-50 border-emerald-200 text-emerald-800'}`}>
      {err ? searchParams.err : searchParams.ok}
    </div>
  )
}

export function Card({ title, children, className = '' }: { title?: string; children: ReactNode; className?: string }) {
  return (
    <section className={`bg-white rounded-xl border border-gray-200 p-5 ${className}`}>
      {title && <h2 className="font-semibold text-forest mb-3">{title}</h2>}
      {children}
    </section>
  )
}

export function Stat({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="text-2xl font-semibold text-forest mt-1">{value}</div>
      {hint && <div className="text-xs text-gray-400 mt-1">{hint}</div>}
    </div>
  )
}

export const input = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-mint bg-white'
export const label = 'text-xs font-semibold text-gray-600 block mb-1'
export const btn = 'inline-flex items-center justify-center bg-forest text-white text-sm font-semibold px-4 py-2 rounded-full hover:bg-sage disabled:opacity-50'
export const btnSecondary = 'inline-flex items-center justify-center bg-white border border-gray-300 text-forest text-sm font-semibold px-4 py-2 rounded-full hover:bg-gray-50'
export const btnSmall = 'inline-flex items-center bg-forest text-white text-xs font-semibold px-3 py-1.5 rounded-full hover:bg-sage'
export const btnSmallSecondary = 'inline-flex items-center bg-white border border-gray-300 text-forest text-xs font-semibold px-3 py-1.5 rounded-full hover:bg-gray-50'

export function Field({ name, labelText, type = 'text', required, defaultValue, placeholder, step, min, max, hint }: {
  name: string; labelText: string; type?: string; required?: boolean; defaultValue?: string | number | null
  placeholder?: string; step?: string; min?: string | number; max?: string | number; hint?: string
}) {
  return (
    <div>
      <label className={label} htmlFor={name}>{labelText}{required && <span className="text-red-500"> *</span>}</label>
      <input id={name} name={name} type={type} required={required} defaultValue={defaultValue ?? undefined}
        placeholder={placeholder} step={step} min={min} max={max} className={input} />
      {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
    </div>
  )
}

export function Select({ name, labelText, options, defaultValue, required }: {
  name: string; labelText: string; options: Array<{ value: string; label: string }>; defaultValue?: string | null; required?: boolean
}) {
  return (
    <div>
      <label className={label} htmlFor={name}>{labelText}{required && <span className="text-red-500"> *</span>}</label>
      <select id={name} name={name} defaultValue={defaultValue ?? ''} required={required} className={input}>
        {!required && <option value="">—</option>}
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  )
}

export function Check({ name, labelText, defaultChecked, value }: { name: string; labelText: string; defaultChecked?: boolean; value?: string }) {
  return (
    <label className="flex items-start gap-2 text-sm text-gray-700">
      <input type="checkbox" name={name} value={value ?? 'on'} defaultChecked={defaultChecked} className="mt-0.5" />
      <span>{labelText}</span>
    </label>
  )
}

const BADGE: Record<string, string> = {
  eligible: 'bg-emerald-100 text-emerald-800', ineligible: 'bg-red-100 text-red-700', needs_review: 'bg-amber-100 text-amber-800',
  scheduled: 'bg-gray-100 text-gray-700', rescheduled: 'bg-gray-100 text-gray-700', checked_in: 'bg-blue-100 text-blue-800',
  completed: 'bg-emerald-100 text-emerald-800', missed: 'bg-red-100 text-red-700', cancelled: 'bg-gray-100 text-gray-400',
  open: 'bg-amber-100 text-amber-800', acknowledged: 'bg-blue-100 text-blue-800', resolved: 'bg-emerald-100 text-emerald-800',
  high: 'bg-red-100 text-red-700', normal: 'bg-gray-100 text-gray-700',
  in_stock: 'bg-emerald-100 text-emerald-800', quarantine: 'bg-amber-100 text-amber-800', dispensed: 'bg-gray-100 text-gray-500',
  expired: 'bg-red-100 text-red-700', damaged: 'bg-red-100 text-red-700', returned: 'bg-gray-100 text-gray-500',
  active: 'bg-emerald-100 text-emerald-800', refunded: 'bg-amber-100 text-amber-800', paid: 'bg-emerald-100 text-emerald-800',
  due: 'bg-gray-100 text-gray-700', overdue: 'bg-red-100 text-red-700', done: 'bg-emerald-100 text-emerald-800',
  new: 'bg-blue-100 text-blue-800', contacted: 'bg-amber-100 text-amber-800', booked: 'bg-emerald-100 text-emerald-800',
  converted: 'bg-emerald-100 text-emerald-800', lost: 'bg-gray-100 text-gray-400',
  initiation: 'bg-blue-100 text-blue-800', maintenance: 'bg-emerald-100 text-emerald-800', stopped: 'bg-gray-100 text-gray-500',
  maintenance_program: 'bg-emerald-100 text-emerald-800',
}

export const STATUS_TH: Record<string, string> = {
  eligible: 'เข้าเกณฑ์', ineligible: 'ไม่เข้าเกณฑ์', needs_review: 'แพทย์พิจารณา',
  scheduled: 'นัดแล้ว', rescheduled: 'เลื่อนนัด', checked_in: 'มาถึงแล้ว', completed: 'เสร็จสิ้น', missed: 'ไม่มาตามนัด', cancelled: 'ยกเลิก',
  open: 'เปิด', acknowledged: 'รับทราบ', resolved: 'ปิดแล้ว', high: 'ด่วน', normal: 'ปกติ',
  in_stock: 'ในสต็อก', quarantine: 'กักไว้', dispensed: 'จ่ายแล้ว', expired: 'หมดอายุ', damaged: 'เสียหาย', returned: 'คืนแล้ว',
  active: 'ใช้งาน', refunded: 'คืนเงินแล้ว', paid: 'ชำระแล้ว', due: 'รอชำระ', overdue: 'เกินกำหนด', done: 'เสร็จ',
  new: 'ใหม่', contacted: 'ติดต่อแล้ว', booked: 'นัดแล้ว', converted: 'เป็นผู้ป่วย', lost: 'ไม่สนใจ',
  initiation: 'เริ่มยา', maintenance: 'ระยะคงที่', stopped: 'หยุดยา', maintenance_program: 'โปรแกรมต่อเนื่อง',
  specialist_visit: 'พบแพทย์เฉพาะทาง', followup_visit: 'ติดตามผล', line_followup: 'ติดตามทาง LINE', lab_only: 'เจาะเลือด',
}

export function Badge({ value }: { value: string | null | undefined }) {
  if (!value) return <span className="text-gray-400">—</span>
  return <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full ${BADGE[value] || 'bg-gray-100 text-gray-700'}`}>{STATUS_TH[value] || value}</span>
}

export function Table({ head, children, empty }: { head: string[]; children: ReactNode; empty?: boolean }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-gray-500 border-b border-gray-200">
            {head.map(h => <th key={h} className="py-2 px-3 font-semibold">{h}</th>)}
          </tr>
        </thead>
        <tbody>
          {empty ? <tr><td colSpan={head.length} className="py-6 px-3 text-center text-gray-400">ไม่มีข้อมูล</td></tr> : children}
        </tbody>
      </table>
    </div>
  )
}

export const td = 'py-2 px-3 border-t border-gray-100 align-top'

export function PatientLink({ p }: { p: { id: string; first_name: string; last_name: string; hn?: string | null } | null | undefined }) {
  if (!p) return <span className="text-gray-400">—</span>
  return (
    <Link href={`/dmglp/staff/patients/${p.id}`} className="text-forest font-semibold hover:underline">
      {p.first_name} {p.last_name}{p.hn ? <span className="text-gray-400 font-normal"> · {p.hn}</span> : null}
    </Link>
  )
}

export const baht = (n: number | string | null | undefined) =>
  n == null ? '—' : `฿${Number(n).toLocaleString('th-TH', { maximumFractionDigits: 2 })}`

export const dateTh = formatThaiDate
export const dateTimeTh = formatThaiDateTime

// Supabase returns a to-one join as an object or a one-element array
// depending on the FK it inferred; normalise to an object.
export function one<T>(v: T | T[] | null | undefined): T | null {
  if (!v) return null
  return Array.isArray(v) ? (v[0] ?? null) : v
}
