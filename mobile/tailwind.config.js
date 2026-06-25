/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/app/**/*.{js,jsx,ts,tsx}",
    "./src/components/**/*.{js,jsx,ts,tsx}"
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // Core backgrounds
        'lp-bg': '#050508',
        'lp-surface': '#0B0D17',
        'lp-card': '#141824',
        'lp-header': '#0E111F',
        'lp-hero-from': '#1A1F36',

        // Accent palette
        'electric-blue': '#00F0FF',
        'neon-violet': '#BD00FF',
        'soft-cyan': '#7DF5FF',

        // Glass
        'glass-border': 'rgba(255, 255, 255, 0.08)',
        'glass-bg': 'rgba(255, 255, 255, 0.03)',
        'glass-border-subtle': 'rgba(255, 255, 255, 0.05)',
        'glass-border-faint': 'rgba(255, 255, 255, 0.03)',

        // Semantic
        'lp-placeholder': '#3A4155',
        'lp-inactive': '#5A6178',
      },
      borderRadius: {
        '2.5xl': '20px',
        '4xl': '32px',
      },
      fontSize: {
        'micro': ['9px', { lineHeight: '12px' }],
        'mini': ['10px', { lineHeight: '14px' }],
        'label': ['11px', { lineHeight: '16px' }],
      },
    },
  },
  plugins: [],
}
