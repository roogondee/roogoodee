// Date helpers pinned to Asia/Bangkok. The program's dates are calendar days
// (a visit is "on 12 ต.ค."), so everything here works on 'YYYY-MM-DD' strings
// and treats them as Bangkok-local — no date-fns, no DST (Thailand has none).

import { BKK_OFFSET_MS } from './config.ts'

export type IsoDate = string // 'YYYY-MM-DD'

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

export function isIsoDate(v: unknown): v is IsoDate {
  return typeof v === 'string' && ISO_DATE.test(v) && !Number.isNaN(Date.parse(`${v}T00:00:00Z`))
}

// Today's calendar date in Bangkok.
export function todayBkk(now: Date = new Date()): IsoDate {
  return new Date(now.getTime() + BKK_OFFSET_MS).toISOString().slice(0, 10)
}

// Hour of day (0-23) in Bangkok.
export function hourBkk(now: Date = new Date()): number {
  return new Date(now.getTime() + BKK_OFFSET_MS).getUTCHours()
}

export function addDays(date: IsoDate, days: number): IsoDate {
  const d = new Date(`${date}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

export function addMonths(date: IsoDate, months: number): IsoDate {
  const d = new Date(`${date}T00:00:00Z`)
  const day = d.getUTCDate()
  d.setUTCDate(1)
  d.setUTCMonth(d.getUTCMonth() + months)
  const last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate()
  d.setUTCDate(Math.min(day, last))
  return d.toISOString().slice(0, 10)
}

// Whole days from `a` to `b` (positive when b is later).
export function daysBetween(a: IsoDate, b: IsoDate): number {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000)
}

// Calendar date in Bangkok for a timestamp.
export function toBkkDate(iso: string | Date): IsoDate {
  const t = typeof iso === 'string' ? Date.parse(iso) : iso.getTime()
  return new Date(t + BKK_OFFSET_MS).toISOString().slice(0, 10)
}

const TH_MONTHS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.']

// '2026-11-02' → '2 พ.ย. 2569' (Buddhist year, as staff read it).
export function formatThaiDate(date: IsoDate | null | undefined): string {
  if (!date || !ISO_DATE.test(date)) return '—'
  const [y, m, d] = date.split('-').map(Number)
  return `${d} ${TH_MONTHS[m - 1]} ${y + 543}`
}

export function formatThaiDateTime(iso: string | null | undefined): string {
  if (!iso) return '—'
  const t = Date.parse(iso)
  if (Number.isNaN(t)) return '—'
  const local = new Date(t + BKK_OFFSET_MS)
  const hh = String(local.getUTCHours()).padStart(2, '0')
  const mm = String(local.getUTCMinutes()).padStart(2, '0')
  return `${formatThaiDate(local.toISOString().slice(0, 10))} ${hh}:${mm}`
}

export function ageOn(birthDate: IsoDate | null | undefined, on: IsoDate): number | null {
  if (!birthDate || !ISO_DATE.test(birthDate)) return null
  const [by, bm, bd] = birthDate.split('-').map(Number)
  const [y, m, d] = on.split('-').map(Number)
  let age = y - by
  if (m < bm || (m === bm && d < bd)) age -= 1
  return age
}

// Google Ads offline-conversion timestamp: "yyyy-MM-dd HH:mm:ss" in Bangkok
// time; the CSV header declares +0700.
export function adsTimestamp(iso: string): string {
  return new Date(Date.parse(iso) + BKK_OFFSET_MS).toISOString().slice(0, 19).replace('T', ' ')
}
