// ErrorPopup.jsx
// A React component for displaying popup notifications below the header nav bar
import React, { useEffect } from 'react';

const ErrorPopup = ({ message, onClose, type = 'error', duration = 5000 }) => {
  // Log component lifecycle
  useEffect(() => {
    console.info('[UI][ErrorPopup] Popup displayed:', { type, message: message.substring(0, 50) + '...', duration });
    
    if (duration > 0) {
      const timer = setTimeout(() => {
        console.debug('[UI][ErrorPopup] Auto-closing popup after timeout');
        onClose();
      }, duration);
      return () => {
        console.debug('[UI][ErrorPopup] Clearing auto-close timer');
        clearTimeout(timer);
      };
    }
  }, [onClose, duration, type, message]);

  const handleClose = () => {
    console.info('[UI][ErrorPopup] User manually closed popup');
    onClose();
  };

  const baseStyles = "absolute top-[70px] right-8 px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 z-[9999] max-w-sm";
  const typeStyles = {
    error: "bg-red-600 text-white",
    success: "bg-green-600 text-white",
    warning: "bg-yellow-600 text-white"
  };

  return (
    <div className={`${baseStyles} ${typeStyles[type]}`}>
      <span className="text-sm font-medium flex-1">{message}</span>
      <button
        onClick={handleClose}
        className="text-white hover:text-gray-300 focus:outline-none font-bold text-lg leading-none"
        aria-label="Close notification"
      >
        ×
      </button>
    </div>
  );
};

export default ErrorPopup;
