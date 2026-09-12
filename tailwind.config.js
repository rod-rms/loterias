/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["selector", '[data-theme="dark"]'],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // LotoAtlas Brand Kit v0.3 semantic roles.
        // Values are kept in exact sync with docs/global/LotoAtlas_BrandKit_v0.3/design-tokens/{colors.json,tokens.css}
        // (dark theme, the primary/default application surface). Literal hex values are used here
        // (rather than var(--la-*) references) so Tailwind's opacity modifiers (e.g. bg-brand-action/10)
        // work correctly; src/styles/brandTokens.css still carries the canonical CSS custom properties
        // for direct CSS use and for a future light/dark toggle.
        brand: {
          bg: "#101729",
          surface: "#1D2740",
          surfaceElevated: "#232F4D",
          text: "#FFFFFF",
          textMuted: "#B7C0D6",
          border: "#2C3856",
          borderStrong: "#6D3CFF",
          action: "#6D3CFF",
          actionHover: "#8B5CFF",
          actionForeground: "#FFFFFF",
          actionText: "#A07AFF",
          focus: "#6D3CFF",
          success: "#22B96B",
          successText: "#22B96B",
          // Raw brand palette, for symbol/modality/data-viz use only — never as a competing CTA color.
          violet: "#6D3CFF",
          violetLight: "#8B5CFF",
          blue: "#1677FF",
          teal: "#12C7B0",
          luck: "#22B96B",
          luckLight: "#66D889",
          ink: "#101729",
          ink2: "#1D2740",
        },
        lotofacil: {
          50: "#f2f9f2",
          100: "#dff0df",
          400: "#4caf50",
          500: "#2e7d32",
          600: "#1b5e20",
          800: "#16351f",
          900: "#12241a",
        },
        megasena: {
          50: "#f1f5fb",
          100: "#dbe6f7",
          300: "#7A9FD1",
          400: "#4a6fa5",
          500: "#2f4f7c",
          600: "#1c3a63",
          800: "#132540",
          900: "#101a2c",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "Segoe UI", "Arial", "sans-serif"],
        mono: ["JetBrains Mono", "SFMono-Regular", "Consolas", "Liberation Mono", "monospace"],
      },
    },
  },
  plugins: [],
};
