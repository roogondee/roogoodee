import { supabaseAdmin } from '@/lib/supabase'
import { decryptJson, isEncrypted } from '@/lib/encryption'
import { logLeadAccess } from '@/lib/audit'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import NoteEditor from '@/components/admin/NoteEditor'

export const revalidate = 0

const SERVICE_LABELS: Record<string, string> = {
  std: '🔴 STD & PrEP', glp1: '💉 GLP-1', ckd: '🫘 CKD', foreign: '🧪 แรงงาน',
}

const TIER_LABEL: Record<string, string> = {
  urgent: '🚨 URGENT', hot: '🔥 Hot', warm: '⚡ Warm', cold: '❄️ Cold',
}

const TIER_COLOR: Record<string, string> = {
  urgent: 'bg-red-100 text-red-700',
  hot:    'bg-orange-100 text-orange-700',
  warm:   'bg-yellow-100 text-yellow-700',
  cold:   'bg-sky-100 text-sky-700',
}

function fmt(iso: string) {
  return new Date(iso).toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' })
}

export default async function LeadDetailPage({ params }: { params: { id: string } }) {
  const [{ data: lead }, { data: vouchers }, { data: accessLog }] = await Promise.all([
    supabaseAdmin.from('leads').select('*').eq('id', params.id).maybeSingle(),
    supabaseAdmin.from('vouchers').select('*').eq('lead_id', params.id).order('issued_at', { ascending: false }),
    supabaseAdmin.from('lead_access_log').select('*').eq('lead_id', params.id).order('created_at', { ascending: false }).limit(50),
  ])

  if (!lead) notFound()

  logLeadAccess({ leadId: params.id, actor: 'admin', action: 'view' })

  const encryptedFlag = isEncrypted(lead.quiz_answers)
  const answers = encryptedFlag ? decryptJson(lead.quiz_answers) : lead.quiz_answers

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Link href="/admin" className="text-sm text-gray-500 hover:text-forest">← กลับ Leads</Link>

      <header className="bg-white rounded-xl border border-gray-100 p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="font-display text-2xl text-forest mb-1">
              {lead.first_name} {lead.last_name || ''}
            </h1>
            <div className="flex items-center gap-3 flex-wrap text-sm">
              <a href={`tel:${lead.phone}`} className="text-forest font-mono font-semibold hover:underline">{lead.phone}</a>
              {lead.email && <span className="text-gray-500">• {lead.email}</span>}
              {lead.line_id && <span className="text-gray-500">• LINE: {lead.line_id}</span>}
              {lead.line_user_id && <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-bold">✓ LINE linked</span>}
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className="text-xs text-gray-500">{SERVICE_LABELS[lead.service] || lead.service}</span>
            {lead.lead_tier && (
              <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${TIER_COLOR[lead.lead_tier]}`}>
                {TIER_LABEL[lead.lead_tier]} · score {lead.lead_score ?? 0}
              </span>
            )}
          </div>
        </div>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-2 text-sm">
          <h2 className="font-semibold text-gray-700 mb-2">ข้อมูลลูกค้า</h2>
          <Row label="อายุ" value={lead.age} />
          <Row label="เพศ" value={lead.gender} />
          <Row label="สถานะ" value={lead.status || 'new'} />
          <Row label="Source" value={lead.source} />
          <Row label="UTM" value={[lead.utm_source, lead.utm_medium, lead.utm_campaign].filter(Boolean).join(' / ') || '-'} />
          <Row label="สร้างเมื่อ" value={fmt(lead.created_at)} />
          {lead.consent_at && <Row label="PDPA consent" value={fmt(lead.consent_at)} />}
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <h2 className="font-semibold text-gray-700 mb-2 text-sm">หมายเหตุภายใน</h2>
          <NoteEditor id={lead.id} initial={lead.note || ''} />
        </div>
      </section>

      <section className="bg-white rounded-xl border border-gray-100 p-5">
        <h2 className="font-semibold text-gray-700 mb-3 text-sm flex items-center gap-2">
          คำตอบ Quiz
          {encryptedFlag && <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 font-bold">🔒 AES-256</span>}
        </h2>
        {answers && typeof answers === 'object' ? (
          <pre className="text-xs bg-gray-50 rounded-lg p-4 overflow-x-auto">
            {JSON.stringify(answers, null, 2)}
          </pre>
        ) : (
          <p className="text-sm text-gray-400">—</p>
        )}
      </section>

      <section className="bg-white rounded-xl border border-gray-100 p-5">
        <h2 className="font-semibold text-gray-700 mb-3 text-sm">Vouchers ({vouchers?.length || 0})</h2>
        {vouchers && vouchers.length > 0 ? (
          <div className="space-y-2">
            {vouchers.map(v => {
              const expired = new Date(v.expires_at).getTime() < Date.now()
              return (
                <div key={v.id} className="flex items-center justify-between text-sm border-b border-gray-50 pb-2 last:border-0">
                  <div>
                    <span className="font-mono font-semibold text-forest">{v.code}</span>
                    <span className="text-xs text-gray-500 ml-3">{SERVICE_LABELS[v.service] || v.service}</span>
                  </div>
                  <div className="text-xs text-right">
                    {v.redeemed_at ? (
                      <span className="text-green-700 font-semibold">✓ ใช้แล้ว {fmt(v.redeemed_at)} ({v.redeemed_by || '-'})</span>
                    ) : expired ? (
                      <span className="text-red-500">หมดอายุ {fmt(v.expires_at)}</span>
                    ) : (
                      <span className="text-blue-700">หมดอายุ {fmt(v.expires_at)}</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <p className="text-sm text-gray-400">—</p>
        )}
      </section>

      <section className="bg-white rounded-xl border border-gray-100 p-5">
        <h2 className="font-semibold text-gray-700 mb-3 text-sm">Access Log ({accessLog?.length || 0})</h2>
        {accessLog && accessLog.length > 0 ? (
          <div className="space-y-1 text-xs">
            {accessLog.map(row => (
              <div key={row.id} className="flex items-center gap-3 text-gray-600">
                <span className="text-gray-400 w-36 shrink-0">{fmt(row.created_at)}</span>
                <span className="font-mono uppercase text-forest w-16 shrink-0">{row.action}</span>
                <span className="text-gray-500">{row.actor}</span>
                {row.details && (
                  <span className="text-gray-400 truncate">{JSON.stringify(row.details)}</span>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400">ยังไม่มีประวัติ</p>
        )}
      </section>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex">
      <dt className="w-28 text-gray-500 shrink-0">{label}</dt>
      <dd className="text-gray-800">{value || '-'}</dd>
    </div>
  )
}
