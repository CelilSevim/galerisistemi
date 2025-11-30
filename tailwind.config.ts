import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        // LOGO RENKLERİN BURADA TANIMLANDI 👇
        carbay: {
          gold: '#FFB700',  // Logodaki o canlı Sarı
          black: '#000000', // Logodaki tam Siyah
          dark: '#111111',  // Hafif yumuşak siyah (göz yormaması için)
          gray: '#F3F4F6'   // Zemin gri tonu
        }
      },
    },
  },
  plugins: [],
};
export default config;