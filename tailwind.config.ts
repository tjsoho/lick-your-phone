import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        lyp: {
          white: "rgb(var(--lyp-white) / <alpha-value>)",
          cherry: "rgb(var(--lyp-cherry) / <alpha-value>)",
          black: "rgb(var(--lyp-black) / <alpha-value>)",
          maroon: "rgb(var(--lyp-maroon) / <alpha-value>)",
          "deep-red": "rgb(var(--lyp-deep-red) / <alpha-value>)",
          "off-white": "rgb(var(--lyp-off-white) / <alpha-value>)",
          gold: "rgb(var(--lyp-gold) / <alpha-value>)",
        },
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
      },
      fontFamily: {
        heading: ["var(--font-kanit)", "Kanit", "sans-serif"],
        body: ["var(--font-montserrat)", "Montserrat", "sans-serif"],
      },
      // Named so they compile. Tailwind rejects `ease-[cubic-bezier(...)]`
      // as ambiguous, so those arbitrary classes emitted no CSS at all and
      // every transition silently fell back to the default curve.
      transitionTimingFunction: {
        brand: "cubic-bezier(0.32, 0.72, 0, 1)",
        standard: "cubic-bezier(0.4, 0, 0.2, 1)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        // The thin bar that crosses the top of the dashboard while a page is
        // fetching. It sweeps rather than filling, because it has no idea how
        // long the wait is and a progress bar that lies is worse than one that
        // only says "working".
        "loading-sweep": {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(400%)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "loading-sweep": "loading-sweep 1.1s cubic-bezier(0.4, 0, 0.2, 1) infinite",
      },
    },
  },
  plugins: [
    require("@tailwindcss/typography"),
    require("tailwindcss-animate"),
  ],
};

export default config;
