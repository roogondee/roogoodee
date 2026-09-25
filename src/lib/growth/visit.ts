// "The patient actually came" — the conversion every ad platform should be
// optimising for, and until now the one none of them ever saw. Redeeming a
// voucher only flipped leads.status; Meta and Google kept learning from quiz
// completions, i.e. from people who like doing quizzes.
//
// markLeadVisited() is called from both places a visit is recorded: the
// voucher redeem screen and a pipeline move to visited/customer. It stamps
// leads.visited_at exactly once (conditional update), and only the call that
// wins that stamp reports to Meta — so redeeming and then dragging the card
// to "customer" never counts the same visit twice. Google Ads picks the same
// stamp up through the offline-conversion export (/api/ads/offline-conversions).

import { supabaseAdmin } from '@/lib/supabase'
import { sendMetaEvents } from '@/lib/meta-capi'
import { NAMED_IN_AD_EVENTS, VISIT_CONVERSION_SERVICES, VISIT_VALUE_THB, isIn } from './config'

interface VisitedLead {
  id: string
  service: string | null
  phone: string | null
  email: string | null
  line_user_id: string | null
  client_ip: string | null
  user_agent: string | null
  fbc: string | null
  fbp: string | null
  consent_pdpa: boolean | null
}

export async function markLeadVisited(
  leadId: string,
  opts: { voucherCode?: string | null } = {},
): Promise<{ firstVisit: boolean }> {
  const now = new Date().toISOString()
  const { data, error } = await supabaseAdmin
    .from('leads')
    .update({ visited_at: now })
    .eq('id', leadId)
    .is('visited_at', null)
    .select('id, service, phone, email, line_user_id, client_ip, user_agent, fbc, fbp, consent_pdpa')

  if (error) {
    console.error('[visit] visited_at stamp failed:', error.message)
    return { firstVisit: false }
  }
  const lead = (data as VisitedLead[] | null)?.[0]
  if (!lead) return { firstVisit: false }

  await reportVisitToMeta(lead, opts.voucherCode ?? null)
  return { firstVisit: true }
}

// Bot leads store a platform user id in `phone` (NOT NULL column) — only a
// real Thai number is worth hashing for Meta.
function realPhone(p: string | null): string | undefined {
  if (!p) return undefined
  const digits = p.replace(/[^\d]/g, '')
  return /^0\d{8,9}$/.test(digits) ? digits : undefined
}

async function reportVisitToMeta(lead: VisitedLead, voucherCode: string | null): Promise<void> {
  // PDPA: every lead path that reaches Meta at creation time requires
  // consent; a lead without it (e.g. a walk-in typed in by staff) is not
  // reported later either.
  if (!lead.consent_pdpa) return
  if (!isIn(VISIT_CONVERSION_SERVICES, lead.service)) return

  const named = isIn(NAMED_IN_AD_EVENTS, lead.service)
  await sendMetaEvents({
    // One visit per lead, so the lead id is a stable dedup key even if the
    // redeem screen is retried.
    events: [{ event_name: 'Purchase', event_id: `visit-${lead.id}` }],
    service: lead.service ?? undefined,
    action_source: 'physical_store',
    user: {
      phone: realPhone(lead.phone),
      email: lead.email ?? undefined,
      // Same external_id the quiz sent at voucher issue, so Meta joins the
      // visit to the original Lead even when there is no phone (LIFF path).
      external_id: voucherCode ?? undefined,
      ip: lead.client_ip ?? undefined,
      user_agent: lead.user_agent ?? undefined,
      fbc: lead.fbc ?? undefined,
      fbp: lead.fbp ?? undefined,
    },
    custom_data: {
      value: VISIT_VALUE_THB,
      currency: 'THB',
      content_name: named ? `${lead.service!.toUpperCase()} Visit` : 'Clinic Visit',
      ...(named ? { content_category: lead.service } : {}),
    },
  })
}
