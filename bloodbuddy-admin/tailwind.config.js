/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        admin: {
          800: '#1e293b',
          900: '#0f172a',
        },
        blood: {
          600: '#e11d48',
          700: '#be123c',
        }
      }
    },
  },
  plugins: [],
}