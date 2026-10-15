/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/studio/index.html",
    "./src/studio/src/**/*.{js,ts,jsx,tsx}",
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}"
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0fdff',
          100: '#ccfbf1',
          400: '#2dd4bf',
          500: '#00f5ff',
          600: '#0ea5e9',
          900: '#0f172a'
        }
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['Fira Code', 'monospace']
      }
    }
  },
  plugins: []
};
