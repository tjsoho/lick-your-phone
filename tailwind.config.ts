import type { Config } from "tailwindcss";

const config: Config = {
    darkMode: ["class"],
    content: [
        "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/ui/**/*.{js,ts,jsx,tsx,mdx}", // Added this line
    ],
    theme: {
        extend: {
            colors: {
                // Monochrome template palette. The original design used a
                // green accent (brand-green) on near-black (brand-black) with
                // a cream surface (brand-cream). Repointed to black / white /
                // grey so the whole app is B&W — recolor these five tokens to
                // re-theme every component at once.
                brand: {
                    yellow: "#52525b", // was accent — now neutral grey
                    teal: "#52525b",
                    black: "#171717", // near-black ink + dark surfaces
                    cream: "#f4f4f5", // light grey surface (off-white)
                    green: "#171717", // accent — now black
                },
                background: "hsl(var(--background))",
                foreground: "hsl(var(--foreground))",
                primary: {
                    DEFAULT: "#171717",
                    foreground: "hsl(var(--primary-foreground))",
                },
                secondary: {
                    DEFAULT: "hsl(var(--secondary))",
                    foreground: "hsl(var(--secondary-foreground))",
                },
                border: "hsl(var(--border))",
                input: "hsl(var(--input))",
                ring: "hsl(var(--ring))",
            },
            fontFamily: {
                poppins: ["var(--font-poppins)", "sans-serif"],
                inter: ["var(--font-inter)", "sans-serif"],
                mars: ["var(--font-mars)", "sans-serif"],
            },
            keyframes: {
                "bubble-grow": {
                    "0%": { width: "40px", height: "40px", opacity: "0" },
                    "100%": { width: "90vw", height: "90vh", opacity: "1" },
                },
                "accordion-down": {
                    from: { height: "0" },
                    to: { height: "var(--radix-accordion-content-height)" },
                },
                "accordion-up": {
                    from: { height: "var(--radix-accordion-content-height)" },
                    to: { height: "0" },
                },
            },
            animation: {
                "bubble-grow": "bubble-grow 0.6s ease-out forwards",
                "accordion-down": "accordion-down 0.2s ease-out",
                "accordion-up": "accordion-up 0.2s ease-out",
            },
        },
    },
    plugins: [
        require("@tailwindcss/typography"),
        require("tailwindcss-animate"),
    ],
};

export default config;
