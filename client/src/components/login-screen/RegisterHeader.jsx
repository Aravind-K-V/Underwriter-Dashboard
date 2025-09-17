// RegisterHeader.jsx
// A React component that renders the header for authentication pages in the Underwriter Dashboard, featuring a logo, company name, icons, and a login button with navigation.

// Import required dependencies
import React, { useEffect } from 'react';
import { Bell, Settings } from 'lucide-react'; // Icons for notifications and settings
import { useNavigate } from 'react-router-dom'; // Hook for programmatic navigation

// Define the LoginHeader component
export default function LoginHeader() {
  // Initialize navigation hook
  const navigate = useNavigate();

  // Log component lifecycle
  useEffect(() => {
    console.info('[UI][RegisterHeader] Component mounted');
  }, []);

  // Handler for navigating to the login page
  // Note: Button is labeled "Login" and navigates to /login, which may be redundant on a login page
  const handleRegisterClick = () => {
    console.info('[Navigation][RegisterHeader] Login button clicked, navigating to login page');
    navigate('/login'); // Redirect to the /login route
  };

  const handleNotificationClick = () => {
    console.info('[UI][RegisterHeader] Notification bell clicked');
  };

  const handleSettingsClick = () => {
    console.info('[UI][RegisterHeader] Settings icon clicked');
  };

  return (
    // Outer container with margins for spacing (8px left/right, 8px top, 4px bottom)
    <div className="mx-4 mt-3 mb-2">
      {/* Header element with dark blue background, full width, 62px height, and rounded corners */}
      <header className="bg-[#0D1B4C] w-full h-[62px] flex items-center justify-between px-8 rounded-xl text-white shadow-sm">
        {/* Left Section: Logo and Company Name */}
        <div className="flex items-center space-x-3 ml-2">
          {/* Logo image */}
          <img src="/src/assets/login-icons/logo.svg" alt="Logo" className="h-[25px]" />
          {/* Company name with custom font and bold styling */}
          <span className="text-xl font-semibold font-['PP Neue Montreal']">
            Kazunov1AI
          </span>
        </div>

        {/* Right Section: Icons and Login Button */}
        <div className="flex items-center gap-6">
          {/* Notification Bell Icon */}
          <Bell className="w-5 h-5 cursor-pointer" onClick={handleNotificationClick} />
          {/* Settings Icon */}
          <Settings className="w-5 h-5 cursor-pointer" onClick={handleSettingsClick} />
          {/* Login Button */}
          <button
            className="bg-[#3371F2] hover:bg-[#1349b4] px-5 py-[6px] rounded text-sm font-semibold font-['PP Neue Montreal'] transition duration-150"
            onClick={handleRegisterClick}
          >
            Login
          </button>
        </div>
      </header>
    </div>
  );
}