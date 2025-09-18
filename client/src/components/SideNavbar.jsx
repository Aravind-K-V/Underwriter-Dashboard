import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMediaQuery } from 'react-responsive';

// SVG icons
import dashboardIcon from '../assets/underwriter-dashboard-icons/dashboard.svg';
import memberIcon from '../assets/underwriter-dashboard-icons/member.svg';
import claimsIcon from '../assets/underwriter-dashboard-icons/claims.svg';
import aiIcon from '../assets/underwriter-dashboard-icons/ai.svg';
import trendsIcon from '../assets/underwriter-dashboard-icons/trends.svg';
import riskIcon from '../assets/underwriter-dashboard-icons/risk.svg';
import reportsIcon from '../assets/underwriter-dashboard-icons/reports.svg';
import policyIcon from '../assets/underwriter-dashboard-icons/policy.svg';
import modelIcon from '../assets/underwriter-dashboard-icons/model.svg';
import integrationIcon from '../assets/underwriter-dashboard-icons/integration.svg';
import unionIcon from '../assets/underwriter-dashboard-icons/Union.svg';
import arrowExpandIcon from '../assets/underwriter-dashboard-icons/arrow-expand.svg';
import arrowContractIcon from '../assets/underwriter-dashboard-icons/arrow-contract.svg';

/* ------------------------------------------------------------------ */
/* Re-usable helpers                                                  */
/* ------------------------------------------------------------------ */
const SidebarSection = ({ title, items, isCollapsed, onItemClick, isMobileOrSmaller }) => (
  <div
    className={`${
      isCollapsed
        ? 'flex flex-col items-center gap-[4px] w-[34px]'
        : 'flex flex-col items-start gap-2 mt-4 w-full'
    }`}
  >
    {!isCollapsed && (
      <p
        className={`font-medium uppercase tracking-[0.03em] ${
          isMobileOrSmaller ? 'text-[10px]' : 'text-[12px]'
        }`}
        style={{
          color: 'rgba(255, 255, 255, 0.5)',
          fontFamily: 'PP Neue Montreal, sans-serif',
          lineHeight: '18px',
        }}
      >
        {title}
      </p>
    )}
    <div
      className={`flex flex-col ${
        isCollapsed ? 'items-center gap-[4px]' : 'items-start gap-1'
      } w-full`}
    >
      {items.map(({ label, icon, route }, idx) => (
        <button
          key={idx}
          type="button"
          aria-label={label}
          onClick={() => onItemClick(label, route)}
          className={`relative transition-all duration-200 ${
            isCollapsed
              ? 'w-[34px] h-[34px] flex justify-center items-center rounded-[6px] hover:bg-white/10 hover:border hover:border-white/25'
              : 'flex items-center gap-[10px] px-2 py-2 w-full rounded-[8px] hover:bg-white/10'
          }`}
        >
          <div
            className={`${
              isCollapsed
                ? 'absolute w-[20px] h-[20px] left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2'
                : 'flex justify-center items-center w-[20px] h-[16px]'
            }`}
          >
            <img
              src={icon}
              alt={label}
              className={`${isCollapsed ? 'w-full h-full' : 'h-[14px]'}`}
              style={{ 
                filter: 'brightness(0) invert(1)',
                minWidth: isCollapsed ? '20px' : '14px',
                minHeight: isCollapsed ? '20px' : '14px'
              }}
            />
          </div>
          {!isCollapsed && (
            <span
              title={label}
              className={`text-white font-medium capitalize tracking-[0.03em] whitespace-nowrap ${
                isMobileOrSmaller ? 'text-[12px]' : 'text-[14px]'
              }`}
              style={{ fontFamily: 'PP Neue Montreal, sans-serif', lineHeight: '21px' }}
            >
              {label}
            </span>
          )}
        </button>
      ))}
    </div>
  </div>
);

const SidebarDivider = ({ isCollapsed }) =>
  isCollapsed ? (
    <div className="w-[34px] h-px bg-white/20 my-[2px]" />
  ) : (
    <div className="w-full h-px bg-white/20 my-[2px]" />
  );

