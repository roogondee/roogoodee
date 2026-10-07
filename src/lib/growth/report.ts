// Aggregation for /admin/growth — pure functions over rows the page fetches,
// so the arithmetic is readable in one place.
//
// "Bucket" is what spend is booked against: the pillar for quiz/landing
// leads, 'advice' for the /advice general-illness chat (its spend is the
// Google Ads /advice campaign, not any one pillar), 'unknown' otherwise.

export interface ReportLead {
  service: string | null
  source: string | null
  utm_source: string | null
  utm_campaign: string | null
  gclid: string | null
  created_at: string
  visited_at: string | null
}

export interface ReportVoucher {
  service: string
  issued_at: string
  redeemed_at: string | null
  review_requested_at: string | null
  review_rating: number | null
  review_rated_at: string | null
  recall_sent_at: string | null
}

export interface ReportSpend {
  service: string
  platform: string
  spend: number | string
  spend_date: string
}

export interface ReportReferral {
  code: string
  service: string
  clicks: number
  created_at: string
}

export interface BucketRow {
  bucket: string
  spend: number
  leads: number
  paidLeads: number
  vouchers: number
  visits: number
  costPerLead: number | null
  costPerVisit: number | null
  visitRate: number | null   // visits / leads
}

export function bucketOf(lead: Pick<ReportLead, 'service' | 'source'>): string {
  if (lead.source === 'advice-chat') return 'advice'
  return lead.service || 'unknown'
}

// Paid = came with an ad click id or an ad-platform utm_source. Referral,
// article and LINE broadcast traffic is ours, not bought.
const PAID_UTM = /^(google|facebook|fb|meta|ig|instagram|tiktok|line_ads)$/i
export function isPaid(lead: Pick<ReportLead, 'gclid' | 'utm_source'>): boolean {
  return !!lead.gclid || PAID_UTM.test(lead.utm_source || '')
}

const inRange = (iso: string | null, since: number) => !!iso && new Date(iso).getTime() >= since

export function buildBuckets(
  leads: ReportLead[],
  vouchers: ReportVoucher[],
  spend: ReportSpend[],
  since: number,
): BucketRow[] {
  const map = new Map<string, BucketRow>()
  const row = (bucket: string) => {
    let r = map.get(bucket)
    if (!r) {
      r = { bucket, spend: 0, leads: 0, paidLeads: 0, vouchers: 0, visits: 0, costPerLead: null, costPerVisit: null, visitRate: null }
      map.set(bucket, r)
    }
    return r
  }

  // spend_date is a Bangkok calendar date; compare as a date string.
  const sinceDate = new Date(since + 7 * 60 * 60 * 1000).toISOString().slice(0, 10)
  for (const s of spend) {
    if (s.spend_date >= sinceDate) row(s.service || 'unknown').spend += Number(s.spend) || 0
  }
  for (const l of leads) {
    const r = row(bucketOf(l))
    if (inRange(l.created_at, since)) {
      r.leads++
      if (isPaid(l)) r.paidLeads++
    }
    // A visit in the window counts even if the lead is older — that is when
    // the money turned into a patient.
    if (inRange(l.visited_at, since)) r.visits++
  }
  for (const v of vouchers) {
    if (inRange(v.issued_at, since)) row(v.service).vouchers++
  }

  const rows = Array.from(map.values())
  for (const r of rows) {
    r.costPerLead = r.spend > 0 && r.leads > 0 ? r.spend / r.leads : null
    r.costPerVisit = r.spend > 0 && r.visits > 0 ? r.spend / r.visits : null
    r.visitRate = r.leads > 0 ? r.visits / r.leads : null
  }
  return rows.sort((a, b) => b.spend - a.spend || b.leads - a.leads)
}

export function totals(rows: BucketRow[]): BucketRow {
  const t = rows.reduce(
    (acc, r) => ({
      ...acc,
      spend: acc.spend + r.spend,
      leads: acc.leads + r.leads,
      paidLeads: acc.paidLeads + r.paidLeads,
      vouchers: acc.vouchers + r.vouchers,
      visits: acc.visits + r.visits,
    }),
    { bucket: 'total', spend: 0, leads: 0, paidLeads: 0, vouchers: 0, visits: 0, costPerLead: null, costPerVisit: null, visitRate: null } as BucketRow,
  )
  t.costPerLead = t.spend > 0 && t.leads > 0 ? t.spend / t.leads : null
  t.costPerVisit = t.spend > 0 && t.visits > 0 ? t.spend / t.visits : null
  t.visitRate = t.leads > 0 ? t.visits / t.leads : null
  return t
}

export function sourceBreakdown(leads: ReportLead[], since: number) {
  const map = new Map<string, { source: string; leads: number; visits: number }>()
  for (const l of leads) {
    const key = l.utm_source || (l.gclid ? 'google' : 'direct/organic')
    let r = map.get(key)
    if (!r) { r = { source: key, leads: 0, visits: 0 }; map.set(key, r) }
    if (inRange(l.created_at, since)) r.leads++
    if (inRange(l.visited_at, since)) r.visits++
  }
  return Array.from(map.values()).filter(r => r.leads || r.visits).sort((a, b) => b.leads - a.leads)
}

export function reviewStats(vouchers: ReportVoucher[], since: number) {
  const requested = vouchers.filter(v => inRange(v.review_requested_at, since))
  const rated = requested.filter(v => v.review_rating != null)
  const sum = rated.reduce((s, v) => s + (v.review_rating || 0), 0)
  return {
    requested: requested.length,
    rated: rated.length,
    average: rated.length ? sum / rated.length : null,
    happy: rated.filter(v => (v.review_rating || 0) >= 4).length,
    unhappy: rated.filter(v => (v.review_rating || 0) <= 3).length,
    recallsSent: vouchers.filter(v => inRange(v.recall_sent_at, since)).length,
  }
}

export function referralStats(codes: ReportReferral[], leads: ReportLead[], since: number) {
  const referred = leads.filter(l => l.utm_source === 'referral')
  return {
    codesIssued: codes.filter(c => inRange(c.created_at, since)).length,
    clicks: codes.reduce((s, c) => s + (c.clicks || 0), 0),
    referredLeads: referred.filter(l => inRange(l.created_at, since)).length,
    referredVisits: referred.filter(l => inRange(l.visited_at, since)).length,
  }
}
