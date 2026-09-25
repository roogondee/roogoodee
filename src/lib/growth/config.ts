// Which pillars each post-visit loop may touch.
//
// These lists are privacy decisions, not tuning knobs. A LINE message is 1:1,
// but a review request or a "share this with a friend" link invites the
// patient to tell other people what they were seen for — never acceptable for
// sexual health, mental health, gynaecology or paternity testing. Widening
// any list below needs the same sign-off as relaxing a red line in CLAUDE.md.

import type { Service } from '@/types'

// Meta CAPI + Google Ads visit conversions. mind and dna are excluded: a
// psychologist session or a paternity consult reported to an ad platform is
// exactly the data PDPA treats as sensitive, and neither is bid on anyway.
export const VISIT_CONVERSION_SERVICES: readonly Service[] = [
  'glp1', 'ckd', 'std', 'mens', 'women', 'foreign',
]

// Services whose name may appear in ad-platform custom_data. For the rest a
// visit is reported as a generic "Clinic Visit" with no pillar attached.
export const NAMED_IN_AD_EVENTS: readonly Service[] = ['glp1', 'ckd', 'foreign']

// Relative weight sent as the visit's value — the face value of the free
// screening voucher (FBS+HbA1c 500฿), used uniformly so no pillar looks more
// valuable to bidding than we can justify. Replace with real per-visit
// revenue once W Medical shares it.
export const VISIT_VALUE_THB = 500

// Review request + referral: only pillars a patient would plausibly talk
// about in public.
export const REVIEW_SERVICES: readonly Service[] = ['glp1', 'ckd']
export const REFERRAL_SERVICES: readonly Service[] = ['glp1', 'ckd']

// Recall: "time for your follow-up check" — a private 1:1 LINE message to the
// patient themselves, so women and mens are fine here; std/mind/dna are not
// (a retest reminder for STD is a clinical decision for the doctor, and
// mind/dna have their own flows).
export const RECALL_AFTER_DAYS: Partial<Record<Service, number>> = {
  glp1: 90,     // HbA1c is re-measured roughly every 3 months
  ckd: 180,
  mens: 180,
  women: 365,   // annual gynae check
}

// Days after redemption before the review request goes out. Day 1 so the
// visit is fresh but the patient is no longer in the waiting room.
export const REVIEW_DELAY_DAYS = 1
// Stop trying if the cron missed the window (e.g. cron down for a week) —
// asking about a visit a month later reads as spam.
export const REVIEW_MAX_AGE_DAYS = 7

// HR portal: a worker is "due" for their annual checkup this many days
// after the last visit, and the team is alerted this many days ahead.
export const EMPLOYER_RECHECK_DAYS = 365
export const EMPLOYER_ALERT_AHEAD_DAYS = 30

export function isIn(list: readonly Service[], service: string | null | undefined): boolean {
  return !!service && (list as readonly string[]).includes(service)
}
