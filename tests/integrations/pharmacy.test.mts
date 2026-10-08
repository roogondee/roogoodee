import { test, type TestContext } from 'node:test'
import assert from 'node:assert/strict'
import {
  LOOKUP_PATH,
  failureForStatus,
  hnForDmglp,
  lookupPharmacyPatients,
  parseLookupResponse,
  pharmacyConfig,
  preparePhones,
} from '../../src/lib/integrations/pharmacy.ts'

const ENV = { PHARMACY_API_URL: 'https://pharmacy.example/', PHARMACY_API_KEY: 'pk_test_123' }

const ROWS = [
  { hn: 'HN-2026-00012', original_hn: null, name: 'สมชาย ใจดี', phone: '0812345678' },
  { hn: '6612345', original_hn: 6612345, name: 'สมหญิง ใจดี', phone: '0812345678' },
]

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

// ---------------------------------------------------------------------------
// Response parser

test('a well-formed answer is kept exactly', () => {
  assert.deepEqual(parseLookupResponse({ patients: ROWS }), ROWS)
  assert.deepEqual(parseLookupResponse({ patients: [] }), [])
})

test('malformed rows are dropped, not repaired', () => {
  const good = ROWS[0]
  const rows = [
    null, 'HN-1', 42, [good],
    { ...good, hn: undefined }, { ...good, hn: '' }, { ...good, hn: '   ' }, { ...good, hn: 12 },
    { ...good, hn: 'H'.repeat(41) },                       // would be stored clipped — a different HN
    { ...good, hn: 'X1', original_hn: '6612345' },         // number in the contract, not a string
    { ...good, hn: 'X2', original_hn: 12.5 },
    { ...good, hn: 'X3', original_hn: -1 },
    { ...good, hn: 'X4', original_hn: 0 },
    { ...good, hn: 'X5', original_hn: Number.MAX_SAFE_INTEGER + 2 },
    { ...good, hn: 'X6', name: '' }, { ...good, hn: 'X7', name: 7 }, { ...good, hn: 'X8', name: undefined },
    { ...good, hn: 'X9', phone: undefined }, { ...good, hn: 'X10', phone: 812345678 },
    good,
  ]
  assert.deepEqual(parseLookupResponse({ patients: rows }), [good])
})

test('rows are trimmed and clipped; unknown fields never come through', () => {
  const [row] = parseLookupResponse({
    patients: [{ hn: '  HN-1  ', name: `  ${'ก'.repeat(200)}  `, phone: ' 0812345678 ', diagnoses: ['E11.9'], idCard: '1100000000000' }],
  }) ?? []
  assert.deepEqual(Object.keys(row).sort(), ['hn', 'name', 'original_hn', 'phone'])
  assert.equal(row.hn, 'HN-1')
  assert.equal(row.name.length, 120)
  assert.equal(row.phone, '0812345678')
  // An omitted original_hn reads as "not imported from HIS".
  assert.equal(row.original_hn, null)
})

test('an answer that is not { patients: [...] } is rejected whole', () => {
  for (const body of [null, undefined, 'patients', 42, [], ROWS, {}, { patients: null }, { patients: 'x' }, { patients: {} }, { data: ROWS }]) {
    assert.equal(parseLookupResponse(body), null, JSON.stringify(body))
  }
})

test('at most ten rows, a patient matched by two numbers listed once', () => {
  const many = Array.from({ length: 15 }, (_, i) => ({ hn: `HN-${i}`, original_hn: null, name: `P${i}`, phone: '0812345678' }))
  const ten = parseLookupResponse({ patients: many })
  assert.equal(ten?.length, 10)
  assert.deepEqual(ten?.map(p => p.hn), many.slice(0, 10).map(p => p.hn))

  const twice = parseLookupResponse({ patients: [ROWS[0], { ...ROWS[0], phone: '0899999999' }, ROWS[1]] })
  assert.deepEqual(twice?.map(p => p.hn), ['HN-2026-00012', '6612345'])
})

test('picking fills the hospital HN when there is one, else the pharmacy id', () => {
  assert.equal(hnForDmglp(ROWS[1]), '6612345')
  assert.equal(hnForDmglp(ROWS[0]), 'HN-2026-00012')
})

// ---------------------------------------------------------------------------
// Request phones

