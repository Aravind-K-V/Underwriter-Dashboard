import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useMediaQuery } from 'react-responsive';
import { Bell, Settings, DollarSign, Shield } from 'lucide-react'; // ✅ Using Lucide icons
import avatar from '../../assets/underwriter-dashboard-icons/user3.svg';
import calendericon from '../../assets/upload_icons/CalendarFilled.svg';
// Import SVG icons
import BackIcon from '../../assets/underwriter-dashboard-icons/back.svg';
import HomeIcon from '../../assets/underwriter-dashboard-icons/home.svg';
import FormPreviewIcon from '../../assets/underwriter-dashboard-icons/FormPreviewIcon.svg';

const InfoRow = ({ label, value, isMobile }) => (
  <div className={`flex ${isMobile ? 'flex-col gap-1' : 'flex-row gap-4'} py-1.5`}>
    <div className={`${isMobile ? 'w-full' : 'w-36 flex-shrink-0'} text-zinc-800 ${isMobile ? 'text-xs' : 'text-sm'} font-medium`} style={{ fontFamily: 'PP Neue Montreal, sans-serif' }}>
      {label}
    </div>
    {!isMobile && (
      <div className="text-zinc-800 text-sm font-medium flex-shrink-0" style={{ fontFamily: 'PP Neue Montreal, sans-serif' }}>:</div>
    )}
    <div className={`flex-1 text-zinc-800 ${isMobile ? 'text-xs' : 'text-sm'} font-normal ${isMobile ? 'text-gray-600' : ''} break-all overflow-wrap-anywhere`} style={{ fontFamily: 'PP Neue Montreal, sans-serif' }}>
      {value}
    </div>
  </div>
);

