import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      screens: {
        "sm-590": "590px",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
        serif: ["Playfair Display", "Georgia", "serif"],
        // App do cliente (protótipo Sol)
        display: ['"Bricolage Grotesque"', "Trebuchet MS", "sans-serif"],
        corpo: ["Figtree", "system-ui", "-apple-system", "Segoe UI", "sans-serif"],
      },
      colors: {
        // Identidade do app do cliente — tokens do protótipo Sol
        sol: {
          sun: "#F5B40F",
          mar: "#0B5F8A",
          fundo: "#0E2F45",
          "fundo-2": "#173F58",
          areia: "#FBF7F0",
          linha: "#E8DFD0",
          borda: "#CFC4B1",
          texto2: "#44565D",
          claro: "#DFF3F7",
          "claro-texto": "#0A4A6B",
          "azul-suave": "#CDE6F0",
          creme: "#FEF1CC",
          "creme-texto": "#5C3D00",
          bege: "#EDE7DC",
          sos: "#B42318",
          "sos-claro": "#FFF6F4",
          ok: "#1E6B4F",
          "ok-claro": "#DCEFE6",
          "ok-texto": "#14533C",
          atencao: "#FFF1D6",
          "atencao-borda": "#D99A1E",
          "atencao-texto": "#3D2C05",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
          hover: "hsl(var(--primary-hover))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
          hover: "hsl(var(--secondary-hover))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
          red: "hsl(var(--accent-red))",
          pink: "hsl(var(--accent-pink))",
        },
        vibrant: {
          yellow: "hsl(var(--card-yellow))",
          purple: "hsl(var(--card-purple))",
          magenta: "hsl(var(--card-magenta))",
          blue: "hsl(var(--card-blue))",
          coral: "hsl(var(--card-coral))",
          mint: "hsl(var(--card-mint))",
          orange: "hsl(var(--card-orange))",
          lavender: "hsl(var(--card-lavender))",
        },
        status: {
          success: "hsl(var(--success))",
          warning: "hsl(var(--warning))",
          error: "hsl(var(--error))",
          info: "hsl(var(--info))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: {
            height: "0",
          },
          to: {
            height: "var(--radix-accordion-content-height)",
          },
        },
        "accordion-up": {
          from: {
            height: "var(--radix-accordion-content-height)",
          },
          to: {
            height: "0",
          },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate"), require("@tailwindcss/typography")],
} satisfies Config;
