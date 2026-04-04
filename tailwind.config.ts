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
        sarabun:  ['Sarabun', 'sans-serif'],
        playfair: ['"Playfair Display"', 'serif'],
      },
    },
  },
  plugins: [],
}
export default config
