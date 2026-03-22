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
        'primary': '#f39e58',
        'background-light': '#FDFBF7',
        'background-dark': '#221810',
        'surface': '#FFFFFF',
        'text-main': '#264653',
        'muted': '#E9ECEF',
        'success': '#A7C957',
        'accent-teal': '#2A9D8F',
        'accent-alert': '#E76F51',
        // Keep weather model colors
        model: {
          knmi: '#FF6B00',
          ecmwf: '#2563EB',
          icon: '#DC2626',
          gfs: '#7C3AED',
          meteofrance: '#06B6D4',
        },
      },
      fontFamily: {
        'display': ['Spline Sans', 'system-ui', '-apple-system', 'sans-serif'],
      },
      borderRadius: {
        'DEFAULT': '1rem',
        'lg': '1.5rem',
        'xl': '2rem',
        'full': '9999px',
      },
      boxShadow: {
        'soft': '0 8px 32px rgba(38, 70, 83, 0.08)',
      },
    },
  },
  plugins: [],
};
