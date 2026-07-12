import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { CERT_TYPE_LABEL, FIT_STATUS_LABEL, type MedicalCertificate } from '@/lib/certs/types'
import type { LabAnalyte } from '@/lib/lab/types'
import IssueCertButton from '@/components/admin/certs/IssueCertButton'
import RevokeCertButton from '@/components/admin/certs/RevokeCertButton'
import CertLinkCopy from '@/components/admin/certs/CertLinkCopy'

export const revalidate = 0

const STATUS_TH: Record<string, string> = { draft: 'ฉบับร่าง', issued: 'ออกแล้ว', revoked: 'เพิกถอน' }

export default async function CertDetailPage({ params }: { params: { id: string } }) {
  const me = await getSessionUser()
  if (!me) redirect('/admin/login')

  const { data } = await supabaseAdmin.from('medical_certificates').select('*').eq('id', params.id).maybeSingle()
  if (!data) redirect('/admin/certs')
  const cert = data as MedicalCertificate

  const { data: patient } = await supabaseAdmin
    .from('patients').select('name, phone, consent_pdpa').eq('id', cert.patient_id).maybeSingle()

  const analytes = (cert.lab_analytes ?? []) as LabAnalyte[]
  const isDraft = cert.status === 'draft'
  const isIssued = cert.status === 'issued'

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <Link href="/admin/certs" className="text-sm text-gray-400 hover:text-forest">← กลับ</Link>
        <span className="text-sm px-3 py-1 rounded-full bg-gray-100 text-gray-600">{STATUS_TH[cert.status]}</span>
      </div>

      <header className="bg-white rounded-2xl p-5 border border-gray-100">
        <h1 className="font-display text-2xl text-forest">{cert.cert_no ?? 'ใบรับรอง (ฉบับร่าง)'}</h1>
        <p className="text-sm text-gray-500 mt-1">{CERT_TYPE_LABEL[cert.cert_type]} · {patient?.name ?? '-'}</p>
        <p className="text-sm text-gray-400">วันที่ตรวจ {cert.visit_date}{cert.valid_until ? ` · ใช้ได้ถึง ${cert.valid_until}` : ''}</p>
        {patient && !patient.consent_pdpa && <p className="text-xs text-amber-600 mt-2">⚠️ คนไข้ยังไม่ยินยอม PDPA — ออกใบรับรองไม่ได้จนกว่าจะยินยอม</p>}
      </header>

      {/* Actions */}
      <section className="bg-white rounded-2xl p-5 border border-gray-100 space-y-4">
        <div className="flex flex-wrap gap-2">
          {isDraft && <IssueCertButton certId={cert.id} defaultName={cert.doctor_name} defaultLicense={cert.doctor_license} />}
          {isDraft && <Link href={`/admin/certs/${cert.id}/edit`} className="border border-gray-200 px-4 py-2.5 rounded-xl text-sm text-gray-600 hover:border-forest">แก้ไข</Link>}
          {(isIssued || cert.status === 'revoked') && (
            <a href={`/api/admin/certs/${cert.id}/pdf`} className="bg-forest text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-sage">ดาวน์โหลด PDF</a>
          )}
          {isIssued && me.role === 'manager' && <RevokeCertButton certId={cert.id} />}
        </div>
        {cert.public_token && (
          <div>
            <p className="text-xs text-gray-500 mb-1">ลิงก์ตรวจสอบ (QR ปลายทาง)</p>
            <CertLinkCopy token={cert.public_token} />
          </div>
        )}
        {cert.status === 'revoked' && cert.revoke_reason && (
          <p className="text-sm text-red-600">เพิกถอนเมื่อ {cert.revoked_at?.slice(0, 10)} — {cert.revoke_reason}</p>
        )}
      </section>

      {/* Summary of contents */}
      <section className="bg-white rounded-2xl p-5 border border-gray-100 text-sm space-y-3">
        <h2 className="font-semibold text-forest">เนื้อหาใบรับรอง</h2>
        {(cert.disease_items ?? []).length > 0 && (
          <div>
            <p className="text-gray-500 mb-1">ผลคัดกรอง</p>
            <ul className="space-y-1">
              {(cert.disease_items ?? []).map((it) => (
                <li key={it.key} className="flex justify-between">
                  <span>{it.label_th}</span>
                  <span className={it.result === 'abnormal' ? 'text-red-600' : it.result === 'normal' ? 'text-green-600' : 'text-gray-400'}>
                    {it.result === 'abnormal' ? 'ผิดปกติ/พบ' : it.result === 'normal' ? 'ปกติ/ไม่พบ' : 'ไม่ได้ตรวจ'}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {analytes.length > 0 && (
          <div>
            <p className="text-gray-500 mb-1">ผล Lab ({analytes.length})</p>
            <ul className="text-gray-600">{analytes.map((a, i) => <li key={i}>{a.test_name}: {a.value}{a.unit ? ` ${a.unit}` : ''} ({a.flag})</li>)}</ul>
          </div>
        )}
        {cert.fit_status && <p><span className="text-gray-500">สรุปผล: </span>{FIT_STATUS_LABEL[cert.fit_status]}</p>}
        {cert.summary && <p><span className="text-gray-500">ความเห็นแพทย์: </span>{cert.summary}</p>}
        {cert.doctor_name && <p className="text-gray-500">แพทย์: {cert.doctor_name}{cert.doctor_license ? ` (ว.${cert.doctor_license})` : ''}</p>}
      </section>
    </div>
  )
}