test('phones are normalised and deduplicated', () => {
  assert.deepEqual(preparePhones(['+66 81-234-5678', '081-234-5678', '0812345678']), ['0812345678'])
  assert.deepEqual(preparePhones(['02-123-4567']), ['021234567'])
})

test('invalid phones and non-strings are dropped', () => {
  assert.deepEqual(preparePhones(['', 'abc', '12345', 'U1234567890abcdef', 'fb:123456789012', null, undefined, 42, '0899999999']), ['0899999999'])
  assert.deepEqual(preparePhones([]), [])
  assert.deepEqual(preparePhones(['-', '  ']), [])
})

test('one field holding several numbers is split the way the pharmacy splits', () => {
  assert.deepEqual(preparePhones(['081-234-5678 / 089-999-9999']), ['0812345678', '0899999999'])
  assert.deepEqual(preparePhones(['0811111111,0822222222;0833333333|0844444444\n0855555555']),
    ['0811111111', '0822222222', '0833333333', '0844444444', '0855555555'])
})

test('at most five phones go out', () => {
  const seven = ['0811111111', '0822222222', '0833333333', '0844444444', '0855555555', '0866666666', '0877777777']
  assert.deepEqual(preparePhones(seven), seven.slice(0, 5))
})

// ---------------------------------------------------------------------------
// Configuration

test('config needs both variables and an https URL (http only for localhost)', t => {
  const warn = t.mock.method(console, 'warn', () => {})
  assert.deepEqual(pharmacyConfig(ENV), { url: `https://pharmacy.example${LOOKUP_PATH}`, key: 'pk_test_123' })
  assert.equal(pharmacyConfig({ ...ENV, PHARMACY_API_URL: 'http://localhost:4000' })?.url, `http://localhost:4000${LOOKUP_PATH}`)
  // Unset: off, quietly.
  assert.equal(pharmacyConfig({}), null)
  assert.equal(pharmacyConfig({ PHARMACY_API_URL: ENV.PHARMACY_API_URL }), null)
  assert.equal(pharmacyConfig({ PHARMACY_API_KEY: ENV.PHARMACY_API_KEY }), null)
  assert.equal(pharmacyConfig({ ...ENV, PHARMACY_API_KEY: '  ' }), null)
  assert.equal(warn.mock.callCount(), 0)
  // Set but unusable: off, with a warning that names the variable (not its value).
  assert.equal(pharmacyConfig({ ...ENV, PHARMACY_API_URL: 'http://pharmacy.example' }), null)
  assert.equal(pharmacyConfig({ ...ENV, PHARMACY_API_URL: 'not a url' }), null)
  assert.equal(warn.mock.callCount(), 2)
  assert.match(String(warn.mock.calls[0].arguments[0]), /PHARMACY_API_URL/)
  assert.doesNotMatch(JSON.stringify(warn.mock.calls.map(c => c.arguments)), /pk_test|pharmacy\.example/)
})

// ---------------------------------------------------------------------------
// The call, with a stubbed global fetch

type FetchCall = { url: string; init: RequestInit }

// One stub per test, restored afterwards; respondWith() swaps the answer
// without stacking stubs.
function stubFetch(t: TestContext, respond: () => Response | Promise<Response>) {
  const calls: FetchCall[] = []
  let responder = respond
  const original = globalThis.fetch
  globalThis.fetch = (async (url: string | URL | Request, init: RequestInit = {}) => {
    calls.push({ url: String(url), init })
    return responder()
  }) as typeof fetch
  t.after(() => { globalThis.fetch = original })
  return { calls, respondWith: (next: () => Response | Promise<Response>) => { responder = next } }
}

test('not configured → not_configured and no request at all', async t => {
  t.mock.method(console, 'warn', () => {})
  const { calls } = stubFetch(t, () => json({ patients: ROWS }))
  assert.deepEqual(await lookupPharmacyPatients(['0812345678'], { env: {} }), { ok: false, reason: 'not_configured' })
  assert.deepEqual(await lookupPharmacyPatients(['0812345678'], { env: { PHARMACY_API_URL: ENV.PHARMACY_API_URL } }), { ok: false, reason: 'not_configured' })
  assert.deepEqual(await lookupPharmacyPatients(['0812345678'], { env: { ...ENV, PHARMACY_API_URL: 'http://pharmacy.example' } }), { ok: false, reason: 'not_configured' })
  assert.equal(calls.length, 0)
})

