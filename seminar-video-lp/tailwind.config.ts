import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      boxShadow: {
        action: "0 12px 24px rgba(19, 122, 61, 0.22), inset 0 -3px 0 rgba(9, 84, 42, 0.28)",
        panel: "0 18px 45px rgba(22, 30, 45, 0.08)",
      },
      colors: {
        ink: "#1f2933",
        leaf: "#17a34a",
        leafDark: "#0f7a37",
        mist: "#f5f8f6",
        line: "#dfe7df",
      },
    },
  },
  plugins: [],
};

export default config;
