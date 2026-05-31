/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        obsidian: {
          bg: "#1e1e2e",
          surface: "#2a2a3c",
          sidebar: "#181825",
          border: "#363649",
          text: "#cdd6f4",
          muted: "#84849a",
          accent: "#7c3aed",
          "accent-hover": "#8b5cf6",
          "accent-light": "#a78bfa",
          success: "#10b981",
          warning: "#f59e0b",
          error: "#ef4444",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
      },
      spacing: {
        sidebar: "240px",
      },
    },
  },
  plugins: [],
};
