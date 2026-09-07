export const locales = [
  { code: "th", label: "ไทย", flag: "🇹🇭" },
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "my", label: "မြန်မာ", flag: "🇲🇲" },
  { code: "lo", label: "ລາວ", flag: "🇱🇦" },
  { code: "km", label: "ខ្មែរ", flag: "🇰🇭" },
  { code: "zh", label: "中文", flag: "🇨🇳" },
  { code: "vi", label: "Tiếng Việt", flag: "🇻🇳" },
  { code: "hi", label: "हिन्दी", flag: "🇮🇳" },
  { code: "ja", label: "日本語", flag: "🇯🇵" },
  { code: "ko", label: "한국어", flag: "🇰🇷" },
] as const;

export type LocaleCode = (typeof locales)[number]["code"];

export const defaultLocale: LocaleCode = "th";

export const LOCALE_COOKIE = "rugondee-locale";

// Pages that must render in Thai unless the visitor has explicitly picked a
// language (cookie) or the URL forces one (?lang=). Browser language is
// skipped for these. /advice is a paid-search landing page for Thai-language
// queries; many phones in Thailand report navigator.language = "en", which
// used to flip the whole page (and the chat greeting) into English for a
// visitor who searched in Thai. The AI still replies in whatever language the
// visitor types — this only controls the page chrome and the first greeting.
export const THAI_FIRST_PATHS = ["/advice"] as const;

// Pages where a browser reporting English is not a real language signal, but
// any other language is. Same root cause as THAI_FIRST_PATHS — a large share
// of handsets in Thailand report navigator.language = "en" — with one
// difference: the foreign-worker pages are genuinely multilingual. A phone set
// to Burmese, Khmer, Lao, Chinese or Vietnamese belongs to a worker who reads
// that language, and those translations exist; "en" is the one value that is
// usually a default nobody chose, and it was flipping the whole MOU page into
// English for Thai employers searching in Thai.
//
// So on these paths: cookie wins, ?lang= wins, a non-English browser language
// wins, and English falls back to Thai. Ads targeting a specific nationality
// should link with ?lang=my / ?lang=km / ?lang=lo rather than rely on this.
export const ENGLISH_NOT_A_SIGNAL_PATHS = ["/foreign"] as const;
