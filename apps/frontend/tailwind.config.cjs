/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./app/**/*.{js,ts,jsx,tsx,vue,svelte}",
    "./src/**/*.{js,ts,jsx,tsx,vue,svelte}",
    "./components/**/*.{js,ts,jsx,tsx,vue,svelte}",
  ],

  theme: {
    extend: {
      colors: {
        border: "var(--border)",
        input: "var(--input)",
        ring: "var(--ring)",
        background: "var(--background)",
        foreground: "var(--foreground)",
        primary: {
          DEFAULT: "var(--primary)",
          foreground: "var(--primary-foreground)",
        },
        secondary: {
          DEFAULT: "var(--secondary)",
          foreground: "var(--secondary-foreground)",
        },
        destructive: {
          DEFAULT: "var(--destructive)",
          foreground: "var(--destructive-foreground)",
        },
        muted: {
          DEFAULT: "var(--muted)",
          foreground: "var(--muted-foreground)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          foreground: "var(--accent-foreground)",
        },
        card: {
          DEFAULT: "var(--card)",
          foreground: "var(--card-foreground)",
        },
        popover: {
          DEFAULT: "var(--popover)",
          foreground: "var(--popover-foreground)",
        },
        apple: {
          primary: "var(--apple-primary)",
          "primary-focus": "var(--apple-primary-focus)",
          "primary-on-dark": "var(--apple-primary-on-dark)",
          ink: "var(--apple-ink)",
          "body-on-dark": "var(--apple-body-on-dark)",
          "body-muted": "var(--apple-body-muted)",
          "ink-muted-80": "var(--apple-ink-muted-80)",
          "ink-muted-48": "var(--apple-ink-muted-48)",
          canvas: "var(--apple-canvas)",
          parchment: "var(--apple-parchment)",
          "surface-tile-1": "var(--apple-surface-tile-1)",
          hairline: "var(--apple-hairline)",
          "divider-soft": "var(--apple-divider-soft)",
          "on-primary": "var(--apple-on-primary)",
          "on-dark": "var(--apple-on-dark)",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        "apple-xs": "5px",
        "apple-sm": "8px",
        "apple-md": "11px",
        "apple-lg": "18px",
        "apple-pill": "9999px",
      },
      spacing: {
        "apple-xxs": "4px",
        "apple-xs": "8px",
        "apple-sm": "12px",
        "apple-md": "17px",
        "apple-lg": "24px",
        "apple-xl": "32px",
        "apple-xxl": "48px",
        "apple-section": "80px",
      },
    },
  },

  plugins: [require("tailwindcss-animate")],
};
