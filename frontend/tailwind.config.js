/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // ─── Claymorphism Design Tokens ──────────────────────────────────────────────
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        // ─── Vireon Brand Clay Colors ───────────────────────────────────────────────
        vireon: {
          bg: '#F4FAF6',
          primary: '#16A34A',
          secondary: '#DCFCE7',
          card: '#FFFFFF',
          'card-mint': '#E6F4ED',
          border: 'rgba(22, 163, 74, 0.2)',
          'accent-green': '#16A34A',
          'accent-dark': '#15803D',
          success: '#16A34A',
          warning: '#F59E0B',
          danger: '#EF4444',
          'text-primary': '#0F172A',
          'text-secondary': '#475569',
          'text-muted': '#64748B',
        },
        // Destructive
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
        xl: '1rem',
        '2xl': '1.25rem',
        '3xl': '1.5rem',
        '4xl': '2rem',
        '5xl': '2.5rem',
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'Inter', 'system-ui', 'sans-serif'],
        heading: ['var(--font-poppins)', 'Poppins', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      spacing: {
        '4.5': '1.125rem',
        '5.5': '1.375rem',
        '6.5': '1.625rem',
        '7.5': '1.875rem',
        '8.5': '2.125rem',
        '9.5': '2.375rem',
        '68': '17rem',
      },
      boxShadow: {
        'clay': '8px 8px 16px rgba(16, 185, 129, 0.08), -8px -8px 16px #ffffff, inset 2px 2px 4px rgba(255, 255, 255, 0.8), inset -2px -2px 4px rgba(16, 185, 129, 0.1)',
        'clay-lg': '12px 12px 24px rgba(16, 185, 129, 0.12), -12px -12px 24px #ffffff, inset 3px 3px 6px rgba(255, 255, 255, 0.9), inset -3px -3px 6px rgba(16, 185, 129, 0.15)',
        'clay-green': '6px 6px 14px rgba(16, 185, 129, 0.35), inset 3px 3px 6px rgba(255, 255, 255, 0.4), inset -3px -3px 6px rgba(4, 120, 87, 0.4)',
        'clay-inset': 'inset 3px 3px 6px rgba(0, 0, 0, 0.06), inset -3px -3px 6px rgba(255, 255, 255, 0.9)',
        'glass': '0 4px 24px rgba(16, 185, 129, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.8)',
        'glass-lg': '0 8px 40px rgba(16, 185, 129, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.9)',
        'glow-green': '0 0 20px rgba(16, 185, 129, 0.25)',
        'glow-green-lg': '0 0 40px rgba(16, 185, 129, 0.35)',
        'card': '0 4px 14px rgba(16, 185, 129, 0.08)',
        'card-hover': '0 10px 28px rgba(16, 185, 129, 0.15)',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        'vireon-hero': 'linear-gradient(135deg, #FFFFFF 0%, #F4FAF6 50%, #E6F4ED 100%)',
        'vireon-card': 'linear-gradient(145deg, #FFFFFF 0%, #F4FAF6 100%)',
        'green-glow': 'radial-gradient(ellipse at center, rgba(16, 185, 129, 0.15) 0%, transparent 70%)',
        'grid-pattern': 'linear-gradient(rgba(16,185,129,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(16,185,129,0.04) 1px, transparent 1px)',
      },
      backgroundSize: {
        'grid': '40px 40px',
      },
      animation: {
        'fade-in': 'fade-in 0.5s ease-in-out',
        'slide-up': 'slide-up 0.4s ease-out',
        'slide-down': 'slide-down 0.4s ease-out',
        'scale-in': 'scale-in 0.3s ease-out',
        'float': 'float 6s ease-in-out infinite',
        'pulse-green': 'pulse-green 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'shimmer': 'shimmer 1.5s linear infinite',
        'spin-slow': 'spin 8s linear infinite',
        'bounce-subtle': 'bounce-subtle 2s ease-in-out infinite',
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'slide-up': {
          from: { opacity: '0', transform: 'translateY(20px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-down': {
          from: { opacity: '0', transform: 'translateY(-20px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-in': {
          from: { opacity: '0', transform: 'scale(0.95)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        'pulse-green': {
          '0%, 100%': { opacity: '1', boxShadow: '0 0 10px rgba(22, 163, 74, 0.5)' },
          '50%': { opacity: '0.7', boxShadow: '0 0 30px rgba(22, 163, 74, 0.8)' },
        },
        'shimmer': {
          from: { backgroundPosition: '-200% 0' },
          to: { backgroundPosition: '200% 0' },
        },
        'bounce-subtle': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-4px)' },
        },
      },
      backdropBlur: {
        xs: '2px',
      },
      gridTemplateColumns: {
        'bento-3': 'repeat(3, 1fr)',
        'bento-4': 'repeat(4, 1fr)',
        'sidebar': '280px 1fr',
        'sidebar-collapsed': '72px 1fr',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};
