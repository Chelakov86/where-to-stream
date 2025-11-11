import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: {
          DEFAULT: '#0a0a0f',
          secondary: '#1a1a2e',
        },
        text: {
          DEFAULT: '#e0e0e0',
          secondary: '#a0a0a0',
        },
        accent: {
          primary: '#00d4ff',
          secondary: '#ff6b35',
        },
      },
    },
  },
  plugins: [],
};
export default config;
