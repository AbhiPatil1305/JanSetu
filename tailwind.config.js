/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          navy: '#1E293B',
          'navy-light': '#334155',
          gold: '#F59E0B',
          'gold-dark': '#D97706',
          bg: '#F8FAFC',
          text: '#0F172A',
          'text-muted': '#64748B',
          success: '#16A34A',
          warning: '#D97706',
          danger: '#DC2626',
          info: '#2563EB',
        }
      },
      fontFamily: {
        sans: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          '"Noto Sans Kannada"',
          'sans-serif',
        ],
        kannada: ['"Noto Sans Kannada"', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
