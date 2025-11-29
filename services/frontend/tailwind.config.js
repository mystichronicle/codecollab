/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Hacker theme colors
        'hacker': {
          'black': '#000000',
          'dark': '#0a0a0a',
          'darker': '#050505',
          'green': '#00ff00',
          'green-dark': '#00cc00',
          'green-light': '#33ff33',
          'green-dim': '#00aa00',
          'green-muted': '#006600',
          'terminal': '#0d1117',
        },
        // Override grays with darker variants
        'matrix': {
          50: '#0a0a0a',
          100: '#0d0d0d',
          200: '#111111',
          300: '#1a1a1a',
          400: '#222222',
          500: '#333333',
          600: '#444444',
          700: '#555555',
          800: '#666666',
          900: '#777777',
        }
      },
      fontFamily: {
        'mono': ['Fira Code', 'Monaco', 'Consolas', 'monospace'],
        'terminal': ['VT323', 'Courier New', 'monospace'],
      },
      boxShadow: {
        'neon': '0 0 5px #00ff00, 0 0 10px #00ff00, 0 0 15px #00ff00',
        'neon-sm': '0 0 2px #00ff00, 0 0 5px #00ff00',
        'neon-lg': '0 0 10px #00ff00, 0 0 20px #00ff00, 0 0 30px #00ff00',
      },
      animation: {
        'flicker': 'flicker 0.15s infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'typing': 'typing 3.5s steps(40, end), blink-caret 0.75s step-end infinite',
        'scanline': 'scanline 8s linear infinite',
      },
      keyframes: {
        flicker: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.8' },
        },
        glow: {
          '0%': { textShadow: '0 0 5px #00ff00, 0 0 10px #00ff00' },
          '100%': { textShadow: '0 0 10px #00ff00, 0 0 20px #00ff00, 0 0 30px #00ff00' },
        },
        scanline: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100%)' },
        },
      },
    },
  },
  plugins: [],
}

