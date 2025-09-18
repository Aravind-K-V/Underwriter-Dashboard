// LeftSection.jsx
// A React component that renders the left section of the authentication pages in the Underwriter Dashboard, displaying a hero image.

// Import required dependency
import React, { useEffect } from 'react';

// Define the LeftSection component
const LeftSection = () => {
  // Log component lifecycle
  useEffect(() => {
    console.info('[UI][LeftSection] Hero section mounted');
    
    return () => {
      console.debug('[UI][LeftSection] Hero section unmounting');
    };
  }, []);

  // Handle hero image load event
  const handleHeroImageLoad = () => {
    console.debug('[UI][LeftSection] Hero image loaded successfully');
  };

  // Handle hero image error event
  const handleHeroImageError = () => {
    console.error('[UI][LeftSection] Hero image failed to load');
  };

  return (
    // Container div that fills the parent width and height
    <div className="w-full h-full">
      {/* Hero image that fills the container with rounded corners */}
      <img
        src="../src/assets/login-icons/Hero.png"
        alt="Hero Section"
        className="w-full h-full object-fill rounded-[10px]"
        onLoad={handleHeroImageLoad}
        onError={handleHeroImageError}
      />
    </div>
  );
};

// Export the component for use in other parts of the application
export default LeftSection;