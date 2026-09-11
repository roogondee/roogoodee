// The 2569 work-permit renewal window (มติคณะรัฐมนตรี 14 กรกฎาคม 2569) —
// applications close 11 ธันวาคม 2569. Shared by /foreign/workpermit (the
// countdown badge) and the homepage (which leads with this campaign until
// the window closes, then falls back to the regular voucher hero). Keep the
// date here only; nothing else should hardcode it.

// Start of the last filing day, Bangkok time. daysUntilWorkPermitDeadline()
// counts down to this, so it reads "0 วัน" on 11 ธ.ค. itself — the day
// filing is still open until 16.30 น.
export const WORKPERMIT_DEADLINE = new Date('2026-12-11T00:00:00+07:00')

// End of the last filing day, Bangkok time. The homepage campaign hero and
// the floating chat guard switch off at this instant, not at the start of
// the day, so the homepage still leads with the deadline on the last day.
const WINDOW_CLOSES = new Date('2026-12-12T00:00:00+07:00')

export function daysUntilWorkPermitDeadline(now: Date = new Date()): number {
  const diffMs = WORKPERMIT_DEADLINE.getTime() - now.getTime()
  return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)))
}

export function isWorkPermitWindowOpen(now: Date = new Date()): boolean {
  return now.getTime() < WINDOW_CLOSES.getTime()
}
