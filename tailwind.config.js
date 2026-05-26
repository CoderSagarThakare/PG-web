/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['selector', '[data-theme="dark"]'],
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // ── Brand colours ──────────────────────────────────
        primary: {
          DEFAULT: '#6c63ff',
          hover:   '#5a52e0',
          light:   'rgba(108,99,255,0.15)',
        },
        accent: {
          DEFAULT: '#00d4aa',
          hover:   '#00b891',
          light:   'rgba(0,212,170,0.12)',
        },
        danger: {
          DEFAULT: '#ff4d6d',
          hover:   '#e03055',
          light:   'rgba(255,77,109,0.12)',
        },
        warning: {
          DEFAULT: '#ffa94d',
          light:   'rgba(255,169,77,0.12)',
        },
        success: {
          DEFAULT: '#51cf66',
          light:   'rgba(81,207,102,0.12)',
        },
        purple: {
          DEFAULT: '#cc5de8',
          light:   'rgba(204,93,232,0.12)',
        },

        // ── Dark theme surfaces (default) ───────────────────
        dark: {
          base:    '#0f1117',
          surface: '#1a1d2e',
          elevated:'#242740',
          hover:   '#2d3052',
          border:  '#2d3052',
          borderLight: 'rgba(255,255,255,0.06)',
          textPrimary:   '#f0f0f8',
          textSecondary: '#a0a3b1',
          textMuted:     '#6b6e82',
        },

        // ── Light theme surfaces ────────────────────────────
        light: {
          base:    '#f4f6f8',
          surface: '#ffffff',
          elevated:'#f9fafb',
          hover:   '#f1f3f5',
          border:  '#e5e7eb',
          borderLight: 'rgba(0,0,0,0.05)',
          textPrimary:   '#111827',
          textSecondary: '#4b5563',
          textMuted:     '#6b7280',
        },
      },

      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },

      borderRadius: {
        sm: '8px',
        md: '12px',
        lg: '16px',
        xl: '24px',
      },

      boxShadow: {
        sm:  '0 2px 8px rgba(0,0,0,0.3)',
        md:  '0 4px 20px rgba(0,0,0,0.4)',
        lg:  '0 8px 40px rgba(0,0,0,0.5)',
        // Light variants
        'sm-light': '0 2px 8px rgba(0,0,0,0.05)',
        'md-light': '0 4px 20px rgba(0,0,0,0.08)',
        'lg-light': '0 8px 40px rgba(0,0,0,0.12)',
        'top':      '0 -4px 24px rgba(0,0,0,0.35)',
      },

      width: {
        sidebar: '230px',
      },

      height: {
        topbar: '56px',
        bottomnav: '62px',
      },

      animation: {
        'spin-fast': 'spin 0.8s linear infinite',
        'fade-in':   'fadeIn 0.3s ease',
        'slide-up':  'slideUp 0.25s ease',
        'pulse-soft':'pulse 2s ease-in-out infinite',
      },

      keyframes: {
        fadeIn:  { from: { opacity: '0' }, to: { opacity: '1' } },
        slideUp: { from: { opacity: '0', transform: 'translateY(20px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
      },
    },
  },
  plugins: [],
};
