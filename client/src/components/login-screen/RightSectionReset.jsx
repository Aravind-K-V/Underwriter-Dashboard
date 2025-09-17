// RightSectionReset.jsx
// A React component that renders the right section of the password reset page in the Underwriter Dashboard, allowing users to reset their password using a token and email from the reset link.

// Import required dependencies
import React, { useState, useEffect } from 'react';
import axios from 'axios'; // Library for making HTTP requests
import { useNavigate, useLocation } from 'react-router-dom'; // Hooks for navigation and accessing URL parameters
import ErrorPopup from './ErrorPopup'; // Import the ErrorPopup component

// Define the RightSectionReset component
const RightSectionReset = () => {
  // State for new password input
  const [newPassword, setNewPassword] = useState('');
  // State for confirm password input
  const [confirmPassword, setConfirmPassword] = useState('');
  // State for error messages
  const [errorMsg, setErrorMsg] = useState('');
  // State to indicate successful password reset
  const [resetSuccess, setResetSuccess] = useState(false);
  // State to track token validity
  const [isTokenValid, setIsTokenValid] = useState(null);
  // Initialize navigation hook
  const navigate = useNavigate();
  // Initialize location hook to access query parameters
  const location = useLocation();

  // Email validation helper function
  const validateEmail = (email) => {
    const re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@(([^<>()[\]\\.,;:\s@\"]+\.)+[^<>()[\]\\.,;:\s@\"]{2,})$/i;
    return re.test(String(email).toLowerCase());
  };

  // Extract token and email_id from URL query parameters
  const getQueryParams = () => {
    const params = new URLSearchParams(location.search);
    return {
      token: params.get('token'),
      email_id: params.get('email_id'),
    };
  };

  // Add handler to clear error
  const clearErrorMsg = () => setErrorMsg('');
  
  // Add handler to clear success message
  const clearSuccessMsg = () => setResetSuccess(false);

  // Validate token and query parameters on component mount
  useEffect(() => {
    const { token, email_id } = getQueryParams();
    console.log('RightSectionReset mounted', { token, email_id });

    if (!token || !email_id) {
      console.error('Missing token or email_id in URL');
      setErrorMsg('Invalid or missing reset link. Please request a new link.');
      setIsTokenValid(false);
      return;
    }

    // Validate email format
    if (!validateEmail(email_id)) {
      console.error('Invalid email format in URL');
      setErrorMsg('Invalid email format in reset link. Please request a new link.');
      setIsTokenValid(false);
      return;
    }

    const validateToken = async () => {
      try {
        console.log('Calling /api/validate-reset-token with:', { token, email_id });
        const response = await axios.get('http://13.232.45.218:5000/api/validate-reset-token', {
          params: { token, email_id },
        });
        console.log('Validate token response:', response.data);
        if (response.data.success) {
          setIsTokenValid(true);
        } else {
          setErrorMsg(response.data.message || 'Password already changed');
          setIsTokenValid(false);
        }
      } catch (error) {
        console.error('Token validation error:', error.message, error.response?.data);
        setErrorMsg(error.response?.data?.message || 'Failed to validate reset link');
        setIsTokenValid(false);
      }
    };

    validateToken();
  }, []);

  // Handle password reset submission with email validation
  const handleResetPassword = async () => {
    const { token, email_id } = getQueryParams();
    
    // Validate email presence
    if (!email_id) {
      setErrorMsg('Email is required. Please use a valid reset link.');
      return;
    }
    
    // Validate email format
    if (!validateEmail(email_id)) {
      setErrorMsg('Invalid email format. Please request a new reset link.');
      return;
    }
    
    // Validate token presence
    if (!token) {
      setErrorMsg('Invalid or missing reset link. Please request a new link.');
      return;
    }
    
    // Validate password inputs
    if (!newPassword || !confirmPassword) {
      setErrorMsg('Both password fields are required');
      return;
    }
    
    if (newPassword !== confirmPassword) {
      setErrorMsg('Passwords do not match');
      return;
    }

    try {
      console.log('Submitting reset password:', { token, email_id, newPassword });
      const res = await axios.post('http://13.232.45.218:5000/api/reset-password', {
        token,
        email_id, // Match backend expected field name
        new_password: newPassword, // Match backend expected field name
      });

      if (res.data.success) {
        setResetSuccess(true); // Indicate successful reset
        setErrorMsg(''); // Clear error message
        setTimeout(() => {
          console.log('Redirecting to /login');
          navigate('/login');
        }, 2000); // Navigate to login page after 2 seconds
      } else {
        setErrorMsg(res.data.message || 'Failed to reset password'); // Display server error
      }
    } catch (err) {
      // Handle network or server errors
      console.error('Reset password error:', err.message, err.response?.data);
      setErrorMsg(err.response?.data?.message || 'Error resetting password');
    }
  };

  // Show loading state while validating token
  if (isTokenValid === null) {
    console.log('Rendering loading state');
    return (
      <>
        {/* Error Popup */}
        {errorMsg && (
          <ErrorPopup 
            message={errorMsg} 
            onClose={clearErrorMsg} 
            type="error"
          />
        )}
        
        <div className="w-full h-full flex flex-col justify-center items-center px-10 py-12 bg-transparent">
          <div className="w-[561px] flex flex-col items-start gap-4">
            <div className="flex flex-col justify-center items-start gap-1">
              <h2 className="text-[35px] text-[#0F012A] font-medium leading-[49px] tracking-[-0.35px] font-['PP Neue Montreal']">
                Reset Password
              </h2>
              <p className="text-[#534B68] text-[16px] leading-[24px] font-normal font-['PP Neue Montreal']">
                Validating reset link...
              </p>
            </div>
          </div>
        </div>
      </>
    );
  }

  // Show error message for invalid/used token
  if (!isTokenValid) {
    console.log('Rendering invalid token state', { errorMsg });
    return (
      <>
        {/* Error Popup */}
        {errorMsg && (
          <ErrorPopup 
            message={errorMsg} 
            onClose={clearErrorMsg} 
            type="error"
          />
        )}
        
        <div className="w-full h-full flex flex-col justify-center items-center px-10 py-12 bg-transparent">
          <div className="w-[561px] flex flex-col items-start gap-4">
            <div className="flex flex-col justify-center items-start gap-1">
              <h2 className="text-[35px] text-[#0F012A] font-medium leading-[49px] tracking-[-0.35px] font-['PP Neue Montreal']">
                Reset Password
              </h2>
              <p className="text-[#534B68] text-[16px] leading-[24px] font-normal font-['PP Neue Montreal']">
                Invalid or expired reset link
              </p>
            </div>
            <div className="w-full flex justify-between mt-2">
              <button
                className="px-4 py-2 bg-[#E5E7EB] text-[#000] rounded-[6px] text-[14px] font-medium tracking-[0.42px] font-['PP Neue Montreal'] hover:bg-[#D1D5DB]"
                onClick={() => navigate('/login')}
              >
                Back to Login
              </button>
              <button
                className="px-4 py-2 bg-[#3371F2] text-white rounded-[6px] text-[14px] font-medium tracking-[0.42px] font-['PP Neue Montreal'] hover:bg-[#2a5ac8]"
                onClick={() => navigate('/forgot-password')}
              >
                Request New Link
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  // Show password form for valid token
  console.log('Rendering password form');
  return (
    <>
      {/* Error Popup */}
      {errorMsg && (
        <ErrorPopup 
          message={errorMsg} 
          onClose={clearErrorMsg} 
          type="error"
        />
      )}
      
      {/* Success Popup */}
      {resetSuccess && (
        <ErrorPopup 
          message="Password reset successfully! Redirecting to login..." 
          onClose={clearSuccessMsg} 
          type="success"
          duration={2000}
        />
      )}

      <div className="w-full h-full flex flex-col justify-center items-center px-10 py-12 bg-transparent">
        <div className="w-[561px] flex flex-col items-start gap-4">
          {/* Header section */}
          <div className="flex flex-col justify-center items-start gap-1">
            <h2 className="text-[35px] text-[#0F012A] font-medium leading-[49px] tracking-[-0.35px] font-['PP Neue Montreal']">
              Reset Password
            </h2>
            <p className="text-[#534B68] text-[16px] leading-[24px] font-normal font-['PP Neue Montreal']">
              Enter your new password to reset
            </p>
          </div>

          {/* New Password Input */}
          <div className="w-full flex flex-col items-start gap-[10px]">
            <label className="text-sm text-[#000] font-['PP Neue Montreal']">New Password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleResetPassword();
                }
              }}
              placeholder="Input your new password"
              className="w-full h-[45px] px-3 rounded-[6px] border border-[rgba(0,0,0,0.15)] bg-white text-[#000] text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              autoFocus
            />
          </div>

          {/* Confirm Password Input */}
          <div className="w-full flex flex-col items-start gap-[10px]">
            <label className="text-sm text-[#000] font-['PP Neue Montreal']">Confirm Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleResetPassword();
                }
              }}
              placeholder="Confirm your new password"
              className="w-full h-[45px] px-3 rounded-[6px] border border-[rgba(0,0,0,0.15)] bg-white text-[#000] text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
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
              onClick={handleResetPassword} // Trigger password reset
              disabled={resetSuccess} // Disable if reset is successful
            >
              Reset Password
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

// Export the component for use in other parts of the application
export default RightSectionReset;
