import Link from 'next/link'
import { supabaseAdmin } from '@/lib/supabase'
import {
  buildBuckets, totals, sourceBreakdown, reviewStats, referralStats,
  type ReportLead, type ReportVoucher, type ReportSpend, type ReportReferral, type BucketRow,
} from '@/lib/growth/report'
import AdSpendForm from './AdSpendForm'

export const dynamic = 'force-dynamic'

// Cost per patient who actually came, per service — the number that decides
// where the next baht of ad budget goes. Spend comes from ad_spend_daily (Meta
// synced nightly by scripts/sync_ad_spend.py, the rest typed in below); visits
// from leads.visited_at, stamped by the redeem screen and pipeline moves.

const BUCKET_LABELS: Record<string, string> = {
  glp1: 'GLP-1', ckd: 'CKD', std: 'STD/PrEP', foreign: 'แรงงานต่างด้าว', mens: 'ชาย 40+',
  women: 'สุขภาพหญิง', mind: 'สุขภาพจิต', dna: 'DNA', advice: '/advice (อาการทั่วไป)', unknown: 'ไม่ระบุ',
}

const PERIODS = [7, 30, 90]

const baht = (n: number | null) =>
  n == null ? '—' : `฿${n.toLocaleString('th-TH', { maximumFractionDigits: 0 })}`
const pct = (n: number | null) => (n == null ? '—' : `${(n * 100).toFixed(1)}%`)

function BucketTr({ r, bold }: { r: BucketRow; bold?: boolean }) {
  return (
    <tr className={bold ? 'font-semibold bg-gray-50' : 'border-t border-gray-100'}>
      <td className="py-2 px-3">{bold ? 'รวม' : BUCKET_LABELS[r.bucket] || r.bucket}</td>
      <td className="py-2 px-3 text-right">{baht(r.spend)}</td>
      <td className="py-2 px-3 text-right">{r.leads}</td>
      <td className="py-2 px-3 text-right text-gray-500">{r.paidLeads}</td>
      <td className="py-2 px-3 text-right">{r.vouchers}</td>
      <td className="py-2 px-3 text-right">{r.visits}</td>
      <td className="py-2 px-3 text-right">{pct(r.visitRate)}</td>
      <td className="py-2 px-3 text-right">{baht(r.costPerLead)}</td>
      <td className="py-2 px-3 text-right text-forest font-semibold">{baht(r.costPerVisit)}</td>
    </tr>
  )
}

function Stat({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="text-2xl font-semibold text-forest mt-1">{value}</div>
      {hint && <div className="text-xs text-gray-400 mt-1">{hint}</div>}
    </div>
  )
}

