/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        accent: "rgb(var(--accent) / <alpha-value>)",
        ghub: {
          bg: "#090a0f",
          sidebar: "#0d0f15",
          panel: "#12151d",
          card: "#161922",
          cardHover: "#1c202c",
          border: "#232838",
          borderLight: "#2e3448",
          cyan: "#00b8fc",
          cyanGlow: "rgba(0, 184, 252, 0.4)",
          text: "#f0f2f5",
          muted: "#858d9d",
        },
      },
      fontFamily: {
        sans: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
        mono: ["JetBrains Mono", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0", transform: "translateY(4px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "pulse-soft": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.4" },
        },
        "hue-cycle": {
          "0%": { filter: "hue-rotate(0deg)" },
          "100%": { filter: "hue-rotate(360deg)" },
        },
        "ping-slow": {
          "0%": { transform: "scale(1)", opacity: "0.6" },
          "80%, 100%": { transform: "scale(2.6)", opacity: "0" },
        },
      },
      animation: {
        "fade-in": "fade-in 180ms ease-out",
        "pulse-soft": "pulse-soft 2.4s ease-in-out infinite",
        "hue-cycle": "hue-cycle 6s linear infinite",
        "ping-slow": "ping-slow 2s cubic-bezier(0, 0, 0.2, 1) infinite",
      },
    },
  },
  plugins: [],
};
