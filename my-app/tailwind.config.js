/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        surface: "var(--surface)",
        "surface-muted": "var(--surface-muted)",
        "surface-strong": "var(--surface-strong)",
        primary: "var(--primary)",
        "primary-bright": "var(--primary-bright)",
        secondary: "var(--secondary)",
        "secondary-bright": "var(--secondary-bright)",
        warning: "var(--warning)",
        danger: "var(--danger)",
        border: "var(--border)",
        muted: "var(--muted)",
      },
      fontFamily: {
        sans: ["var(--font-body-family)"],
        display: ["var(--font-display-family)"],
      },
    },
  },
  plugins: [],
};
