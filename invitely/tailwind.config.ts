// tailwind.config.ts
import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Design system
        ivory: "#F8F4E3",
        champagne: {
          50:  "#fdf9ee",
          100: "#faf2da",
          200: "#f5e6b8",
          800: "#a08040",
        },
        "deep-green": "#0A2810",
        "warm-gold":  "#B8860B",
      },
      fontFamily: {
        serif: ["var(--font-cormorant)", "Georgia", "serif"],
        sans:  ["var(--font-geist-sans)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        lg:  "0.75rem",
        xl:  "1rem",
        "2xl": "1.25rem",
        "3xl": "1.5rem",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
