/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        signal: {
          green: "var(--green)",
          light: "var(--green-light)",
          mid: "var(--green-mid)"
        }
      },
      fontFamily: {
        sans: ["var(--font-dm-sans)"],
        serif: ["var(--font-dm-serif)"]
      },
      boxShadow: {
        soft: "0 20px 60px -30px rgba(15, 110, 86, 0.28)"
      }
    }
  },
  plugins: []
};
