import { test } from 'node:test'
import assert from 'node:assert/strict'
import { detectChannel, generateRefCode, lineDeepLink, parseRefCode } from '../../src/lib/dmglp/attribution.ts'

test('ref codes look like DM-4821', () => {
  assert.match(generateRefCode(() => 0), /^DM-1000$/)
  assert.match(generateRefCode(() => 0.9999), /^DM-9999$/)
})

test('ref code is parsed out of a chat message', () => {
  assert.equal(parseRefCode('สนใจคลินิกเบาหวาน (DM-4821)'), 'DM-4821')
  assert.equal(parseRefCode('dm-0042 ครับ'), 'DM-0042')
  assert.equal(parseRefCode('สวัสดีครับ'), null)
  assert.equal(parseRefCode('RGD-GLP1-ABC123'), null)
})

test('LINE deep link carries the ref code in the prefilled message', () => {
  const url = lineDeepLink('DM-4821')
  assert.ok(url.startsWith('https://line.me/R/oaMessage/%40roogondee/?'))
  assert.equal(decodeURIComponent(url.split('?')[1]), 'สนใจคลินิกเบาหวาน (DM-4821)')
})

test('channel: gclid wins, then utm_source', () => {
  assert.equal(detectChannel({ gclid: 'x', utm_source: 'facebook' }), 'google')
  assert.equal(detectChannel({ utm_source: 'fb' }), 'facebook')
  assert.equal(detectChannel({ ref: 'CLINIC1' }), 'partner')
  assert.equal(detectChannel({}), 'direct')
})
