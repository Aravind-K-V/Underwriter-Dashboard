import React, { useEffect } from 'react';
import { useMediaQuery } from 'react-responsive';

const StatusCards = ({ activeTab, setActiveTab }) => {
  //  RESPONSIVE: Enhanced responsive breakpoints
  const isLargeDesktop = useMediaQuery({ minWidth: 1440 });
  const isDesktop = useMediaQuery({ minWidth: 1200, maxWidth: 1439 });
  const isTablet = useMediaQuery({ minWidth: 768, maxWidth: 1199 });
  const isSmallTablet = useMediaQuery({ minWidth: 600, maxWidth: 767 });
  const isMobile = useMediaQuery({ minWidth: 480, maxWidth: 599 });
  const isSmallMobile = useMediaQuery({ maxWidth: 479 });

  // Combined breakpoints for easier usage
  const isMobileOrSmaller = useMediaQuery({ maxWidth: 767 });

  // Determine user role
  const user = JSON.parse(localStorage.getItem('user'));
  const is_head = user.role === "underwriter_head";

  // Log component lifecycle
  useEffect(() => {
    console.info('[UI][DashboardTabsSection] Component mounted');
  }, []);

  // Log when activeTab changes
  useEffect(() => {
    console.debug('[UI][DashboardTabsSection] Active tab changed:', activeTab);
  }, [activeTab]);

  // Handle tab click
  const handleTabClick = (status) => {
    console.info('[UI][DashboardTabsSection] Tab clicked:', { from: activeTab, to: status });
    setActiveTab(status);
  };

  // "All Applications" tab
  // Updated array to include "Escalated Requests" only for heads
  const statusItems = [
    'All Applications',
    'Pending',
    'Approved',
    'Needs Investigation',
    'Rejected',
    ...(is_head ? ['Escalated Requests'] : []),
  ];


  //  RESPONSIVE: Dynamic gap calculation
  const getGap = () => {
    if (isSmallMobile) return 'gap-2';
    if (isMobile) return 'gap-3';
    if (isSmallTablet) return 'gap-4';
    if (isTablet) return 'gap-5';
    return 'gap-7'; // Desktop and up
  };

  //  RESPONSIVE: Dynamic padding calculation
  const getPadding = () => {
    if (isSmallMobile) return 'px-2';
    if (isMobileOrSmaller) return 'px-3';
    return 'px-4';
  };

  //  RESPONSIVE: Dynamic text size and spacing
  const getTextSize = () => {
    if (isSmallMobile) return 'text-xs';
    if (isMobileOrSmaller) return 'text-sm';
    return 'text-[14px]';
  };

  return (
    <div className={`${getPadding()} overflow-x-auto whitespace-nowrap`}>
      <div className={`inline-flex ${getGap()} border-b border-[#534B68]/40 ${
        isMobileOrSmaller ? 'min-w-max' : ''
      }`}>
        {statusItems.map((status) => {
          const isActive = activeTab === status;
          return (
            <div
              key={status}
              onClick={() => handleTabClick(status)}
              className={`flex flex-col justify-end items-center cursor-pointer ${
                isActive ? 'pb-0' : isMobileOrSmaller ? 'pb-1' : 'pb-2'
              } ${isMobileOrSmaller ? 'min-w-max' : ''}`}
              style={{
                padding: isActive 
                  ? isSmallMobile ? '0px 4px' : isMobileOrSmaller ? '0px 6px' : '0px 8px'
                  : isSmallMobile ? '0px 4px 4px' : isMobileOrSmaller ? '0px 6px 6px' : '0px 8px 8px',
                gap: isActive 
                  ? isSmallMobile ? '4px' : isMobileOrSmaller ? '5px' : '6px'
                  : isSmallMobile ? '3px' : '4px',
                height: isSmallMobile ? '24px' : isMobileOrSmaller ? '28px' : '30px',
                minWidth: 'fit-content',
              }}
            >
              <span
                className={`${getTextSize()} leading-[20px] font-${
                  isActive ? 'medium' : 'normal'
                } truncate ${isMobileOrSmaller ? 'max-w-24' : ''}`}
                style={{
                  color: isActive ? '#0463FF' : '#534B68',
                  fontFamily: 'PP Neue Montreal, sans-serif',
                }}
                title={status}
              >
                {/*  RESPONSIVE: Shortened text for small screens */}
                {isSmallMobile && status === 'All Applications' 
                  ? 'All' 
                  : isSmallMobile && status === 'Needs Investigation' 
                    ? 'Investigation'
                    : isMobile && status === 'Needs Investigation'
                      ? 'Investigation'
                      : status}
              </span>
              {isActive && (
                <div
                  style={{
                    width: '100%',
                    borderBottom: `${isSmallMobile ? '2px' : '3px'} solid #0463FF`,
                  }}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default StatusCards;
