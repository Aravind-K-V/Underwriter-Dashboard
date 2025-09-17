// Updated LoginPage.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/login-screen/Layout';
import LoginHeader from '../components/login-screen/LoginHeader';
import RightSectionlogin from '../components/login-screen/RightSectionlogin';

const LoginPage = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    if (!email || !password) {
      setError('Please enter both email and password');
      setIsLoading(false);
      return;
    }

    try {
      console.info('[Auth][Login] User login request received:', email);
      
      const response = await fetch('http://localhost:5000/api/login', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ 
          email_id: email,
          password: password 
        }),
      });

      const data = await response.json();
      console.debug('[Auth][Login] Server response received:', { success: data.success, hasUser: !!data.user });

      if (data.success && data.user) {
        // Verify that name exists
        if (!data.user.name) {
          console.error('[Auth][Login] Server response missing required name field:', data.user);
          setError('Login successful but user name not found. Please contact support.');
          setIsLoading(false);
          return;
        }

        // Store complete user data from user_login table
        const userDataToStore = {
          user_id: data.user.user_id,
          name: data.user.name,           // Name from user_login table
          email_id: data.user.email_id,
          role: data.user.role,
          status: data.user.status,
          created_date: data.user.created_date
        };

        console.info('[Auth][Login] Storing user data in localStorage:', { user_id: userDataToStore.user_id, name: userDataToStore.name });
        localStorage.setItem('user', JSON.stringify(userDataToStore));
        localStorage.setItem('isAuthenticated', 'true');
        
        // Immediate verification
        const storedData = localStorage.getItem('user');
        const parsedData = JSON.parse(storedData);
        console.debug('[Auth][Login] Verification - stored data retrieved successfully:', { hasName: !!parsedData?.name });
        
        console.info('[Auth][Login] Login successful, navigating to dashboard');
        navigate('/dashboard');
      } else {
        setError(data.message || 'Login failed. Please check your credentials.');
        console.warn('[Auth][Login] Login failed:', data.message);
      }
    } catch (error) {
      setError('An error occurred during login. Please try again.');
      console.error('[Auth][Login] Login request failed:', error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailChange = (newEmail) => {
    setEmail(newEmail);
    if (error) setError('');
  };

  const handlePasswordChange = (newPassword) => {
    setPassword(newPassword);
    if (error) setError('');
  };

  return (
    <Layout
      RightComponent={RightSectionlogin}
      CustomHeader={LoginHeader}
      email={email}
      setEmail={handleEmailChange}
      password={password}
      setPassword={handlePasswordChange}
      error={error}
      setError={setError}
      isLoading={isLoading}
      onLogin={handleLogin}
    />
  );
};

export default LoginPage;
