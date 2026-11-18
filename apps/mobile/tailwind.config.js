/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}", "./App.tsx"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef2ff',
          100: '#e0e7ff',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          900: '#312e81',
        },
        surface: {
          light: '#ffffff',
          dark: '#0f172a',
          cardLight: '#f8fafc',
          cardDark: '#1e293b'
        }
      }
    },
  },
  plugins: [],
};
