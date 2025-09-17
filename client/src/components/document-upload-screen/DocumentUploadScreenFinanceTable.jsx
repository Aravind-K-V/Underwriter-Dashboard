import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { useMediaQuery } from 'react-responsive';
import 'react-datepicker/dist/react-datepicker.css';

// Icons
import MagnifyingGlass from '../../assets/underwriter-dashboard-icons/magnifying-glass.svg';
import EyeIcon from '../../assets/upload_icons/EyeOutlined.svg';
import iconName from '../../assets/upload_icons/user-svgrepo-com 1 (1).svg';
import iconPan from '../../assets/upload_icons/clock-square-svgrepo-com (1) 1.svg';
import iconDob from '../../assets/upload_icons/calendar-add-svgrepo-com 1.svg';
import iconSalary from '../../assets/upload_icons/money-bag-svgrepo-com 1.svg';
import ShieldCheck from '../../assets/upload_icons/shield-check-svgrepo-com (3).svg';
import VerifiedTick from '../../assets/upload_icons/verified-svgrepo-com (2) 1.svg';
import watermarkIcon from '../../assets/upload_icons/watermark.svg';
import financeScoreIcon from '../../assets/upload_icons/finance-score.svg';
import companyLogo from '../../assets/underwriter-dashboard-icons/web-icon.svg';
import tickIcon from '../../assets/underwriter-dashboard-icons/tick.svg';

// Environment variables with proper fallbacks
const PYTHON_API_URL = import.meta.env.VITE_PYTHON_API_URL || 'http://13.232.45.218:8090';
const NODE_API_URL = import.meta.env.VITE_NODE_API_URL || 'http://13.232.45.218:5000';

// Debug logging for environment variables
console.log('🔧 Environment Variables:');
console.log('PYTHON_API_URL:', PYTHON_API_URL);
console.log('NODE_API_URL:', NODE_API_URL);

// Constants
const FAMILY = 'PP Neue Montreal, "PP Neue Montreal", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", sans-serif';

const COLORS = {
  pageBg: '#FFFFFF',
  cardBg: '#F4F6FC',
  white: '#FFFFFF',
  textMain: '#0F012A',
  textMuted: '#6F677F',
  textDark: '#1A2035',
  grayLine: '#E8E7E7',
  blue100: '#E2EAFB',
  blue400: '#5A98FF',
  blue500: '#316BE3',
  blue600: '#0252A9',
  greenGrad: 'linear-gradient(90deg, #2DD39B 0%, #11AB75 100%)',
  headerGrad: 'linear-gradient(219deg, #7AA5FF 0%, #3371F2 0%, #0F1522 100%)',
  errorColor: '#EF4444',
  successColor: '#10B981',
  warningColor: '#F59E0B'
};

// Helper function to check if a string is valid JSON
const isValidJson = (str) => {
  if (typeof str !== 'string') return false;
  try {
    JSON.parse(str);
    return true;
  } catch (e) {
    return false;
  }
};

// Components
const Chip = ({ text, variant = 'success' }) => (
  <div style={{
    height: 24,
    padding: '0 10px 0 6px',
    background: variant === 'success' ? '#E2EAFB' :
      variant === 'error' ? '#FEE2E2' :
        variant === 'warning' ? '#FEF3C7' : '#E2EAFB',
    borderRadius: 5,
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    fontFamily: FAMILY,
  }}>
    <img src={VerifiedTick} alt="" style={{
      width: 14,
      height: 14,
      filter: variant === 'error' ? 'hue-rotate(0deg) saturate(2)' :
        variant === 'warning' ? 'hue-rotate(45deg)' : 'none'
    }} />
    <span style={{
      color: variant === 'success' ? '#0252A9' :
        variant === 'error' ? '#EF4444' :
          variant === 'warning' ? '#F59E0B' : '#0252A9',
      fontSize: 12,
      fontWeight: 500,
      lineHeight: '18px'
    }}>
      {text}
    </span>
  </div>
);

const Pill = ({ text, variant = 'success' }) => (
  <div style={{
    height: 22,
    padding: '0 8px',
    background: variant === 'success' ? COLORS.greenGrad :
      variant === 'error' ? '#EF4444' :
        variant === 'warning' ? '#F59E0B' :
          variant === 'pending' ? '#6B7280' : '#6B7280',
    borderRadius: 12,
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    fontFamily: FAMILY,
    maxWidth: '80px'
  }}>
    <div style={{ width: 6, height: 6, background: '#fff', borderRadius: '50%' }} />
    <span style={{
      color: '#fff',
      fontSize: 11,
      fontWeight: 600,
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis'
    }}>
      {text}
    </span>
  </div>
);

const IconBubble = ({ gradient, iconSrc, alt, size = 44, iconSize = 20 }) => (
  <div style={{
    width: size,
    height: size,
    borderRadius: size,
    background: gradient,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  }}>
    <img src={iconSrc} alt={alt} style={{ width: iconSize, height: iconSize, filter: 'brightness(0) invert(1)' }} />
  </div>
);

// Add this helper function near the top of your component
const formatDocumentName = (doc) => {
  let docName = doc.document_type || doc.name || '';

  if (docName.toLowerCase().includes('bank')) return 'Bank Statement';
  if (docName.toLowerCase().includes('itr')) return 'ITR Document';
  if (docName.toLowerCase().includes('pan')) return 'PAN Card';
  if (docName.toLowerCase().includes('gst')) return 'GST Document';
  if (docName.toLowerCase().includes('payslip')) return 'Payslip';

  // Default formatting for other document types
  return docName.replace(/_/g, ' ').replace(/\w\S*/g, txt =>
    txt.charAt(0).toUpperCase() + txt.slice(1).toLowerCase()
  );
};

// ✅ PURE HELPER FUNCTIONS (Outside Component)
const computeComparison = (extracted, proposer) => {
  // Simple comparison logic - customize as needed
  const comparison_results = {};
  let matches = 0;
  let total = 0;

  // Compare name
  if (extracted.name && proposer.customer_name) {
    total++;
    const match = extracted.name.toLowerCase().includes(proposer.customer_name.toLowerCase()) ||
      proposer.customer_name.toLowerCase().includes(extracted.name.toLowerCase());
    comparison_results.name = { match, extracted: extracted.name, expected: proposer.customer_name };
    if (match) matches++;
  }

  // Compare PAN
  if (extracted.pan_number && proposer.pan_number) {
    total++;
    const match = extracted.pan_number === proposer.pan_number;
    comparison_results.pan_number = { match, extracted: extracted.pan_number, expected: proposer.pan_number };
    if (match) matches++;
  }

  // Compare DOB
  if (extracted.dob && proposer.dob) {
    total++;
    const match = extracted.dob === proposer.dob;
    comparison_results.dob = { match, extracted: extracted.dob, expected: proposer.dob };
    if (match) matches++;
  }

  // Compare salary
  if (extracted.salary && proposer.annual_income) {
    total++;
    const match = Math.abs(extracted.salary - proposer.annual_income) < 1000; // Allow small difference
    comparison_results.salary = { match, extracted: extracted.salary, expected: proposer.annual_income };
    if (match) matches++;
  }

  const overall_accuracy = total > 0 ? Math.round((matches / total) * 100) : 0;
  const overall_match = overall_accuracy >= 80; // 80% threshold

  return {
    comparison_results,
    overall_match,
    accuracy_metrics: { overall_accuracy },
    confidence_score: overall_accuracy / 100,
    message: overall_match ?
      `Document verified successfully with ${overall_accuracy}% accuracy` :
      `Document verification failed with ${overall_accuracy}% accuracy`
  };
};

// Add the missing getMinHeight function  
const getMinHeight = (isMobileOrSmaller, isTablet, isDesktop) => {
  const baseHeights = {
    mobile: 160,
    tablet: 180,
    desktop: 200,
    largeDesktop: 220
  };

  const tabSectionHeight = {
    mobile: 80,
    tablet: 80,
    desktop: 80,
    largeDesktop: 80
  };

  if (isMobileOrSmaller) {
    return `calc(100vh - ${baseHeights.mobile + tabSectionHeight.mobile}px)`;
  } else if (isTablet) {
    return `calc(100vh - ${baseHeights.tablet + tabSectionHeight.tablet}px)`;
  } else if (isDesktop) {
    return `calc(100vh - ${baseHeights.desktop + tabSectionHeight.desktop}px)`;
  } else {
    return `calc(100vh - ${baseHeights.largeDesktop + tabSectionHeight.largeDesktop}px)`;
  }
};

