import type { Config } from 'tailwindcss'

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    screens: {
      'xs': '475px',
      'sm': '640px',
      'md': '768px',
      'lg': '1024px',
      'xl': '1280px',
      '2xl': '1536px',
    },
    extend: {
      colors: {
        mondrian: {
          red: '#FF0000',
          blue: '#204A9E',
          yellow: '#FEED01',
          black: '#000000',
          white: '#FFFFFF',
        },
        brand: {
          solar: '#FFB000',
          frequency: '#4C1C8C',
          accent: '#7F3FBF',
        },
        rarity: {
          common: '#9ca3af',
          uncommon: '#10b981',
          epic: '#8b5cf6',
          legendary: '#f59e0b',
          monarch: '#d946ef',
        }
      },
      borderWidth: {
        '8': '8px',
        '12': '12px',
      },
      gridTemplateColumns: {
        'mondrian': 'repeat(auto-fill, minmax(300px, 1fr))',
      },
      animation: {
        'pulse-monarch': 'pulse-monarch 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'pulse-legendary': 'pulse-legendary 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'pulse-epic': 'pulse-epic 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        'pulse-monarch': {
          '0%, 100%': { opacity: '1', boxShadow: '0 0 15px rgba(217, 70, 239, 0.5)' },
          '50%': { opacity: '.8', boxShadow: '0 0 25px rgba(217, 70, 239, 0.8)' },
        },
        'pulse-legendary': {
          '0%, 100%': { opacity: '1', boxShadow: '0 0 15px rgba(245, 158, 11, 0.5)' },
          '50%': { opacity: '.8', boxShadow: '0 0 25px rgba(245, 158, 11, 0.8)' },
        },
        'pulse-epic': {
          '0%, 100%': { opacity: '1', boxShadow: '0 0 15px rgba(139, 92, 246, 0.5)' },
          '50%': { opacity: '.8', boxShadow: '0 0 25px rgba(139, 92, 246, 0.8)' },
        }
      }
    },
  },
  plugins: [],
} satisfies Config
