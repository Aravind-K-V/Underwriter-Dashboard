// LeftSection.jsx
// A React component that renders the left section of the authentication pages in the Underwriter Dashboard, displaying a hero image.

// Import required dependency
import React from 'react';

// Define the LeftSection component
const LeftSection = () => {
  return (
    // Container div that fills the parent width and height
    <div className="w-full h-full">
      {/* Hero image that fills the container with rounded corners */}
      <img
        src="../src/assets/login-icons/Hero.png"
        alt="Hero Section"
        className="w-full h-full object-fill rounded-[10px]"
      />
    </div>
  );
};

// Export the component for use in other parts of the application
export default LeftSection;