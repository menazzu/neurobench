/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './*.html',
    './js/*.js',
    './admin/*.html',
    './admin/js/*.js',
  ],
  theme: {
    extend: {
      colors: {
        black: '#050505',
        surface: '#0c0c0c',
        border: '#161616',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['"Geist Mono"', 'monospace'],
        title: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