// ✅ MAIN COMPONENT
const DocumentUploadScreenFinanceTable = ({ activeTab, setActiveTab, bothTabsPresent, reviewFlags }) => {
  const isLargeDesktop = useMediaQuery({ minWidth: 1440 });
  const isDesktop = useMediaQuery({ minWidth: 1200, maxWidth: 1439 });
  const isTablet = useMediaQuery({ minWidth: 768, maxWidth: 1199 });
  const isSmallTablet = useMediaQuery({ minWidth: 600, maxWidth: 767 });
  const isMobile = useMediaQuery({ minWidth: 480, maxWidth: 599 });
  const isSmallMobile = useMediaQuery({ maxWidth: 479 });
  const isMobileOrSmaller = useMediaQuery({ maxWidth: 767 });

  const { proposer_id } = useParams();
  const location = useLocation();

  // State management
  const [searchTerm, setSearchTerm] = useState('');
  const [documents, setDocuments] = useState([]);
  const [filteredDocuments, setFilteredDocuments] = useState([]);
  const [processingStatus, setProcessingStatus] = useState({});
  const [selectedProposer, setSelectedProposer] = useState(null);
  const [comparisonResults, setComparisonResults] = useState({});
  const [previewUrl, setPreviewUrl] = useState(null);
  const [previewError, setPreviewError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showComparisonModal, setShowComparisonModal] = useState(false);
  const [selectedDocumentId, setSelectedDocumentId] = useState(null);
  const [verifiedDocuments, setVerifiedDocuments] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(9);
  const [insuranceData, setInsuranceData] = useState({
    premium: null,
    sumInsured: null
  });

  useEffect(() => {
    fetchInsuranceData();
  }, [proposer_id]);

  // ✅ NEW: Add state for decision processing
  const [decisionProcessing, setDecisionProcessing] = useState(false);
  const [currentStatus, setCurrentStatus] = useState('Pending');
  const [statusUpdateLoading, setStatusUpdateLoading] = useState(false);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  // Add this missing loading screen state if you're using it
  const [showLoadingScreen, setShowLoadingScreen] = useState(false);
  const [batchProcessingProgress, setBatchProcessingProgress] = useState(0);
  const [batchProcessingStatus, setBatchProcessingStatus] = useState('');
  const [modalMessage, setModalMessage] = useState('');
  const [approvalModalOpen, setApprovalModalOpen] = useState(false);
  const [approvalModalType, setApprovalModalType] = useState(null);
  const [approvalModalStatus, setApprovalModalStatus] = useState('confirm');
  const [approvalModalError, setApprovalModalError] = useState('');

  // ✅ ADD THE MISSING formatCurrency FUNCTION:
  const formatCurrency = (amount) => {
    if (amount === null || amount === undefined) return '—';
    return `₹${Number(amount).toLocaleString('en-IN')}`;
  };

  // ✅ MOVE fetchInsuranceData FUNCTION HERE:
  const fetchInsuranceData = async () => {
    if (!proposer_id) {
      console.log('[INSURANCE] No proposer_id found');
      return;
    }

    try {
      console.log('[INSURANCE] Fetching insurance data for proposer_id:', proposer_id);

      // Fetch premium from proposer table
      const proposerResponse = await fetch(`${NODE_API_URL}/api/proposers/${proposer_id}/insurance-details`);

      // Fetch sum insured from insured_member table
      const memberResponse = await fetch(`${NODE_API_URL}/api/insured-members/${proposer_id}`);

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
        if (Array.isArray(memberData) && memberData.length > 0) {
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

  // ✅ ADD THIS FUNCTION: Fetch current underwriting request status
  const fetchCurrentStatus = async () => {
    if (!proposer_id) {
      console.log('[STATUS] No proposer_id found in URL params');
      setCurrentStatus("");
      return;
    }

    try {
      console.log('[STATUS] Fetching underwriting status for proposer_id:', proposer_id);

      const response = await fetch(`${NODE_API_URL}/api/underwriting/underwriting-status/${proposer_id}`);

      if (response.ok) {
        const statusData = await response.json();
        console.log('[STATUS] Fetched status from underwriting_requests:', statusData);

        // Set the status and message from the database
        setCurrentStatus(statusData.status || "");
        setModalMessage(statusData.message || '');
        console.log('[STATUS] Current status set to:', statusData.status);
      } else {
        console.error('[STATUS] Failed to fetch status:', response.status, response.statusText);
        setCurrentStatus('NOT RETRIEVED');
      }
    } catch (error) {
      console.error('[STATUS] Error fetching underwriting status:', error);
      setCurrentStatus('NOT RETRIEVED');
    }
  };

  // Responsive calculations (moved from the original code)
  const cardHeight = useMemo(() => {
    if (isSmallMobile) return 115;
    if (isMobile) return 120;
    if (isSmallTablet) return 125;
    if (isTablet) return 130;
    if (isDesktop) return 133;
    return 135;
  }, [isSmallMobile, isMobile, isSmallTablet, isTablet, isDesktop]);

const cardGap = useMemo(() => {
  if (isSmallMobile) return 6;   // Further reduced from 8
  if (isMobile) return 8;        // Further reduced from 10
  if (isSmallTablet) return 9;   // Further reduced from 11
  if (isTablet) return 10;       // Further reduced from 12
  return 12;                     // Further reduced from 14
}, [isSmallMobile, isMobile, isSmallTablet, isTablet]);

  const cardsTotalHeight = useMemo(() => {
    return (cardHeight * 2) + cardGap;
  }, [cardHeight, cardGap]);

  // ✅ UPDATED: Reduced table header height to make room for insurance table
  const tableHeaderHeight = useMemo(() => {
    if (isSmallMobile) return 35;
    if (isMobileOrSmaller) return 38;
    return 40;
  }, [isSmallMobile, isMobileOrSmaller]);

  // ✅ UPDATED: Calculate height for documents table (only 2 rows + scrolling)
  const documentsTableHeight = useMemo(() => {
    const singleRowHeight = isSmallMobile ? 44 : isMobile ? 46 : isTablet ? 50 : 52;
    return tableHeaderHeight + (singleRowHeight * 3); // Header + 3 rows now
  }, [tableHeaderHeight, isSmallMobile, isMobile, isTablet]);
  // ✅ UPDATED: Calculate insurance table height to match remaining card height
const insuranceTableHeight = useMemo(() => {
  const twoFieldsHeight = tableHeaderHeight + (2 * (isSmallMobile ? 44 : isMobile ? 46 : isTablet ? 50 : 52));
  return Math.max(twoFieldsHeight, cardsTotalHeight - documentsTableHeight - 6);
}, [cardsTotalHeight, documentsTableHeight, tableHeaderHeight, isSmallMobile, isMobile, isTablet]);
  const pagePadding = useMemo(() => {
    if (isSmallMobile) return 8;
    if (isMobile) return 12;
    if (isSmallTablet) return 14;
    if (isTablet) return 16;
    if (isDesktop) return 18;
    return 20;
  }, [isSmallMobile, isMobile, isSmallTablet, isTablet, isDesktop]);

  // ✅ ADD THE MISSING FUNCTION HERE (before other helper functions)
  const areAllDocumentsProcessed = () => {
    // Simple check - return true if all documents have been processed
    return documents.every(doc =>
      processingStatus[doc.id] === 'verified' ||
      processingStatus[doc.id] === 'mismatch' ||
      processingStatus[doc.id] === 'error'
    );
  };

  // ✅ NEW: Decision handlers
  // ✅ UPDATED: Approve handler with proper message handling
  const handleApprove = async (message) => {
    setStatusUpdateLoading(true);
    try {
      console.log('✅ Approving proposal for proposer:', proposer_id);

      const response = await fetch(`${NODE_API_URL}/api/underwriting/underwriting-requests/${proposer_id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'Approved',
          message: message // ✅ Include the message in the request
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to approve proposal: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('✅ Proposal approved successfully:', result);

      // Trigger header refresh
      window.dispatchEvent(new CustomEvent('statusUpdated', {
        detail: { proposer_id, status: 'Approved' }
      }));

    } catch (error) {
      console.error('❌ Error approving proposal:', error);
      throw error;
    } finally {
      setStatusUpdateLoading(false);
    }
  };

  // ✅ UPDATED: Reject handler with proper message handling
  const handleReject = async (message) => {
    setStatusUpdateLoading(true);
    try {
      console.log('❌ Rejecting proposal for proposer:', proposer_id);

      const response = await fetch(`${NODE_API_URL}/api/underwriting/underwriting-requests/${proposer_id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'Rejected',
          message: message // ✅ Include the message in the request
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to reject proposal: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('❌ Proposal rejected successfully:', result);

      // Trigger header refresh
      window.dispatchEvent(new CustomEvent('statusUpdated', {
        detail: { proposer_id, status: 'Rejected' }
      }));

    } catch (error) {
      console.error('❌ Error rejecting proposal:', error);
      throw error;
    } finally {
      setStatusUpdateLoading(false);
    }
  };

  // ✅ Add useEffect for fetching insurance data:
  useEffect(() => {
    fetchInsuranceData();
  }, [proposer_id]);

  // ✅ UPDATED: Needs Investigation handler with proper message handling
  const handleNeedsInvestigation = async (message) => {
    setStatusUpdateLoading(true);
    try {
      console.log('🔍 Marking proposal for investigation:', proposer_id);

      const response = await fetch(`${NODE_API_URL}/api/underwriting/underwriting-requests/${proposer_id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'Needs Investigation',
          message: message // ✅ Include the message in the request
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to mark for investigation: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('🔍 Proposal marked for investigation successfully:', result);

      // Trigger header refresh
      window.dispatchEvent(new CustomEvent('statusUpdated', {
        detail: { proposer_id, status: 'Needs Investigation' }
      }));

    } catch (error) {
      console.error('❌ Error marking for investigation:', error);
      throw error;
    } finally {
      setStatusUpdateLoading(false);
    }
  };

  // Update items per page based on screen size
  useEffect(() => {
    if (isSmallMobile) {
      setItemsPerPage(4);
    } else if (isMobile) {
      setItemsPerPage(5);
    } else if (isSmallTablet) {
      setItemsPerPage(6);
    } else if (isTablet) {
      setItemsPerPage(7);
    } else if (isDesktop) {
      setItemsPerPage(9);
    } else {
      setItemsPerPage(10); // Large desktop
    }
  }, [isSmallMobile, isMobile, isSmallTablet, isTablet, isDesktop]);

  // ✅ ENHANCED: Log reviewFlags for debugging
  useEffect(() => {
    console.log('🔍 Finance Table - Review Flags:', reviewFlags);
  }, [reviewFlags]);
  useEffect(() => {
    fetchCurrentStatus();
  }, [proposer_id]);

  // ✅ ADD THIS useEffect: Listen for status updates
  useEffect(() => {
    const handleStatusUpdate = (event) => {
      const { proposer_id: updatedProposerId, status } = event.detail;

      // Only update if it's for the current proposer
      if (updatedProposerId === proposer_id) {
        console.log('[FINANCE_TABLE] Status updated via event:', status);
        setCurrentStatus(status);
      }
    };

    // Listen for custom status update events
    window.addEventListener('statusUpdated', handleStatusUpdate);

    return () => {
      window.removeEventListener('statusUpdated', handleStatusUpdate);
    };
  }, [proposer_id]);

  // ✅ UPDATED: Enhanced error handling with proper JSON checks
  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        if (!proposer_id) {
          setDocuments([]);
          setFilteredDocuments([]);
          return;
        }

        console.log(`🔗 Fetching proposer from: ${NODE_API_URL}/api/proposers/${proposer_id}`);
        const proposerResponse = await fetch(`${NODE_API_URL}/api/proposers/${proposer_id}`);
        if (!proposerResponse.ok) {
          const errorText = await proposerResponse.text();
          console.error('❌ Proposer API Error:', errorText);
          throw new Error(`Failed to fetch proposer (${proposerResponse.status}): ${errorText}`);
        }

        const contentType = proposerResponse.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          const responseText = await proposerResponse.text();
          console.error('❌ Expected JSON but got:', responseText);
          throw new Error('Proposer API returned non-JSON response');
        }

        const proposer = await proposerResponse.json();
        console.log('✅ Fetched proposer data:', proposer);
        setSelectedProposer(proposer);

        console.log(`🔗 Fetching documents from: ${NODE_API_URL}/api/documents/${proposer_id}`);
        const docsResponse = await fetch(`${NODE_API_URL}/api/documents/${proposer_id}`);
        if (!docsResponse.ok) {
          if (docsResponse.status === 404) {
            console.log('ℹ️ No documents found for this proposer');
            setDocuments([]);
            setFilteredDocuments([]);
          } else {
            const errorText = await docsResponse.text();
            console.error('❌ Documents API Error:', errorText);
            throw new Error(`Failed to fetch documents (${docsResponse.status}): ${errorText}`);
          }
        } else {
          const docsContentType = docsResponse.headers.get('content-type');
          if (!docsContentType || !docsContentType.includes('application/json')) {
            const responseText = await docsResponse.text();
            console.error('❌ Expected JSON but got:', responseText);
            throw new Error('Documents API returned non-JSON response');
          }

          const list = await docsResponse.json();
          console.log(`✅ Fetched ${list.length} documents for proposer ${proposer_id}:`, list);

          const mapped = list
            .map((doc) => ({
              id: doc.id,
              name: doc.name || doc.document_type,
              document_type: doc.document_type,
              status: doc.status,
              checklist: doc.checklist,
              metadata: doc.metadata,
              source_url: doc.source_url,
              member_id: doc.member_id,
              proposal_number: doc.proposal_number,
              customer_name: doc.customer_name,
              validated: doc.checklist === 'Verified',
              formattedDate: doc.date ? new Date(doc.date).toLocaleDateString('en-US') : new Date().toLocaleDateString('en-US'),
              dateObj: doc.date ? new Date(doc.date) : new Date(),
              processing_status: doc.processing_status || null,
              // ✅ ADD THESE LINES: Include extracted_data and db_validated fields
              extracted_data: doc.extracted_data,
              db_validated: doc.validated,
            }))
            .filter(doc => doc.name !== 'proposal_form' && doc.name !== 'medical docs');

          setDocuments(mapped);
          setFilteredDocuments(mapped);

          // Check for existing processed data
          const immediateResults = {};
          const immediateStatus = {};
          let hasProcessedData = false;

          mapped.forEach(doc => {
            // ✅ USE extracted_data instead of metadata
            if (doc.extracted_data && doc.extracted_data.trim() !== '') {
              hasProcessedData = true;
              try {
                const pythonApiResponse = JSON.parse(doc.extracted_data);
                console.log(`🔍 Parsed stored data for doc ${doc.id}:`, pythonApiResponse);

                // ✅ FIXED: Use the stored Python API response structure directly
                const extractedData = pythonApiResponse.extracted_data || pythonApiResponse;
                const comparisonResults = pythonApiResponse.comparison_results || {};
                const accuracyMetrics = pythonApiResponse.accuracy_metrics || {};
                const overallMatch = pythonApiResponse.overall_match;

                // Use the stored overall_match value or db_validated field
                let isVerified;
                if (typeof overallMatch === 'boolean') {
                  isVerified = overallMatch;
                } else if (doc.db_validated === true) {
                  isVerified = true;
                } else if (doc.db_validated === false) {
                  isVerified = false;
                } else {
                  // Fallback: compute comparison if no stored result
                  const comp = computeComparison(extractedData, proposer);
                  isVerified = comp.overall_match;
                }

                immediateResults[doc.id] = {
                  document_id: doc.id,
                  proposer_id,
                  extracted_data: extractedData, // ✅ Use inner extracted_data
                  comparison_results: comparisonResults, // ✅ Use stored comparison_results
                  overall_match: isVerified,
                  accuracy_metrics: accuracyMetrics, // ✅ Use stored accuracy_metrics
                  processing_time: pythonApiResponse.processing_time || 0,
                  confidence_score: accuracyMetrics.overall_accuracy ? accuracyMetrics.overall_accuracy / 100 : 0,
                  message: isVerified
                    ? `Document verified successfully with ${accuracyMetrics.overall_accuracy || 100}% accuracy`
                    : `Document verification failed with ${accuracyMetrics.overall_accuracy || 0}% accuracy`,
                  document_info: {
                    id: doc.id,
                    type: pythonApiResponse.document_type || doc.document_type,
                    member_id: doc.member_id
                  }
                };

                immediateStatus[doc.id] = isVerified ? 'verified' : 'mismatch';

                console.log(`✅ Restored status for doc ${doc.id}: ${immediateStatus[doc.id]} (overall_match: ${isVerified})`);

              } catch (error) {
                console.error(`❌ Error parsing extracted data for document ${doc.id}:`, error);
                immediateStatus[doc.id] = 'error';
              }
            } else {
              // Document hasn't been processed yet
              immediateStatus[doc.id] = 'pending';
            }
          });

          if (Object.keys(immediateStatus).length > 0) {
            setProcessingStatus(prev => ({ ...prev, ...immediateStatus }));
            setComparisonResults(prev => ({ ...prev, ...immediateResults }));
            console.log(`✅ Initialized status for ${Object.keys(immediateStatus).length} documents from database`);
            console.log('📊 Initial processing status:', immediateStatus);
          }
        }
      } catch (e) {
        console.error('❌ Load error:', e);
        setError(e.message);
        setDocuments([]);
        setFilteredDocuments([]);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [proposer_id]);

  // Search filter
  useEffect(() => {
    let result = [...documents];
    if (searchTerm.trim()) {
      result = result.filter(
        (d) =>
          (d.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
          (d.document_type || '').toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    setFilteredDocuments(result);
  }, [documents, searchTerm]);

  // ✅ NEW: Auto-process all documents when they are loaded
  useEffect(() => {
    // Abort controller to cancel ongoing requests
    const abortController = new AbortController();
    let isMounted = true;
    let processingInProgress = false;

    const autoProcessDocuments = async () => {
      // Only auto-process if we have documents and they haven't been processed yet
      if (documents.length === 0 || !isMounted) return;

      console.log('🚀 Auto-processing started for', documents.length, 'documents');
      processingInProgress = true;

      // Check if any documents are already processed to avoid re-processing
      const unprocessedDocs = documents.filter(doc => {
        console.log(`   Raw extracted_data for doc ${doc.id}:`, doc.extracted_data);
        const hasExtractedData = doc.extracted_data && doc.extracted_data.trim() !== '';

        if (hasExtractedData) {
          console.log(`⏭️ Skipping document ${doc.id} - already has extracted data`);
          return false;
        }

        return true;
      });

      if (unprocessedDocs.length === 0) {
        console.log('ℹ️ All documents already processed, skipping auto-processing');
        processingInProgress = false;
        return;
      }

      console.log(`📄 Processing ${unprocessedDocs.length} unprocessed documents`);

      // Process documents sequentially with abort checks
      for (let i = 0; i < unprocessedDocs.length; i++) {
        // ✅ CHECK: Stop processing if component unmounted or aborted
        if (!isMounted || abortController.signal.aborted) {
          console.log('🛑 Auto-processing stopped - component unmounted or aborted');
          break;
        }

        const doc = unprocessedDocs[i];

        try {
          console.log(`🔄 Auto-processing document ${i + 1}/${unprocessedDocs.length}: ${doc.name}`);

          // ✅ ENHANCED: Pass abort signal to handleProcessDocument (if supported)
          await handleProcessDocumentWithAbort(doc.id, abortController.signal);

          // ✅ CHECK: Stop if component unmounted during processing
          if (!isMounted || abortController.signal.aborted) {
            console.log('🛑 Auto-processing stopped during document processing');
            break;
          }

          // Small delay between processing documents with abort check
          if (i < unprocessedDocs.length - 1) {
            await new Promise((resolve, reject) => {
              const timeoutId = setTimeout(() => {
                if (abortController.signal.aborted) {
                  reject(new Error('Aborted'));
                } else {
                  resolve();
                }
              }, 1000);

              // If aborted during timeout, clear it immediately
              abortController.signal.addEventListener('abort', () => {
                clearTimeout(timeoutId);
                reject(new Error('Aborted'));
              });
            });
          }
        } catch (error) {
          if (error.message === 'Aborted') {
            console.log('🛑 Auto-processing aborted');
            break;
          }
          console.error(`❌ Error auto-processing document ${doc.id}:`, error);
          // Continue processing other documents even if one fails
        }
      }

      processingInProgress = false;
      if (isMounted && !abortController.signal.aborted) {
        console.log('✅ Auto-processing completed');
      }
    };

    // Only trigger auto-processing if conditions are met
    if (documents.length > 0 && selectedProposer && !loading) {
      const timer = setTimeout(() => {
        if (isMounted && !abortController.signal.aborted) {
          autoProcessDocuments();
        }
      }, 500);

      // Cleanup timer if component unmounts before timeout
      abortController.signal.addEventListener('abort', () => {
        clearTimeout(timer);
      });
    }

    // ✅ CLEANUP FUNCTION: Called when component unmounts or dependencies change
    return () => {
      console.log('🧹 Cleaning up auto-processing...');

      isMounted = false;
      abortController.abort(); // This will stop all ongoing fetch requests

      if (processingInProgress) {
        console.log('🛑 Stopped auto-processing due to component unmount');
      }
    };
  }, [documents, selectedProposer, loading]); // Dependencies: trigger when documents or proposer data changes

  // ✅ ADD THIS: Enhanced debug logging for persistence
  useEffect(() => {
    console.log('🔍 Debug - Persistence Restoration Check:');
    console.log('   documents.length:', documents.length);
    console.log('   processingStatus keys:', Object.keys(processingStatus).length);
    console.log('   comparisonResults keys:', Object.keys(comparisonResults).length);

    documents.forEach(doc => {
      console.log(`   Raw extracted_data for doc ${doc.id}:`, doc.extracted_data);
      const hasExtractedData = doc.extracted_data && doc.extracted_data.trim() !== '';

      const status = processingStatus[doc.id];
      const hasComparison = !!comparisonResults[doc.id];

      console.log(`   Doc ${doc.id} (${doc.name}):`);
      console.log(`     hasExtractedData: ${hasExtractedData}`);
      console.log(`     status: ${status}`);
      console.log(`     hasComparison: ${hasComparison}`);

      if (hasExtractedData) {
        try {
          const parsed = JSON.parse(doc.extracted_data);
          console.log(`     overall_match: ${parsed.overall_match}`);
          console.log(`     has comparison_results: ${!!parsed.comparison_results}`);
        } catch (e) {
          console.log(`     parse error: ${e.message}`);
        }
      }
    });
  }, [documents, processingStatus, comparisonResults]);

  // Helper functions
  const formatDOB = (dobValue) => {
    if (!dobValue) return '—';
    try {
      if (typeof dobValue === 'string' && dobValue.includes('/')) {
        const parts = dobValue.split('/');
        if (parts.length === 3) {
          const date = new Date(dobValue);
          if (!isNaN(date.getTime())) {
            const year = date.getFullYear();
            const month = (date.getMonth() + 1).toString().padStart(2, '0');
            const day = date.getDate().toString().padStart(2, '0');
            return `${year}/${month}/${day}`;
          }
        }
        return dobValue;
      }

      const date = new Date(dobValue);
      if (isNaN(date.getTime())) return 'Invalid Date';

      const year = date.getFullYear();
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const day = date.getDate().toString().padStart(2, '0');
      return `${year}/${month}/${day}`;
    } catch (error) {
      console.error('Error formatting DOB:', error);
      return 'Invalid Date';
    }
  };

  const formatSalary = (salary) => {
    if (!salary && salary !== 0) return '—';
    const formatted = Number(salary).toLocaleString('en-IN');
    return isMobileOrSmaller ? `₹${formatted}` : `₹${formatted}/-`;
  };

  const getDocumentTypeFromId = (docId) => {
    const doc = documents.find((d) => d.id === docId);
    if (!doc) return null;
    const t = (doc.document_type || '').toLowerCase();
    if (t.includes('pan')) return 'PAN CARD';
    if (t.includes('payslip')) return 'PAYSLIP';
    if (t.includes('bank')) return 'BANK STATEMENT';
    if (t.includes('itr')) return 'ITR';
    if (t.includes('gst')) return 'GST';
    return doc.document_type?.toUpperCase() || 'UNKNOWN';
  };

  // ✅ ADD THIS SUCCESS POPUP COMPONENT:
  const SuccessPopup = ({ message, onDismiss }) => {
    return (
      <div style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        background: '#ffffff',
        borderRadius: '20px',
        padding: '30px',
        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.2)',
        zIndex: 9999,
        width: '300px',
        textAlign: 'center',
        fontFamily: 'PP Neue Montreal, sans-serif'
      }}>
        {/* Display only the tick icon image without blue background */}
        <img
          src={tickIcon}
          alt="Success"
          style={{
            width: 120,
            height: 120,
            display: 'block',
            marginLeft: 'auto',
            marginRight: 'auto',
            marginBottom: 20
          }}
        />

        {/* Title */}
        <h3 style={{
          margin: '0 0 8px 0',
          fontSize: '24px',
          fontWeight: 'bold',
          color: '#1f2937'
        }}>
          Notes Added
        </h3>

        {/* Display user's actual message */}
        <p style={{
          margin: '0 0 20px 0',
          color: '#6b7280',
          fontSize: '16px',
          lineHeight: '1.5'
        }}>
          {message && message.trim() ? message : 'Notes has been issued successfully!'}
        </p>

        {/* Dismiss Button */}
        <button
          onClick={onDismiss}
          style={{
            background: '#2563eb',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: '500',
            padding: '12px 36px',
            cursor: 'pointer',
            fontFamily: 'PP Neue Montreal, sans-serif',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.target.style.background = '#1d4ed8';
          }}
          onMouseLeave={(e) => {
            e.target.style.background = '#2563eb';
          }}
        >
          Dismiss
        </button>
      </div>
    );
  };

  // Enhanced function to get verified documents for each parameter with error handling
  const getVerifiedDocumentsForParameter = (key) => {
    const verifiedDocs = [];
    const errorDocs = [];
    const warningDocs = [];

    Object.keys(comparisonResults).forEach((id) => {
      const result = comparisonResults[id];

      // ✅ FIXED: Use the Python API comparison results directly instead of recalculating
      if (!result?.comparison_results) return;

      const comparisons = result.comparison_results || {};
      const docType = getDocumentTypeFromId(id);

      if (!docType) return;

      switch (key) {
        case 'Name':
          if (comparisons.name) {
            if (comparisons.name.match) {
              if (!verifiedDocs.includes(docType)) verifiedDocs.push(docType);
            } else {
              if (!errorDocs.includes(docType)) errorDocs.push(docType);
            }
          }
          break;

        case 'PAN':
          if (comparisons.pan_number) {
            if (comparisons.pan_number.match) {
              if (!verifiedDocs.includes('PAN CARD')) verifiedDocs.push('PAN CARD');
            } else {
              if (!errorDocs.includes('PAN CARD')) errorDocs.push('PAN CARD');
            }
          }
          break;

        case 'DOB':
          if (comparisons.dob) {
            if (comparisons.dob.match) {
              if (!verifiedDocs.includes(docType)) verifiedDocs.push(docType);
            } else {
              if (!errorDocs.includes(docType)) errorDocs.push(docType);
            }
          }
          break;

        case 'Annual Salary':
          if (comparisons.salary) {
            if (comparisons.salary.match) {
              if (['PAYSLIP', 'BANK STATEMENT', 'ITR'].includes(docType.toUpperCase()) && !verifiedDocs.includes(docType)) {
                verifiedDocs.push(docType);
              }
            } else {
              if (['PAYSLIP', 'BANK STATEMENT', 'ITR'].includes(docType.toUpperCase()) && !errorDocs.includes(docType)) {
                errorDocs.push(docType);
              }
            }
          }
          break;

        default:
          break;
      }
    });

    return { verifiedDocs, errorDocs, warningDocs };
  };

  // Function to check if there are any processing errors for a field
  const hasFieldErrors = (fieldName) => {
    const { errorDocs } = getVerifiedDocumentsForParameter(fieldName);
    return errorDocs.length > 0;
  };

  const refreshDocuments = async () => {
    try {
      const docsResponse = await fetch(`${NODE_API_URL}/api/documents/${proposer_id}`);
      if (docsResponse.ok) {
        const updatedDocs = await docsResponse.json();
        const enrichedData = updatedDocs
          .map((doc) => ({
            id: doc.id,
            name: doc.name || doc.document_type,
            document_type: doc.document_type,
            status: doc.status,
            checklist: doc.checklist,
            metadata: doc.metadata,
            source_url: doc.source_url,
            member_id: doc.member_id,
            proposal_number: doc.proposal_number,
            customer_name: doc.customer_name,
            validated: doc.checklist === 'Verified',
            formattedDate: doc.date ? new Date(doc.date).toLocaleDateString('en-US') : new Date().toLocaleDateString('en-US'),
            dateObj: doc.date ? new Date(doc.date) : new Date(),
            processing_status: doc.processing_status || null,
            // ✅ ADD THESE CRITICAL MISSING FIELDS:
            extracted_data: doc.extracted_data,
            db_validated: doc.validated,
          }))
          .filter(doc => doc.name !== 'proposal_form' && doc.name !== 'medical docs');
        setDocuments(enrichedData);
        setFilteredDocuments(enrichedData);

        // ✅ ADD: Log the refreshed documents to verify extracted_data is present
        console.log('🔄 Documents refreshed with extracted_data:', enrichedData.map(d => ({
          id: d.id,
          name: d.name,
          hasExtractedData: !!(d.extracted_data && d.extracted_data.trim())
        })));
      }
    } catch (error) {
      console.error('❌ Failed to refresh documents:', error);
    }
  };

  // ✅ COMPLETELY UPDATED: Main Python API processing function
  const handleProcessDocument = async (documentId) => {
    console.log('🚀 === STARTING DOCUMENT PROCESSING ===');
    console.log('📄 Document ID:', documentId);
    console.log('🔗 Python API URL:', PYTHON_API_URL);

    setProcessingStatus((prev) => ({ ...prev, [documentId]: 'processing' }));

    try {
      const apiUrl = `${PYTHON_API_URL}/process-document/${documentId}`;
      console.log('🔗 Full API URL:', apiUrl);

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        mode: 'cors',
        credentials: 'omit',
      });

      console.log('📥 Response received:');
      console.log('   Status:', response.status);
      console.log('   Status Text:', response.statusText);
      console.log('   OK:', response.ok);

      if (!response.ok) {
        let errorMessage;
        try {
          const errorText = await response.text();
          console.error('❌ Error response:', errorText);
          errorMessage = errorText;
        } catch (parseError) {
          console.error('❌ Could not parse error response:', parseError);
          errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      // ✅ ENHANCED: Better JSON parsing with content type check
      let pythonApiResponse;
      try {
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          const responseText = await response.text();
          console.error('❌ Expected JSON but got:', responseText.substring(0, 200));
          throw new Error('Python API returned non-JSON response');
        }

        const responseText = await response.text();
        console.log('📄 Raw response text:', responseText);

        if (!responseText) {
          throw new Error('Empty response from Python API');
        }

        pythonApiResponse = JSON.parse(responseText);
        console.log('✅ Parsed Python API response:', pythonApiResponse);
      } catch (parseError) {
        console.error('❌ Error parsing JSON response:', parseError);
        throw new Error(`Failed to parse Python API response: ${parseError.message}`);
      }

      // ✅ UPDATED: Use Python API results directly without re-processing
      if (!pythonApiResponse.extracted_data) {
        throw new Error('Invalid response structure: missing extracted_data');
      }

      if (!selectedProposer) {
        throw new Error('Proposer data not available for comparison');
      }

      // ✅ NEW: Use Python API comparison results directly
      const comparisonResults = pythonApiResponse.comparison_results || {};
      const overallMatch = pythonApiResponse.overall_match || false;
      const accuracyMetrics = pythonApiResponse.accuracy_metrics || {};

      console.log('📊 Python API comparison results:', comparisonResults);
      console.log('📊 Overall match:', overallMatch);
      console.log('📊 Accuracy metrics:', accuracyMetrics);

      // Update document status in Node.js backend
      try {
        const updateResponse = await fetch(`${NODE_API_URL}/api/documents/${documentId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            validated: overallMatch,
            extracted_data: JSON.stringify(pythonApiResponse), // ✅ Store the complete response
            processing_status: 'processed',
          }),
        });

        if (!updateResponse.ok) {
          console.warn('⚠️ Failed to update document status in Node.js backend:', updateResponse.statusText);
        } else {
          console.log('✅ Successfully updated document status in Node.js backend');
        }
      } catch (updateError) {
        console.warn('⚠️ Error updating document status:', updateError);
      }

      // ✅ UPDATED: Create processing result using Python API data
      const processingResult = {
        document_id: documentId,
        proposer_id,
        extracted_data: pythonApiResponse.extracted_data,
        comparison_results: comparisonResults, // Use Python API results
        overall_match: overallMatch,
        accuracy_metrics: accuracyMetrics,
        processing_time: pythonApiResponse.processing_time || 0,
        confidence_score: accuracyMetrics.overall_accuracy ? accuracyMetrics.overall_accuracy / 100 : 0,
        message: overallMatch
          ? `Document verified successfully with ${accuracyMetrics.overall_accuracy || 100}% accuracy`
          : `Document verification failed with ${accuracyMetrics.overall_accuracy || 0}% accuracy`,
        document_info: {
          id: documentId,
          type: pythonApiResponse.document_type,
          member_id: documents.find(d => d.id === documentId)?.member_id
        }
      };

      // Update frontend state
      setComparisonResults((prev) => ({ ...prev, [documentId]: processingResult }));

      setProcessingStatus((prev) => ({
        ...prev,
        [documentId]: overallMatch ? 'verified' : 'mismatch',
      }));

      if (overallMatch) {
        const docType = getDocumentTypeFromId(documentId);
        setVerifiedDocuments(prev => ({
          ...prev,
          [documentId]: docType
        }));
      }

      // Refresh documents from Node.js API
      await refreshDocuments();

      console.log('🎉 === DOCUMENT PROCESSING COMPLETED SUCCESSFULLY ===');

      // Show success/failure message
      alert(overallMatch
        ? `✅ Document verified successfully! ${accuracyMetrics.overall_accuracy || 100}% accuracy.`
        : `⚠️ Document verification failed. ${accuracyMetrics.overall_accuracy || 0}% accuracy.`
      );

    } catch (error) {
      console.error('💥 === ERROR IN DOCUMENT PROCESSING ===');
      console.error('Error type:', error.constructor.name);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);

      setProcessingStatus((prev) => ({ ...prev, [documentId]: 'error' }));

      // ✅ UPDATED: Enhanced error messages
      let errorMessage = error.message;
      if (error.message.includes('Failed to fetch') || error.name === 'TypeError') {
        errorMessage = `Network connection failed. Please check if the Python API server is running at: ${PYTHON_API_URL}`;
      } else if (error.message.includes('Failed to parse')) {
        errorMessage = 'Server response could not be parsed. The Python API may be returning invalid data.';
      } else if (error.message.includes('CORS')) {
        errorMessage = 'CORS error: Python API server may not be configured to accept requests from this domain.';
      }

      alert(`❌ Error: ${errorMessage}`);
    }
  };

  const handleProcessDocumentWithAbort = async (documentId, abortSignal = null) => {
    console.log('🚀 === STARTING DOCUMENT PROCESSING ===');
    console.log('📄 Document ID:', documentId);

    // Check if already aborted before starting
    if (abortSignal?.aborted) {
      console.log('🛑 Processing aborted before starting');
      return;
    }

    setProcessingStatus((prev) => ({ ...prev, [documentId]: 'processing' }));

    try {
      const apiUrl = `${PYTHON_API_URL}/process-document/${documentId}`;
      console.log('🔗 Full API URL:', apiUrl);

      // ✅ ENHANCED: Include abort signal in fetch request
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        mode: 'cors',
        credentials: 'omit',
        signal: abortSignal, // ✅ This will cancel the request if aborted
      });

      // Check if aborted after fetch
      if (abortSignal?.aborted) {
        console.log('🛑 Processing was aborted during fetch');
        return;
      }

      console.log('📥 Response received:');
      console.log('   Status:', response.status);
      console.log('   OK:', response.ok);

      if (!response.ok) {
        let errorMessage;
        try {
          const errorText = await response.text();
          console.error('❌ Error response:', errorText);
          errorMessage = errorText;
        } catch (parseError) {
          console.error('❌ Could not parse error response:', parseError);
          errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      // ✅ Parse response with abort check
      let pythonApiResponse;
      try {
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          const responseText = await response.text();
          console.error('❌ Expected JSON but got:', responseText.substring(0, 200));
          throw new Error('Python API returned non-JSON response');
        }

        const responseText = await response.text();

        // Check if aborted during response parsing
        if (abortSignal?.aborted) {
          console.log('🛑 Processing was aborted during response parsing');
          return;
        }

        if (!responseText) {
          throw new Error('Empty response from Python API');
        }

        pythonApiResponse = JSON.parse(responseText);
        console.log('✅ Parsed Python API response:', pythonApiResponse);
      } catch (parseError) {
        if (abortSignal?.aborted) {
          console.log('🛑 Processing was aborted');
          return;
        }
        console.error('❌ Error parsing JSON response:', parseError);
        throw new Error(`Failed to parse Python API response: ${parseError.message}`);
      }

      // Continue with rest of processing logic...
      if (!pythonApiResponse.extracted_data) {
        throw new Error('Invalid response structure: missing extracted_data');
      }

      if (!selectedProposer) {
        throw new Error('Proposer data not available for comparison');
      }

      // Final abort check before updating state
      if (abortSignal?.aborted) {
        console.log('🛑 Processing was aborted before updating state');
        return;
      }

      // ✅ UPDATED: Use Python API results directly
      const comparisonResults = pythonApiResponse.comparison_results || {};
      const overallMatch = pythonApiResponse.overall_match || false;
      const accuracyMetrics = pythonApiResponse.accuracy_metrics || {};

      console.log('📊 Python API comparison results:', comparisonResults);

      // Update states only if not aborted
      if (!abortSignal?.aborted) {
        // Update document status in Node.js backend
        try {
          const updateResponse = await fetch(`${NODE_API_URL}/api/documents/${documentId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              validated: overallMatch,
              extracted_data: JSON.stringify(pythonApiResponse), // ✅ Store the complete response
              processing_status: 'processed',
            }),
            signal: abortSignal, // Also abort this request
          });

          if (!updateResponse.ok) {
            console.warn('⚠️ Failed to update document status');
          }
        } catch (updateError) {
          if (abortSignal?.aborted) {
            console.log('🛑 Update request was aborted');
            return;
          }
          console.warn('⚠️ Error updating document status:', updateError);
        }

        // ✅ UPDATED: Create processing result using Python API data
        const processingResult = {
          document_id: documentId,
          proposer_id,
          extracted_data: pythonApiResponse.extracted_data,
          comparison_results: comparisonResults, // Use Python API results
          overall_match: overallMatch,
          accuracy_metrics: accuracyMetrics,
          processing_time: pythonApiResponse.processing_time || 0,
          confidence_score: accuracyMetrics.overall_accuracy ? accuracyMetrics.overall_accuracy / 100 : 0,
          message: overallMatch
            ? `Document verified successfully with ${accuracyMetrics.overall_accuracy || 100}% accuracy`
            : `Document verification failed with ${accuracyMetrics.overall_accuracy || 0}% accuracy`,
          document_info: {
            id: documentId,
            type: pythonApiResponse.document_type,
            member_id: documents.find(d => d.id === documentId)?.member_id
          }
        };

        setComparisonResults((prev) => ({ ...prev, [documentId]: processingResult }));
        setProcessingStatus((prev) => ({
          ...prev,
          [documentId]: overallMatch ? 'verified' : 'mismatch',
        }));

        if (overallMatch) {
          const docType = getDocumentTypeFromId(documentId);
          setVerifiedDocuments(prev => ({
            ...prev,
            [documentId]: docType
          }));
        }

        await refreshDocuments();
        console.log('🎉 === DOCUMENT PROCESSING COMPLETED SUCCESSFULLY ===');
      }

    } catch (error) {
      // Handle abort error differently
      if (error.name === 'AbortError' || abortSignal?.aborted) {
        console.log('🛑 Document processing was aborted');
        // Don't update processing status to error for aborted requests
        return;
      }

      console.error('💥 === ERROR IN DOCUMENT PROCESSING ===');
      console.error('Error message:', error.message);

      // Only update error state if not aborted
      if (!abortSignal?.aborted) {
        setProcessingStatus((prev) => ({ ...prev, [documentId]: 'error' }));

        let errorMessage = error.message;
        if (error.message.includes('Failed to fetch') || error.name === 'TypeError') {
          errorMessage = `Network connection failed. Please check if the Python API server is running at: ${PYTHON_API_URL}`;
        } else if (error.message.includes('Failed to parse')) {
          errorMessage = 'Server response could not be parsed. The Python API may be returning invalid data.';
        }

        alert(`❌ Error: ${errorMessage}`);
      }
    }
  };

  const handlePreviewClick = async (documentId) => {
    try {
      setPreviewError(null);
      console.log('👁️ Previewing document with ID:', documentId);
      const response = await fetch(`${NODE_API_URL}/api/documents/preview/${documentId}`);
      if (!response.ok) throw new Error(`Failed to fetch document ${documentId}: ${response.statusText}`);
      const data = await response.json();
      if (data?.pdfUrl || data?.source_url) {
        setPreviewUrl(data.pdfUrl || data.source_url);
      } else {
        throw new Error('PDF URL not found');
      }
    } catch (error) {
      console.error('❌ Error fetching PDF URL:', error);
      setPreviewError(error.message);
    }
  };

  const closePreview = () => {
    setPreviewUrl(null);
    setPreviewError(null);
  };

  const handleViewVerificationDetails = (documentId) => {
    setSelectedDocumentId(documentId);
    setShowComparisonModal(true);
  };

  const generateDynamicSubtitle = () => {
    const proposerName = selectedProposer?.customer_name || 'proposer';
    const documentCount = documents.length;
    const verifiedCount = documents.filter(doc => doc.checklist === 'Verified').length;

    if (loading) return 'Loading financial information...';
    if (error) return 'Error loading financial data. Please try again.';
    if (documentCount === 0) return `No documents found for ${proposerName}. Please upload documents to continue.`;
    if (verifiedCount === documentCount) return `All ${documentCount} documents verified successfully for ${proposerName}. Ready to proceed.`;
    if (verifiedCount === 0) return `${documentCount} documents found for ${proposerName}. ${documentCount} pending verification.`;
    return `${verifiedCount} of ${documentCount} documents verified for ${proposerName}. ${documentCount - verifiedCount} pending review.`;
  };

  // Loading screen when processing or documents not fully processed
  if (loading || error || showLoadingScreen || !areAllDocumentsProcessed()) {
    return (
      <div
        style={{
          width: '100%',
          minHeight: 'calc(100vh - 2rem)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '32px',
          backgroundColor: 'rgba(255, 255, 255, 0.85)',
          backdropFilter: 'blur(10px)',
          borderRadius: '12px',
          border: '1px solid rgba(59, 130, 246, 0.3)',
          fontFamily: FAMILY,
          boxSizing: 'border-box'
        }}
      >
        <img
          src={watermarkIcon}
          alt="Watermark"
          style={{
            position: 'fixed',
            bottom: 0,
            right: 0,
            width: isDesktop ? '384px' : isTablet ? '320px' : '256px',
            opacity: 0.3,
            pointerEvents: 'none',
            userSelect: 'none',
            zIndex: 0
          }}
        />
        <div style={{ textAlign: 'center', maxWidth: '448px', position: 'relative', zIndex: 10 }}>
          <div style={{ position: 'relative', marginBottom: '32px' }}>
            <div style={{ position: 'relative', width: '80px', height: '80px', margin: '0 auto' }}>
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  border: '4px solid #DBEAFE',
                  borderTopColor: '#2563EB',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }}
              />
              <div style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <img src={companyLogo} alt="Company Logo" style={{ width: '48px', height: '48px' }} />
              </div>
            </div>
          </div>
          <h3 style={{
            fontSize: '20px',
            fontWeight: 600,
            color: '#111827',
            marginBottom: '8px'
          }}>
            Processing Financial Documents
          </h3>
          <p style={{
            color: '#6B7280',
            fontSize: '16px',
            marginBottom: '16px'
          }}>
            Please wait while we analyze all financial documents with AI...
          </p>
          {decisionProcessing && (
            <div style={{
              width: '100%',
              backgroundColor: '#DBEAFE',
              borderRadius: '9999px',
              height: '12px',
              marginBottom: '16px'
            }}>
              <div
                style={{
                  width: `${batchProcessingProgress}%`,
                  height: '12px',
                  backgroundColor: '#2563EB',
                  borderRadius: '9999px',
                  transition: 'width 0.3s ease'
                }}
              />
            </div>
          )}
          {decisionProcessing && (
            <div style={{
              fontSize: '14px',
              color: '#2563EB',
              marginBottom: '8px'
            }}>
              {batchProcessingProgress}% Complete
            </div>
          )}
          <div style={{
            fontSize: '14px',
            color: '#6B7280'
          }}>
            {batchProcessingStatus || 'Initializing processing...'}
          </div>
          <div style={{
            marginTop: '24px',
            fontSize: '12px',
            color: '#9CA3AF',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              <div style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: decisionProcessing ? '#2563EB' : '#D1D5DB',
                animation: decisionProcessing ? 'pulse 1.5s ease-in-out infinite' : 'none'
              }} />
              <span>Extracting text from documents</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              <div style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: batchProcessingProgress > 50 ? '#2563EB' : '#D1D5DB',
                animation: batchProcessingProgress > 50 ? 'pulse 1.5s ease-in-out infinite' : 'none'
              }} />
              <span>Analyzing financial parameters</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              <div style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: batchProcessingProgress > 80 ? '#2563EB' : '#D1D5DB',
                animation: batchProcessingProgress > 80 ? 'pulse 1.5s ease-in-out infinite' : 'none'
              }} />
              <span>Verifying identity information</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (activeTab !== 'Financial Review') return null;

  const titleBlock = (
    <div style={{
      width: '100%',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: isMobileOrSmaller ? 'flex-start' : 'center',
      marginBottom: isMobileOrSmaller ? 16 : isTablet ? 14 : 12,
      gap: isSmallMobile ? 8 : 10,
      fontFamily: FAMILY,
      flexDirection: isSmallMobile ? 'column' : 'row'
    }}>
      <div style={{
        display: 'inline-flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        width: isSmallMobile ? '100%' : 'auto',
        marginBottom: isSmallMobile ? 12 : 0
      }}>
        <div style={{
          height: isMobileOrSmaller ? 'auto' : 26,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          flexWrap: 'wrap'
        }}>
          <div style={{
            color: 'rgba(0,0,0,0.88)',
            fontSize: isSmallMobile ? 16 : isMobile ? 18 : isSmallTablet ? 20 : isTablet ? 21 : 22,
            fontWeight: 500,
            lineHeight: '26px'
          }}>
            Financial Review
          </div>
        </div>
        <div style={{
          color: COLORS.textMuted,
          fontSize: isSmallMobile ? 11 : isMobile ? 12 : 13.5,
          fontWeight: 400,
          lineHeight: '19px',
          marginTop: 2,
          wordBreak: 'break-word'
        }}>
          {generateDynamicSubtitle()}
        </div>
      </div>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        width: isSmallMobile ? '100%' : 'auto'
      }}>
        <img src={MagnifyingGlass} alt="" style={{
          width: isSmallMobile ? 14 : isMobile ? 16 : 18,
          height: isSmallMobile ? 14 : isMobile ? 16 : 18
        }} />
        <input
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder={isSmallMobile ? "Search..." : isMobile ? "Search documents..." : "Search form table..."}
          style={{
            width: isSmallMobile ? '100%' :
              isMobile ? 180 :
                isSmallTablet ? 220 :
                  isTablet ? 280 :
                    isDesktop ? 320 : 350,
            height: isSmallMobile ? 30 : isMobile ? 32 : 36,
            borderRadius: 8,
            border: `1px solid ${COLORS.grayLine}`,
            background: '#fff',
            padding: '0 10px',
            fontFamily: FAMILY,
            fontSize: isSmallMobile ? 11 : isMobile ? 12 : 13.5,
          }}
        />
      </div>
    </div>
  );

  const financeScoreCard = (
    <div style={{
      position: 'relative',
      width: '100%',
      borderRadius: '12px',
      overflow: 'hidden',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: '12px',
      flexShrink: 0,
      zIndex: 20,
      height: isDesktop ? 80 : isTablet ? 72 : 64,
      padding: 8,
      background: 'linear-gradient(0deg, #7AA5FF 0%, #3371F2 0%, #0F1522 100%), #FFECCE',
      marginBottom: isMobileOrSmaller ? 16 : isTablet ? 14 : 12,
      fontFamily: FAMILY
    }}>
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '303px',
        height: '206px',
        transform: 'rotate(-12deg)',
        transformOrigin: 'top left',
        background: 'linear-gradient(51deg, rgba(92, 118, 171, 0.20) 0%, rgba(165.50, 177, 200.50, 0.20) 60%, rgba(76, 99, 146, 0.20) 93%)'
      }} />
      <div style={{
        position: 'absolute',
        top: 0,
        right: 0,
        width: '100%',
        height: '100%',
        transform: 'rotate(-3deg)',
        transformOrigin: 'top left',
        background: 'linear-gradient(51deg, rgba(92, 118, 171, 0.20) 0%, rgba(165.50, 177, 200.50, 0.20) 60%, rgba(76, 99, 146, 0.20) 93%)'
      }} />
      <div style={{
        position: 'absolute',
        top: 8,
        right: 8,
        opacity: 0.2,
        zIndex: 10
      }}>
        <img src={watermarkIcon} alt="Watermark" style={{
          userSelect: 'none',
          pointerEvents: 'none',
          width: isDesktop ? 32 : 24,
          height: isDesktop ? 32 : 24
        }} />
      </div>
      <div style={{
        position: 'relative',
        zIndex: 10,
        width: '100%',
        height: '100%',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12
        }}>
          <div style={{
            width: isDesktop ? 48 : 40,
            height: isDesktop ? 48 : 40,
            background: 'linear-gradient(135deg, #2563eb 0%, rgba(59, 130, 246, 0.4) 100%)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <img src={financeScoreIcon} alt="Finance Score" style={{
              width: isDesktop ? 28 : 24,
              height: isDesktop ? 28 : 24
            }} />
          </div>
          <div style={{
            display: 'flex',
            flexDirection: 'column'
          }}>
            <span style={{
              color: 'white',
              fontWeight: 500,
              fontSize: isDesktop ? 12 : 12
            }}>
              Finance Score
            </span>
            <div style={{
              display: 'flex',
              alignItems: 'flex-end',
              gap: 4
            }}>
            </div>
          </div>
        </div>
        {isDesktop && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
            marginTop: 8
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4
            }}>
              <span style={{
                color: 'white',
                fontSize: 12,
                fontWeight: 500
              }}>
                4/4 parameters verified
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const VerifiedRow = ({ children }) => (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: isMobileOrSmaller ? 6 : isTablet ? 8 : 10,
      marginTop: isMobileOrSmaller ? 8 : isTablet ? 10 : 12,
      flexWrap: 'wrap',
      minHeight: 24
    }}>
      <img src={ShieldCheck} alt="" style={{
        width: isMobileOrSmaller ? 12 : isTablet ? 14 : 16,
        height: isMobileOrSmaller ? 12 : isTablet ? 14 : 16,
        flexShrink: 0
      }} />
      <div style={{
        color: COLORS.textDark,
        fontSize: isMobileOrSmaller ? 10 : isTablet ? 11.5 : 12.5,
        fontWeight: 550,
        fontFamily: FAMILY,
        whiteSpace: 'nowrap',
        flexShrink: 0
      }}>
        Verified Through
      </div>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: isMobileOrSmaller ? 4 : isTablet ? 6 : 8,
        flexWrap: 'wrap',
        flex: 1
      }}>
        {children}
      </div>
    </div>
  );

  const Card = ({ iconGradient, iconSrc, label, value, chips, hasError = false }) => (
    <div style={{
      background: COLORS.cardBg,
      borderRadius: 8,
      padding: isSmallMobile ? 10 : isMobile ? 12 : isSmallTablet ? 14 : isTablet ? 15 : 16,
      border: `1px solid ${COLORS.grayLine}`,
      fontFamily: FAMILY,
      height: cardHeight,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between'
    }}>
      <div style={{
        display: 'flex',
        gap: isSmallMobile ? 8 : isMobile ? 10 : isTablet ? 11 : 12,
        alignItems: 'center'
      }}>
        <IconBubble
          gradient={iconGradient}
          iconSrc={iconSrc}
          alt={label}
          iconSize={isSmallMobile ? 16 : isMobile ? 17 : isTablet ? 19 : 20}
          size={isSmallMobile ? 36 : isMobile ? 38 : isTablet ? 42 : 44}
        />
        <div style={{ flex: 1 }}>
          <div style={{
            color: COLORS.textMuted,
            fontSize: isSmallMobile ? 10 : isMobile ? 11 : isTablet ? 12 : 12.5,
            fontWeight: 500
          }}>
            {label}
          </div>
          <div style={{
            color: hasError ? COLORS.errorColor : COLORS.textMain,
            fontSize: isSmallMobile ? 14 : isMobile ? 16 : isSmallTablet ? 18 : isTablet ? 20 : 21,
            fontWeight: 550,
            wordBreak: 'break-word',
            lineHeight: '1.2'
          }}>
            {value}
          </div>
        </div>
      </div>
      <div style={{ height: 1, background: COLORS.grayLine, marginTop: 6 }} />
      <VerifiedRow>{chips}</VerifiedRow>
    </div>
  );

  const renderVerificationChips = (attributeKey) => {
    console.log(`🔍 Rendering chips for attribute: ${attributeKey}`);
    const verifiedDocs = [];
    const errorDocs = [];

    Object.entries(comparisonResults).forEach(([docId, result]) => {
      if (!result || !result.comparison_results) return;
      const doc = documents.find(d => String(d.id) === String(docId));
      if (!doc) return;

      let docType = doc.document_type || doc.name || '';
      console.log(`🔍 Original docType: ${docType}`);

      // ✅ SHORT NAMES: Use concise names that fit in chips
      if (docType.toLowerCase().includes('bank')) docType = 'Bank';
      else if (docType.toLowerCase().includes('itr')) docType = 'ITR';
      else if (docType.toLowerCase().includes('pan')) docType = 'PAN';
      else if (docType.toLowerCase().includes('gst')) docType = 'GST';
      else if (docType.toLowerCase().includes('payslip')) docType = 'Payslip';
      else {
        // Keep other types short
        docType = docType.replace(/_/g, ' ')
          .replace(/\b\w/g, l => l.toUpperCase())
          .replace(/(Document|Card|Statement)/g, '') // Remove common suffixes
          .trim()
          .substring(0, 8); // Max 8 characters
      }
      console.log(`🔍 Formatted docType: ${docType}`);

      // Map attribute keys to comparison result keys
      let comparisonKey = attributeKey.toLowerCase();
      if (attributeKey === 'PAN') comparisonKey = 'pan_number';
      if (attributeKey === 'Annual Salary') comparisonKey = 'salary';

      const attrResult = result.comparison_results[comparisonKey];
      if (attrResult) {
        if (attrResult.match) {
          if (!verifiedDocs.includes(docType)) verifiedDocs.push(docType);
        } else {
          if (!errorDocs.includes(docType)) errorDocs.push(docType);
        }
      }
    });

    const chips = [];

    // ✅ VERIFIED DOCUMENTS: Improved styling
    verifiedDocs.forEach((doc, index) => {
      chips.push(
        <div
          key={`verified-${doc}-${attributeKey}-${index}`}
          style={{
            height: 24,
            minWidth: 'fit-content',
            maxWidth: '120px',
            padding: '0 8px 0 6px',
            background: '#E2EAFB',
            borderRadius: 5,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            fontFamily: FAMILY,
            overflow: 'hidden',
          }}
        >
          <img src={VerifiedTick} alt="" style={{
            width: 12,
            height: 12,
            filter: 'none',
            flexShrink: 0
          }} />
          <span style={{
            color: '#0252A9',
            fontSize: 11,
            fontWeight: 500,
            lineHeight: '14px',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}>
            {doc}
          </span>
        </div>
      );
    });

    errorDocs.forEach((doc, index) => {
      chips.push(
        <div
          key={`error-${doc}-${attributeKey}-${index}`}
          style={{
            height: 24,
            minWidth: 'fit-content',
            maxWidth: '120px',
            padding: '0 8px 0 6px',
            background: '#FEE2E2',
            borderRadius: 5,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            fontFamily: FAMILY,
            overflow: 'hidden',
          }}
        >
          <img src={VerifiedTick} alt="" style={{
            width: 12,
            height: 12,
            filter: 'hue-rotate(0deg) saturate(2) brightness(0.8)',
            flexShrink: 0
          }} />
          <span style={{
            color: '#EF4444',
            fontSize: 11,
            fontWeight: 500,
            lineHeight: '14px',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}>
            {doc}
          </span>
        </div>
      );
    });

    if (chips.length === 0) {
      chips.push(
        <div
          key={`pending-${attributeKey}`}
          style={{
            height: 24,
            padding: '0 10px 0 6px',
            background: '#FEF3C7',
            borderRadius: 5,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            fontFamily: FAMILY,
          }}
        >
          <img src={VerifiedTick} alt="" style={{
            width: 14,
            height: 14,
            filter: 'hue-rotate(45deg)'
          }} />
          <span style={{
            color: '#F59E0B',
            fontSize: 12,
            fontWeight: 500,
            lineHeight: '18px'
          }}>
            Pending Verification
          </span>
        </div>
      );
    }

    return <>{chips}</>;
  };

  // ✅ UPDATED: Insurance table with proper height matching
 // ✅ UPDATED: Insurance table with TWO fields (Premium + Sum Insured)
const insuranceTable = (
  <div style={{
    borderRadius: 10,
    overflow: 'hidden',
    background: COLORS.white,
    border: `1px solid ${COLORS.grayLine}`,
    display: 'flex',
    flexDirection: 'column',
    fontFamily: FAMILY,
    height: insuranceTableHeight, // ✅ Dynamic height for 2 fields
  }}>
    {/* Header */}
    <div style={{
      display: 'flex',
      alignItems: 'center',
      background: COLORS.headerGrad,
      height: tableHeaderHeight, // ✅ Same header height as documents table
      flex: '0 0 auto',
      padding: isSmallMobile ? '0 6px' : isMobileOrSmaller ? '0 8px' : '0 12px',
    }}>
      <div style={{
        color: '#fff',
        fontWeight: 600,
        fontSize: isSmallMobile ? 10 : isMobile ? 11 : isTablet ? 12 : 13
      }}>
        Proposal Information
      </div>
    </div>

    {/* Content - Now with 2 equal-height rows */}
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      flex: 1
    }}>
      {/* Premium Row */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        background: '#FAFBFF',
        borderBottom: `1px solid ${COLORS.grayLine}`,
        minHeight: isSmallMobile ? 44 : isMobile ? 46 : isTablet ? 50 : 52,
        flex: 1 // ✅ Equal height distribution
      }}>
        <div style={{
          flex: 1,
          padding: isSmallMobile ? '6px' : isMobileOrSmaller ? '8px' : '10px 12px',
          color: COLORS.textMain,
          fontWeight: 500,
          fontSize: isSmallMobile ? 10 : isMobile ? 11 : isTablet ? 12.5 : 13.5,
        }}>
          Insurance Premium
        </div>
        <div style={{
          padding: isSmallMobile ? '6px' : isMobileOrSmaller ? '8px' : '10px 12px',
          color: COLORS.textMain,
          fontWeight: 600,
          fontSize: isSmallMobile ? 10 : isMobile ? 11 : isTablet ? 12.5 : 13.5,
        }}>
          {formatCurrency(insuranceData.premium)}
        </div>
      </div>

      {/* Sum Insured Row */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        background: COLORS.white,
        minHeight: isSmallMobile ? 44 : isMobile ? 46 : isTablet ? 50 : 52,
        flex: 1 // ✅ Equal height distribution
      }}>
        <div style={{
          flex: 1,
          padding: isSmallMobile ? '6px' : isMobileOrSmaller ? '8px' : '10px 12px',
          color: COLORS.textMain,
          fontWeight: 500,
          fontSize: isSmallMobile ? 10 : isMobile ? 11 : isTablet ? 12.5 : 13.5,
        }}>
          Sum Insured
        </div>
        <div style={{
          padding: isSmallMobile ? '6px' : isMobileOrSmaller ? '8px' : '10px 12px',
          color: COLORS.textMain,
          fontWeight: 600,
          fontSize: isSmallMobile ? 10 : isMobile ? 11 : isTablet ? 12.5 : 13.5,
        }}>
          {formatCurrency(insuranceData.sumInsured)}
        </div>
      </div>
    </div>
  </div>
);

  const cardsGrid = (
    <div style={{
      display: 'grid',
      gridTemplateColumns: isMobileOrSmaller ? '1fr' : '1fr 1fr',
      gap: cardGap,
      fontFamily: FAMILY,
      marginTop: isSmallMobile ? 8 : isMobile ? 10 : isTablet ? 18 : 20, 
    }}>
      <Card
        iconGradient="linear-gradient(223deg, #FFA62D 0%, rgba(249, 187, 95, 0.70) 100%)"
        iconSrc={iconName}
        label="Name"
        value={selectedProposer?.customer_name || '—'}
        hasError={false}
        chips={renderVerificationChips('Name')}
      />
      <Card
        iconGradient="linear-gradient(50deg, #EF81BC 0%, #B2417D 100%)"
        iconSrc={iconPan}
        label="PAN"
        value={selectedProposer?.pan_number || '—'}
        hasError={false}
        chips={renderVerificationChips('PAN')}
      />
      <Card
        iconGradient="linear-gradient(223deg, #11AC76 0%, rgba(45, 210, 154, 0.80) 100%)"
        iconSrc={iconDob}
        label="DOB"
        value={formatDOB(selectedProposer?.dob)}
        hasError={false}
        chips={renderVerificationChips('DOB')}
      />
      <Card
        iconGradient="linear-gradient(223deg, #2D7DDD 0%, #519DF5 100%)"
        iconSrc={iconSalary}
        label="Annual Salary"
        value={formatSalary(selectedProposer?.annual_income)}
        hasError={false}
        chips={renderVerificationChips('Annual Salary')}
      />
    </div>
  );

  // ✅ UPDATED: Documents table with fixed height showing only 2 rows + scrolling
  const tableBox = (
    <div style={{
      borderRadius: 10,
      overflow: 'hidden',
      background: COLORS.white,
      border: `1px solid ${COLORS.grayLine}`,
      display: 'flex',
      flexDirection: 'column',
      fontFamily: FAMILY,
      height: documentsTableHeight, // ✅ Fixed height for 2 rows only
    }}>
      {/* Header - Fixed */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        background: COLORS.headerGrad,
        height: tableHeaderHeight,
        flex: '0 0 auto'
      }}>
        <div style={{
          flex: 1,
          padding: isSmallMobile ? '0 6px' : isMobileOrSmaller ? '0 8px' : '0 12px',
          color: '#fff',
          fontWeight: 600,
          fontSize: isSmallMobile ? 10 : isMobile ? 11 : isTablet ? 12 : 13
        }}>
          Document Name
        </div>
        <div style={{
          flex: 1,
          padding: isSmallMobile ? '0 6px' : isMobileOrSmaller ? '0 8px' : '0 12px',
          color: '#fff',
          fontWeight: 600,
          fontSize: isSmallMobile ? 10 : isMobile ? 11 : isTablet ? 12 : 13
        }}>
          Review Checklist
        </div>
        <div style={{
          width: isSmallMobile ? 160 : isMobile ? 180 : isSmallTablet ? 200 : isTablet ? 220 : 240,
          padding: isSmallMobile ? '0 6px' : isMobileOrSmaller ? '0 8px' : '0 12px',
          color: '#fff',
          fontWeight: 600,
          fontSize: isSmallMobile ? 10 : isMobile ? 11 : isTablet ? 12 : 13,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          Actions
        </div>
      </div>

      {/* ✅ SCROLLABLE BODY - Shows only 2 rows with internal scrolling */}
      <div style={{
        flex: 1,
        overflowY: 'auto', // ✅ Enable scrolling
        overflowX: 'hidden'
      }}>
        {filteredDocuments.map((doc, idx) => {
          const alt = idx % 2 === 0;
          const isProcessing = processingStatus[doc.id] === 'processing';
          const isVerified = processingStatus[doc.id] === 'verified';
          const isMismatch = processingStatus[doc.id] === 'mismatch';
          const isError = processingStatus[doc.id] === 'error';
          let badgeText = '';
          let badgeVariant = 'success';

          // ✅ UPDATED: Use 'pending' variant for grey color
          if (isProcessing) {
            badgeText = 'Processing';
            badgeVariant = 'warning';
          } else if (isVerified) {
            badgeText = 'Verified';
            badgeVariant = 'success';
          } else if (isMismatch) {
            badgeText = 'Mismatch';
            badgeVariant = 'error';
          } else if (isError) {
            badgeText = 'Error';
            badgeVariant = 'error';
          } else if (doc.checklist === 'Verified' || doc.status?.toLowerCase() === 'verified') {
            badgeText = 'Verified';
            badgeVariant = 'success';
          } else {
            badgeText = 'Pending';
            badgeVariant = 'pending';
          }

          return (
            <div key={doc.id} style={{
              display: 'flex',
              alignItems: 'center',
              background: alt ? '#FAFBFF' : COLORS.white,
              borderBottom: `1px solid ${COLORS.grayLine}`,
              minHeight: isSmallMobile ? 44 : isMobile ? 46 : isTablet ? 50 : 52,
            }}>
              <div style={{
                flex: 1,
                padding: isSmallMobile ? '6px' : isMobileOrSmaller ? '8px' : '10px 12px',
                color: COLORS.textMain,
                fontWeight: 500,
                fontSize: isSmallMobile ? 10 : isMobile ? 11 : isTablet ? 12.5 : 13.5,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}>
                {doc.name || doc.document_type}
              </div>
              <div style={{
                flex: 1,
                padding: isSmallMobile ? '6px' : isMobileOrSmaller ? '8px' : '10px 12px',
                display: 'flex',
                flexDirection: 'column',
                gap: 3
              }}>
                {badgeText ? (
                  <Pill text={badgeText} variant={badgeVariant} />
                ) : (
                  <span style={{ color: COLORS.textMuted, fontSize: 13 }}>—</span>
                )}
              </div>
              <div style={{
                width: isSmallMobile ? 160 : isMobile ? 180 : isSmallTablet ? 200 : isTablet ? 220 : 240,
                padding: isSmallMobile ? '6px' : isMobileOrSmaller ? '8px' : '10px 12px',
                display: 'flex',
                gap: isSmallMobile ? 4 : isMobile ? 6 : 8,
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <button
                  onClick={() => handlePreviewClick(doc.id)}
                  title="Preview Document"
                  style={{
                    width: isSmallMobile ? 24 : isMobile ? 26 : isTablet ? 30 : 32,
                    height: isSmallMobile ? 24 : isMobile ? 26 : isTablet ? 30 : 32,
                    borderRadius: 6,
                    outline: `1px ${COLORS.blue400} solid`,
                    outlineOffset: '-1px',
                    background: COLORS.white,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    border: 'none',
                    flexShrink: 0
                  }}
                >
                  <img src={EyeIcon} alt="" style={{
                    width: isSmallMobile ? 12 : isMobile ? 13 : isTablet ? 15 : 16,
                    height: isSmallMobile ? 12 : isMobile ? 13 : isTablet ? 15 : 16
                  }} />
                </button>

                {comparisonResults[doc.id] ? (
                  <button
                    onClick={() => handleViewVerificationDetails(doc.id)}
                    title="View Verification Details"
                    style={{
                      padding: isSmallMobile ? '4px 6px' : isMobile ? '5px 8px' : '6px 10px',
                      background: COLORS.blue100,
                      color: COLORS.blue600,
                      borderRadius: 4,
                      border: `1px solid ${COLORS.blue400}`,
                      cursor: 'pointer',
                      fontSize: isSmallMobile ? 8 : isMobile ? 9 : 10,
                      fontWeight: 500,
                      whiteSpace: 'nowrap',
                      textAlign: 'center',
                      fontFamily: FAMILY,
                      flexShrink: 0
                    }}
                  >
                    {isSmallMobile ? 'Details' : isMobile ? 'Verify' : 'Verification'}
                  </button>
                ) : (
                  <div style={{
                    padding: isSmallMobile ? '4px 6px' : isMobile ? '5px 8px' : '6px 10px',
                    background: '#F3F4F6',
                    color: '#9CA3AF',
                    borderRadius: 4,
                    border: '1px solid #E5E7EB',
                    fontSize: isSmallMobile ? 8 : isMobile ? 9 : 10,
                    fontWeight: 500,
                    whiteSpace: 'nowrap',
                    textAlign: 'center',
                    fontFamily: FAMILY,
                    flexShrink: 0
                  }}>
                    {isSmallMobile ? 'N/A' : isMobile ? 'Pending' : 'Not Processed'}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  if (loading || error) {
    return (
      <div style={{
        width: '100%',
        paddingTop: pagePadding,
        paddingLeft: pagePadding,
        paddingRight: pagePadding,
        paddingBottom: 40,
        background: COLORS.pageBg,
        fontFamily: FAMILY,
        height: isMobileOrSmaller || isTablet ? 'calc(100vh - 120px)' : 'auto',
        maxHeight: isMobileOrSmaller || isTablet ? 'calc(100vh - 120px)' : 'none',
        overflowY: isMobileOrSmaller || isTablet ? 'auto' : 'visible',
        overflowX: 'hidden',
        boxSizing: 'border-box',
        WebkitOverflowScrolling: 'touch',
      }}>
        {titleBlock}
        <div style={{ padding: 16 }}>
          {loading ? 'Loading documents...' : <span style={{ color: 'red' }}>Error: {error}</span>}
        </div>
      </div>
    );
  }

  return (
    <>
      <style jsx>{`
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
      @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
      }
    `}</style>

      <div style={{
        width: '100%',
        paddingTop: pagePadding,
        paddingLeft: pagePadding,
        paddingRight: pagePadding,
        paddingBottom: 40,
        background: 'rgba(255, 255, 255, 0.85)',
        backdropFilter: 'blur(10px)',
        fontFamily: FAMILY,
        minHeight: getMinHeight(isMobileOrSmaller, isTablet, isDesktop),
        display: 'flex',
        flexDirection: 'column',
        overflow: 'auto',
        boxSizing: 'border-box',
        borderRadius: 12,
        border: '1px solid rgba(255, 255, 255, 0.3)'
      }}>

        {titleBlock}
        {financeScoreCard}

        {/* ✅ UPDATED: Grid layout with documents table and insurance table stacked */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobileOrSmaller ? '1fr' : '1.1fr 0.9fr',
          gap: isSmallMobile ? 10 : isMobile ? 12 : isTablet ? 14 : 16,
          alignItems: 'start',
          marginBottom: isMobileOrSmaller ? 8 : 0,
          flex: 1
        }}>
          <div>{cardsGrid}</div>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 6, // ✅ Small gap between documents and insurance tables
          }}>
            {tableBox} {/* ✅ Documents table (reduced size) */}
            {insuranceTable} {/* ✅ Insurance table (positioned to match card height) */}
          </div>
        </div>

        {/* ✅ UPDATED: Conditional Bottom Buttons based on mc_required */}
        <div style={{
          display: 'flex',
          justifyContent: isMobileOrSmaller ? 'center' : 'flex-end',
          gap: isSmallMobile ? 6 : isMobile ? 8 : isTablet ? 10 : 12,
          marginTop: 12,
          flexDirection: isSmallMobile ? 'column' : 'row',
          alignItems: isSmallMobile ? 'center' : 'flex-start',
          flexShrink: 0
        }}>
          {/* Status Message or Action Buttons */}
          {(currentStatus === 'Approved' || currentStatus === 'Rejected') ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontSize: isSmallMobile ? 12 : isMobile ? 13 : isTablet ? 14 : 15,
                color: '#374151',
                borderRadius: 8,
                padding: '12px 16px',
                maxWidth: '70%',
                border: '1px solid #D1D5DB',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                background: currentStatus === 'Approved'
                  ? 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)'
                  : 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)',
                fontFamily: FAMILY,
                lineHeight: 1.5,
                wordWrap: 'break-word'
              }}
            >
              <span style={{ fontWeight: 600, color: '#111827' }}>
                {currentStatus === 'Approved' ? 'Approval Reason: ' : 'Rejection Reason: '}
              </span>
              <span style={{ color: '#374151' }}>
                {modalMessage && modalMessage.trim() ? modalMessage : 'No message provided'}
              </span>
            </div>
          ) : (
            <>
              {/* ✅ UPDATED: Conditional buttons based on reviewFlags.mc_required */}
              {reviewFlags?.mc_required === false ? (
                <>
                  <button
                    onClick={() => {
                      setApprovalModalOpen(true);
                      setApprovalModalType('approve');
                      setApprovalModalStatus('confirm');
                      setApprovalModalError('');
                      setModalMessage('');
                    }}
                    disabled={statusUpdateLoading || currentStatus === 'Approved'}
                    style={{
                      minWidth: 100,
                      height: 'auto',
                      minHeight: isSmallMobile ? 34 : isMobile ? 36 : isTablet ? 38 : 40,
                      padding: '8px 12px',
                      background: currentStatus === 'Approved' ? '#E2EAFB' : '#0252A9',
                      color: currentStatus === 'Approved' ? '#0252A9' : 'white',
                      borderRadius: 12,
                      border: 'none',
                      fontFamily: 'PP Neue Montreal, "PP Neue Montreal", sans-serif',
                      fontWeight: 500,
                      fontSize: isSmallMobile ? 12 : isMobile ? 13 : isTablet ? 14 : 15,
                      boxShadow: '0 4px 12px rgba(5, 82, 169, 0.18)',
                      cursor: (statusUpdateLoading || currentStatus === 'Approved') ? 'not-allowed' : 'pointer',
                      opacity: (statusUpdateLoading || currentStatus === 'Approved') ? 0.7 : 1,
                      transition: 'all 0.2s',
                      whiteSpace: 'normal',
                      wordBreak: 'break-word',
                      textAlign: 'center',
                      lineHeight: '1.2',
                      display: 'inline-block'
                    }}
                  >
                    {statusUpdateLoading && currentStatus !== 'Approved' ? 'Processing...' : 'Approve'}
                  </button>

                  <button
                    onClick={() => {
                      setApprovalModalOpen(true);
                      setApprovalModalType('reject');
                      setApprovalModalStatus('confirm');
                      setApprovalModalError('');
                      setModalMessage('');
                    }}
                    disabled={statusUpdateLoading || currentStatus === 'Rejected'}
                    style={{
                      minWidth: 90,
                      height: 'auto',
                      minHeight: isSmallMobile ? 34 : isMobile ? 36 : isTablet ? 38 : 40,
                      padding: '8px 12px',
                      background: currentStatus === 'Rejected' ? '#E2EAFB' : '#0252A9',
                      color: currentStatus === 'Rejected' ? '#0252A9' : 'white',
                      borderRadius: 12,
                      border: 'none',
                      fontFamily: 'PP Neue Montreal, "PP Neue Montreal", sans-serif',
                      fontWeight: 500,
                      fontSize: isSmallMobile ? 12 : isMobile ? 13 : isTablet ? 14 : 15,
                      boxShadow: '0 4px 12px rgba(5, 82, 169, 0.18)',
                      cursor: (statusUpdateLoading || currentStatus === 'Rejected') ? 'not-allowed' : 'pointer',
                      opacity: (statusUpdateLoading || currentStatus === 'Rejected') ? 0.7 : 1,
                      transition: 'all 0.2s',
                      whiteSpace: 'normal',
                      wordBreak: 'break-word',
                      textAlign: 'center',
                      lineHeight: '1.2',
                      display: 'inline-block'
                    }}
                  >
                    {statusUpdateLoading && currentStatus !== 'Rejected' ? 'Processing...' : 'Reject'}
                  </button>

                  <button
                    onClick={() => {
                      setApprovalModalOpen(true);
                      setApprovalModalType('investigate');
                      setApprovalModalStatus('confirm');
                      setApprovalModalError('');
                      setModalMessage('');
                    }}
                    disabled={statusUpdateLoading || currentStatus === 'Needs Investigation'}
                    style={{
                      minWidth: 140,
                      height: 'auto',
                      minHeight: isSmallMobile ? 34 : isMobile ? 36 : isTablet ? 38 : 40,
                      padding: '8px 12px',
                      background: currentStatus === 'Needs Investigation' ? '#E2EAFB' : '#0252A9',
                      color: currentStatus === 'Needs Investigation' ? '#0252A9' : 'white',
                      borderRadius: 12,
                      border: 'none',
                      fontFamily: 'PP Neue Montreal, "PP Neue Montreal", sans-serif',
                      fontWeight: 500,
                      fontSize: isSmallMobile ? 12 : isMobile ? 13 : isTablet ? 14 : 15,
                      boxShadow: '0 4px 12px rgba(5, 82, 169, 0.18)',
                      cursor: (statusUpdateLoading || currentStatus === 'Needs Investigation') ? 'not-allowed' : 'pointer',
                      opacity: (statusUpdateLoading || currentStatus === 'Needs Investigation') ? 0.7 : 1,
                      transition: 'all 0.2s',
                      whiteSpace: 'normal',
                      wordBreak: 'break-word',
                      textAlign: 'center',
                      lineHeight: '1.2',
                      display: 'inline-block'
                    }}
                  >
                    {statusUpdateLoading && currentStatus !== 'Needs Investigation' ? 'Processing...' : 'Needs Investigation'}
                  </button>
                </>
              ) : (
                // Keep the existing "Go to Health Review" button unchanged
                bothTabsPresent && (
                  <div
                    onClick={() => setActiveTab('Health Review')}
                    className="cursor-pointer"
                    style={{
                      width: isSmallMobile ? '100%' : '192px',
                      height: '40px',
                      paddingLeft: '16px',
                      paddingRight: '12px',
                      paddingTop: '12px',
                      paddingBottom: '12px',
                      backgroundColor: '#0252A9',
                      borderRadius: '8px',
                      display: 'inline-flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      gap: '8px',
                      boxShadow: '0 4px 12px rgba(5, 82, 169, 0.25)',
                      transition: 'all 0.2s ease',
                      border: 'none'
                    }}
                  >
                    <span style={{
                      color: 'white',
                      fontSize: '16px',
                      fontWeight: '500',
                      fontFamily: "'PP Neue Montreal', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif !important",
                      whiteSpace: 'nowrap',
                      textAlign: 'center',
                      lineHeight: '1',
                      letterSpacing: 'normal'
                    }}>
                      {isMobileOrSmaller ? 'Health Review' : 'Go to Health Review'}
                    </span>
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      style={{
                        color: 'white',
                        flexShrink: 0
                      }}
                    >
                      <path
                        d="M9 18L15 12L9 6"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                )
              )}
            </>
          )}
        </div>

        {/* Enhanced responsive modals */}
        {showComparisonModal && selectedDocumentId && comparisonResults[selectedDocumentId] && (
          <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 50,
            fontFamily: FAMILY,
            padding: isMobileOrSmaller ? 8 : 12
          }}>
            <div style={{
              width: isSmallMobile ? '90%' : isMobile ? '85%' : isSmallTablet ? '400px' : '450px',
              maxHeight: isMobileOrSmaller ? '85vh' : '70vh',
              background: COLORS.white,
              borderRadius: 8,
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 10px 25px rgba(0,0,0,0.15)'
            }}>
              {/* Compact Header */}
              <div style={{
                padding: isSmallMobile ? '12px 16px' : '16px 20px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderBottom: `1px solid ${COLORS.grayLine}`,
                background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8
                }}>
                  <div style={{
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    background: comparisonResults[selectedDocumentId].overall_match ? COLORS.greenGrad : COLORS.errorColor,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <span style={{ color: 'white', fontSize: 12, fontWeight: 'bold' }}>
                      {comparisonResults[selectedDocumentId].overall_match ? '✓' : '✗'}
                    </span>
                  </div>
                  <div>
                    <div style={{
                      fontWeight: 600,
                      fontSize: isSmallMobile ? 13 : 14,
                      color: COLORS.textMain
                    }}>
                      Verification Results
                    </div>
                    <div style={{
                      fontSize: isSmallMobile ? 10 : 11,
                      color: COLORS.textMuted
                    }}>
                      {getDocumentTypeFromId(selectedDocumentId)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Compact Content */}
              <div style={{
                flex: 1,
                padding: isSmallMobile ? '12px 16px' : '16px 20px',
                overflow: 'auto'
              }}>
                {/* Status Summary - Updated */}
                <div style={{
                  padding: '12px',
                  borderRadius: 6,
                  background: comparisonResults[selectedDocumentId].overall_match ?
                    'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)' :
                    'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)',
                  border: `1px solid ${comparisonResults[selectedDocumentId].overall_match ? '#10b981' : '#ef4444'}`,
                  marginBottom: 16
                }}>
                  <div style={{
                    fontSize: isSmallMobile ? 14 : 16,
                    fontWeight: 600,
                    color: comparisonResults[selectedDocumentId].overall_match ? '#065f46' : '#991b1b',
                    marginBottom: 4
                  }}>
                    {comparisonResults[selectedDocumentId].overall_match ? '✅ Document Matched' : '❌ Document Not Matched'}
                  </div>
                  <div style={{
                    fontSize: isSmallMobile ? 12 : 14,
                    color: comparisonResults[selectedDocumentId].overall_match ? '#047857' : '#dc2626'
                  }}>
                    Accuracy: {comparisonResults[selectedDocumentId].accuracy_metrics?.overall_accuracy || 0}%
                  </div>
                </div>

                {/* Field Results - Simplified Summary */}
                <div style={{
                  marginBottom: 16
                }}>
                  <h4 style={{
                    fontSize: isSmallMobile ? 11 : 12,
                    fontWeight: 600,
                    color: COLORS.textMain,
                    marginBottom: 8,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                    Field Verification Summary
                  </h4>

                  {(() => {
                    const results = comparisonResults[selectedDocumentId].comparison_results;
                    const matched = Object.values(results).filter(r => r.match).length;
                    const total = Object.keys(results).length;

                    return (
                      <div style={{
                        padding: '8px 12px',
                        background: matched === total ? '#f0fdf4' : '#fef2f2',
                        border: `1px solid ${matched === total ? '#bbf7d0' : '#fecaca'}`,
                        borderRadius: 4,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}>
                        <span style={{
                          fontWeight: 500,
                          fontSize: isSmallMobile ? 11 : 12,
                          color: COLORS.textMain
                        }}>
                          Fields Matched
                        </span>
                        <span style={{
                          fontWeight: 600,
                          fontSize: isSmallMobile ? 11 : 12,
                          color: matched === total ? '#16a34a' : '#dc2626'
                        }}>
                          {matched} / {total}
                        </span>
                      </div>
                    );
                  })()}
                </div>

                {/* Optional: Individual Field Status (if you want to show details) */}
                <div style={{ marginBottom: 16 }}>
                  <h4 style={{
                    fontSize: isSmallMobile ? 11 : 12,
                    fontWeight: 600,
                    color: COLORS.textMain,
                    marginBottom: 8,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                    Field Details
                  </h4>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: 8
                  }}>
                    {Object.entries(comparisonResults[selectedDocumentId].comparison_results).map(([field, result]) => (
                      <div key={field} style={{
                        padding: '8px 10px',
                        borderRadius: 4,
                        background: result.match ? '#f0fdf4' : '#fef2f2',
                        border: `1px solid ${result.match ? '#bbf7d0' : '#fecaca'}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                      }}>
                        <span style={{
                          fontSize: isSmallMobile ? 10 : 11,
                          color: COLORS.textMain,
                          textTransform: 'capitalize',
                          fontWeight: 500
                        }}>
                          {field.replace('_', ' ')}
                        </span>
                        <span style={{
                          fontSize: 10,
                          fontWeight: 600,
                          color: result.match ? '#16a34a' : '#dc2626'
                        }}>
                          {result.match ? '✓' : '✗'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Compact Footer */}
              <div style={{
                padding: isSmallMobile ? '12px 16px' : '16px 20px',
                borderTop: `1px solid ${COLORS.grayLine}`,
                background: '#fafbfc',
                display: 'flex',
                justifyContent: 'flex-end'
              }}>
                <button
                  onClick={() => setShowComparisonModal(false)}
                  style={{
                    padding: isSmallMobile ? '8px 16px' : '10px 20px',
                    background: COLORS.blue600,
                    color: '#fff',
                    borderRadius: 4,
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: isSmallMobile ? 11 : 12,
                    fontWeight: 600,
                    fontFamily: FAMILY
                  }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Document Preview Modal */}
        {previewUrl && (
          <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 50,
            fontFamily: FAMILY,
            padding: isMobileOrSmaller ? '40px 20px' : '60px 32px'  // More top/bottom padding
          }}>
            <div style={{
              width: isMobileOrSmaller ? '85vw' : '82vw',
              height: isMobileOrSmaller ? '75vh' : '70vh', // Reduced height significantly
              maxWidth: '1200px',
              maxHeight: '700px', // Reduced max height
              background: COLORS.white,
              borderRadius: 12,
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
            }}>
              {/* Header - Always visible with proper spacing */}
              <div style={{
                padding: isSmallMobile ? '12px 16px' : '16px 20px', // Reduced header padding
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderBottom: `2px solid ${COLORS.grayLine}`,
                background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
                flexShrink: 0,
                minHeight: 50 // Reduced header height
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10
                }}>
                  <div style={{
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 14,
                    color: 'white'
                  }}>
                    📄
                  </div>
                  <div>
                    <div style={{
                      fontWeight: 600,
                      fontSize: isSmallMobile ? 16 : 18,
                      color: COLORS.textMain
                    }}>
                      Document Preview
                    </div>
                    <div style={{
                      fontSize: 11,
                      color: COLORS.textMuted
                    }}>
                      Click outside or use × to close
                    </div>
                  </div>
                </div>

                <button
                  onClick={closePreview}
                  style={{
                    border: 'none',
                    background: '#ef4444',
                    borderRadius: '6px',
                    width: 34,
                    height: 34,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 20,
                    cursor: 'pointer',
                    color: 'white',
                    transition: 'all 0.2s ease',
                    fontWeight: 'bold',
                    boxShadow: '0 2px 8px rgba(239, 68, 68, 0.3)'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.background = '#dc2626';
                    e.target.style.transform = 'scale(1.1)';
                    e.target.style.boxShadow = '0 4px 12px rgba(239, 68, 68, 0.4)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = '#ef4444';
                    e.target.style.transform = 'scale(1)';
                    e.target.style.boxShadow = '0 2px 8px rgba(239, 68, 68, 0.3)';
                  }}
                >
                  ✕
                </button>
              </div>

              {/* Document Content */}
              <div style={{
                flex: 1,
                overflow: 'hidden',
                background: '#fff',
                position: 'relative'
              }}>
                {previewError ? (
                  <div style={{
                    padding: 30,
                    color: COLORS.errorColor,
                    fontSize: 16,
                    textAlign: 'center',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '100%',
                    flexDirection: 'column',
                    gap: 16
                  }}>
                    <div style={{
                      width: 60,
                      height: 60,
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 30
                    }}>
                      ⚠️
                    </div>
                    <div style={{
                      fontWeight: 600,
                      fontSize: 18,
                      marginBottom: 4
                    }}>
                      Error Loading Document
                    </div>
                    <div style={{
                      fontSize: 14,
                      color: COLORS.textMuted,
                      maxWidth: '80%',
                      textAlign: 'center',
                      lineHeight: 1.5
                    }}>
                      {previewError}
                    </div>
                    <button
                      onClick={closePreview}
                      style={{
                        marginTop: 16,
                        padding: '10px 20px',
                        background: COLORS.blue600,
                        color: 'white',
                        border: 'none',
                        borderRadius: 6,
                        cursor: 'pointer',
                        fontWeight: 600,
                        fontSize: 14,
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.background = COLORS.blue500;
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.background = COLORS.blue600;
                      }}
                    >
                      Close Preview
                    </button>
                  </div>
                ) : (
                  <iframe
                    src={previewUrl}
                    style={{
                      width: '100%',
                      height: '100%',
                      border: 'none',
                      display: 'block'
                    }}
                    title="Document Preview"
                    loading="lazy"
                    onLoad={() => {
                      console.log('📄 Document preview loaded successfully');
                    }}
                    onError={() => {
                      console.error('❌ Error loading document preview');
                      setPreviewError('Failed to load document preview. Please try again.');
                    }}
                  />
                )}
              </div>
            </div>

            {/* Click outside to close */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                zIndex: -1
              }}
              onClick={closePreview}
            />
          </div>
        )}

        {/* ✅ APPROVAL MODAL */}
        {approvalModalOpen && (
          <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            fontFamily: FAMILY
          }}>
            <div style={{
              minWidth: 320,
              maxWidth: 420,
              background: 'white',
              borderRadius: 16,
              padding: 32,
              boxShadow: '0 6px 32px rgba(50,50,93,0.12)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center'
            }}>
              {/* Confirm */}
              {approvalModalStatus === 'confirm' && (
                <>
                  <img src={companyLogo} style={{ width: 60, height: 60, marginBottom: 20 }} alt="Logo" />
                  <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 8 }}>
                    {approvalModalType === 'approve' && 'Confirm Approve?'}
                    {approvalModalType === 'reject' && 'Confirm Reject?'}
                    {approvalModalType === 'investigate' && 'Confirm Mark for Investigation?'}
                  </div>
                  <div style={{ color: '#666', fontSize: 15, marginBottom: 16 }}>
                    {approvalModalType === 'approve' && 'Please provide a reason for approving this proposal:'}
                    {approvalModalType === 'reject' && 'Please provide a reason for rejecting this proposal:'}
                    {approvalModalType === 'investigate' && 'Please provide notes for further investigation:'}
                  </div>

                  <textarea
                    value={modalMessage}
                    onChange={(e) => setModalMessage(e.target.value)}
                    placeholder={
                      approvalModalType === 'approve' ? 'Enter approval reason...' :
                        approvalModalType === 'reject' ? 'Enter rejection reason...' :
                          'Enter investigation notes...'
                    }
                    required
                    style={{
                      width: '100%',
                      minHeight: '80px',
                      padding: '12px',
                      borderRadius: '8px',
                      border: '2px solid #E2EAFB',
                      fontSize: '14px',
                      fontFamily: FAMILY,
                      resize: 'vertical',
                      outline: 'none',
                      marginBottom: '16px'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#0252A9';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#E2EAFB';
                    }}
                  />

                  <div style={{ display: 'flex', gap: 16 }}>
                    <button
                      disabled={!modalMessage.trim()}
                      style={{
                        padding: '8px 20px',
                        borderRadius: 6,
                        border: 'none',
                        background: !modalMessage.trim() ? '#ccc' : '#0252A9',
                        color: 'white',
                        fontWeight: 600,
                        fontSize: 14,
                        cursor: !modalMessage.trim() ? 'not-allowed' : 'pointer',
                        opacity: !modalMessage.trim() ? 0.6 : 1
                      }}
                      onClick={async () => {
                        if (!modalMessage.trim()) {
                          alert('Please enter a message before confirming.');
                          return;
                        }
                        setApprovalModalStatus('loading');
                        try {
                          let newStatus = '';
                          if (approvalModalType === 'approve') {
                            await handleApprove(modalMessage.trim());
                            newStatus = 'Approved';
                          }
                          if (approvalModalType === 'reject') {
                            await handleReject(modalMessage.trim());
                            newStatus = 'Rejected';
                          }
                          if (approvalModalType === 'investigate') {
                            await handleNeedsInvestigation(modalMessage.trim());
                            newStatus = 'Needs Investigation';
                          }

                          // ✅ FIXED: Update both status and message immediately
                          setCurrentStatus(newStatus);
                          setModalMessage(modalMessage.trim()); // ✅ Keep the message for display

                          // Show success popup
                          setSuccessMessage(modalMessage.trim());
                          setShowSuccessPopup(true);
                          setApprovalModalOpen(false);

                          // Auto-dismiss success popup after 3 seconds
                          setTimeout(() => {
                            setShowSuccessPopup(false);
                            // ✅ DON'T clear modalMessage here - keep it for status display
                          }, 3000);

                        } catch (err) {
                          setApprovalModalError(typeof err === 'string' ? err : (err.message || 'Unknown error'));
                          setApprovalModalStatus('error');
                        }
                      }}
                    >
                      Yes, Confirm
                    </button>

                    <button
                      style={{
                        padding: '8px 20px',
                        borderRadius: 6,
                        border: '1px solid #AAA',
                        background: '#fff',
                        color: '#333',
                        fontWeight: 600,
                        fontSize: 14,
                        cursor: 'pointer'
                      }}
                      onClick={() => {
                        setApprovalModalOpen(false);
                        setModalMessage('');
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </>
              )}

              {/* Loading */}
              {approvalModalStatus === 'loading' && (
                <>
                  <div style={{
                    position: 'relative',
                    width: 60,
                    height: 60,
                    marginBottom: 20,
                  }}>
                    <div style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      border: '4px solid #E0E7FF',
                      borderTop: '4px solid #2563EB',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite'
                    }} />

                    <div style={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <img
                        src={companyLogo}
                        alt="Company Logo"
                        style={{
                          width: 28,
                          height: 28
                        }}
                      />
                    </div>
                  </div>

                  <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 6 }}>Processing...</div>
                  <div style={{ color: '#666', fontSize: 15 }}>Please wait, updating status with your message.</div>
                </>
              )}

              {/* Success */}
              {approvalModalStatus === 'success' && (
                <>
                  <div style={{
                    width: 60,
                    height: 60,
                    background: 'linear-gradient(135deg,#2057c7 10%,#4e86ef 80%)',
                    borderRadius: 16,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 20
                  }}>
                    <img
                      src={tickIcon}
                      alt="Success Tick"
                      style={{
                        width: 40, // ✅ INCREASED SIZE: Made larger and more prominent
                        height: 40, // ✅ INCREASED SIZE: Made larger and more prominent
                        objectFit: 'contain',
                        filter: 'brightness(0) invert(1)' // ✅ ADDED: Makes SVG white to show on blue background
                      }}
                    />
                  </div>
                  <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 4 }}>Success</div>
                  <div style={{ color: '#666', fontSize: 15 }}>Status updated successfully with your message.</div>
                </>
              )}

              {/* Error */}
              {approvalModalStatus === 'error' && (
                <>
                  <div style={{
                    width: 60,
                    height: 60,
                    background: '#fee2e2',
                    borderRadius: 16,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 20
                  }}>
                    <svg width="32" height="32" viewBox="0 0 32 32">
                      <circle cx="16" cy="16" r="15" fill="#fff" stroke="#e53e3e" strokeWidth="2" />
                      <line x1="10" y1="10" x2="22" y2="22" stroke="#e53e3e" strokeWidth="2" />
                      <line x1="22" y1="10" x2="10" y2="22" stroke="#e53e3e" strokeWidth="2" />
                    </svg>
                  </div>
                  <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 4, color: '#e53e3e' }}>Error</div>
                  <div style={{ color: '#e53e3e', fontSize: 15, whiteSpace: 'break-spaces' }}>{approvalModalError}</div>
                  <button
                    style={{
                      marginTop: 12,
                      padding: '7px 20px',
                      borderRadius: 6,
                      border: 'none',
                      background: '#0252A9',
                      color: '#fff',
                      fontWeight: 600,
                      fontSize: 14
                    }}
                    onClick={() => setApprovalModalStatus('confirm')}
                  >
                    Try again
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {showSuccessPopup && (
          <SuccessPopup
            message={successMessage}
            onDismiss={() => {
              setShowSuccessPopup(false);
              setModalMessage('');
            }}
          />
        )}

      </div>
    </>
  );
};

export default DocumentUploadScreenFinanceTable;
