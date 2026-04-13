/** @type {import('tailwindcss').Config} */
const config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        bg: {
          base: '#060a18',
          surface: '#0d1426',
          panel: '#101a31',
        },
        brand: {
          DEFAULT: '#00d4aa',
          strong: '#00ebb8',
          muted: 'rgba(0, 212, 170, 0.15)',
        },
        risk: {
          low: '#22c55e',
          mod: '#f59e0b',
          elev: '#f97316',
          high: '#ef4444',
        },
      },
    },
  },
};

export default config;