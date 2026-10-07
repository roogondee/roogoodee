// Google Ads offline-conversion CSV (§4.9 step 4). Exactly five columns —
// Google Click ID, Conversion Name, Conversion Time, Conversion Value,
// Conversion Currency — and nothing else: no names, no phones, no health
// data ever reaches an ad platform (hard boundary §1.4).

import { CONVERSION_NAMES, type ConversionName } from './config.ts'
import { adsTimestamp } from './dates.ts'

export const ADS_CSV_HEADER = ['Google Click ID', 'Conversion Name', 'Conversion Time', 'Conversion Value', 'Conversion Currency'] as const

// Conversion action names as created in the Google Ads account (Import → Clicks).
export const ADS_CONVERSION_LABELS: Record<ConversionName, string> = {
  line_contact:      'DMGLP LINE Contact',
  booked:            'DMGLP Booked',
  treatment_started: 'DMGLP Treatment Started',
}

// Values are modelling hints for Smart Bidding, not revenue.
export const ADS_CONVERSION_VALUES: Record<ConversionName, number> = {
  line_contact: 0,
  booked: 300,
  treatment_started: 3000,
}

export interface ConversionRow {
  gclid: string | null
  name: string
  occurred_at: string
}

export function conversionRowsToCsv(rows: ConversionRow[]): string {
  const lines: string[] = ['Parameters:TimeZone=+0700', ADS_CSV_HEADER.join(',')]
  for (const r of rows) {
    const gclid = (r.gclid || '').trim()
    if (!gclid) continue
    if (!(CONVERSION_NAMES as readonly string[]).includes(r.name)) continue
    const name = r.name as ConversionName
    const value = ADS_CONVERSION_VALUES[name]
    lines.push([
      csvCell(gclid),
      csvCell(ADS_CONVERSION_LABELS[name]),
      csvCell(adsTimestamp(r.occurred_at)),
      value > 0 ? String(value) : '',
      value > 0 ? 'THB' : '',
    ].join(','))
  }
  return lines.join('\n') + '\n'
}

function csvCell(v: string): string {
  return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v
}
