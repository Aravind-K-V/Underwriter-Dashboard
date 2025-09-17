import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useMediaQuery } from 'react-responsive';
import { Bell, Settings } from 'lucide-react';
import avatar from '../../assets/underwriter-dashboard-icons/user3.svg';
// Import SVG icons as regular imports
import BackIcon from '../../assets/underwriter-dashboard-icons/back.svg';
import HomeIcon from '../../assets/underwriter-dashboard-icons/home.svg';
import ChevronRightIcon from '../../assets/underwriter-dashboard-icons/chevron-right.svg';

const DashboardHeader = ({ onLogout, activeTab = 'Pending' }) => {
  //  RESPONSIVE: Enhanced responsive breakpoints
  const isLargeDesktop = useMediaQuery({ minWidth: 1440 });
  const isDesktop = useMediaQuery({ minWidth: 1200, maxWidth: 1439 });
  const isTablet = useMediaQuery({ minWidth: 768, maxWidth: 1199 });
  const isSmallTablet = useMediaQuery({ minWidth: 600, maxWidth: 767 });
  const isMobile = useMediaQuery({ minWidth: 480, maxWidth: 599 });
  const isSmallMobile = useMediaQuery({ maxWidth: 479 });

  // Combined breakpoints for easier usage
  const isMobileOrSmaller = useMediaQuery({ maxWidth: 767 });
  const isTabletOrSmaller = useMediaQuery({ maxWidth: 1199 });

  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [userData, setUserData] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  // Enhanced user data loading from user_login table
  useEffect(() => {
    const loadUserDataFromUserLogin = async () => {
      console.info('[Dashboard][Header] Loading user data from user_login table');

      // Try localStorage first
      const storedUser = localStorage.getItem('user');
      console.debug('[Dashboard][Header] Raw data from localStorage:', { hasData: !!storedUser });

      if (storedUser) {
        try {
          const parsedUser = JSON.parse(storedUser);
          console.debug('[Dashboard][Header] Parsed user data:', { hasName: !!parsedUser?.name, hasEmail: !!parsedUser?.email_id });

          if (parsedUser?.name && parsedUser?.email_id) {
            console.info('[Dashboard][Header] Complete user data found in localStorage');
            setUserData(parsedUser);
            return;
          } else {
            console.warn('[Dashboard][Header] Incomplete user data in localStorage');
          }
        } catch (error) {
          console.error('[Dashboard][Header] Error parsing localStorage data:', error.message);
        }
      }

      // Fallback: fetch directly from user_login table
      const email = storedUser ? JSON.parse(storedUser)?.email_id : null;
      if (email) {
        console.info('[Dashboard][Header] Fetching user from user_login table for email:', email);
        try {
          const response = await fetch(`http://13.202.6.228:5000/api/current-user/${encodeURIComponent(email)}`);

          if (response.ok) {
            const userFromDB = await response.json();
            console.info('[Dashboard][Header] Successfully fetched user from user_login table:', { name: userFromDB.name, email: userFromDB.email_id });

            setUserData(userFromDB);
            // Update localStorage with fresh data from user_login table
            localStorage.setItem('user', JSON.stringify(userFromDB));
          } else {
            console.error('[Dashboard][Header] Failed to fetch user from server:', response.status);
          }
        } catch (error) {
          console.error('[Dashboard][Header] Error fetching user from user_login table:', error.message);
        }
      } else {
        console.error('[Dashboard][Header] No email found, cannot fetch from user_login table');
      }
    };

    loadUserDataFromUserLogin();
  }, []);

  // Log when activeTab changes for debugging
  useEffect(() => {
    console.debug('[Dashboard][Header] Active tab changed to:', activeTab);
  }, [activeTab]);

  // Handle logout
  const handleLogout = () => {
    console.info('[Dashboard][Header] User logout initiated');
    localStorage.removeItem('user');
    localStorage.removeItem('authToken');
    localStorage.removeItem('isAuthenticated');

    // Call the onLogout prop if provided
    if (onLogout) {
      onLogout();
    }

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

  // Get user's display name from user_login table
  const getUserDisplayName = () => {
    console.debug('[Dashboard][Header] Getting display name');

    if (userData && userData.name) {
      const fullName = userData.name.trim();
      const firstName = fullName.split(' ')[0];
      console.debug('[Dashboard][Header] Name found from user_login:', { fullName, firstName });
      return firstName;
    }

    // Fallback: try localStorage directly
    console.debug('[Dashboard][Header] Trying localStorage fallback');
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        if (parsedUser && parsedUser.name) {
          const fullName = parsedUser.name.trim();
          const firstName = fullName.split(' ')[0];
          console.debug('[Dashboard][Header] Name found in localStorage:', { fullName, firstName });
          return firstName;
        }
      } catch (error) {
        console.error('[Dashboard][Header] Error in localStorage fallback:', error.message);
      }
    }

    console.debug('[Dashboard][Header] No name found, returning "User"');
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
        console.error('[Dashboard][Header] Error getting full name:', error.message);
      }
    }

    return 'User';
  };

  // Handle back button click
  const handleBackClick = () => {
    navigate(-1);
  };

  return (
    <div className="w-full">
      {/* Top Bar with breadcrumb and user section */}
      <div className={`${isMobileOrSmaller ? 'h-14 px-2' : 'h-12 px-4'
        } border-b-[0.50px] border-blue-200 flex justify-between items-center`}>
        {/* Left side - Breadcrumb with back button */}
        <div className={`flex items-center ${isSmallMobile ? 'gap-2' : isMobileOrSmaller ? 'gap-3' : 'gap-4'
          }`}>
          {/* Back Button */}
          <div
            onClick={handleBackClick}
            style={{
              width: 'auto',
              paddingLeft: isSmallMobile ? 6 : isMobileOrSmaller ? 8 : 10,
              paddingRight: isSmallMobile ? 6 : isMobileOrSmaller ? 8 : 10,
              background: '#DBE6FA',
              borderRadius: 8,
              justifyContent: 'flex-start',
              alignItems: 'center',
              gap: 4,
              display: 'inline-flex',
              cursor: 'pointer',
              minWidth: isSmallMobile ? '45px' : isMobileOrSmaller ? '55px' : '71px',
              height: isSmallMobile ? '28px' : isMobileOrSmaller ? '30px' : '32px'
            }}
          >
            {/* Use Imported BackIcon SVG */}
            <div style={{
              width: isSmallMobile ? 12 : isMobileOrSmaller ? 14 : 16,
              height: isSmallMobile ? 12 : isMobileOrSmaller ? 14 : 16,
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <img
                src={BackIcon}
                alt="Back"
                style={{
                  width: isSmallMobile ? '10px' : isMobileOrSmaller ? '12px' : '14px',
                  height: isSmallMobile ? '10px' : isMobileOrSmaller ? '12px' : '14px',
                  filter: 'brightness(0) saturate(100%) invert(27%) sepia(51%) saturate(2878%) hue-rotate(216deg) brightness(84%) contrast(97%)'
                }}
              />
            </div>
            {/* Hide text on small mobile */}
            {!isSmallMobile && (
              <div style={{
                width: 33,
                height: 16,
                justifyContent: 'center',
                display: 'flex',
                flexDirection: 'column',
                color: '#3371F2',
                fontSize: isMobileOrSmaller ? 12 : 14,
                fontFamily: '"PP Neue Montreal", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
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
          <nav aria-label="Breadcrumb" className={`flex items-center ${isSmallMobile ? 'gap-1' : 'gap-2'
            } overflow-hidden`}>
            {/* Underwriting Link */}
            <Link
              to="/dashboard"
              className={`flex items-center gap-1 ${isSmallMobile ? 'text-xs' : isMobileOrSmaller ? 'text-sm' : 'text-sm'
                } text-blue-600 hover:text-blue-800 hover:underline transition-colors duration-200 whitespace-nowrap`}
            >
              <img src={HomeIcon} alt="Home" className={`${isSmallMobile ? 'w-3 h-3' : 'w-4 h-4'
                }`} />
              {!isSmallMobile && <span>Underwriting</span>}
            </Link>

            {/* Slash Separator */}
            <span className={`text-gray-400 ${isSmallMobile ? 'text-xs' : 'text-sm'
              } mx-1`}>/</span>

            {/* Dashboard with Home Icon */}
            <Link
              to="/dashboard"
              className={`flex items-center gap-1 ${isSmallMobile ? 'text-xs' : isMobileOrSmaller ? 'text-sm' : 'text-sm'
                } text-blue-600 hover:text-blue-800 hover:underline transition-colors duration-200`}
            >
              <span className={`${isSmallMobile ? 'hidden' : 'hidden sm:inline'}`}>Dashboard</span>
            </Link>

            {/* Only show remaining breadcrumb on larger screens */}
            {!isSmallMobile && (
              <>
                {/* Slash Separator */}
                <span className={`text-gray-400 ${isMobileOrSmaller ? 'text-sm' : 'text-sm'
                  } mx-1`}>/</span>

                {/* Dynamic Current Tab/Section */}
                <span
                  className={`${isMobileOrSmaller ? 'text-sm' : 'text-sm'
                    } text-gray-800 font-medium truncate max-w-24`}
                  style={{
                    fontFamily: 'PP Neue Montreal, sans-serif',
                    color: '#534B68'
                  }}
                >
                  {activeTab}
                </span>
              </>
            )}
          </nav>
        </div>

        {/* Right side - Icons and User Dropdown */}
        <div className={`flex items-center ${isSmallMobile ? 'gap-2' : isMobileOrSmaller ? 'gap-4' : 'gap-6'
          }`}>
          {/* Icons - Hide on small mobile */}
          {!isSmallMobile && (
            <div className={`flex items-center ${isMobileOrSmaller ? 'gap-3' : 'gap-4'
              }`}>
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

          {/* Divider - Hide on small mobile */}
          {!isSmallMobile && (
            <div className={`w-px ${isMobileOrSmaller ? 'h-5' : 'h-6'
              } bg-black mx-2 opacity-50`}></div>
          )}

          {/* User Dropdown */}
          <div className="relative user-dropdown">
            <div
              className={`flex items-center ${isSmallMobile ? 'gap-1' : 'gap-2'
                } cursor-pointer hover:bg-gray-50 p-1 rounded`}
              onClick={() => setShowUserDropdown(!showUserDropdown)}
            >
              <img className={`${isSmallMobile ? 'w-7 h-7' : isMobileOrSmaller ? 'w-8 h-8' : 'w-9 h-9'
                } rounded-full object-cover`} src={avatar} alt="avatar" />
              <span className={`text-slate-900 ${isSmallMobile ? 'text-xs' : 'text-sm'
                } font-medium capitalize ${isSmallMobile ? 'max-w-16 truncate' : ''}`}>
                {getUserDisplayName()}
              </span>
              <svg
                width={isSmallMobile ? "12" : "16"}
                height={isSmallMobile ? "12" : "16"}
                fill="none"
                viewBox="0 0 20 20"
                className={`transition-transform ${showUserDropdown ? 'rotate-180' : ''}`}
              >
                <path d="M5.23 7.21a1 1 0 0 1 1.41 0L10 10.59l3.36-3.38a1 1 0 1 1 1.41 1.42l-4.06 4.04a1 1 0 0 1-1.41 0L5.23 8.63a1 1 0 0 1 0-1.42z" fill="#1e293b" />
              </svg>
            </div>

            {/* Dropdown Menu */}
            {showUserDropdown && (
              <div className={`absolute right-0 top-full mt-2 ${isMobileOrSmaller ? 'w-56' : 'w-48'
                } bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50 max-w-xs`}>
                <div className="px-4 py-2 border-b border-gray-100">
                  <div className={`${isSmallMobile ? 'text-xs' : 'text-sm'
                    } font-medium text-gray-900 truncate`}>
                    {getFullUserName()}
                  </div>
                  <div className={`${isSmallMobile ? 'text-xs' : 'text-xs'
                    } text-gray-500 break-all`}>
                    {userData?.email_id || 'No email'}
                  </div>
                </div>
                <div className="border-t border-gray-100 mt-2">
                  <button
                    onClick={handleLogout}
                    className={`w-full text-left px-4 py-2 ${isSmallMobile ? 'text-xs' : 'text-sm'
                      } text-red-600 hover:bg-red-50`}
                  >
                    Logout
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardHeader;
