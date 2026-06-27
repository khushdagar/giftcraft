import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./hooks/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: { "2xl": "1400px" },
    },
    extend: {
      // ── Surfaces & Canvas (from HTML --canvas / --surface system) ──
      colors: {
        canvas: "#FAFAF7",
        surface: "#FFFFFF",
        elevated: "#F5F5F0",
        recessed: "#EEEDE8",
        dark: { DEFAULT: "#1A1A18", 2: "#2A2A28" },
        ink: { DEFAULT: "#1A1A18", 2: "#6B6B63", 3: "#9B9B93" },
        inv: "#FAFAF7",

        // Primary — Emerald
        em: {
          DEFAULT: "#1A6B4F",
          50: "#E8F5EF",
          400: "#2DA366",
          600: "#145A42",
          700: "#0F4934",
        },

        // Accent — Gold
        gold: {
          DEFAULT: "#C4963C",
          50: "#FBF5E9",
          200: "#EDD5A3",
          700: "#886528",
        },

        // Functional
        err: "#C4402A",
        suc: "#2D8B56",
        warn: "#D4872A",

        // Borders
        bdr: { DEFAULT: "#E8E8E3", 2: "#D4D4CF" },

        // shadcn-compatible tokens
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },

      fontFamily: {
        sans: ["var(--font-roboto)", "system-ui", "-apple-system", "sans-serif"],
        serif: ["'Playfair Display'", "Georgia", "serif"],
        display: ["'Playfair Display'", "Georgia", "serif"],
      },

      fontSize: {
        "t-hero": [
          "clamp(2.8rem,8vw,5.5rem)",
          { lineHeight: "1.04", letterSpacing: "-0.02em", fontWeight: "400" },
        ],
        "t-display": [
          "clamp(2.2rem,5.5vw,3.8rem)",
          { lineHeight: "1.08", letterSpacing: "-0.015em" },
        ],
        "t-title": ["clamp(1.8rem,4vw,2.8rem)", { lineHeight: "1.15" }],
        "t-heading": ["clamp(1.3rem,3vw,1.8rem)", { lineHeight: "1.25" }],
      },

      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        "gc-s": "1.25rem",
        "gc": "2rem",
        "gc-l": "2.5rem",
        "gc-p": "999px",
      },

      boxShadow: {
        card: "0 2px 8px rgba(0,0,0,0.05), 0 4px 24px rgba(0,0,0,0.04)",
        hover: "0 8px 24px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.04)",
        float: "0 8px 32px rgba(0,0,0,0.10), 0 2px 8px rgba(0,0,0,0.04)",
        glow: "0 0 20px rgba(26,107,79,0.25), 0 0 60px rgba(26,107,79,0.10)",
      },

      transitionTimingFunction: {
        gc: "cubic-bezier(0.16, 1, 0.3, 1)",
      },

      backgroundImage: {
        glass: "rgba(255,255,255,0.72)",
      },

      keyframes: {
        fadeUp: {
          from: { opacity: "0", transform: "translateY(24px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        fadeIn: { from: { opacity: "0" }, to: { opacity: "1" } },
        scaleIn: {
          from: { opacity: "0", transform: "scale(0.92)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        floatB: {
          "0%,100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-8px)" },
        },
        marquee: {
          from: { transform: "translateX(0)" },
          to: { transform: "translateX(-50%)" },
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
        "fade-up": "fadeUp 0.8s cubic-bezier(0.16,1,0.3,1) both",
        "fade-in": "fadeIn 0.5s cubic-bezier(0.16,1,0.3,1) both",
        "scale-in": "scaleIn 0.4s cubic-bezier(0.16,1,0.3,1) both",
        "float-b": "floatB 4s ease-in-out infinite",
        marquee: "marquee 30s linear infinite",
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
