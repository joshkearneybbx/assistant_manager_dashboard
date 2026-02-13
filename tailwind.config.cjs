/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'base-black': '#1D1C1B',
        white: '#FFFFFF',
        sand: {
          100: '#FAF9F8',
          200: '#F5F3F0',
          300: '#E8E5E0',
          400: '#DDD8D0'
        },
        grey: {
          400: '#696968'
        },
        assistant: {
          light: '#D6FEFF',
          dark: '#274346'
        },
        status: {
          'green-light': '#E8F9F5',
          green: '#0D6B58',
          'orange-light': '#FFF4ED',
          orange: '#F4A85B',
          'orange-dark': '#E9722F',
          'orange-text': '#9A3400',
          red: '#B91C1C',
          'red-light': '#FEE2E2'
        }
      }
    }
  },
  plugins: []
};
