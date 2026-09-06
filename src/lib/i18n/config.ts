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
