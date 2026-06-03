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
          DEFAULT: '#090b10',
          secondary: '#121821',
        },
        text: {
          DEFAULT: '#f4efe6',
          secondary: '#a9b0ad',
        },
        accent: {
          primary: '#f6b94b',
          secondary: '#53d2c6',
        },
      },
    },
  },
  plugins: [],
};
export default config;
