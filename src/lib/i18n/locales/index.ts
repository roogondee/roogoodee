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

// Use Thai as the canonical type, but allow other locales to have compatible structure
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Translations = Record<string, any> & typeof th

const dictionaries: Record<string, typeof th> = {
  th,
  en: en as unknown as typeof th,
  my: my as unknown as typeof th,
  lo: lo as unknown as typeof th,
  km: km as unknown as typeof th,
  zh: zh as unknown as typeof th,
  vi: vi as unknown as typeof th,
  hi: hi as unknown as typeof th,
  ja: ja as unknown as typeof th,
  ko: ko as unknown as typeof th,
}

export default dictionaries
