// main.jsx (or index.jsx)
// The entry point for the React application, responsible for rendering the root component into the DOM.

// Import StrictMode from React to enable additional development checks
import { StrictMode } from 'react';
// Import createRoot from react-dom/client for rendering the React application
import { createRoot } from 'react-dom/client';
// Import global stylesheet
import './index.css';
// Import the root App component
import App from './App.jsx';

// Render the application into the DOM
createRoot(document.getElementById('root')).render(
  // Wrap the App component in StrictMode for enhanced development warnings
  <StrictMode>
    <App />
  </StrictMode>
);