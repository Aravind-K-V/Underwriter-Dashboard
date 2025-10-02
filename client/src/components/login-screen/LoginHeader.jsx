// LoginHeader.jsx
// A React component that renders the header for authentication pages (e.g., login, forgot password, reset password) in the Underwriter Dashboard, featuring a logo, company name, icons, and a register button with navigation.

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
    console.info('[UI][LoginHeader] Component mounted');
  }, []);

  // Handler for navigating to the registration page
  const handleRegisterClick = () => {
    console.info('[Navigation][LoginHeader] Register button clicked, navigating to registration page');
    navigate('/register'); // Redirect to the /register route
  };

  const handleNotificationClick = () => {
    console.info('[UI][LoginHeader] Notification bell clicked');
  };

  const handleSettingsClick = () => {
    console.info('[UI][LoginHeader] Settings icon clicked');
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

        {/* Right Section: Icons and Register Button */}
        <div className="flex items-center gap-6">
          {/* Notification Bell Icon */}
          <Bell className="w-5 h-5 cursor-pointer" onClick={handleNotificationClick} />
          {/* Settings Icon */}
          <Settings className="w-5 h-5 cursor-pointer" onClick={handleSettingsClick} />
          {/* Register Button */}
          <button
            className="bg-[#3371F2] hover:bg-[#1349b4] px-5 py-[6px] rounded text-sm font-semibold font-['PP Neue Montreal'] transition duration-150"
            onClick={handleRegisterClick}
          >
            Register
          </button>
        </div>
      </header>
    </div>
  );
}