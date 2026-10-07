import { test } from 'node:test'
import assert from 'node:assert/strict'
import { calculateRefund, installmentPlan, programBalance, recalculateInstalments } from '../../src/lib/dmglp/refund.ts'

const PRICES = { 'SVC-OPD': 250, 'SVC-SPEC': 800, 'SVC-FU': 400, 'LAB-BASE': 1500, 'LAB-Q3M': 450 }

test('acceptance: PLUS 15,900 paid, used D0 specialist + baseline labs → refund 13,350', () => {
  const r = calculateRefund(15900, [
    { item_code: 'SVC-OPD', qty: 1 },
    { item_code: 'SVC-SPEC', qty: 1 },
    { item_code: 'LAB-BASE', qty: 1 },
  ], PRICES)
  assert.equal(r.usedValue, 2550)
  assert.equal(r.refund, 13350)
})

test('refund floors at zero', () => {
  const r = calculateRefund(1000, [{ item_code: 'SVC-SPEC', qty: 3 }], PRICES)
  assert.equal(r.refund, 0)
})

test('unknown price codes are reported, not silently zero', () => {
  const r = calculateRefund(5000, [{ item_code: 'SVC-CGM', qty: 1 }], PRICES)
  assert.deepEqual(r.missingPrices, ['SVC-CGM'])
})

test('program balance = entitlement − usage, never negative', () => {
  const b = programBalance([{ item_code: 'SVC-SPEC', qty: 3 }, { item_code: 'SVC-FU', qty: 4 }], [{ item_code: 'SVC-SPEC', qty: 1 }, { item_code: 'SVC-FU', qty: 5 }])
  assert.deepEqual(b, [
    { item_code: 'SVC-SPEC', entitled: 3, used: 1, remaining: 2 },
    { item_code: 'SVC-FU', entitled: 4, used: 5, remaining: 0 },
  ])
})

test('0% × 6 instalments sum to the price, monthly due dates', () => {
  const plan = installmentPlan(7900, 6, '2026-11-02')
  assert.equal(plan.length, 6)
  assert.equal(plan.reduce((s, p) => s + p.amount, 0).toFixed(2), '7900.00')
  assert.equal(plan[0].due_date, '2026-11-02')
  assert.equal(plan[5].due_date, '2027-04-02')
})

test('cancelled program: pending instalments shrink to match services used', () => {
  const inst = [
    { seq: 1, amount: 2650, status: 'paid' },
    { seq: 2, amount: 2650, status: 'due' },
    { seq: 3, amount: 2650, status: 'due' },
  ]
  const out = recalculateInstalments(inst, 4000)
  assert.equal(out[0].amount, 2650)
  assert.equal(out[1].amount, 1350)
  assert.equal(out[2].status, 'cancelled')
})
