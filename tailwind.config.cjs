/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        mono: ['"JetBrains Mono"', 'Fira Mono', 'monospace'],
        sans: ['"DM Sans"', 'system-ui', 'sans-serif'],
      },
      colors: {
        navy: {
          950: '#03060f',
          900: '#060d1f',
          800: '#0a1628',
          700: '#0f2040',
          600: '#162d55',
          500: '#1e3f70',
        },
        accent: {
          green: '#00ff87',
          cyan: '#00d4ff',
          red: '#ff3b5c',
          amber: '#ffb800',
          dim: '#4a9d6f',
        },
        surface: {
          1: '#0d1b2e',
          2: '#111e30',
          3: '#162540',
          4: '#1c2f52',
        },
      },
      keyframes: {
        flashGreen: {
          '0%,100%': { backgroundColor: 'transparent' },
          '50%': { backgroundColor: 'rgba(0,255,135,0.18)' },
        },
        flashRed: {
          '0%,100%': { backgroundColor: 'transparent' },
          '50%': { backgroundColor: 'rgba(255,59,92,0.18)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        marquee: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        typing: {
          '0%,80%,100%': { opacity: '0.2', transform: 'scale(0.8)' },
          '40%': { opacity: '1', transform: 'scale(1)' },
        },
      },
      animation: {
        flashGreen: 'flashGreen 0.6s ease',
        flashRed: 'flashRed 0.6s ease',
        shimmer: 'shimmer 1.6s linear infinite',
        marquee: 'marquee 120s linear infinite',
        slideUp: 'slideUp 0.3s ease both',
        fadeIn: 'fadeIn 0.25s ease both',
        typing: 'typing 1.2s ease infinite',
      },
      boxShadow: {
        card: '0 4px 24px rgba(0,0,0,0.45)',
        glow: '0 0 20px rgba(0,255,135,0.15)',
        panel: '0 8px 40px rgba(0,0,0,0.6)',
      },
    },
  },
  plugins: [],
};
