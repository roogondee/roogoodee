import { Sarabun, Playfair_Display, Noto_Sans_Myanmar, Noto_Sans_Lao } from 'next/font/google'

// Fonts were loaded with a CSS @import to fonts.googleapis.com at the top of
// globals.css. That is the slowest possible arrangement: the browser has to
// download and parse the app's CSS chunk before it can even discover the font
// URL, then make two more hops (fonts.googleapis.com, then fonts.gstatic.com)
// before any text can paint — and none of it is visible to the preload scanner.
// next/font self-hosts the files, emits the preload links at build time, and
// removes both third-party round trips. Killing that chain, not the byte count,
// is where the first-paint win comes from.
//
// next/font requires module-scope initialisation with literal options, so every
// face is declared here. All of them are attached to <html> unconditionally;
// which one actually downloads is decided by CSS (see globals.css) — a custom
// property costs nothing, a font file is only fetched when a rendered element
// matches the family.

export const sarabun = Sarabun({
  // Vietnamese is NOT included: next/font preloads every declared subset, so
  // adding it would make every Thai visitor download faces they never render.
  // Vietnamese diacritics fall back to the system face, same as before.
  subsets: ['thai', 'latin'],
  // 300 was requested but never used (zero `font-light` in the codebase);
  // 500 backs Tailwind's font-medium, which is used in 86 places.
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-sarabun',
})

export const playfair = Playfair_Display({
  subsets: ['latin'],
  style: ['normal', 'italic'],
  display: 'swap',
  variable: '--font-display',
  // Playfair carries no Thai or Burmese glyphs, so it is never the LCP element
  // on these pages — the headline text falls to Sarabun. Not worth a preload.
  preload: false,
})

// Sarabun has no Burmese or Lao glyphs, so those scripts were falling back to
// whatever the handset happened to have. preload: false means the @font-face
// rule ships but no <link rel=preload> is emitted, so the file is fetched only
// when a rendered element matches — a Thai visitor never pays for it.
export const notoMyanmar = Noto_Sans_Myanmar({
  subsets: ['myanmar'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  preload: false,
  variable: '--font-myanmar',
})

export const notoLao = Noto_Sans_Lao({
  subsets: ['lao'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  preload: false,
  variable: '--font-lao',
})

// Khmer/Devanagari/CJK are deliberately left to the system: those faces ship on
// essentially every handset, and a CJK webfont is megabytes even subsetted.
export const fontVariables = [
  sarabun.variable,
  playfair.variable,
  notoMyanmar.variable,
  notoLao.variable,
].join(' ')
