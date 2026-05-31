/* eslint-disable jsx-a11y/alt-text */
import path from 'path'
import React from 'react'
import {
  Document, Page, View, Text, Image, Font,
  Svg, Rect, Polyline, Line, Circle,
  StyleSheet,
} from '@react-pdf/renderer'
import { buildChartSeries } from '../chart'
import type { AnalyteTimeline, LabInterpretation, LabReport, PatientTimeline } from '../types'

// Bundle Sarabun so Thai renders (no tofu). Files traced via next.config.mjs.
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
const RISK: Record<string, string> = { green: '#16a34a', yellow: '#d97706', red: '#dc2626' }

const s = StyleSheet.create({
  page: { fontFamily: 'Sarabun', fontSize: 9, color: '#2C3E28', padding: 32, lineHeight: 1.4 },
  hospital: { fontSize: 8, color: FOREST, borderBottom: `1px solid ${MINT}`, paddingBottom: 6, marginBottom: 10 },
  hospitalName: { fontSize: 11, fontWeight: 'bold' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 16, fontWeight: 'bold', color: FOREST },
  patient: { fontSize: 9, color: '#6B8C72' },
  scoreBadge: { borderRadius: 8, padding: 8, alignItems: 'center', width: 92 },
  scoreNum: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  scoreLbl: { fontSize: 7, color: '#fff' },
  section: { marginTop: 12 },
  h2: { fontSize: 11, fontWeight: 'bold', color: FOREST, marginBottom: 4 },
  th: { flexDirection: 'row', backgroundColor: CREAM, paddingVertical: 3, paddingHorizontal: 4, fontWeight: 'bold' },
  tr: { flexDirection: 'row', paddingVertical: 2, paddingHorizontal: 4, borderBottom: '0.5px solid #eee' },
  cName: { width: '40%' }, cVal: { width: '20%' }, cRef: { width: '25%' }, cFlag: { width: '15%' },
  finding: { marginBottom: 2 },
  disclaimer: { fontSize: 7, fontStyle: 'italic', color: '#6B8C72', marginTop: 6, borderTop: '0.5px solid #ddd', paddingTop: 4 },
  signoff: { fontSize: 8, color: FOREST, marginTop: 10 },
  footer: { position: 'absolute', bottom: 20, left: 32, right: 32, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  qr: { width: 56, height: 56 },
  chartWrap: { marginBottom: 8 },
  chartTitle: { fontSize: 8, fontWeight: 'bold', marginBottom: 2 },
})

function flagColor(flag: string): string {
  if (flag === 'HH' || flag === 'LL') return RISK.red
  if (flag === 'H' || flag === 'L' || flag === 'A') return RISK.yellow
  if (flag === 'N') return RISK.green
  return '#999'
}

function TimelineChart({ t }: { t: AnalyteTimeline }) {
  const series = buildChartSeries(t, { width: 240, height: 110, padding: 24 })
  if (!series) return null
  return (
    <View style={s.chartWrap} wrap={false}>
      <Text style={s.chartTitle}>{t.test_name}{t.unit ? ` (${t.unit})` : ''}</Text>
      <Svg width={series.width} height={series.height}>
        {series.refBand && (
          <Rect x={24} y={Math.min(series.refBand.yTop, series.refBand.yBottom)}
            width={series.width - 48} height={Math.abs(series.refBand.yBottom - series.refBand.yTop)}
            fill="#52B788" fillOpacity={0.12} />
        )}
        {series.targetLine && (
          <Line x1={24} y1={series.targetLine.y} x2={series.width - 24} y2={series.targetLine.y}
            stroke={MINT} strokeWidth={0.8} strokeDasharray="3 2" />
        )}
        <Polyline points={series.polyline} fill="none" stroke={FOREST} strokeWidth={1.2} />
        {series.points.map((p, i) => (
          <Circle key={i} cx={p.x} cy={p.y} r={2.4} fill={p.abnormal ? RISK.red : MINT} />
        ))}
        {series.projection && (
          <Circle cx={series.projection.x} cy={series.projection.y} r={2.4} fill="#999" />
        )}
      </Svg>
    </View>
  )
}

export interface LabReportPdfProps {
  patientName: string
  report: LabReport
  timeline: PatientTimeline
  qrDataUrl?: string
  verifyUrl?: string
  lang?: 'th' | 'en'
}

export function LabReportPdf({ patientName, report, timeline, qrDataUrl, verifyUrl, lang = 'th' }: LabReportPdfProps) {
  const interp: LabInterpretation | undefined =
    (lang === 'en' && report.interpretation_en) ? report.interpretation_en : (report.interpretation ?? undefined)
  const risk = report.risk_level ?? interp?.risk_level ?? 'green'
  const score = report.health_score ?? interp?.health_score ?? 0
  const charts = timeline.analytes.filter((a) => a.points.length >= 2).slice(0, 6)

  return (
    <Document>
      <Page size="A4" style={s.page}>
        <View style={s.hospital}>
          <Text style={s.hospitalName}>W Medical Hospital สมุทรสาคร</Text>
          <Text>ใบอนุญาตสถานพยาบาล สบส. 001/2569 · ร่วมกับ รู้ก่อนดี (Roogondee)</Text>
        </View>

        <View style={s.row}>
          <View>
            <Text style={s.title}>{lang === 'en' ? 'Lab Result Report' : 'รายงานผลตรวจแลป'}</Text>
            <Text style={s.patient}>{patientName} · {lang === 'en' ? 'Date' : 'วันที่ตรวจ'}: {report.report_date}{report.lab_name ? ` · ${report.lab_name}` : ''}</Text>
          </View>
          <View style={[s.scoreBadge, { backgroundColor: RISK[risk] }]}>
            <Text style={s.scoreNum}>{score}</Text>
            <Text style={s.scoreLbl}>{lang === 'en' ? 'HEALTH SCORE' : 'คะแนนสุขภาพ'}</Text>
          </View>
        </View>

        {interp && (
          <View style={s.section}>
            <Text style={s.h2}>{interp.headline}</Text>
            <Text>{interp.summary}</Text>
            {interp.findings?.map((f, i) => <Text key={i} style={s.finding}>• {f}</Text>)}
            <Text style={{ marginTop: 4 }}>{lang === 'en' ? 'Recommendation: ' : 'คำแนะนำ: '}{interp.recommendation}</Text>
          </View>
        )}

        <View style={s.section}>
          <Text style={s.h2}>{lang === 'en' ? 'Analytes' : 'รายการตรวจ'}</Text>
          <View style={s.th}>
            <Text style={s.cName}>{lang === 'en' ? 'Test' : 'รายการ'}</Text>
            <Text style={s.cVal}>{lang === 'en' ? 'Value' : 'ผล'}</Text>
            <Text style={s.cRef}>{lang === 'en' ? 'Reference' : 'ค่าอ้างอิง'}</Text>
            <Text style={s.cFlag}>{lang === 'en' ? 'Flag' : 'สถานะ'}</Text>
          </View>
          {report.analytes.map((a, i) => (
            <View key={i} style={s.tr}>
              <Text style={s.cName}>{a.test_name}</Text>
              <Text style={s.cVal}>{a.value}{a.unit ? ` ${a.unit}` : ''}</Text>
              <Text style={s.cRef}>{a.reference_range ?? (a.ref_low != null || a.ref_high != null ? `${a.ref_low ?? ''}-${a.ref_high ?? ''}` : '-')}</Text>
              <Text style={[s.cFlag, { color: flagColor(a.flag), fontWeight: 'bold' }]}>{a.flag}</Text>
            </View>
          ))}
        </View>

        {charts.length > 0 && (
          <View style={s.section}>
            <Text style={s.h2}>{lang === 'en' ? 'Trends over time' : 'แนวโน้มย้อนหลัง'}</Text>
            {charts.map((t) => <TimelineChart key={t.canonical} t={t} />)}
          </View>
        )}

        {interp && <Text style={s.disclaimer}>⚕ {interp.disclaimer}</Text>}
        <Text style={s.signoff}>
          {lang === 'en' ? 'AI-assisted, reviewed & certified by: ' : 'แปลผลด้วย AI ช่วยร่าง ตรวจสอบและรับรองโดย: '}
          {report.reviewer_name ?? '-'}{report.reviewer_license ? ` เลขที่ ${report.reviewer_license}` : ''}
        </Text>

        <View style={s.footer}>
          <Text style={{ fontSize: 7, color: '#6B8C72' }}>
            {verifyUrl ? `${lang === 'en' ? 'Verify: ' : 'ตรวจสอบ: '}${verifyUrl}` : ''}
          </Text>
          {qrDataUrl ? <Image src={qrDataUrl} style={s.qr} /> : null}
        </View>
      </Page>
    </Document>
  )
}
