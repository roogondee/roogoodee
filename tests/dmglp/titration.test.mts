import { test } from 'node:test'
import assert from 'node:assert/strict'
import { titrationFlags } from '../../src/lib/dmglp/titration.ts'

test('increase before 28 days on current dose flags DOSE_INCREASE_TOO_EARLY', () => {
  const f = titrationFlags({ drug: 'mounjaro', currentDoseMg: 2.5, daysOnCurrentDose: 20, newDoseMg: 5, daysSinceLastDispense: 20 })
  assert.deepEqual(f, ['DOSE_INCREASE_TOO_EARLY'])
})

test('increase after 28 days with one step up has no flags', () => {
  const f = titrationFlags({ drug: 'mounjaro', currentDoseMg: 2.5, daysOnCurrentDose: 28, newDoseMg: 5, daysSinceLastDispense: 28 })
  assert.deepEqual(f, [])
})

test('jumping more than one step flags SKIPPED_STEP', () => {
  const f = titrationFlags({ drug: 'wegovy', currentDoseMg: 0.25, daysOnCurrentDose: 40, newDoseMg: 1, daysSinceLastDispense: 30 })
  assert.deepEqual(f, ['SKIPPED_STEP'])
})

test('keeping or lowering the dose never flags early/skipped', () => {
  assert.deepEqual(titrationFlags({ drug: 'wegovy', currentDoseMg: 1, daysOnCurrentDose: 5, newDoseMg: 1, daysSinceLastDispense: 5 }), [])
  assert.deepEqual(titrationFlags({ drug: 'wegovy', currentDoseMg: 1, daysOnCurrentDose: 5, newDoseMg: 0.5, daysSinceLastDispense: 5 }), [])
})

test('last dispense more than 14 days overdue flags LONG_GAP', () => {
  const f = titrationFlags({ drug: 'mounjaro', currentDoseMg: 5, daysOnCurrentDose: 60, newDoseMg: 5, daysSinceLastDispense: 43 })
  assert.deepEqual(f, ['LONG_GAP'])
  const ok = titrationFlags({ drug: 'mounjaro', currentDoseMg: 5, daysOnCurrentDose: 60, newDoseMg: 5, daysSinceLastDispense: 42 })
  assert.deepEqual(ok, [])
})

test('a dose outside the step ladder is flagged, not silently accepted', () => {
  assert.deepEqual(titrationFlags({ drug: 'mounjaro', currentDoseMg: null, daysOnCurrentDose: null, newDoseMg: 12.5, daysSinceLastDispense: null }), ['UNKNOWN_STEP'])
  assert.deepEqual(titrationFlags({ drug: 'wegovy', currentDoseMg: null, daysOnCurrentDose: null, newDoseMg: 0.1, daysSinceLastDispense: null }), ['DECREASE_BELOW_MIN'])
})

test('starting dose (no current dose) has no titration flags', () => {
  assert.deepEqual(titrationFlags({ drug: 'wegovy', currentDoseMg: null, daysOnCurrentDose: null, newDoseMg: 0.25, daysSinceLastDispense: null }), [])
})
