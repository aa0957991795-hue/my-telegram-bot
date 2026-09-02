/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cash: {
          DEFAULT: '#10b981',
          dark: '#059669',
          light: '#d1fae5',
        },
        ink: {
          DEFAULT: '#0f172a',
          50: 'rgba(15, 23, 42, 0.5)',
          40: 'rgba(15, 23, 42, 0.4)',
          60: 'rgba(15, 23, 42, 0.6)',
          10: 'rgba(15, 23, 42, 0.1)',
          5: 'rgba(15, 23, 42, 0.05)',
        },
        surface: {
          DEFAULT: '#ffffff',
          alt: '#f8fafc',
        },
        line: '#e2e8f0',
        warn: '#f59e0b',
      },
      fontFamily: {
        display: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
