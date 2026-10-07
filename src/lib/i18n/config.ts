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

// Request header the middleware sets and the root layout reads, so the server
// can render the HTML in the visitor's language. It lives here rather than in
// src/middleware.ts so the layout — a Node server component — does not pull the
// middleware module and its edge bindings into its graph just to get a string.
export const LOCALE_HEADER = "x-rgd-locale";

export function isValidLocale(code: string | null | undefined): code is LocaleCode {
  return !!code && locales.some((l) => l.code === code);
}

export function matchesPath(pathname: string, paths: readonly string[]): boolean {
  return paths.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

// Single source of truth for locale precedence, shared by the middleware (which
// decides what language the SSR HTML is written in) and the client provider.
// Keeping one implementation matters: when these drifted apart the server would
// render one language and the client would swap to another after hydration.
//
// Precedence: explicit choice > per-path override > browser language > Thai.
// `?lang=` and the cookie both mean "the visitor chose this", so the middleware
// passes whichever applies (?lang= first) into `explicit` rather than each
// needing its own branch here.
//
// Deliberate change from the old client-side version, which read only
// navigator.language: this negotiates the full q-sorted Accept-Language list,
// so a header like "id-ID,en;q=0.9" now resolves to `en` where it used to fall
// through to Thai. Better for a multilingual audience, and the ENGLISH_NOT_A_
// SIGNAL_PATHS rule still applies to each candidate in turn.
export function resolveLocale(opts: {
  pathname: string;
  explicit?: string | null;
  acceptLanguage?: string | null;
}): LocaleCode {
  if (isValidLocale(opts.explicit)) return opts.explicit;

  if (matchesPath(opts.pathname, THAI_FIRST_PATHS)) return defaultLocale;

  for (const tag of parseAcceptLanguage(opts.acceptLanguage)) {
    const base = tag.split("-")[0];
    if (base === "en" && matchesPath(opts.pathname, ENGLISH_NOT_A_SIGNAL_PATHS)) continue;
    if (isValidLocale(base)) return base;
  }

  return defaultLocale;
}

// "my-MM,my;q=0.9,en;q=0.8" -> ["my-MM", "my", "en"], highest q first.
// Also accepts a bare navigator.language ("my-MM") so the client can share it.
function parseAcceptLanguage(header: string | null | undefined): string[] {
  if (!header) return [];
  return header
    .split(",")
    .map((part) => {
      const [tag, ...params] = part.trim().split(";");
      const q = params.find((p) => p.trim().startsWith("q="));
      return { tag: tag.trim(), q: q ? parseFloat(q.split("=")[1]) || 0 : 1 };
    })
    .filter((e) => e.tag)
    .sort((a, b) => b.q - a.q)
    .map((e) => e.tag);
}
