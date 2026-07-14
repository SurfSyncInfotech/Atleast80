/** @type {import('tailwindcss').Config} */
module.exports = {
  // NOTE: Update this to include the paths to all of your component files.
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#0B6B3A',
          light: '#4CAF50',
          dark: '#064d29',
        },
        secondary: {
          DEFAULT: '#F4C400',
          light: '#FFD740',
        },
        accent: '#FF6B00',
        cream: {
          DEFAULT: '#F8F8F5',
          dark: '#F0EFE8',
        },
        dark: {
          DEFAULT: '#1F1F1F',
          light: '#4A4A4A',
        },
        gray: {
          DEFAULT: '#7A7A7A',
          light: '#E8E8E8',
        },
        success: '#4CAF50',
        warning: '#FF9800',
        error: '#F44336',
      },
      fontFamily: {
        poppins: ['Poppins', 'sans-serif'],
        nunito: ['Nunito', 'sans-serif'],
      },
      borderRadius: {
        sm: '8px',
        md: '12px',
        lg: '18px',
        xl: '24px',
      }
    },
  },
  plugins: [],
}
