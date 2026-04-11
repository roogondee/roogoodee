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

// Deep convert all literal string types to string
type DeepString<T> = {
  [K in keyof T]: T[K] extends string ? string : DeepString<T[K]>
}

export type Translations = DeepString<typeof th>

const dictionaries: Record<string, Translations> = {
  th,
  en,
  my,
  lo,
  km,
  zh,
  vi,
  hi,
  ja,
  ko,
}

export default dictionaries
