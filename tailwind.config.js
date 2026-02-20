/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        datadog: {
          purple: '#5B309C',
          'purple-dark': '#432372',
          'purple-light': '#7B4DC4',
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
};
