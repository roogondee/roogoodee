// Website ref codes — the bridge between an ad click on a landing page and a
// patient who actually walks into W Medical.
//
//   MC-K7Q2M  /medical-certificate   (certificate seekers)
//   CL-K7Q2M  /clinic                (people searching "คลินิกใกล้ฉัน")
//   HR-K7Q2MX link an employer (HR) account to a LINE chat for renewal alerts
//
// The landing mints one code per visit (src/app/api/ref/route.ts) and shows
// it on the page; the LINE button pre-fills it, the visitor can read it out
// on the phone, and staff type it at the counter — into the certificate
// admin on cert.roogondee.com (extra.ref_code) or the /admin/redeem screen.
// See src/lib/growth/ref-visits.ts for what happens to it.
//
// No imports on purpose: pure, so tests/growth/refcodes.test.mts can run it under
// `node --test` without a bundler (same arrangement as src/lib/dmglp/*).

export type RefProgram = 'medcert' | 'clinic'

export const REF_PREFIX: Record<RefProgram, string> = {
  medcert: 'MC',
  clinic: 'CL',
}

// No 0/O, 1/I/L — codes get read out over the phone and typed by hand.
const ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ'
const VISIT_CODE_LEN = 5
const HR_CODE_LEN = 6

function randomChars(len: number, rand: () => number): string {
  let out = ''
  for (let i = 0; i < len; i++) out += ALPHABET[Math.floor(rand() * ALPHABET.length)]
  return out
}

export function newRefCode(program: RefProgram, rand: () => number = Math.random): string {
  return `${REF_PREFIX[program]}-${randomChars(VISIT_CODE_LEN, rand)}`
}

export function newHrLinkCode(rand: () => number = Math.random): string {
  return `HR-${randomChars(HR_CODE_LEN, rand)}`
}

const CHARS = `[${ALPHABET}]`
// Hyphen-minus plus the dashes phone keyboards and copy-paste produce.
const DASH = '[-\u2010\u2011\u2012\u2013\u2014\u2212]'
// In free text (a LINE message) the code needs its dash or a space — or, when
// typed run-together, a digit: without that rule ordinary words parse as
// codes ("CLASSES" is CL + ASSES, "CLUSTER" is CL + USTER).
const VISIT_RE = new RegExp(
  `\\b(MC|CL)(?:\\s*${DASH}\\s*|\\s+|(?=${CHARS}{0,4}\\d))(${CHARS}{${VISIT_CODE_LEN}})\\b`,
)
// HR codes only ever arrive from our own pre-filled button, so the dash is
// required ("HR number" must not parse as HR-NUMBER).
const HR_RE = new RegExp(`\\bHR\\s*${DASH}\\s*(${CHARS}{${HR_CODE_LEN}})\\b`)
// A field that holds nothing but the code (redeem screen, the certificate
// admin's ref field): anchored, so the dash can be optional.
const BARE_RE = new RegExp(`^(MC|CL)\\s*(?:${DASH}\\s*)?(${CHARS}{${VISIT_CODE_LEN}})$`)

// Normalises what staff or visitors type: lower case, spaces, a missing or
// spaced dash, full-width forms pasted from a phone keyboard.
function normalise(text: string): string {
  return (text || '').normalize('NFKC').toUpperCase()
}

function toRef(m: RegExpMatchArray | null): { code: string; program: RefProgram } | null {
  if (!m) return null
  const program: RefProgram = m[1] === 'MC' ? 'medcert' : 'clinic'
  return { code: `${m[1]}-${m[2]}`, program }
}

// Finds a code anywhere in a message ("สนใจ… (MC-K7Q2M)").
export function parseRefCode(text: string): { code: string; program: RefProgram } | null {
  return toRef(normalise(text).match(VISIT_RE))
}

// Reads an input that should be only a code ("mc k7q2m", "MCK7Q2M").
export function parseBareRefCode(text: string): { code: string; program: RefProgram } | null {
  return toRef(normalise(text).trim().match(BARE_RE))
}

export function parseHrLinkCode(text: string): string | null {
  const m = normalise(text).match(HR_RE)
  return m ? `HR-${m[1]}` : null
}

export function isRefCode(text: string): boolean {
  return parseBareRefCode(text) !== null
}

// What the LINE button pre-fills. The code sits in brackets at the end so
// the visitor can type their own question before sending and the webhook
// still finds it.
export const REF_LINE_TEXT: Record<RefProgram, string> = {
  medcert: 'สนใจตรวจรับใบรับรองแพทย์',
  clinic: 'ต้องการนัดพบแพทย์ / สอบถามบริการ',
}

export function refLineUrl(code: string, program: RefProgram, oaId = '@roogondee'): string {
  const text = `${REF_LINE_TEXT[program]} (${code})`
  return `https://line.me/R/oaMessage/${encodeURIComponent(oaId)}/?${encodeURIComponent(text)}`
}

export function hrLinkLineUrl(code: string, oaId = '@roogondee'): string {
  const text = `รับแจ้งเตือนตรวจสุขภาพพนักงาน (${code})`
  return `https://line.me/R/oaMessage/${encodeURIComponent(oaId)}/?${encodeURIComponent(text)}`
}
