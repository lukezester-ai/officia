import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: "#0F1F3D",
        indigoElectric: "#4F46E5",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "ui-sans-serif", "system-ui"],
        display: ["var(--font-display)", "ui-serif", "Georgia"],
      },
      boxShadow: {
        glow: "0 24px 80px rgba(79, 70, 229, 0.22)",
      },
    },
  },
  plugins: [],
};

export default config;
