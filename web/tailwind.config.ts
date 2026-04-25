import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ivory: "#F4EFE6",
        graphite: "#2B2B2B",
        sage: "#9DAE94",
        brass: "#A8794A",
        rule: "#D9CFBE",
      },
      fontFamily: {
        serif: ["var(--font-serif)", "EB Garamond", "Georgia", "serif"],
        sans: ["var(--font-sans)", "Inter", "ui-sans-serif", "system-ui"],
        mono: ["var(--font-mono)", "JetBrains Mono", "ui-monospace", "monospace"],
      },
      borderRadius: {
        none: "0",
        sm: "2px",
        DEFAULT: "4px",
      },
      letterSpacing: {
        eyebrow: "0.18em",
      },
    },
  },
  plugins: [],
};
export default config;
