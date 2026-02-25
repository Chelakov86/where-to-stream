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
        "primary-gold": "#F5B041",
        "midnight-plum-start": "#1A0F1F",
        "midnight-plum-end": "#0A050F",
        "muted-violet": "#2A1B38",
        "golden-bronze": "#4A3B28",
        "cream-text": "#F5F5DC",
        background: {
          DEFAULT: '#0A050F',
          secondary: '#1A0F1F',
        },
        text: {
          DEFAULT: '#FFFFFF',
          secondary: '#F5F5DC',
        },
        accent: {
          primary: '#F5B041',
          secondary: '#4A3B28',
        },
      },
      fontFamily: {
        "display": ["Spline Sans", "sans-serif"],
        "sans": ["Spline Sans", "sans-serif"]
      },
      borderRadius: {
        "DEFAULT": "1rem",
        "lg": "2rem",
        "xl": "3rem",
        "full": "9999px"
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/container-queries')
  ],
};
export default config;
