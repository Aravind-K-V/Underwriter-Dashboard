import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMediaQuery } from 'react-responsive';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { createPortal } from 'react-dom';

// Import static assets for icons
import MagnifyingGlass from '../../assets/underwriter-dashboard-icons/magnifying-glass.svg';
import cheverdown from '../../assets/underwriter-dashboard-icons/chevron-down.svg';
import swap from '../../assets/underwriter-dashboard-icons/swap_vert.svg';
import arrowleft from '../../assets/underwriter-dashboard-icons/arrow-left.svg';
import arrowright from '../../assets/underwriter-dashboard-icons/arrow-right.svg';
import EllipsisOutlined from '../../assets/underwriter-dashboard-icons/Vector.svg';
import calendericon from '../../assets/upload_icons/CalendarFilled.svg';

const DashboardCustomerTable = ({ activeTab = "Pending", sidebarOpen }) => {
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

  const [customers, setCustomers] = useState([]);
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState('');
  const [selectedSort, setSelectedSort] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showSortDatePicker, setShowSortDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedSortDate, setSelectedSortDate] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [openMenuIndex, setOpenMenuIndex] = useState(null);
  const [itemsPerPage, setItemsPerPage] = useState(9);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [ruleEngineData, setRuleEngineData] = useState({});

  const filterRef = useRef(null);
  const sortRef = useRef(null);
  const datePickerRef = useRef(null);
  const sortDatePickerRef = useRef(null);
  const menuRef = useRef(null);

  const navigate = useNavigate();

  //  RESPONSIVE: Update items per page based on screen size
  useEffect(() => {
    if (isSmallMobile) {
      setItemsPerPage(5);
    } else if (isMobile) {
      setItemsPerPage(6);
    } else if (isSmallTablet) {
      setItemsPerPage(7);
    } else if (isTablet) {
      setItemsPerPage(8);
    } else {
      setItemsPerPage(9);
    }
  }, [isSmallMobile, isMobile, isSmallTablet, isTablet]);

  //  RESPONSIVE: Dynamic spacing calculations
  const getMainPadding = () => {
    if (isSmallMobile) return 12;
    if (isMobile) return 16;
    if (isSmallTablet) return 20;
    return 24; // Tablet and up
  };

  const getHeaderHeight = () => {
    if (isSmallMobile) return 36;
    if (isMobileOrSmaller) return 40;
    return 40;
  };

  const getRowHeight = () => {
    if (isSmallMobile) return 48;
    if (isMobileOrSmaller) return 52;
    return 54;
  };

  // Fetch rule engine data
  const fetchRuleEngineData = async () => {
    try {
      const response = await fetch('http://13.232.45.218:5000/api/rule-engine-trail', {
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        console.warn('[Dashboard][CustomerTable] Failed to fetch rule engine data:', response.statusText);
        return {};
      }

      const data = await response.json();

      const ruleDataMap = {};
      if (Array.isArray(data)) {
        data.forEach(rule => {
          if (rule.proposal_number) {
            ruleDataMap[rule.proposal_number] = rule;
          }
        });
      }

      return ruleDataMap;
    } catch (error) {
      console.error('[Dashboard][CustomerTable] Error fetching rule engine data:', error.message);
      return {};
    }
  };

  // Fetch customers data based on activeTab (status)
  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const [customersResponse, ruleData] = await Promise.all([
          fetch(`http://13.232.45.218:5000/api/customers?status=${encodeURIComponent(activeTab)}`, {
            headers: { 'Content-Type': 'application/json' },
          }),
          fetchRuleEngineData()
        ]);

        if (!customersResponse.ok) {
          throw new Error(`HTTP error! Status: ${customersResponse.status}, Message: ${customersResponse.statusText}`);
        }

        const customersData = await customersResponse.json();

        if (!Array.isArray(customersData)) {
          throw new Error('API response is not an array');
        }

        const enrichedData = customersData.map((customer) => ({
          ...customer,
          tag: customer.tag || 'Review',
          proposal_date: customer.proposal_date
            ? new Date(customer.proposal_date).toLocaleDateString()
            : 'N/A',
          original_proposal_date: customer.proposal_date
        }));

        setCustomers(enrichedData);
        setFilteredCustomers(enrichedData);
        setRuleEngineData(ruleData);
        setLoading(false);
      } catch (error) {
        console.error('[Dashboard][CustomerTable] Error fetching customers:', error.message);
        setError(`Failed to load customer data: ${error.message}`);
        setLoading(false);
      }
    };
    fetchCustomers();
  }, [activeTab]);

  // Handle click outside - Enhanced version
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (filterRef.current && !filterRef.current.contains(e.target) &&
        datePickerRef.current && !datePickerRef.current.contains(e.target)) {
        setShowFilterDropdown(false);
        setShowDatePicker(false);
      }

      if (sortRef.current && !sortRef.current.contains(e.target) &&
        sortDatePickerRef.current && !sortDatePickerRef.current.contains(e.target)) {
        setShowSortDropdown(false);
        setShowSortDatePicker(false);
      }

      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpenMenuIndex(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Apply filtering and sorting - Enhanced version
  useEffect(() => {
    let filtered = [...customers];

    // Apply search filter
    if (searchTerm.trim()) {
      filtered = filtered.filter((c) => {
        return (
          (c.customer_name?.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (c.proposer_id?.toString().includes(searchTerm.toLowerCase())) ||
          (c.proposal_number?.toString().includes(searchTerm.toLowerCase())) ||
          (c.product_name?.toLowerCase().includes(searchTerm.toLowerCase()))
        );
      });
    }

    // Apply date filter
    if (selectedFilter === 'Date' && selectedDate) {
      const selectedDateString = new Date(selectedDate).toLocaleDateString();
      filtered = filtered.filter((c) => c.proposal_date === selectedDateString);
    }

    // Apply other filters
    if (selectedFilter === 'Status') {
      filtered = filtered.filter((c) => c.tag && c.tag !== '');
    }

    if (selectedFilter === 'Policy Type') {
      filtered = filtered.filter((c) => c.product_name && c.product_name !== '');
    }

    // Apply sorting - Enhanced with date sorting
    if (selectedSort) {
      const sortedFiltered = [...filtered];

      switch (selectedSort) {
        case 'Date':
          if (selectedSortDate) {
            const sortDateString = new Date(selectedSortDate).toLocaleDateString();
            sortedFiltered.filter((c) => c.proposal_date === sortDateString);
          }
          sortedFiltered.sort((a, b) => {
            if (!a.original_proposal_date) return 1;
            if (!b.original_proposal_date) return -1;
            return new Date(b.original_proposal_date) - new Date(a.original_proposal_date);
          });
          break;

        case 'Name A-Z':
          sortedFiltered.sort((a, b) => {
            const nameA = (a.customer_name || '').toLowerCase().trim();
            const nameB = (b.customer_name || '').toLowerCase().trim();
            return nameA.localeCompare(nameB);
          });
          break;

        case 'Name Z-A':
          sortedFiltered.sort((a, b) => {
            const nameA = (a.customer_name || '').toLowerCase().trim();
            const nameB = (b.customer_name || '').toLowerCase().trim();
            return nameB.localeCompare(nameA);
          });
          break;

        case 'Status':
          sortedFiltered.sort((a, b) => (a.tag || '').localeCompare(b.tag || ''));
          break;

        default:
          break;
      }

      filtered = sortedFiltered;
    }

    setFilteredCustomers(filtered);
    setCurrentPage(1);
  }, [customers, searchTerm, selectedFilter, selectedDate, selectedSort, selectedSortDate]);

  // Filter selection handler
  const handleFilterSelect = (option) => {
    setSelectedFilter(option);

    if (option === 'Date') {
      setShowDatePicker(true);
      setShowFilterDropdown(false);
    } else {
      setShowFilterDropdown(false);
      setShowDatePicker(false);
      setSelectedDate(null);
    }
  };

  // Sort selection handler - Enhanced with date picker support
  const handleSortSelect = (option) => {
    setSelectedSort(option);

    if (option === 'Date') {
      setShowSortDatePicker(true);
      setShowSortDropdown(false);
    } else {
      setShowSortDropdown(false);
      setShowSortDatePicker(false);
      setSelectedSortDate(null);
    }
  };

  // Search handler
  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
  };

  // Date selection handler for filter
  const handleDateChange = (date) => {
    setSelectedDate(date);
    setShowDatePicker(false);
    setShowFilterDropdown(false);
  };

  // Date selection handler for sort
  const handleSortDateChange = (date) => {
    setSelectedSortDate(date);
    setShowSortDatePicker(false);
    setShowSortDropdown(false);
  };

  // Clear all filters - Enhanced version
  const clearFilters = () => {
    setSelectedFilter('');
    setSelectedSort('');
    setSelectedDate(null);
    setSelectedSortDate(null);
    setSearchTerm('');
    setShowDatePicker(false);
    setShowSortDatePicker(false);
    setShowFilterDropdown(false);
    setShowSortDropdown(false);
  };

  // Menu action handler
  const handleMenuAction = (action, proposerId) => {
    setOpenMenuIndex(null);

    switch (action) {
      case 'Delete':
        if (window.confirm('Are you sure you want to delete this customer?')) {
          console.info('[Dashboard][CustomerTable] Customer deletion initiated:', proposerId);
        }
        break;
      case 'Preview':
        console.info('[Dashboard][CustomerTable] Customer preview initiated:', proposerId);
        break;
      default:
        break;
    }
  };

  // UPDATED: Handle view/review button click - All statuses navigate to the same page
  const handleViewReviewClick = async (e, customer) => {
    e.preventDefault();
    e.stopPropagation();

    // All statuses (Pending, Approved, Rejected) now navigate to the same page
    const ruleData = ruleEngineData[customer.proposal_number];

    console.debug('[Dashboard][CustomerTable] Rule data for proposal:', { proposal_number: customer.proposal_number, hasRuleData: !!ruleData });

    if (!ruleData) {
      console.warn('[Dashboard][CustomerTable] No rule engine data found for proposal:', customer.proposal_number);
      navigate(`/${customer.proposer_id}/upload?processDocs=true`);
      return;
    }

    const { finreview_required, mc_required } = ruleData;

    if (finreview_required === true && mc_required === true) {
      console.info('[Dashboard][CustomerTable] Both financial and medical review required');
      navigate(`/${customer.proposer_id}/upload?processDocs=true&tab=financial`);
    } else if (finreview_required === false && mc_required === true) {
      console.info('[Dashboard][CustomerTable] Only medical review required');
      navigate(`/${customer.proposer_id}/upload?processDocs=true&tab=medical&hideFinancial=true`);
    } else if (finreview_required === true && mc_required === false) {
      console.info('[Dashboard][CustomerTable] Only financial review required');
      navigate(`/${customer.proposer_id}/upload?processDocs=true&tab=financial&hideMedical=true`);
    } else {
      console.info('[Dashboard][CustomerTable] No specific review requirements');
      navigate(`/${customer.proposer_id}/upload?processDocs=true`);
    }
  };

  // Pagination
  const paginatedData = filteredCustomers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const totalPages = Math.ceil(filteredCustomers.length / itemsPerPage);

  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  if (loading) {
    return (
      <div className={`${isMobileOrSmaller ? 'p-3 text-sm' : 'p-4'
        } text-gray-500`}>
        Loading customers...
      </div>
    );
  }

  if (error) {
    return (
      <div className={`${isMobileOrSmaller ? 'p-3 text-sm' : 'p-4'
        } text-red-500`}>
        {error}
      </div>
    );
  }

  return (
    <>
      <div 
        className="w-full bg-white rounded-[16px] border border-[#E5ECFB] shadow-sm font-['PP Neue Montreal'] text-base text-black"
        style={{ 
          padding: `${getMainPadding()}px`,
          margin: 0,
          //  NEW: Dynamic minimum height to fill the screen
          minHeight: isMobileOrSmaller ? 'calc(100vh - 160px)' : 
                     isTablet ? 'calc(100vh - 180px)' : 
                     'calc(100vh - 200px)',
          //  NEW: Ensure content is properly spaced
          display: 'flex',
          flexDirection: 'column',
        }}
      >

        {/* Header with Search, Filter, and Sort */}
        <div className={`flex ${isMobileOrSmaller ? 'flex-col gap-3' : 'flex-row justify-between items-center'
          } sticky top-0 bg-white z-10 mb-6`}>

          <h2 className={`${isSmallMobile ? 'text-lg' : isMobileOrSmaller ? 'text-xl' : 'text-[24px]'
            } font-medium leading-[150%] text-black whitespace-nowrap`}>
            {activeTab}
          </h2>

          {/*  FIX: Improved filter/sort container */}
          <div className={`flex ${isMobileOrSmaller ? 'flex-col gap-2 w-full' : 'flex-row items-center gap-[11px]'
            }`}>

            {/* Search Input */}
            <div className={`flex items-center px-4 py-2 gap-4 bg-white border border-[#E5ECFB] rounded-[8px] ${isMobileOrSmaller ? 'w-full h-[36px]' : 'w-[247px] h-[40px]'
              }`}>
              <img src={MagnifyingGlass} alt="Search" className={`${isSmallMobile ? 'w-3 h-3' : 'w-4 h-4'
                }`} />
              <input
                type="text"
                placeholder={isSmallMobile ? "Search..." : "Search from table..."}
                value={searchTerm}
                onChange={handleSearch}
                className={`${isSmallMobile ? 'text-xs' : 'text-sm'
                  } outline-none w-full bg-transparent`}
              />
            </div>

            {/* Filter and Sort Container */}
            <div className={`flex ${isMobileOrSmaller ? 'flex-row gap-2 w-full' : 'flex-row gap-[11px]'
              }`}>
              {/* Filter Button */}
              <div className="relative flex-1" ref={filterRef}>
                <button
                  onClick={() => {
                    setShowFilterDropdown(!showFilterDropdown);
                    setShowSortDropdown(false);
                    setShowSortDatePicker(false);
                    if (!showFilterDropdown) {
                      setShowDatePicker(false);
                    }
                  }}
                  className={`flex items-center justify-center px-4 py-3 gap-2 bg-[#E2EAFB] rounded-[6px] text-[#3371F2] font-['PP Neue Montreal'] w-full ${isMobileOrSmaller ? 'h-[36px]' : 'h-[40px]'
                    }`}
                >
                  {/* Filter icon */}
                  <div className={`${isSmallMobile ? 'w-4 h-2' : 'w-5 h-3'
                    } relative`}>
                    <div className={`${isSmallMobile ? 'w-[15px] h-[1.5px]' : 'w-[19px] h-[2px]'
                      } bg-[#0463FF] absolute top-0`}></div>
                    <div className={`${isSmallMobile ? 'w-[10px] h-[1.5px] top-[3px] left-[2px]' : 'w-[13px] h-[2px] top-[5px] left-[3px]'
                      } bg-[#0463FF] absolute`}></div>
                    <div className={`${isSmallMobile ? 'w-[2px] h-[1.5px] top-[6px] left-[6px]' : 'w-[3px] h-[2px] top-[10px] left-[8px]'
                      } bg-[#0463FF] absolute`}></div>
                  </div>
                  <span className={`${isSmallMobile ? 'text-xs' : isMobileOrSmaller ? 'text-sm' : 'text-[16px]'
                    } font-medium tracking-[0.03em] truncate`}>
                    {isMobileOrSmaller && selectedFilter ? selectedFilter : `Filters${selectedFilter ? ': ' + selectedFilter : ': Select'}`}
                  </span>
                  <img src={cheverdown} alt="Chevron" className={`${isSmallMobile ? 'w-3 h-3' : 'w-4 h-4'
                    }`} />
                </button>
              </div>

              {/* Sort Button */}
              <div className="relative flex-1" ref={sortRef}>
                <button
                  onClick={() => {
                    setShowSortDropdown(!showSortDropdown);
                    setShowFilterDropdown(false);
                    setShowDatePicker(false);
                    if (!showSortDropdown) {
                      setShowSortDatePicker(false);
                    }
                  }}
                  className={`flex items-center justify-center px-4 py-3 gap-2 bg-[#E2EAFB] rounded-[6px] text-[#3371F2] font-['PP Neue Montreal'] w-full ${isMobileOrSmaller ? 'h-[36px]' : 'h-[40px]'
                    }`}
                >
                  <img src={swap} alt="Sort" className={`${isSmallMobile ? 'w-4 h-4' : 'w-5 h-5'
                    }`} />
                  <span className={`${isSmallMobile ? 'text-xs' : isMobileOrSmaller ? 'text-sm' : 'text-[16px]'
                    } font-medium tracking-[0.03em] truncate`}>
                    {isMobileOrSmaller && selectedSort ? selectedSort : `Sort${selectedSort ? ': ' + selectedSort : ': Select'}`}
                  </span>
                  <img src={cheverdown} alt="Chevron" className={`${isSmallMobile ? 'w-3 h-3' : 'w-4 h-4'
                    }`} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/*  UPDATED: Table with extended height that fills remaining space */}
        <div className="flex-1 flex flex-col">
          {/*  RESPONSIVE: Table Header with dynamic sizing */}
          {!isMobileOrSmaller ? (
            // Desktop Table Header - This stays fixed
            <div className="flex flex-row items-center w-full rounded-[12px] border-b border-[rgba(15,1,42,0.1)] bg-gradient-to-r from-[#7AA5FF] via-[#3371F2] to-[#0F1522] text-white text-sm font-medium leading-[140%] overflow-hidden sticky top-[110px] z-10"
              style={{
                height: `${getRowHeight()}px`,
                alignSelf: 'stretch',
                paddingLeft: 12,
                paddingRight: 12,
                background: 'linear-gradient(219deg, #7AA5FF 0%, #3371F2 0%, #0F1522 100%), #D6E3FC',
                overflow: 'hidden',
                borderRadius: 12,
                borderBottom: '1px rgba(14.60, 1, 42, 0.10) solid',
                justifyContent: 'flex-start',
                alignItems: 'center',
                display: 'inline-flex',
              }}
            >
              <div className="flex justify-center items-center px-5 w-[262px] h-full border-r border-white/30">
                <span className="whitespace-nowrap">Proposal Number</span>
              </div>
              <div className="flex justify-center items-center px-5 w-[172px] h-full border-r border-white/30">
                <span className="whitespace-nowrap">Proposer ID</span>
              </div>
              <div className="flex justify-center items-center px-5 w-[240px] h-full border-r border-white/30">
                <span className="whitespace-nowrap">Proposer Name</span>
              </div>
              <div className="flex justify-center items-center px-5 w-[196px] h-full border-r border-white/30">
                <span className="whitespace-nowrap">Proposal Date</span>
              </div>
              {activeTab === 'Escalated Requests' && (
                <div className="flex justify-center items-center px-5 w-[200px] h-full border-r border-white/30">
                  <span className="whitespace-nowrap">Escalated By</span>
                </div>
              )}
              <div className="flex justify-center items-center px-3 w-[192px] h-full">
                <span className="text-center whitespace-nowrap">View Details</span>
              </div>
            </div>
          ) : (
            // Mobile Card Header
            <div className="bg-gradient-to-r from-[#7AA5FF] via-[#3371F2] to-[#0F1522] text-white rounded-t-[12px] p-3 sticky top-[110px] z-10">
              <h3 className="text-sm font-medium text-center">Customer Details</h3>
            </div>
          )}

          {/* ✅ KEY CHANGE: Table Body with FIXED HEIGHT and internal scrolling */}
          <div 
            className={`${isMobileOrSmaller ? 'space-y-2' : 'border rounded-b-[12px]'}`}
            style={{
              maxHeight: isMobileOrSmaller ? '60vh' : '65vh', // Fixed height for scrollable area
              overflowY: 'auto', // Enable vertical scrolling
              minHeight: '300px', // Minimum height to ensure some content is always visible
            }}
          >
            {filteredCustomers.length > 0 ? (
              paginatedData.map((row, index) => (
                isMobileOrSmaller ? (
                  // Mobile Card Layout
                  <div
                    key={row.proposer_id}
                    className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div className="space-y-2">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {row.customer_name}
                          </p>
                          <p className="text-xs text-gray-500">
                            ID: {row.proposer_id} • Proposal: {row.proposal_number}
                          </p>
                        </div>
                        <div className="relative" ref={menuRef}>
                          {/* Menu button removed for cleaner mobile layout */}
                          {openMenuIndex === index && (
                            <div className="absolute right-0 top-8 z-50 w-[79px] bg-white shadow-lg rounded-[8px] flex flex-col p-1">
                              <button
                                onClick={() => handleMenuAction('Delete', row.proposer_id)}
                                className="px-3 py-2 w-full h-[32px] rounded-[4px] text-xs text-black/90 hover:bg-[#E2EAFB]"
                              >
                                Delete
                              </button>
                              <button
                                onClick={() => handleMenuAction('Preview', row.proposer_id)}
                                className="px-3 py-2 w-full h-[32px] rounded-[4px] text-xs text-black/90 hover:bg-[#E2EAFB]"
                              >
                                Preview
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="text-xs text-gray-600">
                        <p>Date: {row.proposal_date}</p>
                        {activeTab === 'Escalated Requests' && (
                          <p>Escalated By: {row.escalated_by || 'N/A'}</p>
                        )}
                      </div>

                      <div className="flex justify-center mt-3">
                        <button
                          onClick={(e) => handleViewReviewClick(e, row)}
                          className={`px-4 py-2 border rounded-[6px] text-sm font-medium whitespace-nowrap transition w-full ${
                            row.tag === 'Approved' || row.tag === 'Rejected'
                              ? 'border-[#28A745] text-[#28A745] hover:bg-[#f0fff0]'
                              : 'border-[#DDA853] text-[#DDA853] hover:bg-[#fff8ec]'
                          }`}
                        >
                          {row.tag === 'Approved' || row.tag === 'Rejected' ? 'View' : 'Review'}
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  // Desktop Table Row with hover effect
                  <div
                    key={row.proposer_id}
                    className={`flex items-center px-3 w-full ${
                      index % 2 === 0 ? 'bg-[#EAEFFB]' : 'bg-white'
                    } border-b border-[#E8E7E7] text-[#333] text-sm hover:bg-blue-50 transition-colors cursor-pointer`}
                    style={{ height: `${getRowHeight()}px` }}
                  >
                    <div className="flex items-center px-3 w-[262px]">
                      <span className="font-medium whitespace-nowrap">{row.proposal_number}</span>
                    </div>
                    <div className="flex justify-center items-center w-[172px] px-5">
                      <span className="font-normal whitespace-nowrap">{row.proposer_id}</span>
                    </div>
                    <div className="flex justify-center items-center w-[240px] px-5">
                      <span className="font-normal whitespace-nowrap">{row.customer_name}</span>
                    </div>
                    <div className="flex justify-center items-center w-[196px] px-5">
                      <span className="font-normal whitespace-nowrap">{row.proposal_date}</span>
                    </div>
                    {activeTab === 'Escalated Requests' && (
                      <div className="flex justify-center items-center w-[200px] px-5">
                        <span className="font-normal whitespace-nowrap">{row.escalated_by || 'N/A'}</span>
                      </div>
                    )}
                    <div className="flex justify-center items-center w-[196px] px-5 gap-1 relative">
                      <button
                        onClick={(e) => handleViewReviewClick(e, row)}
                        className={`px-3 py-[2px] border rounded-[6px] text-[14px] font-medium whitespace-nowrap transition ${
                          row.tag === 'Approved' || row.tag === 'Rejected'
                            ? 'border-[#28A745] text-[#28A745] hover:bg-[#f0fff0]'
                            : 'border-[#DDA853] text-[#DDA853] hover:bg-[#fff8ec]'
                        }`}
                      >
                        {row.tag === 'Approved' || row.tag === 'Rejected' ? 'View' : 'Review'}
                      </button>
                      {/* Menu button code remains the same */}
                    </div>
                  </div>
                )
              ))
            ) : (
              // Empty state - centered in the scrollable area
              <div className={`flex items-center justify-center ${
                isMobileOrSmaller ? 'py-16 text-sm' : 'py-20'
              } text-gray-500 h-full`}>
                No customers found matching your criteria.
              </div>
            )}
          </div>
        </div>

        {/* ✅ RESPONSIVE: Pagination with mobile layout - Fixed position at bottom */}
        <div className={`mt-6 bg-white border-t border-gray-200 pt-4 flex-shrink-0`}>
          <div className={`flex ${isMobileOrSmaller ? 'flex-col gap-4' : 'flex-row justify-between items-center'
            } px-3 w-full`}>

            {/* Items per page section */}
            <div className={`flex ${isMobileOrSmaller ? 'flex-col gap-2' : 'flex-row items-center gap-4'
              }`}>
              <span className={`${isSmallMobile ? 'text-sm' : 'text-[16px]'
                } font-normal text-black`}>
                Items per page
              </span>
              <div className="relative">
                <select
                  value={itemsPerPage}
                  onChange={(e) => setItemsPerPage(Number(e.target.value))}
                  className={`appearance-none text-[#0463FF] font-['PP Neue Montreal'] bg-[#EAEFFB] px-4 py-2 pr-8 rounded-[8px] focus:outline-none ${isSmallMobile ? 'text-sm w-[60px] h-[32px]' : isMobileOrSmaller ? 'text-base w-[65px] h-[36px]' : 'text-[16px] w-[70px] h-[40px]'
                    }`}
                >
                  <option value={isSmallMobile ? 4 : isMobile ? 5 : isSmallTablet ? 6 : isTablet ? 7 : 9}>
                    {isSmallMobile ? 4 : isMobile ? 5 : isSmallTablet ? 6 : isTablet ? 7 : 9}
                  </option>
                  <option value={15}>15</option>
                  <option value={30}>30</option>
                </select>
                <img
                  src={cheverdown}
                  alt="Chevron"
                  className={`pointer-events-none absolute right-2 top-1/2 transform -translate-y-1/2 ${isSmallMobile ? 'w-3 h-3' : 'w-4 h-4'
                    }`}
                />
              </div>
            </div>

            {/*  FIX: Navigation section with better spacing */}
            <div className={`flex ${isMobileOrSmaller ? 'flex-col gap-3' : 'flex-row items-center gap-2'
              }`}>
              {/* Mobile pagination info */}
              {isMobileOrSmaller && (
                <div className="text-center text-sm text-gray-600">
                  Page {currentPage} of {totalPages} ({filteredCustomers.length} total)
                </div>
              )}

              {/* Navigation controls */}
              <div className="flex flex-row items-center gap-1">
                <button
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  className={`flex items-center px-3 py-2 gap-2 rounded-[8px] cursor-pointer disabled:opacity-50 border border-gray-200 hover:bg-gray-50 ${isSmallMobile ? 'text-sm' : 'text-base'
                    }`}
                >
                  <img src={arrowleft} alt="Previous" className={`${isSmallMobile ? 'w-[12px] h-[14px]' : 'w-[14px] h-[16px]'
                    }`} />
                  <span className="font-medium text-black/80">
                    {isSmallMobile ? 'Prev' : 'Previous'}
                  </span>
                </button>

                {/* Page numbers */}
                <div className="flex flex-row items-center gap-1 mx-2">
                  {Array.from({ length: Math.min(totalPages, isMobileOrSmaller ? 5 : 10) }, (_, i) => i + 1).map((num) => (
                    <button
                      key={num}
                      onClick={() => goToPage(num)}
                      className={`flex justify-center items-center rounded-[6px] ${currentPage === num ? 'bg-[#EAEFFB] text-[#0463FF] font-medium' : 'border border-[#3371F24D] text-[#3371F2] font-normal hover:bg-gray-50'
                        } ${isSmallMobile ? 'w-[28px] h-[28px] text-sm' : 'w-[32px] h-[32px] text-[16px]'}`}
                    >
                      <span>{num}</span>
                    </button>
                  ))}
                  {totalPages > (isMobileOrSmaller ? 5 : 10) && (
                    <div className={`flex justify-center items-center border border-[#3371F24D] rounded-[6px] ${isSmallMobile ? 'w-[28px] h-[28px]' : 'w-[32px] h-[32px]'
                      }`}>
                      <span className={`text-[#3371F2] font-normal ${isSmallMobile ? 'text-sm' : 'text-[16px]'
                        }`}>...</span>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className={`flex items-center px-3 py-2 gap-2 rounded-[8px] cursor-pointer disabled:opacity-50 border border-gray-200 hover:bg-gray-50 ${isSmallMobile ? 'text-sm' : 'text-base'
                    }`}
                >
                  <span className="text-[#0463FF] font-medium">
                    Next
                  </span>
                  <img src={arrowright} alt="Next" className={`${isSmallMobile ? 'w-[12px] h-[14px]' : 'w-[14px] h-[16px]'
                    }`} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* All the dropdown portals remain the same... */}
      {/*  RESPONSIVE: Filter Dropdown Portal with mobile sizing */}
      {showFilterDropdown && createPortal(
        <div
          className={`fixed bg-white shadow-xl rounded-md border border-[#E5ECFB] max-h-[400px] overflow-y-auto font-['PP Neue Montreal'] ${isMobileOrSmaller ? 'w-[200px]' : 'w-[240px]'
            }`}
          style={{
            top: filterRef.current ? filterRef.current.getBoundingClientRect().bottom + 8 : 0,
            left: filterRef.current ? filterRef.current.getBoundingClientRect().left : 0,
            zIndex: 10000,
          }}
        >
          {['Date', 'Status'].map((item) => (
            <div
              key={item}
              onClick={() => handleFilterSelect(item)}
              className={`px-4 py-3 hover:bg-blue-50 cursor-pointer flex justify-between items-center border-b border-[#E5ECFB] last:border-b-0 ${isSmallMobile ? 'text-xs' : 'text-sm'
                }`}
            >
              <span>{item}</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M9 18L15 12L9 6" stroke="#3371F2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          ))}
          <div
            onClick={clearFilters}
            className={`px-4 py-3 hover:bg-red-50 cursor-pointer flex justify-between items-center text-red-600 ${isSmallMobile ? 'text-xs' : 'text-sm'
              }`}
          >
            <span>Clear All Filters</span>
          </div>
        </div>,
        document.body
      )}

      {/*  RESPONSIVE: Sort Dropdown Portal with mobile sizing */}
      {showSortDropdown && createPortal(
        <div
          className={`fixed bg-white shadow-xl rounded-md border border-[#E5ECFB] max-h-[200px] overflow-y-auto font-['PP Neue Montreal'] ${isMobileOrSmaller ? 'w-36' : 'w-44'
            }`}
          style={{
            top: sortRef.current ? sortRef.current.getBoundingClientRect().bottom + 8 : 0,
            left: sortRef.current ? sortRef.current.getBoundingClientRect().left : 0,
            zIndex: 10000,
          }}
        >
          {['Date', 'Name A-Z', 'Name Z-A', 'Status'].map((option) => (
            <div
              key={option}
              onClick={() => handleSortSelect(option)}
              className={`px-4 py-2 hover:bg-blue-100 cursor-pointer ${isSmallMobile ? 'text-xs' : 'text-sm'
                }`}
            >
              {option}
            </div>
          ))}
        </div>,
        document.body
      )}

      {/*  RESPONSIVE: Filter Date Picker Portal with mobile sizing */}
      {showDatePicker && createPortal(
        <div
          ref={datePickerRef}
          className={`fixed bg-white border border-[#E5ECFB] rounded-md shadow-xl p-4 font-['PP Neue Montreal'] ${isMobileOrSmaller ? 'w-[260px]' : 'w-[280px]'
            }`}
          style={{
            top: filterRef.current ? filterRef.current.getBoundingClientRect().bottom + 8 : 0,
            left: filterRef.current ? filterRef.current.getBoundingClientRect().left : 0,
            zIndex: 10001,
          }}
        >
          <DatePicker
            inline
            selected={selectedDate}
            onChange={handleDateChange}
            calendarClassName="!border-0 !shadow-none"
          />
          <div className="flex justify-between items-center pt-3 border-t border-[#E5ECFB] mt-2">
            <button
              onClick={() => {
                setSelectedDate(new Date());
                setShowDatePicker(false);
              }}
              className={`text-[#3371F2] font-medium hover:underline ${isSmallMobile ? 'text-xs' : 'text-sm'
                }`}
            >
              Today
            </button>
            <button
              onClick={() => {
                setShowDatePicker(false);
              }}
              className={`text-gray-500 font-medium hover:underline ${isSmallMobile ? 'text-xs' : 'text-sm'
                }`}
            >
              Cancel
            </button>
          </div>
        </div>,
        document.body
      )}

      {/*  RESPONSIVE: Sort Date Picker Portal with mobile sizing */}
      {showSortDatePicker && createPortal(
        <div
          ref={sortDatePickerRef}
          className={`fixed bg-white border border-[#E5ECFB] rounded-md shadow-xl p-4 font-['PP Neue Montreal'] ${isMobileOrSmaller ? 'w-[260px]' : 'w-[280px]'
            }`}
          style={{
            top: sortRef.current ? sortRef.current.getBoundingClientRect().bottom + 8 : 0,
            left: sortRef.current ? sortRef.current.getBoundingClientRect().left : 0,
            zIndex: 10001,
          }}
        >
          <div className={`mb-3 text-center text-[#3371F2] font-medium ${isSmallMobile ? 'text-sm' : 'text-base'
            }`}>
            Sort by Date
          </div>
          <DatePicker
            inline
            selected={selectedSortDate}
            onChange={handleSortDateChange}
            calendarClassName="!border-0 !shadow-none"
          />
          <div className="flex justify-between items-center pt-3 border-t border-[#E5ECFB] mt-2">
            <button
              onClick={() => {
                setSelectedSortDate(new Date());
                setShowSortDatePicker(false);
              }}
              className={`text-[#3371F2] font-medium hover:underline ${isSmallMobile ? 'text-xs' : 'text-sm'
                }`}
            >
              Today
            </button>
            <button
              onClick={() => {
                setShowSortDatePicker(false);
              }}
              className={`text-gray-500 font-medium hover:underline ${isSmallMobile ? 'text-xs' : 'text-sm'
                }`}
            >
              Cancel
            </button>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};

export default DashboardCustomerTable;
