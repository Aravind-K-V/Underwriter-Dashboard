// RightSectionForgot.jsx
// A React component that renders the right section of the forgot password page in the Underwriter Dashboard, allowing users to request a password reset link via email.

// Import required dependencies
import React, { useState, useEffect } from 'react';
import axios from 'axios'; // Library for making HTTP requests
import { useNavigate } from 'react-router-dom'; // Hook for programmatic navigation
import ErrorPopup from './ErrorPopup'; // Import the ErrorPopup component

// Define the RightSectionForgot component
const RightSectionForgot = () => {
  // State to store the email input for password reset
  const [resetEmail, setResetEmail] = useState('');
  // State to store error messages
  const [errorMsg, setErrorMsg] = useState('');
  // State to indicate successful reset link request
  const [resetSuccess, setResetSuccess] = useState(false);
  // Initialize navigation hook
  const navigate = useNavigate();

  // Log component lifecycle
  useEffect(() => {
    console.info('[Auth][RightSectionForgot] Component mounted');
  }, []);

  // Handle sending the password reset link
  const handleSendResetLink = async () => {
    console.info('[Auth][RightSectionForgot] Password reset link request initiated:', { email: resetEmail });
    
    // Validate email input
    if (!resetEmail) {
      console.warn('[Auth][RightSectionForgot] Email validation failed: empty email');
      setErrorMsg('Email is required');
      return;
    }

    try {
      console.debug('[Auth][RightSectionForgot] Sending password reset request to API');
      // Send request to forgot-password API endpoint
      const res = await axios.post('http://13.232.45.218:5000/api/forgot-password', {
        email_id: resetEmail, // Match backend expected field name
      });

      console.debug('[Auth][RightSectionForgot] API response received:', { success: res.data.success });

      if (res.data.success) {
        console.info('[Auth][RightSectionForgot] Password reset link sent successfully');
        setResetSuccess(true); // Indicate successful request
        setErrorMsg(''); // Clear any previous errors
        setTimeout(() => {
          console.info('[Auth][RightSectionForgot] Navigating to login page');
          navigate('/login');
        }, 2000); // Navigate to login page after 2 seconds
      } else {
        console.warn('[Auth][RightSectionForgot] Password reset link request failed:', res.data.message);
        setErrorMsg(res.data.message || 'Failed to send confirmation link'); // Display server error
      }
    } catch (err) {
      console.error('[Auth][RightSectionForgot] Password reset link request error:', err.response?.data?.message || err.message);
      // Handle network or server errors
      setErrorMsg(err.response?.data?.message || 'Error sending confirmation link');
    }
  };

  return (
    <>
      {/* Error Popup */}
      {errorMsg && (
        <ErrorPopup 
          message={errorMsg} 
          onClose={() => setErrorMsg('')} 
          type="error"
        />
      )}
      
      {/* Success Popup */}
      {resetSuccess && (
        <ErrorPopup 
          message="Confirmation link sent successfully! Check your email to reset your password." 
          onClose={() => setResetSuccess(false)} 
          type="success"
        />
      )}

      {/* Main container with full width/height, centered content, and padding */}
      <div className="w-full h-full flex flex-col justify-center items-center px-10 py-12 bg-transparent">
        {/* Form container with fixed width and spacing */}
        <div className="w-[561px] flex flex-col items-start gap-4">
          {/* Header section */}
          <div className="flex flex-col justify-center items-start gap-1">
            <h2 className="text-[35px] text-[#0F012A] font-medium leading-[49px] tracking-[-0.35px] font-['PP Neue Montreal']">
              Forgot Password
            </h2>
            <p className="text-[#534B68] text-[16px] leading-[24px] font-normal font-['PP Neue Montreal']">
              Enter your registered email to receive a password reset link
            </p>
          </div>
          {/* Email input section */}
          <div className="w-full flex flex-col items-start gap-[10px]">
            <label className="text-sm text-[#000] font-['PP Neue Montreal']">Enter Registered Email</label>
            <input
              type="email"
              value={resetEmail}
              onChange={(e) => setResetEmail(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSendResetLink();
                }
              }}
              placeholder="Input your email ID here"
              className="w-full h-[45px] px-3 rounded-[6px] border border-[rgba(0,0,0,0.15)] bg-white text-[#000] text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              autoFocus // Automatically focus input on render
            />
          </div>
          {/* Action buttons */}
          <div className="w-full flex justify-between mt-2">
            <button
              className="px-4 py-2 bg-[#E5E7EB] text-[#000] rounded-[6px] text-[14px] font-medium tracking-[0.42px] font-['PP Neue Montreal'] hover:bg-[#D1D5DB]"
              onClick={() => navigate('/login')} // Navigate back to login page
            >
              Cancel
            </button>
            <button
              className="px-4 py-2 bg-[#3371F2] text-white rounded-[6px] text-[14px] font-medium tracking-[0.42px] font-['PP Neue Montreal'] hover:bg-[#2a5ac8]"
              onClick={handleSendResetLink} // Trigger reset link request
            >
              Send Reset Link
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

// Export the component for use in other parts of the application
export default RightSectionForgot;
