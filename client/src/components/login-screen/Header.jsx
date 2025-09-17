// Header.jsx
// A React component that renders the header for the Underwriter Dashboard, featuring a logo, company name, icons, profile information, and a logout button.

// Import required dependencies
import React from 'react';
import { Bell, Settings } from 'lucide-react'; // Import icons from lucide-react library

// Define the Header component
export default function Header() {
  return (
    // Outer container with margins for spacing (8px left/right, 8px top, 4px bottom)
    <div className="mx-4 mt-3 mb-2">
      {/* Header element with dark blue background, full width, 62px height, and rounded corners */}
      <header
        className="bg-[#0D1B4C] w-full h-[62px] mx-auto flex items-center justify-between text-white px-8 rounded-xl"
      >
        {/* Left Section: Logo and Company Name */}
        <div className="flex items-center space-x-3 ml-2">
          {/* Logo image */}
          <img src="/assets/logo.svg" alt="Logo" className="h-[25px]" />
          {/* Company name with bold styling and non-selectable text */}
          <span className="text-xl font-semibold select-none">Kazunov1AI</span>
        </div>
        {/* Spacer to maintain layout balance (138px width) */}
        <div className="w-[138px]" />
        {/* Right Section: Icons, Profile, and Logout Button */}
        <div className="flex items-center space-x-6">
          {/* Notification Bell Icon */}
          <Bell className="w-[20px] h-[20px] cursor-pointer" />
          {/* Settings Icon */}
          <Settings className="w-[20px] h-[20px] cursor-pointer" />
          {/* Profile Section */}
          <div className="flex items-center space-x-2 select-none">
            {/* Profile picture */}
            <img
              src="/assets/profilepic.svg"
              alt="Profile"
              className="w-[35px] h-[35px] rounded-full"
            />
            {/* Profile name and dropdown arrow */}
            <div className="flex items-center space-x-1">
              <span className="text-sm font-medium">Shubham</span>
              {/* Dropdown arrow SVG */}
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </div>
          </div>
          {/* Logout Button */}
          <button className="bg-blue-600 px-4 py-2 rounded hover:bg-red-700 text-sm font-semibold">
            LOG OUT
          </button>
        </div>
      </header>
    </div>
  );
}