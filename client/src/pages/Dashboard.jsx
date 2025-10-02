import { useState, useEffect } from 'react';
import { useMediaQuery } from 'react-responsive';
import SideNavbar from '../components/SideNavbar';
import DashboardHeader from '../components/dashboard/DashboardHeader';
import DashboardTabsSection from '../components/dashboard/DashboardTabsSection';
import DashboardCustomerTable from '../components/dashboard/DashboardCustomerTable';
import { useNavigate } from 'react-router-dom';

const Dashboard = () => {
  //  RESPONSIVE: Enhanced responsive breakpoints
  const isLargeDesktop = useMediaQuery({ minWidth: 1440 });
  const isDesktop = useMediaQuery({ minWidth: 1200, maxWidth: 1439 });
  const isTablet = useMediaQuery({ minWidth: 768, maxWidth: 1199 });
  const isSmallTablet = useMediaQuery({ minWidth: 600, maxWidth: 767 });
  const isMobile = useMediaQuery({ minWidth: 480, maxWidth: 599 });
  const isSmallMobile = useMediaQuery({ maxWidth: 479 });

  // Combined breakpoints for easier usage
  const isMobileOrSmaller = useMediaQuery({ maxWidth: 767 });

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState('Pending');
  const navigate = useNavigate();

  // Log component lifecycle
  useEffect(() => {
    console.info('[Dashboard][Lifecycle] Dashboard component mounted');
  }, []);

  const handleLogout = () => {
    console.info('[Dashboard][Logout] User logout initiated');
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('user');
    navigate('/login');
  };

  //  RESPONSIVE: Dynamic spacing calculations
  const getMainPadding = () => {
    if (isSmallMobile) return '8px';
    if (isMobile) return '12px';
    if (isSmallTablet) return '16px';
    if (isTablet) return '20px';
    return '24px'; // Desktop and up
  };

  const getSpacing = () => {
    if (isSmallMobile) return '16px';
    if (isMobile) return '20px';
    if (isSmallTablet) return '24px';
    if (isTablet) return '28px';
    return '32px'; // Desktop and up
  };

  const getWatermarkSize = () => {
    if (isSmallMobile) return 'w-32';
    if (isMobile) return 'w-40';
    if (isSmallTablet) return 'w-48';
    if (isTablet) return 'w-64';
    return 'w-80'; // Desktop and up
  };

  return (
    <div className="flex min-h-screen bg-[#F3F5F9] relative overflow-hidden">
      {/*  RESPONSIVE: Sidebar container */}
      <div className="flex-shrink-0">
        <SideNavbar />
      </div>

      {/*  RESPONSIVE: Main content with dynamic spacing */}
      <main
        className="flex-1 relative z-10 w-full"
        style={{ 
          marginLeft: 'var(--sidebar-width)',
          transition: 'margin-left 0.3s ease',
          padding: getMainPadding(),
          paddingBottom: `calc(${getMainPadding()} * 2)`, // Extra bottom padding
          minHeight: '100vh',
          //  Ensure content doesn't get cut off
          overflowX: 'hidden',
          overflowY: 'auto'
        }}
      >
        {/*  RESPONSIVE: Header with spacing */}
        <div style={{ marginBottom: getSpacing() }}>
          <DashboardHeader 
            onLogout={handleLogout} 
            activeTab={activeTab}
            //  Pass responsive props
            isSmallMobile={isSmallMobile}
            isMobile={isMobile}
            isTablet={isTablet}
            isMobileOrSmaller={isMobileOrSmaller}
          />
        </div>

        {/*  RESPONSIVE: Tabs section with spacing */}
        <div style={{ marginBottom: getSpacing() }}>
          <DashboardTabsSection 
            activeTab={activeTab} 
            setActiveTab={setActiveTab}
            //  Pass responsive props
            isSmallMobile={isSmallMobile}
            isMobile={isMobile}
            isTablet={isTablet}
            isMobileOrSmaller={isMobileOrSmaller}
          />
        </div>

        {/*  RESPONSIVE: Customer table */}
        <div>
          <DashboardCustomerTable 
            activeTab={activeTab} 
            sidebarOpen={sidebarOpen}
            //  Pass responsive props
            isSmallMobile={isSmallMobile}
            isMobile={isMobile}
            isSmallTablet={isSmallTablet}
            isTablet={isTablet}
            isDesktop={isDesktop}
            isLargeDesktop={isLargeDesktop}
            isMobileOrSmaller={isMobileOrSmaller}
          />
        </div>
      </main>

      {/*  RESPONSIVE: Watermark with proper sizing and positioning */}
      <img
        src="../src/assets/underwriter-dashboard-icons/watermark.svg"
        alt="Watermark"
        className={`fixed bottom-0 right-0 ${getWatermarkSize()} opacity-100 pointer-events-none select-none z-0`}
        style={{
          right: isMobileOrSmaller ? '8px' : '16px',
          bottom: isMobileOrSmaller ? '8px' : '16px',
        }}
      />
    </div>
  );
};

export default Dashboard;
