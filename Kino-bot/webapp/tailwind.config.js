/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        tgBase: 'var(--tg-theme-bg-color)',
        tgText: 'var(--tg-theme-text-color)',
        tgHint: 'var(--tg-theme-hint-color)',
        tgLink: 'var(--tg-theme-link-color)',
        tgButton: 'var(--tg-theme-button-color)',
        tgButtonText: 'var(--tg-theme-button-text-color)',
        tgSecondaryBg: 'var(--tg-theme-secondary-bg-color)'
      }
    },
  },
  plugins: [],
}