export default async function GrowthPage({ searchParams }: { searchParams: { days?: string } }) {
  const days = PERIODS.includes(Number(searchParams.days)) ? Number(searchParams.days) : 30
  const since = Date.now() - days * 24 * 60 * 60 * 1000
  const sinceIso = new Date(since).toISOString()
  const sinceDate = new Date(since + 7 * 60 * 60 * 1000).toISOString().slice(0, 10)

  const [leadsCreated, leadsVisited, vouchersRes, spendRes, referralRes, recentSpendRes] = await Promise.all([
    supabaseAdmin.from('leads')
      .select('service, source, utm_source, utm_campaign, gclid, created_at, visited_at')
      .gte('created_at', sinceIso).limit(10000),
    // Visits in the window from leads created before it.
    supabaseAdmin.from('leads')
      .select('service, source, utm_source, utm_campaign, gclid, created_at, visited_at')
      .gte('visited_at', sinceIso).lt('created_at', sinceIso).limit(10000),
    supabaseAdmin.from('vouchers')
      .select('service, issued_at, redeemed_at, review_requested_at, review_rating, review_rated_at, recall_sent_at')
      .or(`issued_at.gte."${sinceIso}",review_requested_at.gte."${sinceIso}",recall_sent_at.gte."${sinceIso}"`)
      .limit(10000),
    supabaseAdmin.from('ad_spend_daily').select('service, platform, spend, spend_date').gte('spend_date', sinceDate).limit(10000),
    supabaseAdmin.from('referral_codes').select('code, service, clicks, created_at').limit(5000),
    supabaseAdmin.from('ad_spend_daily')
      .select('id, spend_date, platform, service, campaign, spend, source')
      .order('spend_date', { ascending: false }).limit(20),
  ])

  const missingSchema = [leadsCreated, vouchersRes, spendRes, referralRes].find(r => r.error)?.error
  const leads = [
    ...((leadsCreated.data as ReportLead[] | null) ?? []),
    ...((leadsVisited.data as ReportLead[] | null) ?? []),
  ]
  const vouchers = (vouchersRes.data as ReportVoucher[] | null) ?? []
  const spend = (spendRes.data as ReportSpend[] | null) ?? []
  const referrals = (referralRes.data as ReportReferral[] | null) ?? []

  const rows = buildBuckets(leads, vouchers, spend, since)
  const total = totals(rows)
  const sources = sourceBreakdown(leads, since)
  const reviews = reviewStats(vouchers, since)
  const refs = referralStats(referrals, leads, since)
  const recentSpend = (recentSpendRes.data as Array<ReportSpend & { id: string; campaign: string; source: string }> | null) ?? []

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-display text-forest">Growth — ต้นทุนต่อคนไข้ที่มาจริง</h1>
          <p className="text-sm text-gray-500 mt-1">
            &ldquo;มาจริง&rdquo; = กดใช้ voucher ที่หน้า รับ Voucher หรือย้ายสถานะ lead เป็น visited/customer
          </p>
        </div>
        <div className="flex gap-2 text-sm">
          {PERIODS.map(p => (
            <Link
              key={p}
              href={`/admin/growth?days=${p}`}
              className={`px-3 py-1.5 rounded-full border ${p === days ? 'bg-forest text-white border-forest' : 'bg-white border-gray-200 text-gray-600'}`}
            >
              {p} วัน
            </Link>
          ))}
        </div>
      </div>

      {missingSchema && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-xl p-4 text-sm">
          ยังไม่ได้รัน migration <code>supabase/migrations/create_growth_loops.sql</code> — ตัวเลขบางส่วนจะว่าง ({missingSchema.message})
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat label="ค่าโฆษณา" value={baht(total.spend)} hint={`${days} วันล่าสุด`} />
        <Stat label="คนไข้ที่มาจริง" value={total.visits} hint={`จาก ${total.leads} leads`} />
        <Stat label="ต้นทุน / คนไข้ที่มาจริง" value={baht(total.costPerVisit)} />
        <Stat label="อัตรามาจริง" value={pct(total.visitRate)} hint="visits ÷ leads" />
      </div>

      <section className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
        <h2 className="font-semibold text-forest px-4 pt-4">แยกตามบริการ</h2>
        <table className="w-full text-sm mt-2">
          <thead className="text-xs text-gray-500">
            <tr>
              <th className="text-left py-2 px-3">บริการ</th>
              <th className="text-right py-2 px-3">ค่าแอด</th>
              <th className="text-right py-2 px-3">Leads</th>
              <th className="text-right py-2 px-3">จากแอด</th>
              <th className="text-right py-2 px-3">Voucher</th>
              <th className="text-right py-2 px-3">มาจริง</th>
              <th className="text-right py-2 px-3">% มาจริง</th>
              <th className="text-right py-2 px-3">฿/Lead</th>
              <th className="text-right py-2 px-3">฿/คนไข้</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => <BucketTr key={r.bucket} r={r} />)}
            <BucketTr r={total} bold />
          </tbody>
        </table>
        <p className="text-xs text-gray-400 px-4 pb-4 pt-2">
          ค่าแอดที่ชื่อแคมเปญไม่มีรหัสบริการ (GLP1/CKD/STD/…) จะไปอยู่แถว &ldquo;ไม่ระบุ&rdquo; — ตั้งชื่อแคมเปญให้มีรหัสเสมอ
        </p>
      </section>

      <div className="grid md:grid-cols-2 gap-6">
        <section className="bg-white rounded-xl border border-gray-200 p-4">
          <h2 className="font-semibold text-forest">แยกตามแหล่งที่มา (utm_source)</h2>
          <table className="w-full text-sm mt-2">
            <thead className="text-xs text-gray-500">
              <tr><th className="text-left py-1">แหล่ง</th><th className="text-right py-1">Leads</th><th className="text-right py-1">มาจริง</th></tr>
            </thead>
            <tbody>
              {sources.map(s => (
                <tr key={s.source} className="border-t border-gray-100">
                  <td className="py-1.5">{s.source}</td>
                  <td className="py-1.5 text-right">{s.leads}</td>
                  <td className="py-1.5 text-right">{s.visits}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="bg-white rounded-xl border border-gray-200 p-4 space-y-4">
          <div>
            <h2 className="font-semibold text-forest">รีวิวหลังมาตรวจ</h2>
            <p className="text-sm text-gray-600 mt-1">
              ส่งไป {reviews.requested} · ตอบ {reviews.rated} · เฉลี่ย {reviews.average ? reviews.average.toFixed(1) : '—'} ดาว ·
              {' '}4–5 ดาว {reviews.happy} (ส่งลิงก์ Google) · 1–3 ดาว {reviews.unhappy} (แจ้งทีมโทรกลับ)
            </p>
          </div>
          <div>
            <h2 className="font-semibold text-forest">แนะนำเพื่อน</h2>
            <p className="text-sm text-gray-600 mt-1">
              ออกโค้ด {refs.codesIssued} · คลิกลิงก์ {refs.clicks} (ทั้งหมด) · เพื่อนทำแบบประเมิน {refs.referredLeads} · เพื่อนมาตรวจจริง {refs.referredVisits}
            </p>
          </div>
          <div>
            <h2 className="font-semibold text-forest">ข้อความชวนตรวจซ้ำ (Recall)</h2>
            <p className="text-sm text-gray-600 mt-1">ส่งแล้ว {reviews.recallsSent} คนในช่วงนี้</p>
          </div>
        </section>
      </div>

      <section className="bg-white rounded-xl border border-gray-200 p-4">
        <h2 className="font-semibold text-forest">กรอกค่าโฆษณา (Google / TikTok / LINE)</h2>
        <p className="text-xs text-gray-500 mt-1">
          Meta ดึงอัตโนมัติทุกคืน — กรอกเฉพาะแพลตฟอร์มอื่น จะกรอกเป็นยอดรายวันหรือยอดรวมทั้งสัปดาห์ (ใส่วันแรกของสัปดาห์) ก็ได้
        </p>
        <AdSpendForm recent={recentSpend} />
      </section>
    </div>
  )
}
