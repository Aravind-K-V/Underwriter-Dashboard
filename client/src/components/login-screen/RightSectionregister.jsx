// RightSectionregister.jsx
// A React component that renders the right section of the registration page in the Underwriter Dashboard, handling user registration with name, email, password, and confirm password inputs, API calls, and navigation.

// Import required dependencies
import React, { useState } from 'react';
import axios from 'axios'; // Library for making HTTP requests
import { useNavigate } from 'react-router-dom'; // Hook for programmatic navigation
import ErrorPopup from './ErrorPopup'; // Import the ErrorPopup component

// Define the RightSectionregister component, accepting props for state synchronization with parent
const RightSectionregister = ({
  name: propName,
  setName: setPropName,
  email: propEmail,
  setEmail: setPropEmail,
  password: propPassword,
  setPassword: setPropPassword,
  confirmPassword: propConfirmPassword,
  setConfirmPassword: setPropConfirmPassword,
  error: propError,
  setError: setPropError,
}) => {
  // State for name input, initialized with parent prop or empty string
  const [name, setName] = useState(propName || '');
  // State for email input, initialized with parent prop or empty string
  const [email, setEmail] = useState(propEmail || '');
  // State for password input, initialized with parent prop or empty string
  const [password, setPassword] = useState(propPassword || '');
  // State for confirm password input, initialized with parent prop or empty string
  const [confirmPassword, setConfirmPassword] = useState(propConfirmPassword || '');
  // State for error messages, initialized with parent prop or empty string
  const [errorMsg, setErrorMsg] = useState(propError || '');
  // State for success messages
  const [successMsg, setSuccessMsg] = useState('');
  // Initialize navigation hook
  const navigate = useNavigate();

  // Handle register submission with API call
  const handleRegister = async () => {
    // Validate password match
    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match');
      if (setPropError) setPropError('Passwords do not match'); // Sync error with parent
      return;
    }
    
    console.info('[Auth][RightSectionRegister] Registration attempt initiated:', { name, email_id: email });
    try {
      // Send register request to API
      const response = await axios.post('http://13.232.45.218:5000/api/register', {
        name,
        email_id: email,
        password,
      });

      console.debug('[Auth][RightSectionRegister] Server response received:', { success: response.data.success });
      
      if (response.data.success) {
        setSuccessMsg('Registration successful! Please login.'); // Display success message
        setErrorMsg('');
        if (typeof setPropError === 'function') {
          setPropError(''); // Clear parent error if function exists
        }
        console.info('[Auth][RightSectionRegister] Registration successful, redirecting to login');
        setTimeout(() => navigate('/login'), 3000); // Navigate to login page after 3 seconds
      } else {
        setErrorMsg(response.data.message || 'Registration failed'); // Display server error
        if (typeof setPropError === 'function') {
          setPropError(response.data.message || 'Registration failed');
        }
        setSuccessMsg('');
        console.warn('[Auth][RightSectionRegister] Registration failed:', response.data.message);
      }
    } catch (error) {
      console.error('[Auth][RightSectionRegister] Registration request failed:', error.response?.data?.message || error.message);
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
          {/* Heading */}
          <h2 className="text-[35px] text-[#0F012A] font-medium">Register on Kazunov 1AI</h2>
          {/* Name Input */}
          <div className="w-full">
            <label className="text-sm">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (setPropName) setPropName(e.target.value); // Sync with parent state
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleRegister();
                }
              }}
              className="w-full h-[45px] px-3 rounded-[6px] border border-[rgba(0,0,0,0.15)] bg-white text-[#000] text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              autoFocus // Focus input on load
            />
          </div>
          {/* Email Input */}
          <div className="w-full">
            <label className="text-sm">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (setPropEmail) setPropEmail(e.target.value); // Sync with parent state
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleRegister();
                }
              }}
              className="w-full h-[45px] px-3 rounded-[6px] border border-[rgba(0,0,0,0.15)] bg-white text-[#000] text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>
          {/* Password Input */}
          <div className="w-full">
            <label className="text-sm">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (setPropPassword) setPropPassword(e.target.value); // Sync with parent state
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleRegister();
                }
              }}
              className="w-full h-[45px] px-3 rounded-[6px] border border-[rgba(0,0,0,0.15)] bg-white text-[#000] text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>
          {/* Confirm Password Input */}
          <div className="w-full">
            <label className="text-sm">Confirm Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                if (setPropConfirmPassword) setPropConfirmPassword(e.target.value); // Sync with parent state
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleRegister();
                }
              }}
              className="w-full h-[45px] px-3 rounded-[6px] border border-[rgba(0,0,0,0.15)] bg-white text-[#000] text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>
          {/* Register Button */}
          <div className="w-full flex justify-end">
            <button
              onClick={handleRegister}
              className="w-[111px] h-[45px] bg-[#3371F2] text-white rounded-[6px] px-8 py-3 text-[14px] font-medium tracking-[0.42px] capitalize hover:bg-[#5e92f3]"
            >
              Register
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

// Export the component for use in other parts of the application
export default RightSectionregister;
