import daisyui from "daisyui";

/** @type {import('tailwindcss').Config} */
export default {
  daisyui: {
    theme: ["sunset"],
  },
  plugins: [daisyui],
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: true,
  theme: {
    extend: {},
  },
};
