import { test } from 'node:test'
import assert from 'node:assert/strict'
import { MOVED_TO_HOSPITAL, hospitalUrlFor } from '../../src/config/moved-to-hospital.ts'

test('a moved post points to the Thai article on the hospital site', () => {
  const moved = { 'egfr-test': 'egfr-test', 'ฟอกไต-vs': 'hemodialysis-vs-peritoneal-dialysis' }
  assert.equal(hospitalUrlFor('egfr-test', moved), 'https://www.2uhospital.com/th/articles/egfr-test')
  assert.equal(hospitalUrlFor('ฟอกไต-vs', moved), 'https://www.2uhospital.com/th/articles/hemodialysis-vs-peritoneal-dialysis')
  assert.equal(hospitalUrlFor('not-moved', moved), null)
})

test('a malformed target never becomes a redirect', () => {
  assert.equal(hospitalUrlFor('x', { x: 'https://evil.example' }), null)
  assert.equal(hospitalUrlFor('x', { x: '' }), null)
})

test('every configured target is an ASCII hospital slug', () => {
  for (const [from, to] of Object.entries(MOVED_TO_HOSPITAL)) {
    assert.match(to, /^[a-z0-9-]+$/, from)
  }
})
