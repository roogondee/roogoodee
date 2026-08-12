// Structural guard for src/lib/i18n/locales/*.ts — run via `npm run check:i18n`
// (wired into `prebuild`, so a broken locale file fails the Vercel build).
//
// th.ts is the canonical schema. For every other locale we walk leaf paths and flag:
//   - ORPHAN   key exists in the locale but not in th (catches mis-nested blocks
//              like the `about`-inside-`nav` bug — the stranded keys show up as
//              nav.about.* orphans)                                → always fatal
//   - TYPE     locale has an object where th has a string (or vice versa)
//                                                                  → always fatal
//   - MISSING  key exists in th but not in the locale
//              → fatal only for STRICT locales; reported for the rest, because
//                the runtime deep-merge in locales/index.ts falls back to Thai.
//
// Node >= 22.18 runs this directly (type stripping); no build step needed.

import th from '../src/lib/i18n/locales/th.ts'
import en from '../src/lib/i18n/locales/en.ts'
import my from '../src/lib/i18n/locales/my.ts'
import lo from '../src/lib/i18n/locales/lo.ts'
import km from '../src/lib/i18n/locales/km.ts'
import zh from '../src/lib/i18n/locales/zh.ts'
import vi from '../src/lib/i18n/locales/vi.ts'
import hi from '../src/lib/i18n/locales/hi.ts'
import ja from '../src/lib/i18n/locales/ja.ts'
import ko from '../src/lib/i18n/locales/ko.ts'

// Locales that must have full key parity with th (no missing keys allowed).
const STRICT = new Set(['en', 'my'])

type Dict = Record<string, unknown>
const locales: Record<string, Dict> = { en, my, lo, km, zh, vi, hi, ja, ko }

function leafPaths(obj: Dict, prefix = ''): Map<string, 'string' | 'object'> {
  const out = new Map<string, 'string' | 'object'>()
  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key
    if (value !== null && typeof value === 'object') {
      out.set(path, 'object')
      for (const [p, t] of leafPaths(value as Dict, path)) out.set(p, t)
    } else {
      out.set(path, 'string')
    }
  }
  return out
}

const thPaths = leafPaths(th as unknown as Dict)
let fatal = 0

for (const [code, dict] of Object.entries(locales)) {
  const paths = leafPaths(dict)
  const orphans: string[] = []
  const typeErrors: string[] = []
  const missing: string[] = []

  for (const [path, type] of paths) {
    const thType = thPaths.get(path)
    if (!thType) orphans.push(path)
    else if (thType !== type) typeErrors.push(`${path} (th: ${thType}, ${code}: ${type})`)
  }
  for (const path of thPaths.keys()) {
    if (!paths.has(path)) missing.push(path)
  }

  const strict = STRICT.has(code)
  const missingFatal = strict && missing.length > 0
  if (orphans.length || typeErrors.length || missingFatal) fatal++

  if (orphans.length || typeErrors.length || missing.length) {
    console.log(`\n=== ${code}${strict ? ' (STRICT)' : ''} ===`)
    for (const p of orphans) console.log(`  ORPHAN   ${p}`)
    for (const p of typeErrors) console.log(`  TYPE     ${p}`)
    if (strict) for (const p of missing) console.log(`  MISSING! ${p}`)
    console.log(`  -> ${orphans.length} orphans, ${typeErrors.length} type errors, ${missing.length} missing${strict ? '' : ' (non-fatal, deep-merge falls back to th)'}`)
  }
}

if (fatal) {
  console.error(`\ncheck-locales: FAILED for ${fatal} locale(s). Orphan/type errors mean a mis-nested or mistyped block; STRICT locales (${[...STRICT].join(', ')}) must also have every th key.`)
  process.exit(1)
}
console.log('check-locales: OK')
