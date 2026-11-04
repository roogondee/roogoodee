'use client'
import { useEffect, useState } from 'react'
import { useTranslation } from '@/lib/i18n/context'
import { track } from '@/lib/analytics/track'
import { refLineUrl } from '@/lib/refcodes'
import { useRefCode } from '@/components/ui/useRefCode'

// Shared LINE + call button pair for the /advice landing page.
//
// Google Smart campaigns pick their own keywords and creative, so they send
// a mix of symptom searches and non-symptom searches (hospital name, hours,
// price) straight at this page. The chat is still the primary path, but a
// visitor who just wants a human should be one tap away from LINE or a call
// without first typing three chat messages — that's what the `chat` rail
// (inside AdviceChat, after a few turns) already did; `hero` and `sticky`
// put the same pair where a Smart-campaign visitor sees it immediately.
//
// `chat` keeps firing the original event names (advice_followup_*) because
// those are already wired to the Google Ads conversion action and renaming
// them would reset that reporting history. `hero`/`sticky`/`services` fire new
// advice_cta_* events, tagged with placement, so the two entry points can be
// compared in GA4 without touching the existing conversion.
//
// The LINE button opens a chat with a message already typed: "สวัสดีค่ะ
// อยากปรึกษาอาการ: <their symptom> (AD-K7Q2M)". The visitor only presses
// send — no add-friend-then-stare-at-an-empty-chat — and the AD- code turns
// that message into a lead carrying the ad click (src/lib/growth/ref-visits.ts).
// The symptom is the first message the visitor typed into the chat (see
// setAdviceLineTopic); it goes into the LINE message they see before sending
// and nowhere else (never into analytics).

// The chat publishes the visitor's first message here so every LINE button on
// the page (hero and sticky bar included, which live outside the chat)
// pre-fills the same symptom. In memory only.
const TOPIC_EVENT = 'advice:line-topic'
let currentTopic = ''
export function setAdviceLineTopic(text: string) {
  if (currentTopic || !text.trim()) return // the first message is the complaint
  currentTopic = text.trim()
  window.dispatchEvent(new Event(TOPIC_EVENT))
}

export type AdviceCtaPlacement = 'hero' | 'sticky' | 'services' | 'chat'

const CALL_TEL = 'tel:0819023540'

export default function AdviceContactCtas({
  placement,
  className = '',
}: {
  placement: AdviceCtaPlacement
  className?: string
}) {
  const { t } = useTranslation()
  const a = t.advice
  const { refCode, lineUrl: plainLineUrl } = useRefCode('advice')
  const [sharedTopic, setSharedTopic] = useState(currentTopic)
  useEffect(() => {
    const on = () => setSharedTopic(currentTopic)
    on()
    window.addEventListener(TOPIC_EVENT, on)
    return () => window.removeEventListener(TOPIC_EVENT, on)
  }, [])
  const topic = sharedTopic
  const lineUrl = refCode ? refLineUrl(refCode, 'advice', undefined, topic) : plainLineUrl

  const lineEvent = placement === 'chat' ? 'advice_followup_line_click' : 'advice_cta_line_click'
  const callEvent = placement === 'chat' ? 'advice_followup_call_click' : 'advice_cta_call_click'
  const eventParams = {
    ...(placement === 'chat' ? {} : { placement }),
    ref_code: refCode || 'none',
    prefilled: topic ? 'symptom' : 'greeting',
  }

  return (
    <div className={`flex gap-2 ${className}`}>
      <a
        href={lineUrl}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => track(lineEvent, eventParams)}
        className="flex-1 flex items-center justify-center gap-1.5 bg-[#06C755] text-white px-4 py-2.5 rounded-full text-sm font-bold hover:brightness-95 transition-all"
      >
        {a.followUpLineBtn}
      </a>
      <a
        href={CALL_TEL}
        onClick={() => track(callEvent, eventParams)}
        className="flex-1 flex items-center justify-center gap-1.5 border border-forest/30 text-forest px-4 py-2.5 rounded-full text-sm font-bold hover:bg-mint/10 transition-all"
      >
        {a.followUpCallBtn}
      </a>
    </div>
  )
}
