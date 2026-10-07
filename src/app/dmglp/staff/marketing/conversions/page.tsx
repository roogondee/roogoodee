import { supabaseAdmin } from '@/lib/supabase'
import { requireDmglp } from '@/lib/dmglp/roles'
import { ADS_CONVERSION_LABELS } from '@/lib/dmglp/conversions'
import { Card, PageHeader, Stat, Table, btnSmallSecondary, dateTimeTh, one, td } from '../../ui'

export const dynamic = 'force-dynamic'

// Marketing view (§3): attribution + conversions, aggregated. No names, no
// clinical data — this role must never see identifiable health information.
export default async function ConversionsPage({ searchParams }: { searchParams: { days?: string } }) {
  await requireDmglp('marketing.read')
  const days = [7, 30, 90].includes(Number(searchParams.days)) ? Number(searchParams.days) : 30
  const since = new Date(Date.now() - days * 86_400_000).toISOString()
  const [{ data: attr }, { data: conv }] = await Promise.all([
    supabaseAdmin.from('dmglp_attribution').select('id, ref_code, channel, gclid, cookie_consent, created_at').gte('created_at', since).order('created_at', { ascending: false }).limit(500),
    supabaseAdmin.from('dmglp_conversions').select('id, name, occurred_at, exported_at, attribution:dmglp_attribution(ref_code, channel, gclid)').gte('occurred_at', since).order('occurred_at', { ascending: false }).limit(500),
  ])
  const byChannel: Record<string, { clicks: number; line_contact: number; booked: number; treatment_started: number }> = {}
  for (const a of attr ?? []) {
    const c = a.channel || 'unknown'
    byChannel[c] ??= { clicks: 0, line_contact: 0, booked: 0, treatment_started: 0 }
    byChannel[c].clicks += 1
  }
  for (const c of conv ?? []) {
    const a = one(c.attribution) as { channel: string | null } | null
    const ch = a?.channel || 'unknown'
    byChannel[ch] ??= { clicks: 0, line_contact: 0, booked: 0, treatment_started: 0 }
    byChannel[ch][c.name as 'line_contact' | 'booked' | 'treatment_started'] += 1
  }
  const total = (name: string) => (conv ?? []).filter(c => c.name === name).length
  const withGclid = (conv ?? []).filter(c => (one(c.attribution) as { gclid: string | null } | null)?.gclid).length

  return (
    <>
      <PageHeader title="Attribution & Conversions" subtitle={`ช่วง ${days} วัน · ส่งออกไป Google Ads ได้เฉพาะ gclid + เวลา + ชื่อ conversion`}
        actions={<>{[7, 30, 90].map(d => <a key={d} href={`?days=${d}`} className={btnSmallSecondary}>{d} วัน</a>)}<a href="/api/dmglp/conversions-export" className={btnSmallSecondary}>ดาวน์โหลด CSV (Google Ads)</a></>} />
      <div className="grid sm:grid-cols-4 gap-3 mb-5">
        <Stat label="คลิกเข้าหน้า /dmglp (มี ref code)" value={(attr ?? []).length} />
        <Stat label="ทัก LINE (line_contact)" value={total('line_contact')} />
        <Stat label="นัดแล้ว (booked)" value={total('booked')} />
        <Stat label="เริ่มยา (treatment_started)" value={total('treatment_started')} hint={`${withGclid} conversion มี gclid`} />
      </div>
      <Card title="ตามช่องทาง" className="mb-5">
        <Table head={['ช่องทาง', 'คลิก', 'ทัก LINE', 'นัด', 'เริ่มยา', 'คลิก→เริ่มยา']}>
          {Object.entries(byChannel).map(([ch, s]) => (
            <tr key={ch}><td className={td}>{ch}</td><td className={td}>{s.clicks}</td><td className={td}>{s.line_contact}</td><td className={td}>{s.booked}</td><td className={td}>{s.treatment_started}</td><td className={td}>{s.clicks ? `${((s.treatment_started / s.clicks) * 100).toFixed(1)}%` : '—'}</td></tr>
          ))}
        </Table>
      </Card>
      <Card title="Conversions ล่าสุด">
        <Table head={['เวลา', 'Conversion', 'Ref', 'ช่องทาง', 'gclid', 'ส่งออกแล้ว']} empty={(conv ?? []).length === 0}>
          {(conv ?? []).slice(0, 100).map(c => {
            const a = one(c.attribution) as { ref_code: string; channel: string | null; gclid: string | null } | null
            return (
              <tr key={c.id}>
                <td className={`${td} text-xs`}>{dateTimeTh(c.occurred_at)}</td>
                <td className={td}>{ADS_CONVERSION_LABELS[c.name as keyof typeof ADS_CONVERSION_LABELS]}</td>
                <td className={td}>{a?.ref_code}</td>
                <td className={td}>{a?.channel}</td>
                <td className={`${td} text-xs`}>{a?.gclid ? `${a.gclid.slice(0, 10)}…` : '—'}</td>
                <td className={`${td} text-xs`}>{c.exported_at ? dateTimeTh(c.exported_at) : '—'}</td>
              </tr>
            )
          })}
        </Table>
      </Card>
    </>
  )
}
