// Footer.jsx
// A React component that renders the footer for the Underwriter Dashboard, displaying branding and legal text with a company logo.

// Import required dependency
import React, { useEffect } from 'react';

// Define the Footer component
const Footer = () => {
  // Log component lifecycle
  useEffect(() => {
    console.info('[UI][Footer] Footer component mounted');
    
    return () => {
      console.debug('[UI][Footer] Footer component unmounting');
    };
  }, []);

  // Handle company logo load event
  const handleLogoLoad = () => {
    console.debug('[UI][Footer] Company logo loaded successfully');
  };

  // Handle company logo error event
  const handleLogoError = () => {
    console.error('[UI][Footer] Company logo failed to load');
  };

  return (
    // Main footer container with a fixed width of 800px and precise right padding
    // Note: Comment indicates a change back to w-[668px], but code uses w-[800px]
    <footer
      className="flex w-[800px] pr-4 justify-between items-start flex-shrink-0"
      style={{ paddingRight: '8px' }} // Override className padding with precise 8px right padding
    >
      {/* First Frame: Container for "Powered by" text and logo */}
      <div
        className="flex h-[8px] items-center"
        style={{ padding: '2.5px 109px 2.5px 0px' }} // Custom padding with typo '1o9px' (likely meant to be '109px')
      >
        {/* Second Frame: Contains "Powered by" text and logo */}
        <div className="flex h-6 items-start gap-2"> {/* 8px gap between text and logo */}
          {/* "Powered by" text */}
          <p
            className=""
            style={{
              width: '83px',
              height: '30px',
              color: 'rgba(0, 0, 0, 0.88)', // Semi-transparent black text
              fontFamily: 'PP Neue Montreal', // Custom font (must be included in project)
              fontSize: '16px',
              fontStyle: 'normal',
              fontWeight: 500,
              lineHeight: '16px', // 100% line height for tight text alignment
            }}
          >
            Powered by
          </p>
          {/* Frame for SVG Logo */}
          <div
            className=""
            style={{ width: '110px', height: '40px' }} // Container for logo
          >
            {/* Company logo image */}
            <img
              src="../src/assets/login-icons/company logo.svg"
              alt="Footer Logo"
              className="w-[90px] h-auto object-contain" // Logo sized to 90px width, maintaining aspect ratio
              onLoad={handleLogoLoad}
              onError={handleLogoError}
            />
          </div>
        </div>
      </div>
      {/* "Trusted by Securities" text */}
      <p
        className="text-right"
        style={{
          height: '450px', // Unusually large height, likely a typo or for specific layout
          color: 'rgba(0, 0, 0, 0.45)', // Semi-transparent gray text
          fontFamily: 'PP Neue Montreal', // Custom font (must be included in project)
          fontSize: '16px',
          fontStyle: 'normal',
          fontWeight: 400,
          lineHeight: '0px', // 0px line height may cause text overlap, likely a typo
        }}
      >
        Trusted by Securities. All rights reserved
      </p>
    </footer>
  );
};

// Export the component for use in other parts of the application
export default Footer;