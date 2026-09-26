import { test } from 'node:test'
import assert from 'node:assert/strict'
import { computeBmi, computeEligibility, type ScreeningInput } from '../../src/lib/dmglp/eligibility.ts'

const base: ScreeningInput = {
  weight_kg: 90, height_cm: 170, has_t2dm: false, comorbidities: [],
  pregnant_or_planning: false, breastfeeding: false, mtc_men2_history: false,
  pancreatitis_history: false, gallbladder_history: false, gastroparesis: false,
  on_insulin: false, on_sulfonylurea: false, retinopathy: false,
}

test('BMI = weight / height²', () => {
  assert.equal(computeBmi(90, 170), 31.1)
  assert.equal(computeBmi(null, 170), null)
  assert.equal(computeBmi(90, 0), null)
})

test('BMI >= 30 is eligible (obesity)', () => {
  const r = computeEligibility(base)
  assert.equal(r.status, 'eligible')
  assert.deepEqual(r.indications, ['obesity'])
  assert.deepEqual(r.flags, [])
})

test('BMI 27-30 needs a weight-related comorbidity', () => {
  const noComorb = computeEligibility({ ...base, weight_kg: 80 }) // bmi 27.7
  assert.equal(noComorb.status, 'ineligible')
  assert.ok(noComorb.flags.includes('NO_INDICATION'))
  const withHt = computeEligibility({ ...base, weight_kg: 80, comorbidities: ['ht'] })
  assert.equal(withHt.status, 'eligible')
  assert.deepEqual(withHt.indications, ['overweight_with_comorbidity'])
})

test('type 2 diabetes is an indication regardless of BMI', () => {
  const r = computeEligibility({ ...base, weight_kg: 60, has_t2dm: true })
  assert.equal(r.status, 'eligible')
  assert.deepEqual(r.indications, ['t2dm'])
})

test('pregnancy / breastfeeding / MTC-MEN2 history block prescription', () => {
  assert.equal(computeEligibility({ ...base, pregnant_or_planning: true }).status, 'ineligible')
  assert.equal(computeEligibility({ ...base, breastfeeding: true }).status, 'ineligible')
  const r = computeEligibility({ ...base, mtc_men2_history: true, has_t2dm: true })
  assert.equal(r.status, 'ineligible')
  assert.ok(r.flags.includes('CONTRA_MTC_MEN2'))
})

test('cautions allow but require review', () => {
  const r = computeEligibility({ ...base, on_insulin: true, retinopathy: true })
  assert.equal(r.status, 'needs_review')
  assert.deepEqual(r.flags, ['CAUTION_HYPO_RISK', 'CAUTION_RETINOPATHY'])
})

test('rule thresholds are configurable', () => {
  const r = computeEligibility({ ...base, weight_kg: 80 }, { obesity_bmi: 27, overweight_bmi: 25 })
  assert.equal(r.status, 'eligible')
})
