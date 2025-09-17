import { useState, useEffect } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { useMediaQuery } from 'react-responsive';
import SideNavbar from '../components/SideNavbar';
import DocumentHeader from '../components/document-upload-screen/DocumentUploadScreenHeader';
import TabsSection from '../components/document-upload-screen/DocumentUploadScreenTabsSection';
import DocumentUploadScreenFinanceTable from '../components/document-upload-screen/DocumentUploadScreenFinanceTable';
import DocumentUploadScreenMedicalTable from '../components/document-upload-screen/DocumentUploadScreenMedicalTable';

const DocumentUploadScreen = () => {
  const { proposer_id } = useParams();
  const location = useLocation();

  // RESPONSIVE: Enhanced responsive breakpoints
  const isLargeDesktop = useMediaQuery({ minWidth: 1440 });
  const isDesktop = useMediaQuery({ minWidth: 1200, maxWidth: 1439 });
  const isTablet = useMediaQuery({ minWidth: 768, maxWidth: 1199 });
  const isSmallTablet = useMediaQuery({ minWidth: 600, maxWidth: 767 });
  const isMobile = useMediaQuery({ minWidth: 480, maxWidth: 599 });
  const isSmallMobile = useMediaQuery({ maxWidth: 479 });

  // Combined breakpoints for easier usage
  const isMobileOrSmaller = useMediaQuery({ maxWidth: 767 });
  const isTabletOrSmaller = useMediaQuery({ maxWidth: 1199 });

  // ALL HOOKS MUST BE AT THE TOP LEVEL - NO EXCEPTIONS
  const [reviewFlags, setReviewFlags] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(isMobileOrSmaller);

  // RESPONSIVE: Update sidebar state based on screen size
  useEffect(() => {
    setSidebarCollapsed(isMobileOrSmaller);
  }, [isMobileOrSmaller]);

  // Calculate tabs based on reviewFlags
  const { finreview_required, mc_required } = reviewFlags || {};
  const tabs = [];
  if (finreview_required) tabs.push('Financial Review');
  if (mc_required) tabs.push('Health Review');

  // NEW: Handle URL parameters for initial tab setting
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const tabParam = searchParams.get('tab');

    if (tabs.length > 0) {
      if (tabParam === 'financial' && finreview_required) {
        setActiveTab('Financial Review');
      } else if (tabParam === 'medical' && mc_required) {
        setActiveTab('Health Review');
      } else if (!activeTab) {
        // Set default tab - prioritize financial if both are available
        if (finreview_required) {
          setActiveTab('Financial Review');
        } else if (mc_required) {
          setActiveTab('Health Review');
        }
      }
    }
  }, [tabs, finreview_required, mc_required, location.search, activeTab]);

  // Fetch review flags from API
  useEffect(() => {
    async function fetchData() {
      if (!proposer_id) return;

      try {
        setLoading(true);
        console.log('🔍 Fetching data for proposer:', proposer_id);

        // Fetch review flags
        const reviewFlagsResponse = await fetch(`/api/underwriting/review-flags/${proposer_id}`);
        if (!reviewFlagsResponse.ok) {
          throw new Error('Failed to fetch review flags');
        }
        const reviewFlagsData = await reviewFlagsResponse.json();
        console.log('✅ Review flags loaded:', reviewFlagsData);
        setReviewFlags(reviewFlagsData);

      } catch (err) {
        console.error('❌ Error fetching review flags:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [proposer_id]);

  // RESPONSIVE: Dynamic padding calculation
  const getMainPadding = () => {
    if (isSmallMobile) return 8;
    if (isMobile) return 12;
    if (isSmallTablet) return 14;
    if (isTablet) return 16;
    if (isDesktop) return 18;
    return 20; // Large desktop
  };

  // RESPONSIVE: Dynamic spacing calculation
  const getSpacing = () => {
    if (isSmallMobile) return 12;
    if (isMobile) return 14;
    if (isSmallTablet) return 16;
    if (isTablet) return 18;
    return 20; // Desktop and up
  };

  // RESPONSIVE: Loading screen with responsive design
  if (loading) {
    return (
      <div className="flex min-h-screen bg-[#F2F7FF] items-center justify-center">
        <div className="text-center px-4">
          <div
            className={`animate-spin rounded-full border-b-2 border-blue-600 mx-auto mb-4 ${isSmallMobile ? 'h-8 w-8' :
              isMobile ? 'h-10 w-10' :
                'h-12 w-12'
              }`}
          ></div>
          <p className={`text-gray-600 ${isSmallMobile ? 'text-sm' :
            isMobile ? 'text-base' :
              'text-lg'
            }`}>
            Loading review requirements...
          </p>
        </div>
      </div>
    );
  }

  // RESPONSIVE: Error screen with responsive design
  if (error) {
    return (
      <div className="flex min-h-screen bg-[#F2F7FF] items-center justify-center">
        <div className="text-center px-4 max-w-md w-full">
          <div className={`text-red-500 mb-4 ${isSmallMobile ? 'text-sm' :
            isMobile ? 'text-base' :
              'text-lg'
            }`}>
            ❌ Error: {error}
          </div>
          <button
            onClick={() => window.location.reload()}
            className={`bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors w-full ${isSmallMobile ? 'px-3 py-2 text-sm' :
              isMobile ? 'px-4 py-2 text-base' :
                'px-6 py-3 text-lg'
              }`}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // RESPONSIVE: No tabs screen with responsive design
  if (tabs.length === 0) {
    return (
      <div className="flex min-h-screen bg-[#F2F7FF] relative overflow-hidden">
        <SideNavbar />
        <main
          className="flex-1 transition-[margin] duration-300 ease-in-out relative z-10"
          style={{
            marginLeft: isMobileOrSmaller ? '0' : 'var(--sidebar-width)',
            paddingLeft: isMobileOrSmaller ? '60px' : '0' // Account for mobile sidebar
          }}
        >
          <div
            className="space-y-4 relative"
            style={{
              padding: `${getMainPadding()}px`
            }}
          >
            <DocumentHeader activeTab="No Review" />
            <div
              className="bg-white/90 backdrop-blur-sm rounded-lg text-center relative"
              style={{
                padding: `${getSpacing() * 2}px ${getSpacing()}px`
              }}
            >
              <div className={`text-gray-500 mb-2 ${isSmallMobile ? 'text-base' :
                isMobile ? 'text-lg' :
                  isTablet ? 'text-xl' :
                    'text-2xl'
                }`}>
                No Reviews Required
              </div>
              <p className={`text-gray-400 ${isSmallMobile ? 'text-sm' :
                isMobile ? 'text-base' :
                  'text-lg'
                }`}>
                This proposer does not require financial or medical review.
              </p>
            </div>
          </div>
        </main>

        {/* Watermark remains the same */}
        <img
          src="../src/assets/underwriter-dashboard-icons/watermark.svg"
          alt="Watermark"
          className={`fixed bottom-0 right-0 opacity-50 pointer-events-none select-none z-0 ${isSmallMobile ? 'w-32' :
            isMobile ? 'w-40' :
              isSmallTablet ? 'w-48' :
                isTablet ? 'w-64' :
                  isDesktop ? 'w-80' :
                    'w-96'
            }`}
        />
      </div>
    );
  }

  // RESPONSIVE: Tab content renderer with responsive props
  const renderTabContent = () => {
    const bothTabsPresent = finreview_required && mc_required;

    switch (activeTab) {
      case 'Financial Review':
        return (
          <DocumentUploadScreenFinanceTable
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            bothTabsPresent={bothTabsPresent}
            reviewFlags={reviewFlags}
            isSmallMobile={isSmallMobile}
            isMobile={isMobile}
            isSmallTablet={isSmallTablet}
            isTablet={isTablet}
            isDesktop={isDesktop}
            isLargeDesktop={isLargeDesktop}
            isMobileOrSmaller={isMobileOrSmaller}
          />
        );
      case 'Health Review':
        return (
          <DocumentUploadScreenMedicalTable
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            bothTabsPresent={bothTabsPresent}
            reviewFlags={reviewFlags}
            isSmallMobile={isSmallMobile}
            isMobile={isMobile}
            isSmallTablet={isSmallTablet}
            isTablet={isTablet}
            isDesktop={isDesktop}
            isLargeDesktop={isLargeDesktop}
            isMobileOrSmaller={isMobileOrSmaller}
          />
        );
      default:
        return (
          <div
            className="text-center text-gray-500"
            style={{
              padding: `${getSpacing()}px`
            }}
          >
            <p className={
              isSmallMobile ? 'text-sm' :
                isMobile ? 'text-base' :
                  'text-lg'
            }>
              No reviews required for this proposer.
            </p>
          </div>
        );
    }
  };

  return (
    <div className="flex min-h-screen bg-[#F2F7FF] relative overflow-hidden">
      <SideNavbar />
      <main
        className="flex-1 transition-[margin] duration-300 ease-in-out relative z-10"
        style={{
          marginLeft: isMobileOrSmaller ? '0' : 'var(--sidebar-width)',
          paddingLeft: isMobileOrSmaller ? '60px' : '0', // Account for mobile sidebar
          minHeight: '100vh'
        }}
      >
        <div
          className="relative"
          style={{
            padding: `${getMainPadding()}px`,
            paddingBottom: `${getMainPadding() * 2}px`, // Extra bottom padding
            minHeight: `calc(100vh - ${getMainPadding() * 2}px)`
          }}
        >
          {/* RESPONSIVE: Header with responsive spacing */}
          <div style={{ marginBottom: `${getSpacing()}px` }}>
            <DocumentHeader activeTab={activeTab} />
          </div>

          {/* RESPONSIVE: Tabs section with conditional rendering and spacing */}
          {tabs.length > 1 && (
            <div style={{ marginBottom: `${getSpacing()}px` }}>
              <TabsSection
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                tabs={tabs}
                isSmallMobile={isSmallMobile}
                isMobile={isMobile}
                isTablet={isTablet}
                isMobileOrSmaller={isMobileOrSmaller}
              />
            </div>
          )}

          {/* RESPONSIVE: Tab content with full responsive support */}
          <div className="relative">
            {renderTabContent()}
          </div>
        </div>
      </main>

      {/* RESPONSIVE: Watermark with comprehensive responsive sizing */}
      <img
        src="../src/assets/underwriter-dashboard-icons/watermark.svg"
        alt="Watermark"
        className={`fixed bottom-0 right-0 opacity-50 pointer-events-none select-none z-0 transition-all duration-300 ${isSmallMobile ? 'w-24 sm:w-32' :
          isMobile ? 'w-32 sm:w-40' :
            isSmallTablet ? 'w-40 sm:w-48' :
              isTablet ? 'w-48 md:w-64' :
                isDesktop ? 'w-64 lg:w-80' :
                  'w-80 xl:w-96'
          }`}
        style={{
          right: isMobileOrSmaller ? '8px' : '16px',
          bottom: isMobileOrSmaller ? '8px' : '16px'
        }}
      />
    </div>
  );
};

export default DocumentUploadScreen;