const DocumentHeader = ({ activeTab = 'Documents Uploaded' }) => {
  // Media query hooks for responsive design
  const isDesktop = useMediaQuery({ minWidth: 1024 });
  const isTablet = useMediaQuery({ minWidth: 768, maxWidth: 1023 });
  const isMobile = useMediaQuery({ maxWidth: 767 });

  const [showModal, setShowModal] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showDecisionButtons, setShowDecisionButtons] = useState(false);
  const [proposerData, setProposerData] = useState(null);
  const [underwritingData, setUnderwritingData] = useState(null);
  const [userData, setUserData] = useState(null);

  // ✅ NEW: Add state for insurance data
  const [insuranceData, setInsuranceData] = useState({
    premium: null,
    sumInsured: null
  });

  // ✅ NEW: Add state for current status tracking
  const [currentStatus, setCurrentStatus] = useState("");

  const { proposer_id } = useParams();
  const navigate = useNavigate();

  // Helper function to mask phone number - show only last 4 digits
  const maskPhoneNumber = (phoneNumber) => {
    if (!phoneNumber) return 'N/A';

    const cleanNumber = phoneNumber.toString().replace(/\D/g, ''); // Remove non-digits

    if (cleanNumber.length < 4) {
      return phoneNumber; // Return as is if less than 4 digits
    }

    const lastFour = cleanNumber.slice(-4);
    const maskedPart = 'X'.repeat(cleanNumber.length - 4);

    return maskedPart + lastFour;
  };

  // ✅ NEW: Function to fetch insurance data (premium and sum insured)
  const fetchInsuranceData = async () => {
    if (!proposer_id) {
      console.log('[INSURANCE] No proposer_id found');
      return;
    }

    try {
      console.log('[INSURANCE] Fetching insurance data for proposer_id:', proposer_id);

      // Fetch premium from proposer table
      const proposerResponse = await fetch(`http://13.232.45.218:5000/api/proposers/${proposer_id}/insurance-details`);

      // Fetch sum insured from insured_member table
      const memberResponse = await fetch(`http://13.232.45.218:5000/api/insured-members/${proposer_id}`);

      let premium = null;
      let sumInsured = null;

      // Get premium from proposer table
      if (proposerResponse.ok) {
        const proposerInsuranceData = await proposerResponse.json();
        premium = proposerInsuranceData.premium_amount;
        console.log('[INSURANCE] Premium fetched:', premium);
      } else {
        console.warn('[INSURANCE] Failed to fetch premium from proposer table');
      }

      // Get sum insured from insured_member table
      if (memberResponse.ok) {
        const memberData = await memberResponse.json();
        // If multiple members exist, we might want to sum them up or take the primary member
        if (Array.isArray(memberData) && memberData.length > 0) {
          // Take the first member's sum insured or sum all members
          sumInsured = memberData[0].sum_insured;
          console.log('[INSURANCE] Sum insured fetched:', sumInsured);
        } else if (memberData.sum_insured) {
          sumInsured = memberData.sum_insured;
          console.log('[INSURANCE] Sum insured fetched:', sumInsured);
        }
      } else {
        console.warn('[INSURANCE] Failed to fetch sum insured from insured_member table');
      }

      setInsuranceData({
        premium: premium,
        sumInsured: sumInsured
      });

    } catch (error) {
      console.error('[INSURANCE] Error fetching insurance data:', error);
      setInsuranceData({
        premium: null,
        sumInsured: null
      });
    }
  };

  // ✅ NEW: Function to fetch current status from underwriting_requests table
  const fetchCurrentStatus = async () => {
    if (!proposer_id) {
      console.log('[STATUS] No proposer_id found in URL params');
      setCurrentStatus("");
      return;
    }

    try {
      console.log('[STATUS] Fetching underwriting status for proposer_id:', proposer_id);

      // ✅ FIXED: Correct URL path
      const response = await fetch(`http://13.232.45.218:5000/api/underwriting/underwriting-status/${proposer_id}`);

      if (response.ok) {
        const statusData = await response.json();
        console.log('[STATUS] Fetched status from underwriting_requests:', statusData);

        // Set the status from the database
        const status = statusData.status;
        setCurrentStatus(status);
        console.log('[STATUS] Current status set to:', status);
      } else {
        console.error('[STATUS] Failed to fetch status:', response.status, response.statusText);
        setCurrentStatus('NOT RETRIEVED');
      }
    } catch (error) {
      console.error('[STATUS] Error fetching underwriting status:', error);
      setCurrentStatus('NOT RETRIEVED');
    }
  };

  // ✅ NEW: Listen for status updates from Finance Table
  useEffect(() => {
    const handleStatusUpdate = (event) => {
      const { proposer_id: updatedProposerId, status } = event.detail;

      // Only update if it's for the current proposer
      if (updatedProposerId === proposer_id) {
        console.log('[HEADER] Status updated via event:', status);
        setCurrentStatus(status);

        // Also update underwritingData to keep it in sync
        setUnderwritingData(prev => ({
          ...prev,
          status: status,
          updated_at: new Date().toISOString()
        }));
      }
    };

    // Listen for custom status update events
    window.addEventListener('statusUpdated', handleStatusUpdate);

    return () => {
      window.removeEventListener('statusUpdated', handleStatusUpdate);
    };
  }, [proposer_id]);

  // ✅ UPDATED: Fetch initial status and insurance data when component mounts
  useEffect(() => {
    fetchCurrentStatus();
    fetchInsuranceData(); // ✅ NEW: Fetch insurance data
  }, [proposer_id]);

  useEffect(() => {
    const fetchData = async () => {
      if (proposer_id) {
        try {
          // Fetch proposer data
          const proposerResponse = await fetch(`http://13.232.45.218:5000/api/proposers/${proposer_id}`);
          if (proposerResponse.ok) {
            const proposerData = await proposerResponse.json();
            setProposerData(proposerData);
          } else {
            console.error('Failed to fetch proposer data');
          }

          // ✅ FIXED: Corrected URL path - removed /underwriting prefix
          console.log('📡 Fetching underwriting data for proposer:', proposer_id);
          const underwritingResponse = await fetch(`http://13.232.45.218:5000/api/underwriting/underwriting-requests/${proposer_id}`);
          if (underwritingResponse.ok) {
            const underwritingData = await underwritingResponse.json();

            // 🔍 ENHANCED DEBUG LOGGING
            console.log('📊 Raw underwriting response:', underwritingResponse);
            console.log('📊 Parsed underwriting data:', underwritingData);
            console.log('📊 Request ID found:', underwritingData?.request_id);
            console.log('📊 Data type check:', typeof underwritingData);
            console.log('📊 Is array?', Array.isArray(underwritingData));

            // Handle if data comes as array (fallback)
            const finalData = Array.isArray(underwritingData) ? underwritingData[0] : underwritingData;

            console.log('📊 Final processed data:', finalData);
            console.log('📊 Final request_id:', finalData?.request_id);

            setUnderwritingData(finalData);

            // ✅ NEW: Set current status from underwriting data
            if (finalData?.status) {
              setCurrentStatus(finalData.status);
            }
          } else {
            console.warn('No underwriting request found, creating test request...');

            // Try to create a test request
            try {
              // ✅ FIXED: Correct URL path for test request creation
              const createResponse = await fetch(`http://13.232.45.218:5000/api/underwritng/underwriting-requests/${proposer_id}/test`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  payload_json: null,
                  payload_text: null
                })
              });

              if (createResponse.ok) {
                const testData = await createResponse.json();
                console.log('✅ Test request created:', testData);
                setUnderwritingData(testData.data);
                setCurrentStatus(testData.data?.status);
              } else {
                throw new Error('Failed to create test request');
              }
            } catch (testError) {
              console.error('❌ Failed to create test request:', testError);
              setCurrentStatus('NOT RETRIEVED');
            }
          }
        } catch (error) {
          console.error('Error fetching data:', error);
          setCurrentStatus('NOT RETRIEVED');
        }
      }
    };

    // Enhanced user data loading from user_login table
    const loadUserDataFromUserLogin = async () => {
      console.log('[USER_LOGIN] Starting to load user data from user_login table...');

      // Try localStorage first
      const storedUser = localStorage.getItem('user');
      console.log('[USER_LOGIN] Raw data from localStorage:', storedUser);

      if (storedUser) {
        try {
          const parsedUser = JSON.parse(storedUser);
          console.log('[USER_LOGIN] Parsed user data:', parsedUser);
          console.log('[USER_LOGIN] Name from localStorage:', parsedUser?.name);
          console.log('[USER_LOGIN] Email from localStorage:', parsedUser?.email_id);

          if (parsedUser?.name && parsedUser?.email_id) {
            console.log('[USER_LOGIN] Complete user data found in localStorage');
            setUserData(parsedUser);
            return;
          } else {
            console.warn('[USER_LOGIN] Incomplete user data in localStorage');
          }
        } catch (error) {
          console.error('[USER_LOGIN] Error parsing localStorage data:', error);
        }
      }

      // Fallback: fetch directly from user_login table
      const email = storedUser ? JSON.parse(storedUser)?.email_id : null;
      if (email) {
        console.log('[USER_LOGIN] Fetching user from user_login table for email:', email);
        try {
          const response = await fetch(`http://13.232.45.218:5000/api/current-user/${encodeURIComponent(email)}`);

          if (response.ok) {
            const userFromDB = await response.json();
            console.log('[USER_LOGIN] Successfully fetched user from user_login table:', userFromDB);
            console.log('[USER_LOGIN] Name from user_login table:', userFromDB.name);

            setUserData(userFromDB);
            // Update localStorage with fresh data from user_login table
            localStorage.setItem('user', JSON.stringify(userFromDB));
          } else {
            console.error('[USER_LOGIN] Failed to fetch user from server:', response.status);
          }
        } catch (error) {
          console.error('[USER_LOGIN] Error fetching user from user_login table:', error);
        }
      } else {
        console.error('[USER_LOGIN] No email found, cannot fetch from user_login table');
      }
    };

    loadUserDataFromUserLogin();
    fetchData();
  }, [proposer_id]);

  // Log when activeTab changes for debugging
  useEffect(() => {
    console.log('[BREADCRUMB] Active tab changed to:', activeTab);
  }, [activeTab]);

  // Handle logout
  const handleLogout = () => {
    console.log('[LOGOUT] Logging out user');
    localStorage.removeItem('user');
    localStorage.removeItem('authToken');
    localStorage.removeItem('isAuthenticated');
    navigate('/login');
  };

  // Handle clicking outside dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showUserDropdown && !event.target.closest('.user-dropdown')) {
        setShowUserDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showUserDropdown]);

  // Handle status updated callback
  const handleStatusUpdated = (newStatus, requestId) => {
    console.log(`🔄 Status callback received: ${newStatus} for request ${requestId}`);

    // Update both the local underwritingData state and currentStatus
    setUnderwritingData(prev => ({
      ...prev,
      status: newStatus,
      updated_at: new Date().toISOString()
    }));

    setCurrentStatus(newStatus);
  };

  // Helper function to format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };

  // ✅ NEW: Helper function to format currency
  const formatCurrency = (amount) => {
    if (!amount) return 'N/A';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  // ✅ UPDATED: Helper function to get status color with more status options
  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'approved':
        return 'text-green-600';
      case 'rejected':
        return 'text-red-600';
      case 'pending':
        return 'text-yellow-600';
      case 'processed by ai':
        return 'text-blue-600';
      case 'needs information':
        return 'text-orange-600';
      case 'needs investigation':
        return 'text-purple-600';
      default:
        return 'text-gray-600';
    }
  };

  // Helper function to get employment type display
  const getEmploymentTypeDisplay = () => {
    if (!proposerData?.employment_type) return null;

    const employmentType = proposerData.employment_type;
    const displayText = employmentType.replace('-', ' ');

    // Return object with text and styling
    return {
      text: displayText,
      bgColor: employmentType === 'self-employed' ? 'bg-orange-100' : 'bg-blue-100',
      textColor: employmentType === 'self-employed' ? 'text-orange-700' : 'text-blue-700'
    };
  };

  // Get user's display name from user_login table
  const getUserDisplayName = () => {
    console.log('[DISPLAY_NAME] Getting display name...');
    console.log('[DISPLAY_NAME] Current userData:', userData);

    if (userData && userData.name) {
      const fullName = userData.name.trim();
      const firstName = fullName.split(' ')[0];
      console.log('[DISPLAY_NAME] Name found from user_login - Full:', fullName, 'First:', firstName);
      return firstName;
    }

    // Fallback: try localStorage directly
    console.log('[DISPLAY_NAME] Trying localStorage fallback...');
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        if (parsedUser && parsedUser.name) {
          const fullName = parsedUser.name.trim();
          const firstName = fullName.split(' ');
          console.log('[DISPLAY_NAME] Name found in localStorage - Full:', fullName, 'First:', firstName);
          return firstName;
        }
      } catch (error) {
        console.error('[DISPLAY_NAME] Error in localStorage fallback:', error);
      }
    }

    console.log('[DISPLAY_NAME] No name found, returning "User"');
    return 'User';
  };

  // Get full user name for dropdown
  const getFullUserName = () => {
    if (userData?.name) {
      return userData.name;
    }

    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        return parsedUser?.name || 'User';
      } catch (error) {
        console.error('Error getting full name:', error);
      }
    }

    return 'User';
  };

  // Handle back button click
  const handleBackClick = () => {
    navigate(-1);
  };

  // Handle modal close
  const handleCloseModal = () => {
    setShowModal(false);
  };

  // Calculate modal content for dynamic sizing
  const getModalContent = () => {
    const basicInfo = [
      { label: "Customer Name", value: proposerData?.customer_name || 'NA' },
      { label: "Customer ID", value: proposer_id ? `#${proposer_id}` : 'NA' },
      { label: "Proposal Number", value: proposerData?.proposal_number || 'NA' },
      { label: "Contact Number", value: maskPhoneNumber(proposerData?.phone_number || proposerData?.mobile) },
      { label: "Email ID", value: proposerData?.email || 'N/A' },
      { label: "Employment Type", value: proposerData?.employment_type ? proposerData.employment_type.replace('-', ' ') : 'N/A' },
      { label: "Current Status", value: currentStatus },
      { label: "Date of Submission", value: formatDate(underwritingData?.created_at) }
    ];

    const requestInfo = [
      { label: "Request ID", value: `#${underwritingData?.request_id || 'N/A'}` },
      { label: "Status", value: currentStatus },
      { label: "Submitted", value: formatDate(underwritingData?.created_at) },
      { label: "Last Updated", value: formatDate(underwritingData?.updated_at || underwritingData?.created_at) }
    ];

    const underwriterInfo = [
      { label: "Assigned to", value: getFullUserName() },
      { label: "Email", value: userData?.email_id || 'N/A' },
      { label: "Role", value: userData?.role || 'Underwriter' }
    ];

    const customerDetails = [
      { label: "PAN Number", value: proposerData?.pan_number || 'N/A' },
      { label: "Date of Birth", value: proposerData?.dob ? new Date(proposerData.dob).toLocaleDateString() : 'N/A' },
      { label: "Annual Income", value: proposerData?.annual_income ? `₹${proposerData.annual_income.toLocaleString()}` : 'N/A' },
      { label: "Employment", value: proposerData?.employment_type ? proposerData.employment_type.replace('-', ' ') : 'N/A' },
      { label: "Address", value: proposerData?.address || 'N/A' },
      { label: "City", value: proposerData?.city || 'N/A' },
      { label: "State", value: proposerData?.state || 'N/A' },
      { label: "PIN Code", value: proposerData?.pin_code || 'N/A' }
    ];

    return { basicInfo, requestInfo, underwriterInfo, customerDetails };
  };

  return (
    <div className="w-full" style={{ fontFamily: 'PP Neue Montreal, sans-serif' }}>
      {/* ===== Top Bar with Breadcrumb ===== */}
      <div className={`${isMobile ? 'h-16' : 'h-12'} border-b-[0.50px] border-blue-200 flex justify-between items-center ${isMobile ? 'px-2' : 'px-4'}`}>
        {/* Left side - Breadcrumb with back button */}
        <div className="flex items-center gap-2 md:gap-4">
          {/* Styled Back Button */}
          <div
            onClick={handleBackClick}
            style={{
              width: 'auto',
              paddingLeft: isMobile ? 6 : 10,
              paddingRight: isMobile ? 6 : 10,
              background: '#DBE6FA',
              borderRadius: 8,
              justifyContent: 'flex-start',
              alignItems: 'center',
              gap: 4,
              display: 'inline-flex',
              cursor: 'pointer',
              minWidth: isMobile ? '50px' : '71px',
              height: isMobile ? '28px' : '32px',
              fontFamily: 'PP Neue Montreal, sans-serif'
            }}
          >
            {/* Use Imported BackIcon SVG */}
            <div style={{ width: isMobile ? 12 : 16, height: isMobile ? 12 : 16, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <img
                src={BackIcon}
                alt="Back"
                style={{
                  width: isMobile ? '10px' : '14px',
                  height: isMobile ? '10px' : '14px',
                  filter: 'brightness(0) saturate(100%) invert(27%) sepia(51%) saturate(2878%) hue-rotate(216deg) brightness(84%) contrast(97%)'
                }}
              />
            </div>
            {!isMobile && (
              <div style={{
                width: 33,
                height: 16,
                justifyContent: 'center',
                display: 'flex',
                flexDirection: 'column',
                color: '#3371F2',
                fontSize: 14,
                fontFamily: 'PP Neue Montreal, sans-serif',
                fontWeight: '500',
                textTransform: 'capitalize',
                lineHeight: '21px',
                letterSpacing: '0.42px',
                wordWrap: 'break-word'
              }}>
                Back
              </div>
            )}
          </div>

          {/* Dynamic Breadcrumb Navigation with Slash Separator */}
          <nav aria-label="Breadcrumb" className="flex items-center gap-1 md:gap-2">
            {/* Underwriting Link */}
            <Link
              to="/dashboard"
              className={`flex items-center gap-1 ${isMobile ? 'text-xs' : 'text-sm'} text-blue-600 hover:text-blue-800 hover:underline transition-colors duration-200 whitespace-nowrap`}
              style={{ fontFamily: 'PP Neue Montreal, sans-serif' }}
            >
              <img src={HomeIcon} alt="Home" className={`${isMobile ? 'w-3 h-3' : 'w-4 h-4'} flex-shrink-0`} />
              <span>Underwriting</span>
            </Link>

            {/* Slash Separator */}
            <span className={`text-gray-400 ${isMobile ? 'text-xs' : 'text-sm'} mx-1`} style={{ fontFamily: 'PP Neue Montreal, sans-serif' }}>/</span>

            {/* Dashboard with Home Icon */}
            <Link
              to="/dashboard"
              className={`flex items-center gap-1 ${isMobile ? 'text-xs' : 'text-sm'} text-blue-600 hover:text-blue-800 hover:underline transition-colors duration-200`}
              style={{ fontFamily: 'PP Neue Montreal, sans-serif' }}
            >
              {!isMobile && <span className="hidden sm:inline">Dashboard</span>}
            </Link>

            {/* Slash Separator */}
            <span className={`text-gray-400 ${isMobile ? 'text-xs' : 'text-sm'} mx-1`} style={{ fontFamily: 'PP Neue Montreal, sans-serif' }}>/</span>

            {/* Customer Name */}
            <Link
              to="/dashboard"
              className={`${isMobile ? 'text-xs truncate max-w-20' : 'text-sm'} text-blue-600 hover:text-blue-800 hover:underline transition-colors duration-200`}
              style={{ fontFamily: 'PP Neue Montreal, sans-serif' }}
            >
              {proposerData?.customer_name || 'Customer'}
            </Link>

            {/* Slash Separator */}
            <span className={`text-gray-400 ${isMobile ? 'text-xs' : 'text-sm'} mx-1`} style={{ fontFamily: 'PP Neue Montreal, sans-serif' }}>/</span>

            {/* Dynamic Current Tab/Section */}
            <span
              className={`${isMobile ? 'text-xs truncate max-w-24' : 'text-sm'} text-gray-800 font-medium`}
              style={{
                fontFamily: 'PP Neue Montreal, sans-serif',
                color: '#534B68'
              }}
            >
              {activeTab}
            </span>
          </nav>
        </div>

        {/* Right side - Icons and User Dropdown */}
        <div className={`flex items-center ${isMobile ? 'gap-2' : 'gap-6'}`}>
          {/* Icons - Only show on desktop/tablet */}
          {!isMobile && (
            <div className="flex items-center gap-4">
              {/* Notification Icon */}
              <div className="w-8 h-8 bg-blue-600/10 rounded-lg flex justify-center items-center">
                <Bell size={16} className="text-blue-600" />
              </div>
              {/* Settings Icon */}
              <div className="w-8 h-8 bg-blue-600/10 rounded-lg flex justify-center items-center">
                <Settings size={16} className="text-blue-600" />
              </div>
            </div>
          )}

          {!isMobile && <div className="w-px h-6 bg-black mx-4 opacity-50"></div>}

          {/* User Dropdown */}
          <div className="relative user-dropdown">
            <div
              className="flex items-center gap-1 md:gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded"
              onClick={() => setShowUserDropdown(!showUserDropdown)}
            >
              <img className={`${isMobile ? 'w-7 h-7' : 'w-9 h-9'} rounded-full object-cover`} src={avatar} alt="avatar" />
              <span
                className={`text-slate-900 ${isMobile ? 'text-xs' : 'text-sm'} font-medium capitalize truncate max-w-20`}
                style={{ fontFamily: 'PP Neue Montreal, sans-serif' }}
              >
                {getUserDisplayName()}
              </span>
              <svg width={isMobile ? "12" : "16"} height={isMobile ? "12" : "16"} fill="none" viewBox="0 0 20 20" className={`transition-transform flex-shrink-0 ${showUserDropdown ? 'rotate-180' : ''}`}>
                <path d="M5.23 7.21a1 1 0 0 1 1.41 0L10 10.59l3.36-3.38a1 1 0 1 1 1.41 1.42l-4.06 4.04a1 1 0 0 1-1.41 0L5.23 8.63a1 1 0 0 1 0-1.42z" fill="#1e293b" />
              </svg>
            </div>

            {/* Dropdown Menu */}
            {showUserDropdown && (
              <div className={`absolute right-0 top-full mt-2 ${isMobile ? 'w-56' : 'w-64'} bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50`}>
                <div className={`px-4 py-3 border-b border-gray-100`}>
                  <div
                    className={`${isMobile ? 'text-sm' : 'text-base'} font-medium text-gray-900 truncate`}
                    style={{ fontFamily: 'PP Neue Montreal, sans-serif' }}
                  >
                    {getFullUserName()}
                  </div>
                  <div
                    className={`${isMobile ? 'text-xs' : 'text-sm'} text-gray-500 mt-1 break-all`}
                    style={{ fontFamily: 'PP Neue Montreal, sans-serif' }}
                  >
                    {userData?.email_id || 'No email'}
                  </div>
                </div>
                <div className="pt-2">
                  <button
                    onClick={handleLogout}
                    className={`w-full text-left px-4 py-2 ${isMobile ? 'text-sm' : 'text-base'} text-red-600 hover:bg-red-50 transition-colors duration-200`}
                    style={{ fontFamily: 'PP Neue Montreal, sans-serif' }}
                  >
                    Logout
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ===== Main Header Info ===== */}
      <div className={`${isMobile ? 'px-2' : 'px-4'} flex flex-col gap-4`}>
        {/* Customer Row */}
        <div className={`${isMobile ? 'h-auto py-4' : 'h-20'} flex ${isMobile ? 'flex-col gap-4' : 'justify-between items-center'}`}>
          <div className="flex items-center gap-3">
            <img className={`${isMobile ? 'w-12 h-12' : 'w-16 h-16'} rounded-full object-cover`} src={avatar} alt="avatar" />
            <div className="flex-1 min-w-0">
              <h1
                className={`${isMobile ? 'text-lg' : 'text-2xl'} font-medium truncate`}
                style={{ fontFamily: 'PP Neue Montreal, sans-serif' }}
              >
                {proposerData?.customer_name || 'Loading...'}
              </h1>
              <div className="flex gap-2 mt-1 items-center flex-wrap">
                <span
                  className={`${isMobile ? 'text-xs' : 'text-sm'} text-neutral-400`}
                  style={{ fontFamily: 'PP Neue Montreal, sans-serif' }}
                >
                  Customer ID: {proposer_id ? `#${proposer_id}` : '#Loading...'}
                </span>

                {/* Employment Type Badge - Main Implementation */}
                {getEmploymentTypeDisplay() && (
                  <span
                    className={`ml-2 ${isMobile ? 'text-xs' : 'text-xs'} px-2 py-0.5 rounded-full font-semibold capitalize ${getEmploymentTypeDisplay().bgColor} ${getEmploymentTypeDisplay().textColor}`}
                    style={{ fontFamily: 'PP Neue Montreal, sans-serif' }}
                  >
                    {getEmploymentTypeDisplay().text}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className={`flex ${isMobile ? 'flex-col gap-3' : 'items-center gap-6'}`}>
            <div className={`flex items-center gap-2 ${isMobile ? 'text-xs' : 'text-sm'}`}>
              <div className="w-4 h-4 bg-[#0252A9] text-white text-[10px] rounded-full flex items-center justify-center">✓</div>
              {/* ✅ UPDATED: Use currentStatus instead of underwritingData?.status */}
              <span style={{ fontFamily: 'PP Neue Montreal, sans-serif' }}>
                Current Status: <span className={`font-semibold ${getStatusColor(currentStatus)}`}>{currentStatus}</span>
              </span>
            </div>
            <div className={`flex items-center gap-2 ${isMobile ? 'text-xs' : 'text-sm'}`}>
              <img src={calendericon} alt="calendar" className="w-4 h-4" />
              <span style={{ fontFamily: 'PP Neue Montreal, sans-serif' }}>
                Date of submission: {formatDate(underwritingData?.created_at)}
              </span>
            </div>

          
            <div className={`flex ${isMobile ? 'flex-col gap-2' : 'flex-row gap-3'}`}>
              <div
                className={`${isMobile ? 'w-full' : 'w-48'} h-10 pl-4 pr-3 py-3 rounded-lg inline-flex justify-center items-center gap-2 cursor-pointer`}
                style={{
                  backgroundColor: '#0252A9',
                  fontFamily: "'PP Neue Montreal', sans-serif !important"
                }}
                onClick={() => setShowModal(true)}
              >
                <div
                  className="text-center justify-center text-white text-base font-medium"
                  style={{
                    fontFamily: "'PP Neue Montreal', sans-serif !important",
                    fontWeight: '500 !important'
                  }}
                >
                  {isMobile ? 'View Form' : 'View Proposal Form'}
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Rest of the component remains the same... */}
      {/* ===== Decision Panel ===== */}
      {showDecisionButtons && underwritingData && (
        <div className={`${isMobile ? 'px-2' : 'px-4'} mb-6`}>
          {underwritingData?.request_id ? (
            <UnderwritingDecisionButtons
              requestId={underwritingData.request_id}
              proposerId={proposer_id}
              initialStatus={currentStatus}
              onStatusUpdated={handleStatusUpdated}
              disabled={false}
            />
          ) : (
            <div className="p-4 bg-red-100 border border-red-300 rounded-lg text-red-700" style={{ fontFamily: 'PP Neue Montreal, sans-serif' }}>
              <strong>⚠️ Cannot load decision buttons:</strong> No request ID found in data.<br />
              <button
                onClick={async () => {
                  try {
                    const response = await fetch(`http://13.232.45.218:5000/api/underwriting/underwriting-requests/${proposer_id}/test`, {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify({
                        payload_json: null,
                        payload_text: null
                      })
                    });
                    if (response.ok) {
                      window.location.reload();
                    }
                  } catch (error) {
                    console.error('Failed to create test request:', error);
                  }
                }}
                className="mt-2 px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                style={{ fontFamily: 'PP Neue Montreal, sans-serif' }}
              >
                🔧 Create Test Request
              </button>
            </div>
          )}
        </div>
      )}

      {/* Modal remains the same as in your original code... */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className={`
            ${isMobile
              ? 'w-full max-w-md max-h-[85vh]'
              : isTablet
                ? 'w-full max-w-3xl max-h-[80vh]'
                : 'w-full max-w-6xl max-h-[85vh]'
            } 
            bg-white rounded-2xl shadow-xl flex flex-col relative border border-gray-100
          `} style={{ fontFamily: 'PP Neue Montreal, sans-serif' }}>

            {/* Modal Header with Form Icon - Larger SVG */}
            <div className={`${isMobile ? 'px-4 py-3' : 'px-5 py-4'} border-b border-gray-200 flex-shrink-0`}>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <img
                    src={FormPreviewIcon}
                    alt="Form Preview"
                    className="w-7 h-7 text-blue-600"
                    style={{
                      filter: 'brightness(0) saturate(100%) invert(47%) sepia(65%) saturate(2365%) hue-rotate(216deg) brightness(94%) contrast(89%)'
                    }}
                  />
                </div>
                <div>
                  <div
                    className={`${isMobile ? 'text-lg' : 'text-xl'} font-semibold text-zinc-800`}
                    style={{ fontFamily: 'PP Neue Montreal, sans-serif' }}
                  >
                    Form Preview
                  </div>
                  <div
                    className={`${isMobile ? 'text-xs' : 'text-sm'} text-zinc-500 mt-1`}
                    style={{ fontFamily: 'PP Neue Montreal, sans-serif' }}
                  >
                    Complete customer information and request details
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Content with Better Spacing - Smaller */}
            <div className={`${isMobile ? 'px-4 py-4' : 'px-5 py-5'} flex-grow overflow-y-auto`}>
              <div className={`grid gap-6 ${isMobile ? 'grid-cols-1' : isTablet ? 'grid-cols-2' : 'grid-cols-3'}`}>

                {/* Left Column - Basic Information */}
                <div className="space-y-3">
                  <h3
                    className={`${isMobile ? 'text-base' : 'text-lg'} font-semibold text-zinc-800 mb-3 pb-2 border-b border-gray-200`}
                    style={{ fontFamily: 'PP Neue Montreal, sans-serif' }}
                  >
                    Basic Information
                  </h3>
                  <div className="space-y-1">
                    {getModalContent().basicInfo.map((item, index) => (
                      <InfoRow key={index} label={item.label} value={item.value} isMobile={isMobile} />
                    ))}
                  </div>
                </div>

                {/* Middle Column - Request Information */}
                <div className="space-y-3">
                  <h3
                    className={`${isMobile ? 'text-base' : 'text-lg'} font-semibold text-zinc-800 mb-3 pb-2 border-b border-gray-200`}
                    style={{ fontFamily: 'PP Neue Montreal, sans-serif' }}
                  >
                    Request Details
                  </h3>
                  <div className="space-y-1">
                    {getModalContent().requestInfo.map((item, index) => (
                      <InfoRow key={index} label={item.label} value={item.value} isMobile={isMobile} />
                    ))}
                  </div>

                  <div style={{ marginTop: '40px' }}>
                    <h4
                      className={`${isMobile ? 'text-sm' : 'text-base'} font-semibold text-zinc-800 mb-3 pb-1 border-b border-gray-100`}
                      style={{ fontFamily: 'PP Neue Montreal, sans-serif' }}
                    >
                      Underwriter Info
                    </h4>
                    <div className="space-y-1">
                      {getModalContent().underwriterInfo.map((item, index) => (
                        <InfoRow key={index} label={item.label} value={item.value} isMobile={isMobile} />
                      ))}
                    </div>
                  </div>

                </div>

                {/* Right Column - Customer Details */}
                <div className={`space-y-3 ${!isDesktop && isMobile ? 'col-span-1' : !isDesktop ? 'col-span-2' : ''}`}>
                  <h3
                    className={`${isMobile ? 'text-base' : 'text-lg'} font-semibold text-zinc-800 mb-3 pb-2 border-b border-gray-200`}
                    style={{ fontFamily: 'PP Neue Montreal, sans-serif' }}
                  >
                    Customer Details
                  </h3>
                  <div className="space-y-1">
                    {getModalContent().customerDetails.map((item, index) => (
                      <InfoRow key={index} label={item.label} value={item.value} isMobile={isMobile} />
                    ))}
                  </div>

                  
                  {/* Status Badge - Smaller */}
                  <div className="mt-4 p-3 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg border border-blue-200">
                    <div
                      className={`${isMobile ? 'text-xs' : 'text-sm'} text-zinc-700 font-medium mb-1`}
                      style={{ fontFamily: 'PP Neue Montreal, sans-serif' }}
                    >
                      Current Status
                    </div>
                    <div
                      className={`${isMobile ? 'text-base' : 'text-lg'} font-bold ${getStatusColor(currentStatus)}`}
                      style={{ fontFamily: 'PP Neue Montreal, sans-serif' }}
                    >
                      {currentStatus}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className={`${isMobile ? 'px-4 py-3' : 'px-5 py-4'} border-t border-gray-200 flex justify-end flex-shrink-0`}>
              <button
                onClick={handleCloseModal}
                className={`${isMobile ? 'px-6 py-2 text-sm w-full' : 'px-8 py-2 text-base'} text-white rounded-lg transition-colors duration-200 font-semibold shadow-md hover:shadow-lg`}
                style={{
                  fontFamily: 'PP Neue Montreal, sans-serif',
                  backgroundColor: '#3371F2'
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = '#2563eb'}
                onMouseLeave={(e) => e.target.style.backgroundColor = '#3371F2'}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentHeader;
