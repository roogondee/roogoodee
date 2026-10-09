import type { Metadata } from 'next'
import ClinicClient from '@/components/pages/ClinicClient'

// Landing for "near me" search intent — คลินิกใกล้ฉัน, โรงพยาบาลใกล้ฉัน,
// หาหมอ สมุทรสาคร. These searchers want an address, a phone number and the
// way there, not a symptom chat: on /advice the keyword took ~92% of spend
// while Google rated it "Limited — low quality" against that page and 88%
// of the clicks never typed a word. See docs/clinic-google-ads.md.
//
// Claims are limited to what is already on record: address, phones,
// licence number, "เปิดทุกวัน" (owner-provided, also on /dmglp). No opening
// hours, no prices, no insurance/สิทธิ์ claims — the CTAs ask the team.

const ADDRESS = {
  '@type': 'PostalAddress',
  streetAddress: '99/26 หมู่ 5 ต.บางน้ำจืด',
  addressLocality: 'อำเภอเมืองสมุทรสาคร',
  addressRegion: 'สมุทรสาคร',
  postalCode: '74000',
  addressCountry: 'TH',
}

const JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'Hospital',
  name: 'โรงพยาบาลดับเบิ้ลยู เมดิคอล (W Medical Hospital)',
  address: ADDRESS,
  geo: { '@type': 'GeoCoordinates', latitude: 13.6286116, longitude: 100.3551941 },
  telephone: ['+66-34-110-988', '+66-81-902-3540'],
  url: 'https://roogondee.com/clinic',
  hasMap: 'https://www.google.com/maps/search/?api=1&query=13.6286116,100.3551941',
}

export const metadata: Metadata = {
  title: 'พบแพทย์ใกล้คุณ สมุทรสาคร — โรงพยาบาลดับเบิ้ลยู เมดิคอล | ตรวจสุขภาพ ใบรับรองแพทย์',
  description: 'โรงพยาบาลดับเบิ้ลยู เมดิคอล อ.เมืองสมุทรสาคร เปิดทุกวัน พบแพทย์ตรวจอาการ ใบรับรองแพทย์ ตรวจสุขภาพแรงงานต่างด้าว เบาหวาน ไต โทร 034-110-988 หรือนำทางด้วย Google Maps',
  keywords: 'คลินิกใกล้ฉัน, โรงพยาบาลใกล้ฉัน, หาหมอ สมุทรสาคร, คลินิก สมุทรสาคร, โรงพยาบาล สมุทรสาคร, W Medical, ดับเบิ้ลยู เมดิคอล',
  alternates: { canonical: 'https://roogondee.com/clinic' },
  robots: { index: true, follow: true },
  openGraph: {
    title: 'พบแพทย์ใกล้คุณ — โรงพยาบาลดับเบิ้ลยู เมดิคอล สมุทรสาคร',
    description: 'เปิดทุกวัน โทร 034-110-988 · นำทางด้วย Google Maps · ทัก LINE นัดคิว',
    url: 'https://roogondee.com/clinic',
  },
}

export default function ClinicPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }} />
      <ClinicClient />
    </>
  )
}
