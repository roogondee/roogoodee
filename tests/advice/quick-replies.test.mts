import { test } from 'node:test'
import assert from 'node:assert/strict'
import { extractQuickReplies } from '../../src/lib/advice/quick-replies.ts'

test('the options line is stripped and returned as buttons', () => {
  const r = extractQuickReplies('ไข้ต่ำๆ มักเกิดจากไวรัสค่ะ\nเป็นมากี่วันแล้วคะ\n[[options: วันนี้ | 2-3 วัน | เกิน 1 สัปดาห์ | ไม่แน่ใจ]]')
  assert.equal(r.text, 'ไข้ต่ำๆ มักเกิดจากไวรัสค่ะ\nเป็นมากี่วันแล้วคะ')
  assert.deepEqual(r.options, ['วันนี้', '2-3 วัน', 'เกิน 1 สัปดาห์', 'ไม่แน่ใจ'])
})

test('lenient about how the model writes the marker', () => {
  assert.deepEqual(extractQuickReplies('Q?\n[options: Today | 2-3 days]').options, ['Today', '2-3 days'])
  assert.deepEqual(extractQuickReplies('Q?\n[[ตัวเลือก: ได้ค่ะ ｜ ไม่เป็นไรค่ะ]]').options, ['ได้ค่ะ', 'ไม่เป็นไรค่ะ'])
  assert.deepEqual(extractQuickReplies('Q?\n[[Options : **ใช่** | ไม่ใช่]]').options, ['ใช่', 'ไม่ใช่'])
})

test('no marker, no buttons, text untouched', () => {
  const r = extractQuickReplies('ขอบคุณค่ะ หายไวๆ นะคะ')
  assert.equal(r.text, 'ขอบคุณค่ะ หายไวๆ นะคะ')
  assert.deepEqual(r.options, [])
})

test('caps, dedupes, drops long or empty options, and never returns a lone button', () => {
  const r = extractQuickReplies('Q\n[[options: a | b | a | | c | d | e]]')
  assert.deepEqual(r.options, ['a', 'b', 'c', 'd'])
  assert.deepEqual(extractQuickReplies('Q\n[[options: ได้ค่ะ]]').options, [])
  assert.deepEqual(extractQuickReplies(`Q\n[[options: ${'ก'.repeat(41)} | x | y]]`).options, ['x', 'y'])
})

test('only the last marker counts, every marker is hidden', () => {
  const r = extractQuickReplies('[[options: x | y]]\nกลาง\n[[options: 1 | 2]]')
  assert.equal(r.text, 'กลาง')
  assert.deepEqual(r.options, ['1', '2'])
})
