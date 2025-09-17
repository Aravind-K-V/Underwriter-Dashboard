// ForgotPasswordScreen.jsx
// A React component that renders the forgot password page, utilizing a reusable layout with a custom header and right section for password reset functionality.

// Import routing and layout components from react-router-dom
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
// Import custom components for the forgot password page
import RightSectionForgot from "../components/login-screen/RightSectionForgot";
import Layout from "../components/login-screen/Layout";
import LoginHeader from "../components/login-screen/LoginHeader";

// Define the Forgot component
const Forgot = () => {
  return (
    // Render the forgot password page using the reusable Layout component
    <Layout
      // Pass RightSectionForgot as the right section component for password reset form
      RightComponent={RightSectionForgot}
      // Pass LoginHeader as the custom header component
      CustomHeader={LoginHeader}
    />
  );
};

// Export the component for use in other parts of the application
export default Forgot;