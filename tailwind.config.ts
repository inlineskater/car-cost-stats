import type { Config } from 'tailwindcss'

// Notion-inspired palette: warm greys, hairline borders, muted accent colors.
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: '#37352f',   // primary text
          muted: '#787774',     // secondary text
          faint: '#9b9a97',     // tertiary / placeholder
        },
        line: {
          DEFAULT: '#e9e9e7',   // borders, dividers
          soft: '#f1f1ef',      // row separators, chart grid
        },
        surface: {
          DEFAULT: '#ffffff',
          sidebar: '#f7f7f5',
          hover: '#efefed',
          subtle: '#fbfbfa',
        },
        accent: {
          DEFAULT: '#2383e2',
          hover: '#0077d4',
        },
        lpg: {
          DEFAULT: '#448361',
          light: '#dbeddb',
          dark: '#2b593f',
        },
        petrol: {
          DEFAULT: '#337ea9',
          light: '#d3e5ef',
          dark: '#28456c',
        },
      },
      fontFamily: {
        sans: [
          'ui-sans-serif',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Helvetica',
          'Inter',
          'sans-serif',
        ],
      },
      boxShadow: {
        pop: 'rgba(15,15,15,0.05) 0 0 0 1px, rgba(15,15,15,0.1) 0 3px 6px, rgba(15,15,15,0.2) 0 9px 24px',
      },
    },
  },
  plugins: [],
} satisfies Config
