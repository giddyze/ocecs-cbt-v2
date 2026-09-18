import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          navy: "#0F2A4A",
          navyDeep: "#0A1D33",
          gold: "#D4A843",
          teal: "#007B83",
          coral: "#E86A5C",
          // Secondary accent, additive only — sampled from the OCECS logo.
          // Reserved for new UI (nav dropdown, new focus rings), never a
          // replacement for existing gold/teal/coral usage.
          orange: "#E8792B"
        }
      },
      keyframes: {
        // Referenced by the landing page's animate-[fadeIn_0.6s_ease-out]
        // utility, which had no matching keyframe defined until now.
        fadeIn: {
          "0%": { opacity: "0", transform: "translateY(4px)" },
          "100%": { opacity: "1", transform: "translateY(0)" }
        },
        dropdownOpen: {
          "0%": { opacity: "0", transform: "translateY(-6px) scale(0.98)" },
          "100%": { opacity: "1", transform: "translateY(0) scale(1)" }
        },
        dangle: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(3px)" }
        },
        nudge: {
          "0%, 100%": { transform: "translateX(0)" },
          "50%": { transform: "translateX(2px)" }
        },
        breathe: {
          "0%, 100%": { transform: "scale(1)", opacity: "1" },
          "50%": { transform: "scale(1.015)", opacity: "0.92" }
        },
        floatSlow: {
          "0%, 100%": { transform: "translateY(0) rotate(0deg)" },
          "50%": { transform: "translateY(-14px) rotate(4deg)" }
        },
        floatSlowReverse: {
          "0%, 100%": { transform: "translateY(0) rotate(0deg)" },
          "50%": { transform: "translateY(12px) rotate(-3deg)" }
        },
        shake: {
          "0%, 100%": { transform: "translateX(0)" },
          "20%": { transform: "translateX(-4px)" },
          "40%": { transform: "translateX(4px)" },
          "60%": { transform: "translateX(-3px)" },
          "80%": { transform: "translateX(3px)" }
        },
        countUp: {
          "0%": { opacity: "0", transform: "translateY(6px)" },
          "100%": { opacity: "1", transform: "translateY(0)" }
        },
        springIn: {
          "0%": { transform: "scale(0.5)", opacity: "0" },
          "60%": { transform: "scale(1.1)", opacity: "1" },
          "100%": { transform: "scale(1)", opacity: "1" }
        },
        colorSweep: {
          "0%": { filter: "brightness(1)" },
          "50%": { filter: "brightness(1.35)" },
          "100%": { filter: "brightness(1)" }
        },
        slideDown: {
          "0%": { opacity: "0", transform: "translateY(-12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" }
        },
        gradientDrift: {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" }
        },
        glowPulse: {
          "0%, 100%": { opacity: "0.55", transform: "scale(1)" },
          "50%": { opacity: "0.9", transform: "scale(1.06)" }
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" }
        }
      },
      animation: {
        fadeIn: "fadeIn 0.6s ease-out",
        dropdownOpen: "dropdownOpen 180ms ease-out",
        dangle: "dangle 1.8s ease-in-out infinite",
        nudge: "nudge 2s ease-in-out infinite",
        breathe: "breathe 2.5s ease-in-out infinite",
        floatSlow: "floatSlow 7s ease-in-out infinite",
        floatSlowReverse: "floatSlowReverse 8.5s ease-in-out infinite",
        shake: "shake 400ms ease-in-out",
        countUp: "countUp 300ms ease-out",
        springIn: "springIn 400ms cubic-bezier(0.34, 1.56, 0.64, 1)",
        colorSweep: "colorSweep 500ms ease-out",
        slideDown: "slideDown 300ms ease-out",
        gradientDrift: "gradientDrift 12s ease-in-out infinite",
        glowPulse: "glowPulse 4s ease-in-out infinite",
        shimmer: "shimmer 3.5s linear infinite"
      }
    }
  },
  plugins: []
};
export default config;
