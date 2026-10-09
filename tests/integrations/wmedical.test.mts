import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createHmac } from 'node:crypto'
import {
  idempotencyKey,
  leadInsert,
  leadNote,
  normalizeThaiPhone,
  parseEvent,
  phoneSha256,
  signBody,
  verifySignature,
} from '../../src/lib/integrations/wmedical.ts'

// Shared test vector — the hospital (lib/crm.ts) and pharmacy
// (backend/src/lib/roogondee.ts) tests assert the same digest, and the
// migration's public.th_phone_sha256('+66 81-234-5678') returns it too.
// If one side changes its normalisation, visits silently stop matching.
const VECTOR_PHONE = '+66 81-234-5678'
const VECTOR_SHA256 = '9cb4de460569edf9c77c8f5dafda425b7b47d287ffc4c19015d172f623bc93f5'

test('phone hash matches the cross-system test vector', () => {
  assert.equal(phoneSha256(VECTOR_PHONE), VECTOR_SHA256)
  assert.equal(phoneSha256('081-234-5678'), VECTOR_SHA256)
  assert.equal(phoneSha256('0812345678 ลูกสาว'), VECTOR_SHA256)
  assert.equal(phoneSha256('66812345678'), VECTOR_SHA256)
})

test('only Thai numbers normalise — bot ids and junk get no hash', () => {
  assert.equal(normalizeThaiPhone('02-123-4567'), '021234567')
  assert.equal(normalizeThaiPhone('fb:123456789012'), null)
  assert.equal(normalizeThaiPhone('U1234567890abcdef'), null)
  assert.equal(normalizeThaiPhone('-'), null)
  assert.equal(normalizeThaiPhone(''), null)
  assert.equal(phoneSha256(null), null)
})

test('signature is the hospital lib/crm.ts format and is checked exactly', () => {
  const body = JSON.stringify({ event: 'lead.created' })
  const header = `sha256=${createHmac('sha256', 's3cret').update(body).digest('hex')}`
  assert.equal(signBody(body, 's3cret'), header)
  assert.equal(verifySignature(body, header, 's3cret'), true)
  assert.equal(verifySignature(body, header, 'other'), false)
  assert.equal(verifySignature(body + ' ', header, 's3cret'), false)
  assert.equal(verifySignature(body, null, 's3cret'), false)
  assert.equal(verifySignature(body, header, ''), false)
  assert.equal(verifySignature(body, 'sha256=short', 's3cret'), false)
})

const hospitalBooking = {
  event: 'lead.created',
  created_at: '2026-10-08T03:00:00.000Z',
  source: 'Facebook',
  type: 'booking',
  id: '1b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed',
  name: 'นก ทดสอบ',
  phone: '0812345678',
  lang: 'my',
  service: 'teleconsult',
  attribution: { utm_source: 'facebook', utm_campaign: 'wmh_oct', fbclid: 'IwAR0abc', gclid: 'Cj0K', landing: '/th/booking', evil: 'x' },
  marketing_consent: false,
  symptoms: 'never stored',
}

test('a hospital booking maps onto a booked lead with its attribution', () => {
  const parsed = parseEvent(hospitalBooking)
  assert.equal(parsed.ok, true)
  if (!parsed.ok || parsed.event.event !== 'lead.created') return
  const row = leadInsert(parsed.event)
  assert.equal(row.source, 'wmh-booking')
  assert.equal(row.status, 'booked')
  assert.equal(row.service, 'general')
  assert.equal(row.first_name, 'นก ทดสอบ')
  assert.equal(row.utm_source, 'facebook')
  assert.equal(row.utm_campaign, 'wmh_oct')
  assert.equal(row.gclid, 'Cj0K')
  assert.equal(row.fbc, `fb.1.${Date.parse('2026-10-08T03:00:00.000Z')}.IwAR0abc`)
  // No marketing consent on the hospital side → never reported to Meta.
  assert.equal(row.consent_pdpa, false)
  assert.equal(row.consent_at, null)
  assert.match(row.note, /ปรึกษาแพทย์ออนไลน์/)
  assert.match(row.note, /ช่องทาง: Facebook/)
  assert.match(row.note, /\[wmh:booking:1b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed\]$/)
  // Unknown fields (symptoms, made-up attribution keys) are dropped.
  assert.doesNotMatch(JSON.stringify(row), /never stored|evil/)
})

test('group bookings belong to the foreign pillar; subscribers carry consent', () => {
  const group = parseEvent({ ...hospitalBooking, type: 'group_booking', company: 'ABC Foods', service: undefined })
  assert.ok(group.ok && group.event.event === 'lead.created')
  if (group.ok && group.event.event === 'lead.created') {
    const row = leadInsert(group.event)
    assert.equal(row.service, 'foreign')
    assert.equal(row.status, 'new')
    assert.equal(row.company, 'ABC Foods')
    assert.equal(row.source, 'wmh-group-booking')
  }
  const sub = parseEvent({ event: 'lead.created', type: 'subscriber', name: 'A', phone: '0899999999', lang: 'th', marketing_consent: true })
  assert.ok(sub.ok && sub.event.event === 'lead.created')
  if (sub.ok && sub.event.event === 'lead.created') {
    const now = new Date('2026-10-08T00:00:00Z')
    const row = leadInsert(sub.event, now)
    assert.equal(row.consent_pdpa, true)
    assert.equal(row.consent_at, now.toISOString())
    assert.equal(idempotencyKey(sub.event), null)
    assert.doesNotMatch(leadNote(sub.event), /\[wmh:/)
  }
})

test('lead.created needs a known type, a name and a phone', () => {
  assert.equal(parseEvent({ ...hospitalBooking, type: 'walk_in' }).ok, false)
  assert.equal(parseEvent({ ...hospitalBooking, name: ' ' }).ok, false)
  assert.equal(parseEvent({ ...hospitalBooking, phone: undefined }).ok, false)
  assert.equal(parseEvent(null).ok, false)
})

test('visit.completed accepts only sha256 digests, never a phone number', () => {
  const ok = parseEvent({
    event: 'visit.completed', system: 'pharmacy', type: 'dispense', id: 'rx-1',
    phone_sha256: [VECTOR_SHA256, VECTOR_SHA256, '0812345678', 42],
  })
  assert.ok(ok.ok && ok.event.event === 'visit.completed')
  if (ok.ok && ok.event.event === 'visit.completed') {
    assert.deepEqual(ok.event.phone_sha256, [VECTOR_SHA256])
    assert.equal(idempotencyKey(ok.event), 'wmedical:visit.completed:pharmacy:dispense:rx-1')
  }
  assert.equal(parseEvent({ event: 'visit.completed', system: 'pharmacy', type: 'dispense', id: 'rx-1', phone_sha256: ['0812345678'] }).ok, false)
  assert.equal(parseEvent({ event: 'visit.completed', system: 'lab', type: 'x', id: '1', phone_sha256: [VECTOR_SHA256] }).ok, false)
  assert.equal(parseEvent({ event: 'visit.completed', system: 'hospital', type: 'booking', phone_sha256: [VECTOR_SHA256] }).ok, false)
})

test('events from a newer sender are acknowledged, not rejected', () => {
  const r = parseEvent({ event: 'certificate.issued' })
  assert.equal(r.ok, false)
  assert.equal(!r.ok && r.ignorable, true)
  const bad = parseEvent({ hello: 'world' })
  assert.equal(!bad.ok && bad.ignorable, false)
})
