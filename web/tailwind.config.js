/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        cream: {
          50: '#FEFCF8',
          100: '#FDF8EE',
          200: '#F9EDDA',
        },
        forest: {
          500: '#2D5A3D',
          600: '#1E4D2B',
          700: '#153D20',
          800: '#0D2E16',
        },
        warmth: {
          400: '#E8935A',
          500: '#D97B3D',
          600: '#C4682E',
        },
        model: {
          knmi: '#FF6B00',
          ecmwf: '#2563EB',
          icon: '#DC2626',
          gfs: '#7C3AED',
          meteofrance: '#06B6D4',
        },
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
