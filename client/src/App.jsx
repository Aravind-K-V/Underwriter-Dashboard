import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import DocumentUploadScreen from './pages/DocumentUploadScreen';
import LoginPage from './pages/LoginPage';
import PrivateRoute from './components/PrivateRoute';
import RegisterPage from './pages/RegisterPage';
import ForgotPasswordScreen from './pages/ForgotPasswordScreen';
import ResetPasswordScreen from './pages/ResetPasswordScreen';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordScreen />} />
        <Route path="/reset-password" element={<ResetPasswordScreen />} />
        <Route
          path="/dashboard"
          element={<PrivateRoute><Dashboard /></PrivateRoute>}
        />
        <Route
          path="/:proposer_id/upload"
          element={<PrivateRoute><DocumentUploadScreen /></PrivateRoute>}
        />
        <Route path="/" element={<Navigate to="/login" />} /> {/* Default to login */}
        <Route path="*" element={<Navigate to="/login" />} /> {/* Fallback to login */}
      </Routes>
    </BrowserRouter>
  );
}

export default App;