/* ------------------------------------------------------------------ */
/* Main component                                                     */
/* ------------------------------------------------------------------ */
const SideNavbar = () => {
  // RESPONSIVE: Enhanced responsive breakpoints
  const isLargeDesktop = useMediaQuery({ minWidth: 1440 });
  const isDesktop = useMediaQuery({ minWidth: 1200, maxWidth: 1439 });
  const isTablet = useMediaQuery({ minWidth: 768, maxWidth: 1199 });
  const isSmallTablet = useMediaQuery({ minWidth: 600, maxWidth: 767 });
  const isMobile = useMediaQuery({ minWidth: 480, maxWidth: 599 });
  const isSmallMobile = useMediaQuery({ maxWidth: 479 });

  // Combined breakpoints for easier usage
  const isMobileOrSmaller = useMediaQuery({ maxWidth: 767 });

  // Initialize state from sessionStorage, default to false (expanded)
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const savedState = sessionStorage.getItem('sidebarCollapsed');
    return savedState ? JSON.parse(savedState) : false;
  });

  // Update sessionStorage whenever isCollapsed changes
  useEffect(() => {
    sessionStorage.setItem('sidebarCollapsed', JSON.stringify(isCollapsed));
  }, [isCollapsed]);

  const navigate = useNavigate();

  // Handle navigation clicks
  const handleNavClick = (label, route) => {
    console.info('[Navigation][SideNavbar] Navigation item clicked:', label);
    
    switch (label.toLowerCase()) {
      case 'dashboard':
        navigate('/dashboard');
        break;
      case 'underwriting':
        navigate('/dashboard');
        break;
      case 'claims management':
        console.warn('[Navigation][SideNavbar] Claims Management route not yet implemented');
        break;
      default:
        console.warn('[Navigation][SideNavbar] Route not yet implemented:', label);
        break;
    }
  };

  // RESPONSIVE: Dynamic sidebar width
  const sidebarWidth = isCollapsed ? 
    (isMobileOrSmaller ? '60px' : '72px') : 
    (isMobileOrSmaller ? '200px' : '240px');

  return (
    <div
      className="relative flex"
      style={{
        '--sidebar-width': sidebarWidth,
      }}
    >
      {/* Fixed sidebar that DOESN'T scroll but extends full height */}
      <aside
        className="bg-gradient-to-b from-[#0F1522] to-[#2C64D7] text-white isolate transition-all duration-300"
        style={{
          width: sidebarWidth,
          position: 'fixed',
          top: 0,
          left: 0,
          height: '100vh',
          overflow: 'hidden',
          zIndex: 40,
          backgroundImage: 'linear-gradient(to bottom, #0F1522, #2C64D7)',
          backgroundRepeat: 'no-repeat',
          backgroundSize: '100% 100%',
        }}
      >
        {/* Content wrapper that fills exactly viewport height */}
        <div 
          className="flex flex-col w-full h-full"
          style={{
            padding: isMobileOrSmaller ? '16px 12px' : '24px',
            height: '100vh',
            overflow: 'hidden',
          }}
        >
          {/* Content container */}
          <div className="flex-1 flex flex-col justify-start">
            <div
              className={`flex flex-col ${
                isCollapsed ? 'items-center gap-[20px] w-[34px] mx-auto' : 'items-start w-full'
              }`}
            >
              {/* Logo */}
              <div className="flex flex-col items-center gap-7 mb-2 flex-shrink-0">
                <div className="flex items-center gap-2">
                  <img
                    src={unionIcon}
                    alt="Kazunov Logo"
                    className={`${isMobileOrSmaller ? 'w-[20px] h-[20px]' : 'w-[24px] h-[24px]'}`}
                  />
                  {!isCollapsed && (
                    <span
                      className={`text-white font-semibold leading-[16px] whitespace-nowrap ${
                        isMobileOrSmaller ? 'text-[12px]' : 'text-[14px]'
                      }`}
                      style={{ fontFamily: 'PP Neue Montreal, sans-serif' }}
                    >
                      Kazunov 1AI
                    </span>
                  )}
                </div>
              </div>

              {/* Navigation sections */}
              <div
                className={`mt-0 flex flex-col ${
                  isCollapsed ? 'items-center gap-[18px]' : 'gap-3'
                } w-full flex-1`}
                style={{
                  minHeight: 0,
                  flexGrow: 1
                }}
              >
                <SidebarSection
                  title="Main Menu"
                  isCollapsed={isCollapsed}
                  onItemClick={handleNavClick}
                  isMobileOrSmaller={isMobileOrSmaller}
                  items={[
                    { label: 'Dashboard', icon: dashboardIcon, route: '/dashboard' },
                    { label: 'Underwriting', icon: aiIcon, route: '/dashboard' },
                    { label: 'Claims Management', icon: claimsIcon, route: '/claims' },
                  ]}
                />
                
                <SidebarDivider isCollapsed={isCollapsed} />
                
                <SidebarSection
                  title="Analytics & Reports"
                  isCollapsed={isCollapsed}
                  onItemClick={handleNavClick}
                  isMobileOrSmaller={isMobileOrSmaller}
                  items={[
                    { label: 'Health Trends Analysis', icon: trendsIcon, route: '/trends' },
                    { label: 'Risk Prediction', icon: riskIcon, route: '/risk' },
                    { label: 'Utilization Reports', icon: reportsIcon, route: '/reports' },
                  ]}
                />
                
                <SidebarDivider isCollapsed={isCollapsed} />
                
                <SidebarSection
                  title="Operations & Settings"
                  isCollapsed={isCollapsed}
                  onItemClick={handleNavClick}
                  isMobileOrSmaller={isMobileOrSmaller}
                  items={[
                    { label: 'Policy Settings', icon: policyIcon, route: '/policy' },
                    { label: 'Model Management', icon: modelIcon, route: '/model' },
                    { label: 'Integrations', icon: integrationIcon, route: '/integrations' },
                  ]}
                />
                
                {/* Spacer to fill remaining space */}
                <div className="flex-1"></div>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Spacer div to prevent content overlap with fixed sidebar */}
      <div 
        className="flex-shrink-0 transition-all duration-300" 
        style={{ width: sidebarWidth }}
      ></div>

      {/* Toggle button */}
      <div
        className="fixed z-50"
        style={{
          top: isMobileOrSmaller ? '40px' : '52px',
          left: isCollapsed ? 
            (isMobileOrSmaller ? '50px' : '62px') : 
            `calc(${sidebarWidth} - 20px)`,
          transition: 'left 0.3s ease',
        }}
      >
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={`flex justify-center items-center bg-white border border-[#E5ECFB] shadow-md rounded-full hover:shadow-lg transition-shadow duration-200 ${
            isMobileOrSmaller ? 'w-8 h-8' : 'w-10 h-10'
          }`}
        >
          <img
            src={isCollapsed ? arrowContractIcon : arrowExpandIcon}
            alt="Toggle Sidebar"
            className={`${isMobileOrSmaller ? 'w-28 h-28' : 'w-32 h-32'}`}
          />
        </button>
      </div>
    </div>
  );
};

export default SideNavbar;