// RegisterPage.jsx
// A React component that renders the registration page for the Underwriter Dashboard, managing user input for registration and passing state to child components.

// Import required dependencies from React
import React, { useState, useEffect } from 'react';
// Import custom components for the registration page layout
import Layout from '../components/login-screen/Layout';
import RegisterHeader from '../components/login-screen/RegisterHeader';
import RightSectionregister from '../components/login-screen/RightSectionregister';

// Define the RegisterPage component
const RegisterPage = () => {
  // State to manage name input
  const [name, setName] = useState('');
  // State to manage email input
  const [email, setEmail] = useState('');
  // State to manage password input
  const [password, setPassword] = useState('');
  // State to manage confirm password input
  const [confirmPassword, setConfirmPassword] = useState('');
  // State to store error messages for display
  const [error, setError] = useState('');

  // Log component lifecycle
  useEffect(() => {
    console.info('[Pages][RegisterPage] Registration page mounted');
    
    return () => {
      console.debug('[Pages][RegisterPage] Registration page unmounting');
    };
  }, []);

  // Log state changes for debugging
  useEffect(() => {
    console.debug('[Pages][RegisterPage] Form state updated:', { 
      hasName: !!name, 
      hasEmail: !!email, 
      hasPassword: !!password, 
      hasConfirmPassword: !!confirmPassword,
      hasError: !!error 
    });
  }, [name, email, password, confirmPassword, error]);

  return (
    // Render the registration page using the reusable Layout component
    <Layout
      // Pass RightSectionregister as the right section component for the registration form
      RightComponent={RightSectionregister}
      // Pass RegisterHeader as the custom header component
      CustomHeader={RegisterHeader}
      // Pass state and setters for form inputs and error handling
      name={name}
      setName={setName}
      email={email}
      setEmail={setEmail}
      password={password}
      setPassword={setPassword}
      confirmPassword={confirmPassword}
      setConfirmPassword={setConfirmPassword}
      error={error}
      setError={setError}
    />
  );
};

// Export the component for use in other parts of the application
export default RegisterPage;