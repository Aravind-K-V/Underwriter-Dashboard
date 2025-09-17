// ResetPasswordScreen.jsx
// A React component that renders the password reset page for the Underwriter Dashboard, utilizing a reusable layout with a custom header and right section for password reset form functionality.

// Import routing components from react-router-dom
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
// Import custom components for the password reset page
import RightSectionReset from "../components/login-screen/RightSectionReset";
import Layout from "../components/login-screen/Layout";
import LoginHeader from "../components/login-screen/LoginHeader";

// Define the Reset component
const Reset = () => {
  return (
    // Render the password reset page using the reusable Layout component
    <Layout
      // Pass RightSectionReset as the right section component for the password reset form
      RightComponent={RightSectionReset}
      // Pass LoginHeader as the custom header component
      CustomHeader={LoginHeader}
    />
  );
};

// Export the component for use in other parts of the application
export default Reset;