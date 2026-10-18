/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',

  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],

  theme: {
    extend: {
      colors: {
        brand: {
          bg: '#fbf5f1',
          bg2: '#f4e7e1',
          surface: '#ffffff',
          ink: '#2b1315',
          muted: '#6f595b',
          line: '#ead9d3',
          accent: '#a4121f',
          btn: '#a4121f',
          btnHover: '#860e19',
          crimsonHi: '#d42b3a',
          crimsonDeep: '#6f0818',
          blush: '#fbe3e0',
          onBtn: '#ffffff',
          ok: '#1d7a4b',
          okSoft: '#dff3e8',
        }
      },

      fontFamily: {
        display: ['Fraunces', 'Georgia', 'serif'],
        body: ['Figtree', 'system-ui', 'sans-serif'],
        mono: ['DM Mono', 'monospace'],
      },

      boxShadow: {
        custom:
          '0 1px 2px rgba(60,10,15,.06), 0 18px 40px -18px rgba(110,15,25,.25)',
      }
    },
  },

  plugins: [],
}