// tailwind.config.js
// Configuration file for Tailwind CSS, defining content sources, custom theme extensions, and plugins for the Underwriter Dashboard project.

module.exports = {
  // Specify the files to scan for Tailwind CSS class names
  content: [
    "./index.html", // Include the main HTML file
    "./src/**/*.{js,ts,jsx,tsx}", // Include all JavaScript, TypeScript, JSX, and TSX files in the src directory
  ],
  // Extend the default Tailwind theme with custom styles
  theme: {
    extend: {
      // Custom color definitions
      colors: {
        primary: '#0463FF', // Define a primary blue color
        lightblue: '#E2EAFB', // Define a light blue color for backgrounds or accents
      },
      // Custom font family definitions
      fontFamily: {
        pp: ['"PP Neue Montreal"', 'sans-serif'], // Define 'pp' as a custom font family with fallback
      },
      // Custom letter spacing definitions
      letterSpacing: {
        wider3: '0.03em', // Define a 3% letter spacing utility
      },
      // Custom line height definitions
      lineHeight: {
        tight110: '1.1', // Define a tight line height of 110%
      },
    },
  },
  // Specify additional Tailwind plugins (none used in this project)
  plugins: [],
};