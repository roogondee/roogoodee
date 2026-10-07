import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { verifyLiffIdToken } from '@/lib/liff-verify'
import { checkAdviceRateLimit, clientIpFrom } from '@/lib/advice/rate-limit'
import { SURVEY_ITEMS, SURVEY_RED_FLAG_MESSAGE_TH } from '@/lib/dmglp/config'
import { createAlert } from '@/lib/dmglp/db'
import { programBalance } from '@/lib/dmglp/refund'
import { todayBkk } from '@/lib/dmglp/dates'

export const runtime = 'nodejs'

// Patient-facing API behind /dmglp/liff (§4.5, §4.11). Identity comes ONLY
// from the verified LIFF id_token → line_user_id → dmglp_patients; a patient
// can read their own appointments / programme balance and submit a symptom
// survey. Nothing clinical (drug, dose, labs) is returned.

type Body =
  | { action: 'appointments'; id_token: string }
  | { action: 'program'; id_token: string }
  | { action: 'survey'; id_token: string; appointment_id?: string; answers: Record<string, boolean>; free_text?: string }

export async function POST(req: NextRequest) {
  const rl = checkAdviceRateLimit(clientIpFrom(req))
  if (!rl.allowed) return NextResponse.json({ error: 'rate limited' }, { status: 429 })
  const body = (await req.json().catch(() => null)) as Body | null
  if (!body || typeof body.id_token !== 'string') return NextResponse.json({ error: 'bad request' }, { status: 400 })

  const user = await verifyLiffIdToken(body.id_token)
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const { data: patient } = await supabaseAdmin.from('dmglp_patients').select('id, first_name').eq('line_user_id', user.userId).maybeSingle()
  if (!patient) return NextResponse.json({ error: 'not_linked', message: 'ยังไม่พบข้อมูลของคุณในโปรแกรม กรุณาแจ้งเจ้าหน้าที่ให้เชื่อมบัญชี LINE' }, { status: 404 })

  if (body.action === 'appointments') {
    const { data } = await supabaseAdmin
      .from('dmglp_appointments').select('id, template_code, type, scheduled_date, status')
      .eq('patient_id', patient.id).gte('scheduled_date', todayBkk()).in('status', ['scheduled', 'rescheduled', 'missed']).order('scheduled_date').limit(12)
    await supabaseAdmin.from('dmglp_audit_log').insert({ staff_id: null, staff_role: 'patient', action: 'read', table_name: 'dmglp_appointments', record_id: patient.id })
    return NextResponse.json({ first_name: patient.first_name, appointments: data ?? [] })
  }

  if (body.action === 'program') {
    const { data: program } = await supabaseAdmin
      .from('dmglp_programs').select('tier, expires_at, status, entitlements:dmglp_program_entitlements(item_code, qty), usage:dmglp_program_usage(item_code, qty)')
      .eq('patient_id', patient.id).eq('status', 'active').order('purchased_at', { ascending: false }).limit(1).maybeSingle()
    return NextResponse.json({ program: program ? { tier: program.tier, expires_at: program.expires_at, balance: programBalance(program.entitlements ?? [], program.usage ?? []) } : null })
  }

  if (body.action === 'survey') {
    const answers: Record<string, boolean> = {}
    let red = false
    for (const item of SURVEY_ITEMS) {
      answers[item.key] = body.answers?.[item.key] === true
      if (answers[item.key] && item.redFlag) red = true
    }
    const free = typeof body.free_text === 'string' ? body.free_text.slice(0, 1000) : ''
    const apptId = typeof body.appointment_id === 'string' && /^[0-9a-f-]{36}$/i.test(body.appointment_id) ? body.appointment_id : null
    const { error } = await supabaseAdmin.from('dmglp_surveys').insert({ patient_id: patient.id, appointment_id: apptId, answers: { ...answers, free_text: free }, red_flag: red })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (red) {
      await createAlert({ patient_id: patient.id, source: 'survey', severity: 'high', message: `แบบสอบถาม LIFF พบอาการเตือน: ${SURVEY_ITEMS.filter(i => i.redFlag && answers[i.key]).map(i => i.labelTh).join('; ')}${free ? ` — "${free.slice(0, 120)}"` : ''}` })
    } else if (Object.values(answers).some(Boolean) || free) {
      await supabaseAdmin.from('dmglp_tasks').insert({ patient_id: patient.id, appointment_id: apptId, assignee_role: 'pharmacist', kind: 'survey_followup', due_date: todayBkk(), note: `อาการจากแบบสอบถาม: ${SURVEY_ITEMS.filter(i => answers[i.key]).map(i => i.labelTh).join('; ')}${free ? ` — "${free.slice(0, 120)}"` : ''}` })
    }
    return NextResponse.json({ ok: true, red_flag: red, message: red ? SURVEY_RED_FLAG_MESSAGE_TH : 'ขอบคุณค่ะ ทีมงานได้รับข้อมูลแล้ว หากมีอาการเปลี่ยนแปลงแจ้งได้ทาง LINE นี้' })
  }

  return NextResponse.json({ error: 'bad action' }, { status: 400 })
}
