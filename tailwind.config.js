/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./entrypoints/**/*.{html,ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],

  theme: {
    extend: {
      colors: {
        hammy: {
          50: "#EEF1FE",
          100: "#DEE4FC",
          200: "#B7C4FA",
          300: "#8197F8",
          400: "#395DF9",
          500: "#022CE2",
          600: "#0527BA",
          700: "#062093",
          800: "#071B71",
          900: "#081449",
          950: "#060E2D",

          paper: "#FFFFFF",
          cream: "#F5F6FA",
          ink: "#0B1330",
        },
      },

      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "Inter",
          "Segoe UI",
          "system-ui",
          "sans-serif",
        ],
      },

      keyframes: {
        breathe: {
          "0%, 100%": {
            transform: "scale(1)",
          },
          "50%": {
            transform: "scale(1.05)",
          },
        },

        float: {
          "0%, 100%": {
            transform: "translateY(0px)",
          },
          "50%": {
            transform: "translateY(-4px)",
          },
        },

        wiggle: {
          "0%, 100%": {
            transform: "rotate(-2deg)",
          },
          "50%": {
            transform: "rotate(2deg)",
          },
        },

        popIn: {
          "0%": {
            transform: "scale(0.92)",
            opacity: "0",
          },
          "100%": {
            transform: "scale(1)",
            opacity: "1",
          },
        },
      },

      animation: {
        breathe: "breathe 3.2s ease-in-out infinite",
        float: "float 3.5s ease-in-out infinite",
        wiggle: "wiggle 1.8s ease-in-out infinite",
        "pop-in": "popIn 0.28s cubic-bezier(0.34, 1.56, 0.64, 1) both",
      },
    },
  },

  plugins: [],
};
