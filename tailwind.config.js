/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // L'Interligne — a director's marked-up sides. Cool newsprint stock,
        // graphite ink, a hot annotation red. Serious but warm.
        stock: {
          DEFAULT: "#eae6dc", // page
          light: "#f3f0e8",
          dim: "#ded9cc",
          shade: "#cdc7b6",
        },
        graphite: {
          DEFAULT: "#22201d", // ink
          soft: "#4a463f",
          faint: "#7d776b",
        },
        // annotation red — the director's grease pencil
        grease: "#c33d2e",
        // the five tactic families
        fam: {
          aggression: "#c0392b", // red family
          "aggression-ink": "#5c1a13",
          vulnerability: "#2f6fb0", // blue
          "vulnerability-ink": "#173a5e",
          control: "#c98a12", // amber
          "control-ink": "#6a4708",
          connection: "#3f8f5b", // green
          "connection-ink": "#1f4a2e",
          evasion: "#8158a8", // violet
          "evasion-ink": "#432a5c",
        },
      },
      fontFamily: {
        // cue lines & tactics: a screenplay courier-adjacent mono
        cue: ['"Courier Prime"', "ui-monospace", "monospace"],
        // headings: a strong editorial slab
        slab: ['"Zilla Slab"', "Georgia", "serif"],
        // subtext / reading: a warm readable serif
        read: ['"Newsreader"', "Georgia", "serif"],
        // small UI labels
        sans: ['"IBM Plex Sans"', "system-ui", "sans-serif"],
      },
      boxShadow: {
        side: "0 1px 0 0 rgba(34,32,29,0.06), 0 10px 30px -18px rgba(34,32,29,0.35)",
        lift: "0 2px 0 0 rgba(34,32,29,0.08), 0 18px 40px -22px rgba(34,32,29,0.45)",
      },
      keyframes: {
        riseIn: {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        pulseInk: {
          "0%, 100%": { opacity: "0.3" },
          "50%": { opacity: "1" },
        },
        sweep: {
          "0%": { transform: "translateX(-120%)" },
          "100%": { transform: "translateX(120%)" },
        },
      },
      animation: {
        riseIn: "riseIn 0.4s ease-out both",
        pulseInk: "pulseInk 1.1s ease-in-out infinite",
        sweep: "sweep 1.4s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
