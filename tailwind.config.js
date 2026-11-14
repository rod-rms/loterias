/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["selector", '[data-theme="dark"]'],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    // UI-001: one strict type scale (12 / 14 / 16 / 20 / 28). Every size utility maps onto it, so no page can
    // drift to in-between sizes.
    fontSize: {
      xs: ["12px", { lineHeight: "16px" }],
      sm: ["14px", { lineHeight: "20px" }],
      base: ["16px", { lineHeight: "24px" }],
      lg: ["20px", { lineHeight: "28px" }],
      xl: ["20px", { lineHeight: "28px" }],
      "2xl": ["28px", { lineHeight: "34px" }],
      "3xl": ["28px", { lineHeight: "34px" }],
    },
    // UI-001: radius is 6 px at most (chips/pills may be round). Larger utilities collapse to 6 px on purpose.
    borderRadius: {
      none: "0",
      sm: "2px",
      DEFAULT: "4px",
      md: "4px",
      lg: "6px",
      xl: "6px",
      "2xl": "6px",
      "3xl": "6px",
      full: "9999px",
    },
    // UI-001: no decorative shadows. Only dialogs/drawers/popovers keep an elevation shadow.
    boxShadow: {
      none: "none",
      sm: "none",
      DEFAULT: "none",
      md: "none",
      lg: "0 12px 32px rgba(0, 0, 0, 0.45)",
      xl: "0 12px 32px rgba(0, 0, 0, 0.45)",
      overlay: "0 12px 32px rgba(0, 0, 0, 0.45)",
    },
    extend: {
      colors: {
        // LotoAtlas Brand Kit v0.3 semantic roles (hex values unchanged; see src/styles/brandTokens.css).
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
          // Raw brand palette, for symbol/data-viz use only — never as a competing CTA color.
          violet: "#6D3CFF",
          violetLight: "#8B5CFF",
          blue: "#1677FF",
          teal: "#12C7B0",
          luck: "#22B96B",
          luckLight: "#66D889",
          ink: "#101729",
          ink2: "#1D2740",
        },
        // UI-001: neutral scale derived from Atlas Ink (#101729) and Atlas Ink 2 (#1D2740). Structure only:
        // backgrounds, dividers, secondary text. Violet is reserved for the primary action and the focus ring.
        ink: {
          950: "#0B1120",
          900: "#101729", // page background (= brand.bg)
          800: "#161F36",
          700: "#1D2740", // surface (= brand.surface)
          600: "#232F4D", // elevated surface / hover
          500: "#2C3856", // dividers (= brand.border)
          400: "#4A5878", // strong border, disabled text
          300: "#8A96B2", // secondary text (6.1:1 on ink-900, 5.2:1 on ink-700)
          200: "#B7C0D6", // muted text (= brand.textMuted)
          100: "#E6EBF7",
        },
        // UI-001: the current modality's identity colours. Set as CSS variables by the shell from the modality
        // registry (public/data/config/game-config.json), never hard-coded per page.
        mod: {
          accent: "var(--mod-accent)",
          strong: "var(--mod-accent-strong)",
          soft: "var(--mod-soft)",
          on: "var(--mod-on-accent)",
          text: "var(--mod-text)",
        },
      },
      fontFamily: {
        sans: ["IBM Plex Sans", "system-ui", "-apple-system", "Segoe UI", "Arial", "sans-serif"],
        mono: ["IBM Plex Mono", "SFMono-Regular", "Consolas", "Liberation Mono", "monospace"],
      },
      maxWidth: {
        content: "1200px",
      },
      transitionDuration: {
        DEFAULT: "150ms",
      },
    },
  },
  plugins: [],
};
