import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  hrLinkLineUrl, isRefCode, newHrLinkCode, newRefCode, parseBareRefCode, parseHrLinkCode, parseRefCode, refLineUrl,
} from '../../src/lib/refcodes.ts'

test('codes use the program prefix and the unambiguous alphabet', () => {
  assert.equal(newRefCode('medcert', () => 0), 'MC-22222')
  assert.equal(newRefCode('clinic', () => 0.9999), 'CL-ZZZZZ')
  assert.equal(newHrLinkCode(() => 0), 'HR-222222')
  for (let i = 0; i < 200; i++) assert.match(newRefCode('medcert'), /^MC-[2-9A-HJKMNP-Z]{5}$/)
})

test('a ref code is found inside a LINE message, however it was typed', () => {
  assert.deepEqual(parseRefCode('สนใจตรวจรับใบรับรองแพทย์ (MC-K7Q2M)'), { code: 'MC-K7Q2M', program: 'medcert' })
  assert.deepEqual(parseRefCode('cl-k7q2m ค่ะ'), { code: 'CL-K7Q2M', program: 'clinic' })
  assert.deepEqual(parseRefCode('รหัส MC K7Q2M'), { code: 'MC-K7Q2M', program: 'medcert' })
  assert.deepEqual(parseRefCode('ＭＣ－Ｋ７Ｑ２Ｍ'), { code: 'MC-K7Q2M', program: 'medcert' })
  assert.deepEqual(parseRefCode('MC \u2013 K7Q2M'), { code: 'MC-K7Q2M', program: 'medcert' }) // en dash
  assert.deepEqual(parseRefCode('รหัสCLK7Q2Mครับ'), { code: 'CL-K7Q2M', program: 'clinic' }) // run-together, has a digit
})

test('ordinary words never parse as codes', () => {
  // Run-together with no digit would turn English words into codes.
  for (const word of ['classes', 'CLUSTER', 'cleaner', 'clauses', 'MCQUEEN']) {
    assert.equal(parseRefCode(`ขอสอบถาม ${word} ค่ะ`), null, word)
  }
  assert.equal(parseHrLinkCode('ขอ HR number หน่อย'), null)
  assert.equal(parseHrLinkCode('HRABC234'), null) // HR codes only come from our button, dash and all
})

test('look-alikes are not ref codes', () => {
  assert.equal(parseRefCode('สวัสดีครับ'), null)
  assert.equal(parseRefCode('DM-4821'), null)
  assert.equal(parseRefCode('RGD-GLP1-ABC123'), null)
  assert.equal(parseRefCode('MC-K7Q2M9'), null) // too long
  assert.equal(parseRefCode('MC-K7Q0M'), null) // 0 is not in the alphabet
})

test('isRefCode only accepts a bare code (redeem screen input)', () => {
  assert.equal(isRefCode('mc-k7q2m'), true)
  assert.equal(isRefCode(' CL-K7Q2M '), true)
  assert.equal(isRefCode('RGD-GLP1-A3X9K2'), false)
  assert.equal(isRefCode('ใบรับรอง MC-K7Q2M'), false)
})

test('a code-only field accepts the code however staff typed it', () => {
  assert.deepEqual(parseBareRefCode('mck7q2m'), { code: 'MC-K7Q2M', program: 'medcert' })
  assert.deepEqual(parseBareRefCode('cl k7q2m'), { code: 'CL-K7Q2M', program: 'clinic' })
  assert.deepEqual(parseBareRefCode(' CL-ASSES '), { code: 'CL-ASSES', program: 'clinic' })
  assert.equal(parseBareRefCode('MC-K7Q2M ค่ะ'), null)
})

test('HR link codes are separate from visit codes', () => {
  assert.equal(parseHrLinkCode('รับแจ้งเตือนตรวจสุขภาพพนักงาน (HR-ABC234)'), 'HR-ABC234')
  assert.equal(parseHrLinkCode('MC-K7Q2M'), null)
  assert.equal(parseRefCode('HR-ABC234'), null)
})

test('LINE links pre-fill the code where the webhook will look for it', () => {
  const url = refLineUrl('MC-K7Q2M', 'medcert')
  assert.ok(url.startsWith('https://line.me/R/oaMessage/%40roogondee/?'))
  const text = decodeURIComponent(url.split('?')[1])
  assert.deepEqual(parseRefCode(text), { code: 'MC-K7Q2M', program: 'medcert' })
  assert.equal(parseHrLinkCode(decodeURIComponent(hrLinkLineUrl('HR-ABC234').split('?')[1])), 'HR-ABC234')
})
