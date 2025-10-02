// RightSectionlogin.jsx
// A React component that renders the right section of the login page in the Underwriter Dashboard, handling user login with email and password inputs, API calls, and navigation.

// Import required dependencies
import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios'; // Library for making HTTP requests
import { useNavigate } from 'react-router-dom'; // Hook for programmatic navigation
import ErrorPopup from './ErrorPopup'; // Import the ErrorPopup component

// Define the RightSectionlogin component, accepting props from parent for state synchronization
const RightSectionlogin = ({ email: propEmail, setEmail: setPropEmail, password: propPassword, setPassword: setPropPassword, error: propError, setError: setPropError }) => {
  // State for email input, initialized with parent prop or empty string
  const [email, setEmail] = useState(propEmail || '');
  // State for password input, initialized with parent prop or empty string
  const [password, setPassword] = useState(propPassword || '');
  // State for error messages, initialized with parent prop or empty string
  const [errorMsg, setErrorMsg] = useState(propError || '');
  // State for success messages
  const [successMsg, setSuccessMsg] = useState('');
  // Initialize navigation hook
  const navigate = useNavigate();
  // Reference to password input for focus management
  const passwordRef = useRef(null);

  // Debug props on mount
  useEffect(() => {
    console.debug('[Auth][RightSectionLogin] Component props initialized:', {
      hasPropEmail: !!propEmail,
      hasSetPropEmail: typeof setPropEmail === 'function',
      hasPropPassword: !!propPassword,
      hasSetPropPassword: typeof setPropPassword === 'function',
      hasPropError: !!propError,
      hasSetPropError: typeof setPropError === 'function',
    });
  }, []);

  // Sync email input with parent state if setPropEmail is a function
  const handleEmailChange = (e) => {
    const value = e.target.value;
    setEmail(value);
    if (typeof setPropEmail === 'function') {
      setPropEmail(value); // Update parent state if function exists
    }
  };

  // Sync password input with parent state if setPropPassword is a function
  const handlePasswordChange = (e) => {
    const value = e.target.value;
    setPassword(value);
    if (typeof setPropPassword === 'function') {
      setPropPassword(value); // Update parent state if function exists
    }
  };

  // Effect to refocus password input if it's active when password state changes
  useEffect(() => {
    if (passwordRef.current && document.activeElement === passwordRef.current) {
      passwordRef.current.focus();
    }
  }, [password]);

  // Handle login submission with API call
  const handleLogin = async () => {
    console.info('[Auth][RightSectionLogin] Login attempt initiated:', { email });
    try {
      // Send login request to API
      const response = await axios.post('http://13.232.45.218:5000/api/login', {
        email_id: email, // Match backend expected field name
        password,
      });

      console.debug('[Auth][RightSectionLogin] Server response received:', { success: response.data.success });
      if (response.data.success) {
        setSuccessMsg('Login successful!'); // Display success message
        setErrorMsg('');
        if (typeof setPropError === 'function') {
          setPropError(''); // Clear parent error if function exists
        }
        localStorage.setItem('isAuthenticated', 'true'); // Store authentication status
        localStorage.setItem('user', JSON.stringify({ email_id: email, role: 'underwriter' })); // Store user data
        console.info('[Auth][RightSectionLogin] Login successful, navigating to dashboard');
        navigate('/dashboard'); // Navigate to dashboard
      } else {
        setErrorMsg(response.data.message || 'Invalid credentials'); // Display server error
        if (typeof setPropError === 'function') {
          setPropError(response.data.message || 'Invalid credentials');
        }
        setSuccessMsg('');
        console.warn('[Auth][RightSectionLogin] Login failed:', response.data.message);
      }
    } catch (error) {
      console.error('[Auth][RightSectionLogin] Login request failed:', error.response?.data?.message || error.message);
      const errorMessage = error.response?.data?.message || 'Server error';
      setErrorMsg(errorMessage); // Display error
      if (typeof setPropError === 'function') {
        setPropError(errorMessage);
      }
      setSuccessMsg('');
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
      {successMsg && (
        <ErrorPopup 
          message={successMsg} 
          onClose={() => setSuccessMsg('')} 
          type="success"
        />
      )}

      {/* Main container with full width/height, centered content, and padding */}
      <div className="w-full h-full flex flex-col justify-center items-center px-10 py-12 bg-transparent">
        {/* Form container with fixed width and spacing */}
        <div className="w-[561px] flex flex-col items-start gap-4">
          {/* Heading Section */}
          <div className="flex flex-col justify-center items-start gap-1">
            <h2 className="text-[35px] text-[#0F012A] font-medium leading-[49px] tracking-[-0.35px] font-['PP Neue Montreal']">
              Welcome to Kazunov 1AI
            </h2>
          </div>

          {/* Email Input */}
          <div className="flex flex-col items-start gap-[10px] w-full">
            <label className="text-sm text-[#000]">Enter Email ID</label>
            <input
              type="email"
              placeholder="Input your email ID here"
              value={email}
              onChange={handleEmailChange}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleLogin();
                }
              }}
              className="w-full h-[45px] px-3 rounded-[6px] border border-[rgba(0,0,0,0.15)] bg-white text-[#000] text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              autoFocus // Focus input on load
            />
          </div>

          {/* Password Input */}
          <div className="flex flex-col items-start gap-[10px] w-full">
            <label className="text-sm text-[#000]">Enter Password</label>
            <input
              type="password"
              placeholder="Input your password here"
              value={password}
              onChange={handlePasswordChange}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleLogin();
                }
              }}
              ref={passwordRef}
              key="password-input"
              className="w-full h-[45px] px-3 rounded-[6px] border border-[rgba(0,0,0,0.15)] bg-white text-[#000] text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>

          {/* Forgot Password Link */}
          <div className="w-full flex justify-end">
            <a
              href="/forgot-password"
              className="text-[12px] text-[#0463FF] underline font-['PP Neue Montreal'] hover:opacity-80"
            >
              Forgot Password?
            </a>
          </div>

          {/* Login Button */}
          <div className="w-full flex justify-end">
            <button
              onClick={handleLogin}
              className="w-[111px] h-[45px] bg-[#3371F2] text-white rounded-[6px] px-8 py-3 text-[14px] font-medium tracking-[0.42px] capitalize hover:bg-[#5e92f3]"
            >
              Login
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

// Export the component for use in other parts of the application
export default RightSectionlogin;
