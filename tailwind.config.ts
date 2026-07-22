import typography from "@tailwindcss/typography";
import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        base: "#0A0D12",
        surface: "#12161D",
        surface2: "#1A1F28",
        border: "#242A35",
        primary: "#E7E9EE",
        muted: "#8A8F9A",
        accent: "#FF6A3D",
        accentMuted: "#7A3A26",
        cite: "#38BDF8",
        // Additive tokens for the landing page's terminal/live-query motif.
        // Kept separate from `accent`/`cite` above so the chat UI (which
        // already relies on those) is unaffected.
        termAmber: "#F0B429",
        termGreen: "#7EE787",
      },
      fontFamily: {
        display: ["var(--font-display)", "sans-serif"],
        sans: ["var(--font-body)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      keyframes: {
        playhead: {
          "0%": { left: "0%" },
          "100%": { left: "100%" },
        },
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        blink: {
          "0%, 49%": { opacity: "1" },
          "50%, 100%": { opacity: "0" },
        },
      },
      animation: {
        fadeUp: "fadeUp 0.5s ease-out forwards",
        blink: "blink 1s step-end infinite",
      },
      typography: {
        invert: {
          css: {
            "--tw-prose-body": "#E7E9EE",
            "--tw-prose-headings": "#E7E9EE",
            "--tw-prose-bold": "#E7E9EE",
            "--tw-prose-links": "#38BDF8",
            "--tw-prose-bullets": "#8A8F9A",
            "--tw-prose-counters": "#8A8F9A",
            "--tw-prose-code": "#FF6A3D",
            "--tw-prose-quotes": "#8A8F9A",
            "--tw-prose-quote-borders": "#242A35",
          },
        },
      },
    },
  },
  plugins: [typography],
};
export default config;