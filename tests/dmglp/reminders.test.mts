import { test } from 'node:test'
import assert from 'node:assert/strict'
import { containsForbidden, lineFollowupText, surveyInviteText, visitReminderText } from '../../src/lib/dmglp/reminders-text.ts'
import { formatThaiDate } from '../../src/lib/dmglp/dates.ts'

test('LINE reminder text contains no drug name, dose, diagnosis or lab value', () => {
  const texts = [
    visitReminderText('2026-11-30', 'https://liff.line.me/123/appointments'),
    visitReminderText('2026-11-30', null),
    surveyInviteText('https://liff.line.me/123/survey/abc'),
    lineFollowupText(null),
  ]
  for (const t of texts) assert.deepEqual(containsForbidden(t), [], t)
  assert.ok(texts[0].includes('ถึงเวลานัดติดตามการดูแลของคุณ'))
})

test('dates are shown in Buddhist year', () => {
  assert.equal(formatThaiDate('2026-11-02'), '2 พ.ย. 2569')
})
