/* eslint-disable jsx-a11y/alt-text */
import path from 'path'
import React from 'react'
import { Document, Page, View, Text, Image, Font, StyleSheet } from '@react-pdf/renderer'
import {
  CERT_TYPE_LABEL, CERT_TYPE_LABEL_EN, FIT_STATUS_LABEL,
  type MedicalCertificate,
} from '@/lib/certs/types'
import type { LabAnalyte } from '@/lib/lab/types'

// Reuse the Sarabun TTFs already shipped for the lab report PDF.
Font.register({
  family: 'Sarabun',
  fonts: [
    { src: path.join(process.cwd(), 'src/lib/lab/fonts/Sarabun-Regular.ttf') },
    { src: path.join(process.cwd(), 'src/lib/lab/fonts/Sarabun-Bold.ttf'), fontWeight: 'bold' },
  ],
})

const FOREST = '#1B4332'
const MINT = '#52B788'
const CREAM = '#F8F4EF'
const RED = '#dc2626'
const AMBER = '#d97706'

const s = StyleSheet.create({
  page: { fontFamily: 'Sarabun', fontSize: 10, color: '#2C3E28', padding: 34, lineHeight: 1.5 },
  headRow: { flexDirection: 'row', justifyContent: 'space-between', borderBottom: `1.5px solid ${MINT}`, paddingBottom: 8, marginBottom: 10 },
  hospitalName: { fontSize: 13, fontWeight: 'bold', color: FOREST },
  hospitalMeta: { fontSize: 7.5, color: '#6B8C72' },
  certNo: { fontSize: 9, color: FOREST, textAlign: 'right' },
  photo: { width: 74, height: 96, objectFit: 'cover', border: `1px solid ${MINT}`, borderRadius: 4 },
  title: { fontSize: 15, fontWeight: 'bold', color: FOREST, textAlign: 'center', marginVertical: 8 },
  subtitle: { fontSize: 9, color: '#6B8C72', textAlign: 'center', marginBottom: 6 },
  revoked: { backgroundColor: '#fef2f2', border: `1px solid ${RED}`, borderRadius: 6, padding: 6, marginBottom: 8 },
  revokedText: { color: RED, fontWeight: 'bold', fontSize: 10, textAlign: 'center' },
  paragraph: { marginBottom: 6 },
  section: { marginTop: 8 },
  h2: { fontSize: 11, fontWeight: 'bold', color: FOREST, marginBottom: 4 },
  infoRow: { flexDirection: 'row', marginBottom: 2 },
  infoLabel: { width: '32%', color: '#6B8C72' },
  infoVal: { width: '68%' },
  th: { flexDirection: 'row', backgroundColor: CREAM, paddingVertical: 3, paddingHorizontal: 4, fontWeight: 'bold' },
  tr: { flexDirection: 'row', paddingVertical: 2.5, paddingHorizontal: 4, borderBottom: '0.5px solid #eee' },
  cItem: { width: '58%' }, cResult: { width: '42%' },
  cName: { width: '40%' }, cVal: { width: '22%' }, cRef: { width: '23%' }, cFlag: { width: '15%' },
  fitBox: { marginTop: 8, padding: 6, borderRadius: 6, backgroundColor: CREAM },
  fitText: { fontWeight: 'bold', color: FOREST },
  signWrap: { marginTop: 22, flexDirection: 'row', justifyContent: 'flex-end' },
  signBox: { width: 200, alignItems: 'center' },
  signLine: { borderTop: '0.7px solid #444', width: '100%', marginBottom: 3 },
  footer: { position: 'absolute', bottom: 22, left: 34, right: 34, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  qr: { width: 58, height: 58 },
  footerNote: { fontSize: 7, color: '#6B8C72', maxWidth: 380 },
})

function flagColor(flag: string): string {
  if (flag === 'HH' || flag === 'LL') return RED
  if (flag === 'H' || flag === 'L' || flag === 'A') return AMBER
  if (flag === 'N') return '#16a34a'
  return '#999'
}

const RESULT_LABEL: Record<string, string> = {
  normal: 'ปกติ / ไม่พบ (Normal)',
  abnormal: 'ผิดปกติ / พบ (Abnormal)',
  not_tested: 'ไม่ได้ตรวจ (N/A)',
}

export interface CertificatePdfProps {
  cert: MedicalCertificate
  qrDataUrl?: string
  verifyUrl?: string
  photoDataUrl?: string
}

function Vitals({ cert }: { cert: MedicalCertificate }) {
  const e = cert.exam ?? {}
  const items: [string, string | number | undefined][] = [
    ['น้ำหนัก (kg)', e.weight_kg], ['ส่วนสูง (cm)', e.height_cm], ['BMI', e.bmi],
    ['ความดัน (mmHg)', e.bp_sys && e.bp_dia ? `${e.bp_sys}/${e.bp_dia}` : undefined],
    ['ชีพจร (/min)', e.pulse],
  ]
  const present = items.filter(([, v]) => v != null && v !== '')
  if (!present.length) return null
  return (
    <View style={s.section}>
      <Text style={s.h2}>ผลตรวจร่างกายทั่วไป (Physical Examination)</Text>
      {present.map(([label, v]) => (
        <View key={label} style={s.infoRow}>
          <Text style={s.infoLabel}>{label}</Text>
          <Text style={s.infoVal}>{String(v)}</Text>
        </View>
      ))}
    </View>
  )
}

function DiseaseTable({ cert, bilingual }: { cert: MedicalCertificate; bilingual: boolean }) {
  const items = cert.disease_items ?? []
  if (!items.length) return null
  return (
    <View style={s.section}>
      <Text style={s.h2}>ผลการตรวจคัดกรอง{bilingual ? ' (Screening Results)' : ''}</Text>
      <View style={s.th}>
        <Text style={s.cItem}>รายการ{bilingual ? ' / Item' : ''}</Text>
        <Text style={s.cResult}>ผล / Result</Text>
      </View>
      {items.map((it, i) => (
        <View key={i} style={s.tr}>
          <Text style={s.cItem}>{it.label_th}{bilingual && it.label_en ? `\n${it.label_en}` : ''}</Text>
          <Text style={[s.cResult, { color: it.result === 'abnormal' ? RED : it.result === 'normal' ? '#16a34a' : '#999' }]}>
            {RESULT_LABEL[it.result]}{it.detail ? ` — ${it.detail}` : ''}
          </Text>
        </View>
      ))}
    </View>
  )
}

function LabTable({ analytes }: { analytes: LabAnalyte[] }) {
  if (!analytes.length) return null
  return (
    <View style={s.section}>
      <Text style={s.h2}>ผลตรวจทางห้องปฏิบัติการ (Laboratory Results)</Text>
      <View style={s.th}>
        <Text style={s.cName}>รายการ / Test</Text>
        <Text style={s.cVal}>ผล / Value</Text>
        <Text style={s.cRef}>ค่าอ้างอิง / Ref</Text>
        <Text style={s.cFlag}>สถานะ</Text>
      </View>
      {analytes.map((a, i) => (
        <View key={i} style={s.tr}>
          <Text style={s.cName}>{a.test_name}</Text>
          <Text style={s.cVal}>{a.value}{a.unit ? ` ${a.unit}` : ''}</Text>
          <Text style={s.cRef}>{a.reference_range ?? (a.ref_low != null || a.ref_high != null ? `${a.ref_low ?? ''}-${a.ref_high ?? ''}` : '-')}</Text>
          <Text style={[s.cFlag, { color: flagColor(a.flag), fontWeight: 'bold' }]}>{a.flag}</Text>
        </View>
      ))}
    </View>
  )
}

// One certificate = one or more <Page>. Exported as a fragment so the batch
// route can concatenate many certs into a single Document.
export function CertificatePages({ cert, qrDataUrl, verifyUrl, photoDataUrl }: CertificatePdfProps) {
  const snap = cert.patient_snapshot ?? { name: '-' }
  const bilingual = cert.cert_type === 'work_permit'
  const isRevoked = cert.status === 'revoked'
  const genderTh = snap.gender === 'male' ? 'ชาย' : snap.gender === 'female' ? 'หญิง' : snap.gender ?? '-'

  return (
    <Page size="A4" style={s.page}>
      <View style={s.headRow}>
        <View>
          <Text style={s.hospitalName}>โรงพยาบาลดับเบิ้ลยู เมดิคอล สมุทรสาคร</Text>
          <Text style={s.hospitalMeta}>W Medical Hospital, Samut Sakhon</Text>
          <Text style={s.hospitalMeta}>99/26 หมู่ 5 ต.บางน้ำจืด อ.เมืองสมุทรสาคร จ.สมุทรสาคร 74000 · โทร 0 2453 6121</Text>
          <Text style={s.hospitalMeta}>ใบอนุญาตสถานพยาบาล (สมุทรสาคร) 001/2569 · มาตรฐาน MOPH LAB</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          {cert.cert_no ? <Text style={s.certNo}>เลขที่ {cert.cert_no}</Text> : null}
          {photoDataUrl ? <Image src={photoDataUrl} style={[s.photo, { marginTop: 4 }]} /> : null}
        </View>
      </View>

      <Text style={s.title}>{CERT_TYPE_LABEL[cert.cert_type]}</Text>
      {bilingual ? <Text style={s.subtitle}>{CERT_TYPE_LABEL_EN[cert.cert_type]}</Text> : null}

      {isRevoked ? (
        <View style={s.revoked}>
          <Text style={s.revokedText}>เอกสารนี้ถูกเพิกถอนแล้ว — CERTIFICATE REVOKED</Text>
          {cert.revoke_reason ? <Text style={{ fontSize: 8, color: RED, textAlign: 'center' }}>เหตุผล: {cert.revoke_reason}</Text> : null}
        </View>
      ) : null}

      {cert.cert_type === 'general' ? (
        <Text style={s.paragraph}>
          ข้าพเจ้า {cert.doctor_name ?? '-'} ใบอนุญาตประกอบวิชาชีพเวชกรรมเลขที่ {cert.doctor_license ?? '-'}{' '}
          ได้ทำการตรวจร่างกาย {snap.name} เมื่อวันที่ {cert.visit_date} และมีความเห็นตามผลการตรวจดังต่อไปนี้
        </Text>
      ) : null}

      <View style={s.section}>
        <View style={s.infoRow}><Text style={s.infoLabel}>ชื่อ-นามสกุล / Name</Text><Text style={s.infoVal}>{snap.name}</Text></View>
        {snap.dob ? <View style={s.infoRow}><Text style={s.infoLabel}>วันเกิด / DOB</Text><Text style={s.infoVal}>{snap.dob}</Text></View> : null}
        <View style={s.infoRow}><Text style={s.infoLabel}>เพศ / Gender</Text><Text style={s.infoVal}>{genderTh}</Text></View>
        {snap.nationality ? <View style={s.infoRow}><Text style={s.infoLabel}>สัญชาติ / Nationality</Text><Text style={s.infoVal}>{snap.nationality}</Text></View> : null}
        {snap.id_last4 ? <View style={s.infoRow}><Text style={s.infoLabel}>เลขเอกสาร (4 ท้าย)</Text><Text style={s.infoVal}>xxxx-{snap.id_last4}</Text></View> : null}
        {snap.employer_name ? <View style={s.infoRow}><Text style={s.infoLabel}>นายจ้าง / Employer</Text><Text style={s.infoVal}>{snap.employer_name}</Text></View> : null}
        {snap.work_permit_no ? <View style={s.infoRow}><Text style={s.infoLabel}>เลขใบอนุญาตทำงาน</Text><Text style={s.infoVal}>{snap.work_permit_no}</Text></View> : null}
        <View style={s.infoRow}><Text style={s.infoLabel}>วันที่ตรวจ / Visit date</Text><Text style={s.infoVal}>{cert.visit_date}</Text></View>
        {cert.valid_until ? <View style={s.infoRow}><Text style={s.infoLabel}>ใช้ได้ถึง / Valid until</Text><Text style={s.infoVal}>{cert.valid_until}</Text></View> : null}
      </View>

      <Vitals cert={cert} />
      <DiseaseTable cert={cert} bilingual={bilingual} />
      <LabTable analytes={cert.lab_analytes ?? []} />

      {cert.fit_status ? (
        <View style={s.fitBox}>
          <Text style={s.fitText}>สรุปผล / Conclusion: {FIT_STATUS_LABEL[cert.fit_status]}</Text>
        </View>
      ) : null}

      {cert.summary ? (
        <View style={s.section}>
          <Text style={s.h2}>ความเห็นแพทย์ (Physician's Opinion)</Text>
          <Text>{cert.summary}</Text>
        </View>
      ) : null}

      <View style={s.signWrap}>
        <View style={s.signBox}>
          <View style={s.signLine} />
          <Text>( {cert.doctor_name ?? '-'} )</Text>
          <Text style={{ fontSize: 8, color: '#6B8C72' }}>แพทย์ผู้ตรวจ{cert.doctor_license ? ` · เลขที่ ว. ${cert.doctor_license}` : ''}</Text>
        </View>
      </View>

      <View style={s.footer}>
        <Text style={s.footerNote}>
          {verifyUrl ? `สแกนเพื่อตรวจสอบความถูกต้อง / Scan to verify: ${verifyUrl}` : ''}
          {cert.issued_at ? `\nออกเมื่อ ${new Date(cert.issued_at).toISOString().slice(0, 10)}` : ''}
        </Text>
        {qrDataUrl ? <Image src={qrDataUrl} style={s.qr} /> : null}
      </View>
    </Page>
  )
}

export function CertificatePdf(props: CertificatePdfProps) {
  return <Document>{CertificatePages(props)}</Document>
}

// Batch: many certs in one printable document (one page each).
export function CertificateBatchPdf({ items }: { items: CertificatePdfProps[] }) {
  return (
    <Document>
      {items.map((it, i) => React.cloneElement(CertificatePages(it), { key: it.cert.id ?? i }))}
    </Document>
  )
}
