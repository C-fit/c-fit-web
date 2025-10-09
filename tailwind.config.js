/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class', // next-themes 토글과 맞춤
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx}",
    "./src/components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        primary: "var(--primary)",
        "primary-foreground": "var(--primary-foreground)",
        accent: "var(--accent)",
        muted: "var(--muted)",
      },
      fontFamily: {
        sans: "var(--font-geist-sans), ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Noto Sans, Ubuntu, Cantarell, Helvetica Neue, Arial, 'Apple Color Emoji', 'Segoe UI Emoji'",
        mono: "var(--font-geist-mono), ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
      },
    },
  },
  plugins: [],
};
