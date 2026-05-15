import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import type { Service } from '@/types'

const VALID_SERVICES: readonly Service[] = ['glp1', 'ckd', 'std', 'foreign', 'mens']
const VALID_EVENTS = ['start', 'progress', 'complete', 'submit_success'] as const
type Event = (typeof VALID_EVENTS)[number]

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

interface TrackPayload {
  session_id?: string
  service?: Service
  event?: Event
  question_id?: string
  question_index?: number
  total_questions?: number
  utm_source?: string
  utm_medium?: string
  utm_campaign?: string
  referrer?: string
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as TrackPayload

    if (!body.session_id || !UUID_RE.test(body.session_id)) {
      return NextResponse.json({ error: 'bad session' }, { status: 400 })
    }
    if (!body.service || !VALID_SERVICES.includes(body.service)) {
      return NextResponse.json({ error: 'bad service' }, { status: 400 })
    }
    if (!body.event || !VALID_EVENTS.includes(body.event)) {
      return NextResponse.json({ error: 'bad event' }, { status: 400 })
    }

    const truncate = (v: string | undefined, n: number) =>
      typeof v === 'string' ? v.slice(0, n) : null

    await supabaseAdmin.from('quiz_funnel_events').insert({
      session_id:      body.session_id,
      service:         body.service,
      event:           body.event,
      question_id:     truncate(body.question_id, 64),
      question_index:  typeof body.question_index === 'number' ? body.question_index : null,
      total_questions: typeof body.total_questions === 'number' ? body.total_questions : null,
      utm_source:      truncate(body.utm_source, 64),
      utm_medium:      truncate(body.utm_medium, 64),
      utm_campaign:    truncate(body.utm_campaign, 128),
      referrer:        truncate(body.referrer, 512),
      user_agent:      truncate(req.headers.get('user-agent') ?? undefined, 512),
    })

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false }, { status: 200 })
  }
}
