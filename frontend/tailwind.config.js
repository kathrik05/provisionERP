/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Poppins", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      colors: {
        brand: {
          DEFAULT: "#0B6B61",
          dark: "#09584F",
        },
        app: {
          bg: "#EAF5F0",
          card: "#FFFFFF",
          border: "#E8ECE9",
          text: {
            primary: "#1E1E1E",
            secondary: "#6B7280",
          },
        },
      },
      boxShadow: {
        soft: "0 8px 30px rgba(0,0,0,0.04)",
        lift: "0 14px 40px rgba(0,0,0,0.06)",
        bloom: "0 10px 40px rgba(0,0,0,0.08)",
      },
      keyframes: {
        fadeInUp: {
          "0%": { opacity: 0, transform: "translateY(10px)" },
          "100%": { opacity: 1, transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-in-up": "fadeInUp 0.4s ease-out forwards",
      },
    },
  },
  plugins: [],
};
