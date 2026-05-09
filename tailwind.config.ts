import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        lpg: {
          DEFAULT: '#22c55e',
          light: '#bbf7d0',
          dark: '#15803d',
        },
        petrol: {
          DEFAULT: '#3b82f6',
          light: '#bfdbfe',
          dark: '#1d4ed8',
        },
      },
      fontFamily: {
        sans: [
          'Inter',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          'sans-serif',
        ],
      },
    },
  },
  plugins: [],
} satisfies Config
