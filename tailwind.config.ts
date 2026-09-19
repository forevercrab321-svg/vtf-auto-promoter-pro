import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Scope safety states used across the UI
        scope: {
          green: "#16a34a",
          yellow: "#ca8a04",
          red: "#dc2626",
        },
        ink: {
          950: "#0b1120",
          900: "#0f172a",
          800: "#1e293b",
          700: "#334155",
        },
      },
      fontFamily: {
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
