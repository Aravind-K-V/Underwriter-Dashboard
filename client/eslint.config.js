// .eslintrc.js
// ESLint configuration file for a React application, defining linting rules and environments.

// Export the ESLint configuration object
module.exports = {
  // Define the environments where the code will run
  env: {
    browser: true, // Enable browser globals (e.g., window, document)
    es2021: true, // Enable ECMAScript 2021 features and globals
  },
  // Extend existing ESLint configurations for consistent linting
  extends: [
    'eslint:recommended', // Use ESLint's recommended rules for general JavaScript
    'plugin:react/recommended', // Use recommended React-specific linting rules
    'plugin:react-hooks/recommended', // Use recommended rules for React Hooks
    'airbnb', // Use Airbnb's strict JavaScript/React style guide
  ],
  // Configure the parser for ECMAScript version and module type
  parserOptions: {
    ecmaVersion: 12, // Support ECMAScript 2021 (equivalent to ES12)
    sourceType: 'module', // Enable ES modules (import/export syntax)
  },
  // Enable plugins for additional linting capabilities
  plugins: [
    'react', // Enable React-specific linting rules
    'react-hooks', // Enable linting for React Hooks
    'react-refresh', // Enable linting for React Refresh (fast refresh in development)
  ],
  // Customize specific linting rules
  rules: {
    'react-refresh/only-export-components': 'warn', // Warn if non-component exports are detected (for React Refresh optimization)
    'react/prop-types': 'off', // Disable PropTypes validation (e.g., if using TypeScript or other type systems)
  },
};