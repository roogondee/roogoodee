import { test } from 'node:test'
import assert from 'node:assert/strict'
import { generateSchedule, generateMaintenanceSchedule, reschedule } from '../../src/lib/dmglp/schedule.ts'

test('enrolling on date X creates 9 appointments with correct offsets', () => {
  const s = generateSchedule('2026-11-02')
  assert.equal(s.length, 9)
  const byCode = Object.fromEntries(s.map(a => [a.template_code, a]))
  assert.equal(byCode.D0.scheduled_date, '2026-11-02')
  assert.equal(byCode.D3.scheduled_date, '2026-11-05')
  assert.equal(byCode.D7.scheduled_date, '2026-11-09')
  assert.equal(byCode.W4.scheduled_date, '2026-11-30')
  assert.equal(byCode.W8.scheduled_date, '2026-12-28')
  assert.equal(byCode.W12.scheduled_date, '2027-01-25')
  assert.equal(byCode.W16.scheduled_date, '2027-02-22')
  assert.equal(byCode.W20.scheduled_date, '2027-03-22')
  assert.equal(byCode.W24.scheduled_date, '2027-04-19')
  assert.equal(byCode.D0.type, 'specialist_visit')
  assert.equal(byCode.D0.lab_panel, 'baseline')
  assert.equal(byCode.D3.type, 'line_followup')
  assert.equal(byCode.D3.drug_linked, false)
  assert.equal(byCode.W12.lab_panel, 'q3m')
  assert.equal(byCode.W24.lab_panel, 'q6m')
})

test('maintenance: monthly follow-up, specialist every 3rd month with q3m labs, q6m at 6, yearly at 12', () => {
  const m = generateMaintenanceSchedule('2027-04-19', 12)
  assert.equal(m.length, 12)
  assert.equal(m[0].type, 'followup_visit')
  assert.equal(m[0].lab_panel, null)
  assert.equal(m[2].type, 'specialist_visit')
  assert.equal(m[2].lab_panel, 'q3m')
  assert.equal(m[5].lab_panel, 'q6m')
  assert.equal(m[11].lab_panel, 'yearly')
  assert.equal(m[0].scheduled_date, '2027-05-19')
})

test('reschedule shifts later drug-linked visits only when shiftLater is chosen', () => {
  const appts = generateSchedule('2026-11-02').map((a, i) => ({ id: `a${i}`, scheduled_date: a.scheduled_date, drug_linked: a.drug_linked, status: 'scheduled' }))
  // move W4 (index 3) by +7 days
  const noShift = reschedule({ appointments: appts, movedId: 'a3', newDate: '2026-12-07', shiftLater: false })
  assert.deepEqual(noShift, [{ id: 'a3', scheduled_date: '2026-12-07' }])

  const shifted = reschedule({ appointments: appts, movedId: 'a3', newDate: '2026-12-07', shiftLater: true })
  assert.equal(shifted.length, 6) // W4 + W8, W12, W16, W20, W24 (line follow-ups are before and not drug-linked)
  assert.equal(shifted.find(c => c.id === 'a4')!.scheduled_date, '2027-01-04')
  assert.equal(shifted.find(c => c.id === 'a8')!.scheduled_date, '2027-04-26')
})
