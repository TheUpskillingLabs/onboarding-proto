import type { Config } from "tailwindcss";

/**
 * Design tokens mirrored from the OLOS Tailwind config so the proto visually
 * matches the existing product (per requirements §2). These are copied values,
 * not an import — the proto is fully self-contained.
 */
const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Background — deep blue-black
        midnight: "#0A0E16",
        // Primary accents
        teal: "#14B8A6",
        aqua: "#2DD4BF",
        // Text, used at various opacities (text-cloud/60, etc.)
        cloud: "#E6EDF3",
        // Borders / hairlines
        whisper: "#1E2630",
      },
      fontFamily: {
        sans: [
          "var(--font-sans)",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
};

export default config;
