/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        lotofacil: {
          50: "#f2f9f2",
          100: "#dff0df",
          400: "#4caf50",
          500: "#2e7d32",
          600: "#1b5e20",
        },
        megasena: {
          50: "#f1f5fb",
          100: "#dbe6f7",
          400: "#4a6fa5",
          500: "#2f4f7c",
          600: "#1c3a63",
        },
      },
    },
  },
  plugins: [],
};
