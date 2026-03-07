/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#14522d',
          hover: '#0f3e22',
          light: '#1a6b3a',
        },
        // Light mode: soft green-tinted whites
        background: {
          light: '#eef5f0',   // gentle green-white
          dark: '#0d1b2a',    // cosmos deep navy-blue
        },
        surface: {
          DEFAULT: '#f4faf6', // light green-tinted white
          dark: '#132337',    // cosmos card blue
        },
        // Cosmos blue palette for dark mode
        cosmos: {
          900: '#0d1b2a',
          800: '#132337',
          700: '#1a3a5c',
          600: '#1e4d7b',
          500: '#2563a8',
          400: '#3b82d4',
          300: '#7eb3f0',
        },
        border: '#d1e8da',   // green-tinted border
      },
      fontFamily: {
        display: ['Mukta', 'Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        DEFAULT: '0.25rem',
        lg: '0.5rem',
        xl: '0.75rem',
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      animation: {
        'marquee': 'marquee 30s linear infinite',
        'float': 'float 6s ease-in-out infinite',
        'hero-gradient': 'heroGradient 8s ease infinite',
        'fade-in-up': 'fadeInUp 0.6s ease-out',
      },
      keyframes: {
        marquee: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-20px)' },
        },
        heroGradient: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}
