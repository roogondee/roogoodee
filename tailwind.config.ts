import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        forest: '#1B4332',
        sage:   '#2D6A4F',
        mint:   '#52B788',
        leaf:   '#95D5B2',
        cream:  '#F8F4EF',
        warm:   '#F4E9D8',
        gold:   '#C9973B',
        dark:   '#0D2015',
        rtext:  '#2C3E28',
        muted:  '#6B8C72',
      },
      fontFamily: {
        sarabun:  ['var(--font-sarabun)', 'sans-serif'],
        playfair: ['var(--font-display)', 'var(--font-sarabun)', 'serif'],
      },
      // Decorative motion. Every one of these is switched off under
      // prefers-reduced-motion in globals.css. None animates opacity from 0,
      // so the hero text/image stays an LCP candidate from the first paint.
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%':      { transform: 'translateY(-10px)' },
        },
        blob: {
          '0%, 100%': { transform: 'translate(0, 0) scale(1)' },
          '33%':      { transform: 'translate(24px, -32px) scale(1.08)' },
          '66%':      { transform: 'translate(-18px, 18px) scale(0.95)' },
        },
        'rise-in': {
          from: { transform: 'translateY(18px) scale(0.98)' },
          to:   { transform: 'translateY(0) scale(1)' },
        },
        shine: {
          from: { transform: 'translateX(-120%) skewX(-20deg)' },
          to:   { transform: 'translateX(320%) skewX(-20deg)' },
        },
      },
      animation: {
        float:     'float 6s ease-in-out infinite',
        'float-slow': 'float 9s ease-in-out infinite',
        blob:      'blob 18s ease-in-out infinite',
        'rise-in': 'rise-in 0.9s cubic-bezier(0.2, 0.7, 0.2, 1) both',
        shine:     'shine 3.5s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
export default config
