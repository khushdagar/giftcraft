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
      // 2rem each side eats too much of a phone screen — halve it below sm.
      padding: { DEFAULT: "1rem", sm: "2rem" },
      screens: { "2xl": "1400px" },
    },
    extend: {
      // Custom breakpoint for the navbar's "Help is here" call pill: it needs
      // both the icon AND the number, and 1100px is the narrowest width where
      // the full pill fits without crowding search + account + cart.
      screens: { nav: "1100px" },

      // ── Surfaces & Canvas ──
      // Brand palette, taken from the GIVOO logo:
      //   Jet Black #000000 · Burgundy #800020
      //   Warm Ivory #F5F1EB · Soft White #FAFAFA · Dark Graphite #222222
      colors: {
        canvas: "#F5F1EB",      // Warm Ivory — page background
        surface: "#FFFFFF",     // cards sit crisp on the ivory canvas
        elevated: "#FAFAFA",    // Soft White
        recessed: "#EDE7DC",    // deeper ivory for inset panels
        dark: { DEFAULT: "#000000", 2: "#222222" },   // Jet Black / Dark Graphite
        ink: { DEFAULT: "#222222", 2: "#5C5852", 3: "#8F8A82" },
        inv: "#F5F1EB",

        // Primary — Burgundy
        em: {
          DEFAULT: "#800020",
          50: "#FBF4F5",
          100: "#F6E6E9",
          200: "#EBC9D0",
          300: "#D9A0AB",
          400: "#B04057",
          600: "#6B001B",
          700: "#560015",
          800: "#3D000F",
        },

        // Tailwind's built-in `emerald`/`teal` palettes are still used in ~46
        // files from the old green theme. Rather than rewrite every call site,
        // remap the scale onto Burgundy so `bg-emerald-600` etc. land on brand.
        emerald: {
          50: "#FBF4F5",
          100: "#F6E6E9",
          200: "#EBC9D0",
          300: "#D9A0AB",
          400: "#B04057",
          500: "#940025",
          600: "#800020",
          700: "#6B001B",
          800: "#560015",
          900: "#3D000F",
          950: "#26000A",
        },
        teal: {
          50: "#FBF4F5",
          100: "#F6E6E9",
          200: "#EBC9D0",
          300: "#D9A0AB",
          400: "#B04057",
          500: "#940025",
          600: "#800020",
          700: "#6B001B",
          800: "#560015",
          900: "#3D000F",
          950: "#26000A",
        },

        // Accent — Graphite / Ivory neutral tier
        gold: {
          DEFAULT: "#3A3A3A",
          50: "#F5F1EB",
          200: "#DED7CA",
          300: "#C9C0AF",
          700: "#222222",
          800: "#111111",
          900: "#000000",
        },

        // Functional
        err: "#C4402A",
        suc: "#2D8B56",
        warn: "#D4872A",

        // Borders
        bdr: { DEFAULT: "#E5DFD4", 2: "#D3CBBC" },

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
        sans: ["var(--font-dm-sans)", "system-ui", "-apple-system", "sans-serif"],
        serif: ["var(--font-playfair)", "Georgia", "serif"],
        display: ["var(--font-playfair)", "Georgia", "serif"],
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
        glow: "0 0 20px rgba(128,0,32,0.25), 0 0 60px rgba(128,0,32,0.10)",
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
        // Dialog open animation. Must carry the translate(-50%,-50%) centering
        // in every frame — a plain scale() keyframe would overwrite the
        // transform-based centering and shove the dialog off-center.
        dialogIn: {
          from: { opacity: "0", transform: "translate(-50%, -48%) scale(0.96)" },
          to: { opacity: "1", transform: "translate(-50%, -50%) scale(1)" },
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
        "dialog-in": "dialogIn 0.4s cubic-bezier(0.16,1,0.3,1) both",
        "float-b": "floatB 4s ease-in-out infinite",
        marquee: "marquee 30s linear infinite",
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate"), require("@tailwindcss/typography")],
};

export default config;
