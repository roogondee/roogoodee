import { test } from 'node:test'
import assert from 'node:assert/strict'
import { conversionRowsToCsv } from '../../src/lib/dmglp/conversions.ts'

test('export contains exactly the 5 Google Ads columns', () => {
  const csv = conversionRowsToCsv([
    { gclid: 'Cj0KCQ_abc', name: 'line_contact', occurred_at: '2026-10-01T02:30:00Z' },
    { gclid: 'Cj0KCQ_abc', name: 'treatment_started', occurred_at: '2026-10-05T09:00:00Z' },
  ])
  const lines = csv.trim().split('\n')
  assert.equal(lines[0], 'Parameters:TimeZone=+0700')
  assert.equal(lines[1], 'Google Click ID,Conversion Name,Conversion Time,Conversion Value,Conversion Currency')
  assert.equal(lines.length, 4)
  for (const l of lines.slice(1)) assert.equal(l.split(',').length, 5)
  assert.equal(lines[2], 'Cj0KCQ_abc,DMGLP LINE Contact,2026-10-01 09:30:00,,')
  assert.equal(lines[3], 'Cj0KCQ_abc,DMGLP Treatment Started,2026-10-05 16:00:00,3000,THB')
})

test('rows without a gclid or with an unknown name are dropped', () => {
  const csv = conversionRowsToCsv([
    { gclid: null, name: 'booked', occurred_at: '2026-10-01T02:30:00Z' },
    { gclid: 'x', name: 'phone_call', occurred_at: '2026-10-01T02:30:00Z' },
  ])
  assert.equal(csv.trim().split('\n').length, 2)
})
