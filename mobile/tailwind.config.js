/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        vireon: {
          bg: '#F4FAF6',
          primary: '#16A34A',
          secondary: '#DCFCE7',
          card: '#FFFFFF',
          'card-mint': '#F0FDF4',
          'accent-green': '#16A34A',
          success: '#16A34A',
          warning: '#F59E0B',
          danger: '#EF4444',
          'text-primary': '#0F172A',
          'text-secondary': '#475569',
          'text-muted': '#64748B',
          border: 'rgba(22, 163, 74, 0.2)',
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
