/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.tsx", "./src/**/*.ts"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        bg: "#3b3b3f",
        fg: "#f1f1f1",
        card: "#4a4a4e",
        primary: "#e1e3e6",
        secondary: "#505055",
        muted: "#4a4a4e",
        accent: "#5a5a60",
        destructive: "#9e5e5e",
        border: "#505055",
        input: "#505055",
        chart: {
          1: "#a7c7e7",
          2: "#c1e1c1",
          3: "#fdfd96",
          4: "#ffb7ce",
          5: "#c3b1e1"
        }
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"]
      },
      borderRadius: {
        DEFAULT: "0.5rem"
      },
      boxShadow: {
        card: "0px 8px 15px rgba(0,0,0,30%)"
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0", transform: "translateX(-50%) translateY(-4px)" },
          "100%": { opacity: "1", transform: "translateX(-50%) translateY(0)" }
        }
      },
      animation: {
        "fade-in": "fade-in 0.15s ease-out"
      }
    }
  },
  plugins: []
}
