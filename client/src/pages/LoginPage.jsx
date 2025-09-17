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
      console.log('Attempting login with email:', email);
      
      const response = await fetch('http://13.232.45.218:5000/api/login', {
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
      console.log('Full login response received:', data);
      console.log('User object from server:', data.user);
      console.log('Name from server:', data.user?.name);

      if (data.success && data.user) {
        // Verify that name exists
        if (!data.user.name) {
          console.error('ERROR: Server response missing name field!');
          console.error('User object:', data.user);
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

        console.log('Storing user data from user_login table:', userDataToStore);
        localStorage.setItem('user', JSON.stringify(userDataToStore));
        localStorage.setItem('isAuthenticated', 'true');
        
        // Immediate verification
        const storedData = localStorage.getItem('user');
        const parsedData = JSON.parse(storedData);
        console.log('VERIFICATION - Raw stored data:', storedData);
        console.log('VERIFICATION - Parsed data:', parsedData);
        console.log('VERIFICATION - Name in storage:', parsedData?.name);
        
        console.log('Login successful, navigating to dashboard');
        navigate('/dashboard');
      } else {
        setError(data.message || 'Login failed. Please check your credentials.');
        console.error('Login failed:', data);
      }
    } catch (error) {
      setError('An error occurred during login. Please try again.');
      console.error('Login error:', error);
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
