import th from './th'
import en from './en'
import my from './my'
import lo from './lo'
import km from './km'
import zh from './zh'
import vi from './vi'
import hi from './hi'
import ja from './ja'
import ko from './ko'

// Thai is the canonical schema. Every other locale is deep-merged over it once
// at module load, so a key that a locale file is missing (or has as an empty
// string / wrong type) falls back to the Thai text instead of rendering blank
// or crashing on `t.section.key` access. `scripts/check-locales.mts` (run by
// `npm run build` via `prebuild`) keeps the files structurally honest.
export type Translations = typeof th

type Dict = Record<string, unknown>

function deepMerge(base: Dict, override: Dict): Dict {
  const out: Dict = { ...base }
  for (const key of Object.keys(override)) {
    const b = base[key]
    const o = override[key]
    if (b && o && typeof b === 'object' && typeof o === 'object') {
      out[key] = deepMerge(b as Dict, o as Dict)
    } else if (typeof o === 'string' && o.trim() !== '' && typeof b === 'string') {
      out[key] = o
    }
    // otherwise keep the Thai value (missing, empty, or mistyped override)
  }
  return out
}

function withThaiFallback(locale: Dict): Translations {
  return deepMerge(th as unknown as Dict, locale) as Translations
}

const dictionaries: Record<string, Translations> = {
  th,
  en: withThaiFallback(en),
  my: withThaiFallback(my),
  lo: withThaiFallback(lo),
  km: withThaiFallback(km),
  zh: withThaiFallback(zh),
  vi: withThaiFallback(vi),
  hi: withThaiFallback(hi),
  ja: withThaiFallback(ja),
  ko: withThaiFallback(ko),
}

export default dictionaries
