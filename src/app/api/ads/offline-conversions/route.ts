import { NextRequest, NextResponse } from 'next/server'
import { timingSafeEqual } from 'crypto'
import { supabaseAdmin } from '@/lib/supabase'
import { getSessionUser } from '@/lib/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Google Ads offline click-conversion feed (CSV, Google's upload template).
//
// Point a Google Ads *scheduled upload* at this URL (Goals → Conversions →
// Uploads → Schedules → source "HTTPS", with the username/password below) and
// it pulls the file daily — nobody has to run the export query by hand any
// more. Two conversion actions, both created in Ads as "Import → Clicks":
//
//   ADS_OFFLINE_LEAD_CONVERSION  (default "RGD Quiz Voucher") — a pillar quiz
//     lead that got a voucher. The quiz completes inside LINE's browser, a
//     fresh context with no Google cookie, so no client-side Ads tag can ever
//     report it; gclid is carried through the gate → LIFF URL → leads.gclid.
//   ADS_OFFLINE_VISIT_CONVERSION (default "RGD Patient Visit") — the lead
//     actually came to W Medical (leads.visited_at, stamped by the redeem
//     screen or a pipeline move to visited/customer). This is the one to bid on.
//
// Re-sending yesterday's rows is harmless: Google drops a row whose
// (gclid, conversion name, time) it already has. Rows are limited to the
// 90-day click window Google accepts.
//
// Auth: HTTP Basic with ADS_OFFLINE_EXPORT_USER / ADS_OFFLINE_EXPORT_PASSWORD
// (what the scheduled upload sends), or a logged-in admin session for a
// manual download. The file carries gclids and timestamps only — no names,
// phones or services.

const LEAD_CONVERSION = process.env.ADS_OFFLINE_LEAD_CONVERSION || 'RGD Quiz Voucher'
const VISIT_CONVERSION = process.env.ADS_OFFLINE_VISIT_CONVERSION || 'RGD Patient Visit'
const VISIT_VALUE = 500
const WINDOW_DAYS = 90
const QUIZ_SOURCES = ['quiz', 'quiz-liff', 'quiz-line']

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a)
  const bb = Buffer.from(b)
  return ab.length === bb.length && timingSafeEqual(ab, bb)
}

function basicAuthOk(req: NextRequest): boolean {
  const user = process.env.ADS_OFFLINE_EXPORT_USER
  const pass = process.env.ADS_OFFLINE_EXPORT_PASSWORD
  if (!user || !pass) return false
  const header = req.headers.get('authorization') || ''
  if (!header.startsWith('Basic ')) return false
  const decoded = Buffer.from(header.slice(6), 'base64').toString('utf8')
  const idx = decoded.indexOf(':')
  if (idx < 0) return false
  return safeEqual(decoded.slice(0, idx), user) && safeEqual(decoded.slice(idx + 1), pass)
}

// "yyyy-MM-dd HH:mm:ss" in Bangkok time; the file header declares +0700.
function bkk(iso: string): string {
  const d = new Date(new Date(iso).getTime() + 7 * 60 * 60 * 1000)
  return d.toISOString().slice(0, 19).replace('T', ' ')
}

function csvCell(v: string | number): string {
  const s = String(v)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

interface LeadRow {
  gclid: string
  created_at: string
  visited_at: string | null
  source: string | null
  vouchers: { issued_at: string }[] | null
}

export async function GET(req: NextRequest) {
  if (!basicAuthOk(req) && !(await getSessionUser())) {
    return new NextResponse('Unauthorized', {
      status: 401,
      headers: { 'WWW-Authenticate': 'Basic realm="offline-conversions"' },
    })
  }

  const since = new Date(Date.now() - WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString()
  const { data, error } = await supabaseAdmin
    .from('leads')
    .select('gclid, created_at, visited_at, source, vouchers(issued_at)')
    .not('gclid', 'is', null)
    .gte('created_at', since)
    .order('created_at', { ascending: true })
    .limit(5000)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const rows: string[][] = []
  for (const lead of (data as LeadRow[] | null) ?? []) {
    const gclid = lead.gclid.trim()
    if (!gclid) continue

    const voucher = lead.vouchers?.[0]
    if (voucher && QUIZ_SOURCES.includes(lead.source ?? '')) {
      rows.push([gclid, LEAD_CONVERSION, bkk(voucher.issued_at), '', ''])
    }
    if (lead.visited_at) {
      rows.push([gclid, VISIT_CONVERSION, bkk(lead.visited_at), String(VISIT_VALUE), 'THB'])
    }
  }

  const lines = [
    'Parameters:TimeZone=+0700',
    'Google Click ID,Conversion Name,Conversion Time,Conversion Value,Conversion Currency',
    ...rows.map(r => r.map(csvCell).join(',')),
  ]

  return new NextResponse(lines.join('\n') + '\n', {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="roogondee-offline-conversions.csv"',
      'Cache-Control': 'no-store',
    },
  })
}
