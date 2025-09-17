// PrivateRoute.jsx
// A React component that acts as a route guard for the Underwriter Dashboard, ensuring only authenticated users can access protected routes by checking localStorage.

// Import required dependency
import { Navigate } from 'react-router-dom'; // Component for programmatic navigation

// Define the PrivateRoute component, accepting children to render if authenticated
const PrivateRoute = ({ children }) => {
  // Check authentication status from localStorage
  const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';
  // Debug log to track authentication status and current path
  console.log('PrivateRoute - isAuthenticated:', isAuthenticated, 'Path:', window.location.pathname);
  
  // Conditionally render children if authenticated, otherwise redirect to login
  return isAuthenticated ? children : <Navigate to="/login" />;
};

// Export the component for use in the application's routing configuration
export default PrivateRoute;