test('no valid phone → empty answer and no request', async t => {
  const { calls } = stubFetch(t, () => json({ patients: ROWS }))
  assert.deepEqual(await lookupPharmacyPatients(['', 'abc'], { env: ENV }), { ok: true, patients: [] })
  assert.equal(calls.length, 0)
})

test('the request follows the contract', async t => {
  const { calls } = stubFetch(t, () => json({ patients: ROWS }))
  const result = await lookupPharmacyPatients(['+66 81-234-5678', '089-999-9999', '0812345678'], { env: ENV })
  assert.deepEqual(result, { ok: true, patients: ROWS })

  assert.equal(calls.length, 1)
  const { url, init } = calls[0]
  assert.equal(url, 'https://pharmacy.example/api/integrations/v1/patients/lookup')
  assert.equal(init.method, 'POST')
  assert.deepEqual(init.headers, { 'content-type': 'application/json', 'x-api-key': 'pk_test_123' })
  assert.deepEqual(JSON.parse(String(init.body)), { phones: ['0812345678', '0899999999'] })
  assert.ok(init.signal instanceof AbortSignal)
  assert.equal(init.redirect, 'manual')
  assert.equal(init.cache, 'no-store')
})

test('status codes map to failures', async t => {
  t.mock.method(console, 'warn', () => {})
  const stub = stubFetch(t, () => json({ patients: ROWS }))
  const cases: Array<[number, string]> = [
    [400, 'bad_response'], [401, 'unauthorized'], [403, 'unauthorized'], [404, 'bad_response'],
    [301, 'bad_response'], [408, 'unavailable'], [429, 'rate_limited'],
    [500, 'unavailable'], [502, 'unavailable'], [503, 'unavailable'],
  ]
  for (const [status, reason] of cases) {
    assert.equal(failureForStatus(status), reason, `status ${status}`)
    stub.respondWith(() => json({ message: 'nope' }, status))
    assert.deepEqual(await lookupPharmacyPatients(['0812345678'], { env: ENV }), { ok: false, reason }, `status ${status}`)
  }
  assert.equal(failureForStatus(200), null)
  assert.equal(stub.calls.length, cases.length)
})

test('network errors and timeouts → unavailable', async t => {
  t.mock.method(console, 'warn', () => {})
  const stub = stubFetch(t, () => { throw new TypeError('fetch failed') })
  assert.deepEqual(await lookupPharmacyPatients(['0812345678'], { env: ENV }), { ok: false, reason: 'unavailable' })
  stub.respondWith(() => { throw new DOMException('The operation was aborted due to timeout', 'TimeoutError') })
  assert.deepEqual(await lookupPharmacyPatients(['0812345678'], { env: ENV }), { ok: false, reason: 'unavailable' })
})

test('a 200 that is not the contract → bad_response', async t => {
  t.mock.method(console, 'warn', () => {})
  const stub = stubFetch(t, () => json({ patients: ROWS }))
  const bodies = [
    () => new Response('<html>not json</html>', { status: 200 }),
    () => json({ patients: 'x' }),
    () => json(ROWS),
    () => new Response(JSON.stringify({ patients: ROWS, padding: 'x'.repeat(70 * 1024) }), { status: 200 }),
  ]
  for (const body of bodies) {
    stub.respondWith(body)
    assert.deepEqual(await lookupPharmacyPatients(['0812345678'], { env: ENV }), { ok: false, reason: 'bad_response' })
  }
})

test('failure logs never carry the phone, a name, an HN or the key', async t => {
  const warn = t.mock.method(console, 'warn', () => {})
  const stub = stubFetch(t, () => json({ message: 'invalid phone 0812345678' }, 400))
  await lookupPharmacyPatients(['0812345678'], { env: ENV })
  stub.respondWith(() => { throw new TypeError('fetch failed for 0812345678') })
  await lookupPharmacyPatients(['0812345678'], { env: ENV })
  stub.respondWith(() => json({ patients: `${ROWS[0].name} ${ROWS[0].hn} 0812345678` }))
  await lookupPharmacyPatients(['0812345678'], { env: ENV })

  assert.equal(warn.mock.callCount(), 3)
  const logged = JSON.stringify(warn.mock.calls.map(c => c.arguments))
  assert.doesNotMatch(logged, /0812345678|สมชาย|HN-2026|pk_test/)
})
