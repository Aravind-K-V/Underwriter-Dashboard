// Layout.jsx
// A reusable React component that serves as the main layout for authentication pages in the Underwriter Dashboard, integrating a header, left section, right section, and footer.

// Import required dependency
import React from 'react';
// Import custom components
import LeftSection from './LeftSection';
import Footer from './Footer';
import Header from './Header';

// Define the Layout component, accepting dynamic RightComponent and CustomHeader props
const Layout = ({ RightComponent, CustomHeader }) => {
  return (
    // Main container with full-screen height and light blue background
    <div className="min-h-screen bg-blue-50 overflow-hidden">
      {/* Header: Renders CustomHeader if provided, otherwise falls back to default Header */}
      {CustomHeader ? <CustomHeader /> : <Header />}

      {/* Main content wrapper with responsive flex layout and padding */}
      <div className="relative flex flex-col lg:flex-row w-full mx-auto min-h-[calc(100vh-120px)] gap-4 px-4 pb-4">
        {/* Main content area with full width and calculated height */}
        <main className="w-full h-[calc(98vh-90px)] flex gap-4">
          {/* Left Section: Fixed width, scrollable content */}
          <div
            className="w-[42%] h-[85vh] overflow-auto bg-blue relative"
            style={{ borderRadius: '10px', overflow: 'hidden' }} // Rounded corners and hidden overflow
          >
            <LeftSection />
          </div>

          {/* Right Section: Dynamic component, scrollable content */}
          <div
            className="w-[58%] h-[85vh] overflow-auto bg-blue relative"
            style={{ borderRadius: '10px', overflow: 'hidden' }} // Rounded corners and hidden overflow
          >
            {/* Watermark: Positioned at bottom-right with reduced opacity */}
            <div className="absolute bottom-2 right-4">
              <img
                src="../src/assets/login-icons/watermark.svg"
                alt="Kazunov 1AI Watermark"
                className="w-200 h-auto opacity-70"
                style={{ filter: 'brightness(0.95)' }} // Slightly dimmed watermark
              />
            </div>
            {/* Content wrapper with padding and higher z-index to overlay watermark */}
            <div className="relative z-10 p-2">
              <RightComponent /> {/* Render dynamic right section component */}
            </div>
          </div>
        </main>

        {/* Footer: Positioned at bottom-right */}
        <div className="absolute bottom-1 h-6 right-6">
          <Footer />
        </div>
      </div>
    </div>
  );
};

// Export the component for use in other parts of the application
export default Layout;