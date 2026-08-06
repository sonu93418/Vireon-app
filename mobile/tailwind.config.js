/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        vireon: {
          bg: '#030712',
          primary: '#0F172A',
          secondary: '#111827',
          card: '#111827',
          'accent-green': '#16A34A',
          success: '#22C55E',
          warning: '#F59E0B',
          danger: '#EF4444',
          'text-primary': '#F1F5F9',
          'text-secondary': '#94A3B8',
          'text-muted': '#64748B',
          border: 'rgba(255, 255, 255, 0.08)',
        },
      },
      fontFamily: {
        sans: ['Inter', 'System'],
        heading: ['Poppins', 'Inter', 'System'],
        mono: ['JetBrains Mono', 'Menlo', 'monospace'],
      },
      spacing: {
        '4.5': 18,
        '5.5': 22,
        '13': 52,
        '15': 60,
        '18': 72,
      },
      borderRadius: {
        '4xl': 32,
        '5xl': 40,
      },
    },
  },
  plugins: [],
};
