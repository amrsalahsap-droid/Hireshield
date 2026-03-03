import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Enterprise color palette
        primary: {
          50: '#DBEAFE',
          500: '#2563EB',
          600: '#1D4ED8',
          700: '#1E3A8A',
          900: '#1E3A8A',
        },
        // Neutral base colors
        neutral: {
          50: '#F8FAFC',
          100: '#F1F5F9',
          200: '#E5E7EB',
          500: '#6B7280',
          900: '#111827',
        },
        // Risk colors (controlled usage)
        risk: {
          safe: '#16A34A',
          investigate: '#D97706',
          high: '#DC2626',
          'safe-bg': '#DCFCE7',
          'investigate-bg': '#FEF3C7',
          'high-bg': '#FEE2E2',
        },
        // Legacy support
        background: "var(--background)",
        foreground: "var(--foreground)",
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['IBM Plex Mono', 'monospace'],
      },
      fontSize: {
        'page-title': ['28px', { lineHeight: '36px', fontWeight: '600' }],
        'section-title': ['20px', { lineHeight: '28px', fontWeight: '600' }],
        'card-title': ['16px', { lineHeight: '24px', fontWeight: '600' }],
        'body': ['14px', { lineHeight: '20px', fontWeight: '400' }],
        'secondary': ['13px', { lineHeight: '18px', fontWeight: '400' }],
        'label': ['12px', { lineHeight: '16px', fontWeight: '400', letterSpacing: '0.05em' }],
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem',
      },
      boxShadow: {
        'subtle': '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
      },
      borderRadius: {
        'card': '12px',
        'button': '8px',
        'badge': '6px',
      },
    },
  },
  plugins: [],
};
export default config;
