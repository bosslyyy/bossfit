import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "rgb(var(--background) / <alpha-value>)",
        foreground: "rgb(var(--foreground) / <alpha-value>)",
        card: "rgb(var(--card) / <alpha-value>)",
        "card-foreground": "rgb(var(--card-foreground) / <alpha-value>)",
        surface: "rgb(var(--surface) / <alpha-value>)",
        muted: "rgb(var(--muted) / <alpha-value>)",
        "muted-foreground": "rgb(var(--muted-foreground) / <alpha-value>)",
        border: "rgb(var(--border) / <alpha-value>)",
        accent: "rgb(var(--accent) / <alpha-value>)",
        "accent-foreground": "rgb(var(--accent-foreground) / <alpha-value>)",
        success: "rgb(var(--success) / <alpha-value>)",
        danger: "rgb(var(--danger) / <alpha-value>)",
        ring: "rgb(var(--ring) / <alpha-value>)"
      },
      fontFamily: {
        display: ['"Trebuchet MS"', '"Arial Rounded MT Bold"', '"Aptos Display"', "sans-serif"],
        body: ['"Aptos"', '"Segoe UI Variable"', '"Segoe UI"', "sans-serif"]
      },
      borderRadius: {
        xl: "1rem",
        "2xl": "1.5rem",
        "3xl": "1.75rem",
        "4xl": "2rem"
      },
      boxShadow: {
        soft: "0 20px 52px rgb(var(--shadow) / 0.12)",
        panel: "0 12px 30px rgb(var(--shadow) / 0.16)",
        focus: "0 0 0 3px rgb(var(--ring) / 0.18)"
      },
      backgroundImage: {
        mesh: "radial-gradient(circle at top left, rgb(var(--mesh-warm) / 0.08), transparent 40%), radial-gradient(circle at top right, rgb(var(--mesh-cool) / 0.10), transparent 42%), linear-gradient(180deg, rgb(var(--card) / 0.14), rgb(var(--card) / 0))"
      },
      keyframes: {
        rise: {
          "0%": { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" }
        },
        glow: {
          "0%, 100%": { transform: "scale(1)", opacity: "0.95" },
          "50%": { transform: "scale(1.03)", opacity: "1" }
        },
        confetti: {
          "0%": { opacity: "0", transform: "scale(0.4) translateY(0)" },
          "25%": { opacity: "1" },
          "100%": { opacity: "0", transform: "scale(1.18) translateY(-28px)" }
        }
      },
      animation: {
        rise: "rise 0.45s ease-out both",
        glow: "glow 1.8s ease-in-out infinite",
        confetti: "confetti 0.9s ease-out both"
      }
    }
  },
  plugins: []
};

export default config;
