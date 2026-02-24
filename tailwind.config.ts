import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/data/**/*.{js,ts}",
  ],
  safelist: [
    // Category icon colors used dynamically via cat.color
    'bg-orange-100', 'text-orange-600',
    'bg-blue-100', 'text-blue-600',
    'bg-pink-100', 'text-pink-600',
    'bg-purple-100', 'text-purple-600',
    'bg-green-100', 'text-green-600',
    'bg-amber-100', 'text-amber-600',
    // Category showcase gradient backgrounds
    'from-orange-200', 'to-orange-100',
    'from-blue-200', 'to-blue-100',
    'from-pink-200', 'to-pink-100',
    'from-purple-200', 'to-purple-100',
    'from-green-200', 'to-green-100',
    'from-amber-200', 'to-amber-100',
    // Showcase item gradient colors (dynamic from DB)
    'from-pink-300', 'via-pink-400', 'to-pink-500',
    'from-purple-500', 'to-pink-500',
    'from-amber-500', 'to-orange-500',
    'from-green-500', 'to-teal-500',
    'from-pink-400', 'to-rose-500',
    'from-gray-600', 'to-gray-800',
    'from-blue-500', 'to-indigo-600',
    'from-red-500', 'to-orange-500',
    'from-teal-400', 'to-cyan-500',
    'from-indigo-500', 'to-purple-600',
  ],
  theme: {
    extend: {
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
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
        gold: "#ecbe38",
        "deep-purple": "#43276c",
        "off-white": "#fcf7f4",
        chart: {
          "1": "hsl(var(--chart-1))",
          "2": "hsl(var(--chart-2))",
          "3": "hsl(var(--chart-3))",
          "4": "hsl(var(--chart-4))",
          "5": "hsl(var(--chart-5))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontFamily: {
        sans: [
          "Helvetica Now Display",
          "Helvetica Neue",
          "Helvetica",
          "Arial",
          "system-ui",
          "-apple-system",
          "sans-serif",
        ],
      },
      boxShadow: {
        soft: "0 2px 8px rgba(67, 39, 108, 0.08)",
        "soft-lg": "0 4px 16px rgba(67, 39, 108, 0.12)",
        "soft-xl": "0 8px 24px rgba(67, 39, 108, 0.16)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
export default config;
