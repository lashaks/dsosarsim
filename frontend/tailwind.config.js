/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: {
          primary: "var(--bg-primary)",
          secondary: "var(--bg-secondary)",
          panel: "var(--bg-panel)",
          hover: "var(--bg-hover)",
        },
        border: {
          DEFAULT: "var(--border)",
        },
        gold: {
          DEFAULT: "var(--gold)",
          dim: "var(--gold-dim)",
        },
        text: {
          primary: "var(--text-primary)",
          body: "var(--text-body)",
          muted: "var(--text-muted)",
        },
        status: {
          fmc: "var(--status-fmc)",
          "fmc-t": "var(--status-fmc-t)",
          pmc: "var(--status-pmc)",
          "pmc-t": "var(--status-pmc-t)",
          nmc: "var(--status-nmc)",
          "nmc-t": "var(--status-nmc-t)",
          info: "var(--status-info)",
          "info-t": "var(--status-info-t)",
        },
      },
      fontFamily: {
        display: ['"Barlow Condensed"', "system-ui", "sans-serif"],
        body: ['"Inter"', "system-ui", "sans-serif"],
        mono: ['"JetBrains Mono"', "ui-monospace", "monospace"],
      },
      fontSize: {
        "xxs": ["0.625rem", { lineHeight: "0.875rem" }],
      },
      letterSpacing: {
        "section": "0.18em",
      },
      borderRadius: {
        DEFAULT: "0.5rem",
      },
      transitionDuration: {
        DEFAULT: "150ms",
      },
    },
  },
  plugins: [],
};
