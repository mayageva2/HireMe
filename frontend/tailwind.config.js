/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        "primary": "#46eedd",
        "secondary": "#4ae183",
        "surface": "#041329",
        "surface-container-high": "#1c2a41",
        "surface-container-low": "#0d1c32",
        "on-surface": "#d6e3ff",
        "on-surface-variant": "#bacac6",
        "outline-variant": "#3b4a47",
      },
      fontFamily: {
        manrope: ['Manrope', 'sans-serif'],
      },
    },
  },
  plugins: [],
}