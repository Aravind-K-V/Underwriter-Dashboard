import React, { useState, useEffect, useRef } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { useMediaQuery } from 'react-responsive';

// Icon imports
import healthScoreIcon from '../../assets/medical-table-icons/health-score.svg';
import bloodIcon from '../../assets/medical-table-icons/blood.svg';
import smokeIcon from '../../assets/medical-table-icons/smoke.svg';
import liverIcon from '../../assets/medical-table-icons/liver.svg';
import bloodHealthIcon from '../../assets/medical-table-icons/blood-health.svg';
import riskFactorIcon from '../../assets/medical-table-icons/risk-factor.svg';
import chevronDownIcon from '../../assets/underwriter-dashboard-icons/chevron-down.svg';
import questionCircleIcon from '../../assets/medical-table-icons/question-circle.svg';
import verificationIcon from '../../assets/medical-table-icons/verification.svg';
import watermarkIcon from '../../assets/medical-table-icons/watermark.svg';
import viewIcon from '../../assets/medical-table-icons/view.svg';
// import tickIcon from '../../assets/underwriter-dashboard-icons/tick.svg';

import EllipsisOutlined from '../../assets/medical-table-icons/EllipsisOutlined.svg';
import lowArrow from '../../assets/medical-table-icons/low-arrow.svg';
import mediumArrow from '../../assets/medical-table-icons/medium-arrow.svg';
import highArrow from '../../assets/medical-table-icons/high-arrow.svg';
import aiIcon from '../../assets/underwriter-dashboard-icons/ai.svg';
import companyLogo from '../../assets/underwriter-dashboard-icons/web-icon.svg';
// Media query hooks for responsive design
import tickIconUrl from '../../assets/underwriter-dashboard-icons/tick.svg';


// Environment variables - Updated for Vite
const NODE_API_URL = import.meta.env.VITE_NODE_API_URL || 'http://localhost:5000';

const DocumentUploadScreenMedicalTable = ({ activeTab, setActiveTab, bothTabsPresent, reviewFlags }) => {
  // Media query hooks for responsive design
  const isDesktop = useMediaQuery({ minWidth: 1024 });
  const isTablet = useMediaQuery({ minWidth: 768, maxWidth: 1023 });
  const isMobile = useMediaQuery({ maxWidth: 767 });
  const isMobileOrSmaller = useMediaQuery({ maxWidth: 767 });

  // State management for dropdowns, documents, and UI interactions
  const [openDropdown, setOpenDropdown] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [previewError, setPreviewError] = useState(null);
  const [extractedText, setExtractedText] = useState(null);
  const [extractionError, setExtractionError] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingDocId, setProcessingDocId] = useState(null);
  const [processedDocuments, setProcessedDocuments] = useState({});
  const [viewingStoredJSON, setViewingStoredJSON] = useState(null);
  const [documentProcessingStatus, setDocumentProcessingStatus] = useState({});
  const [proposerHealthData, setProposerHealthData] = useState([]);
  const [loadingHealthData, setLoadingHealthData] = useState(false);
  const [selectedMemberIndex, setSelectedMemberIndex] = useState(0);
  const [expandedHealthMetricId, setExpandedHealthMetricId] = useState(null);
  const [processedHealthAnalysis, setProcessedHealthAnalysis] = useState(null);
  const [medicalDocuments, setMedicalDocuments] = useState([]);
  const [medicalDocumentsLoading, setMedicalDocumentsLoading] = useState(false);
  const [medicalDocumentsError, setMedicalDocumentsError] = useState(null);
  const [isBatchProcessing, setIsBatchProcessing] = useState(false);
  const [batchProcessingProgress, setBatchProcessingProgress] = useState(0);
  const [batchProcessingStatus, setBatchProcessingStatus] = useState('');
  const [batchResults, setBatchResults] = useState([]);
  const [combinedResults, setCombinedResults] = useState(null);
  const [allNameVerifications, setAllNameVerifications] = useState([]);
  const [showCombinedResultsModal, setShowCombinedResultsModal] = useState(false);
  const [isDocumentsProcessed, setIsDocumentsProcessed] = useState(false);
  const [showLoadingScreen, setShowLoadingScreen] = useState(false);
  const [currentStatus, setCurrentStatus] = useState('Pending');
  const [statusUpdateLoading, setStatusUpdateLoading] = useState(false);
  // Modal states (ADD THESE AFTER EXISTING STATES)
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState(null); // "approve", "reject", "investigate"
  const [modalStatus, setModalStatus] = useState('confirm'); // "confirm" | "loading" | "success" | "error"
  const [modalError, setModalError] = useState('');
  const [modalMessage, setModalMessage] = useState(''); //  NEW: Required message field
  //  ADD THIS REF
  const scrollContainerRef = useRef(null);
  //  ADD THESE NEW STATE VARIABLES:
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');


  // Extract proposer_id from URL parameters
  const { proposer_id } = useParams();
  const location = useLocation();
  const [autoProcessingTriggered, setAutoProcessingTriggered] = useState(false);

  // Updated healthMetrics array with fixed total parameters
  const healthMetrics = [
    {
      id: 1,
      title: 'Blood Health',
      subParameters: [
        'HAEMOGLOBIN (Hb)',
        'TLC (Total Leucocyte Count)',
        'NEUTROPHIL',
        'LYMPHOCYTE',
        'EOSINOPHIL',
        'MONOCYTE',
        'BASOPHIL',
        'E.S.R. (WESTERGREN)',
        'R B C (Red Blood Cell Count)',
        'HCT (Hematocrit)',
        'M C V (Mean Corp Volume)',
        'M C H (Mean Corp Hb)',
        'M C H C (Mean Corp Hb Conc)',
        'PLATELET COUNT',
        'ABSOLUTE NEUTROPHIL COUNT',
        'ABSOLUTE LYMPHOCYTE COUNT',
        'ABSOLUTE EOSINOPHIL COUNT',
        'ABSOLUTE MONOCYTE COUNT',
        'ABSOLUTE BASOPHIL COUNT',
        'Absolute counts'
      ],
      score: 'N/A',
      total: 20,
      description: 'measurements are inside the range',
      riskLevel: 'Low',
      icon: bloodIcon,
      iconBg: 'bg-gradient-to-br from-red-500 to-red-300'
    },
    {
      id: 2,
      title: 'Liver Health',
      subParameters: [
        'ALBUMIN',
        'SGOT/AST',
        'SGPT/ALT',
        'GGTP',
        'ALKALINE PHOSPHATASE'
      ],
      score: 'N/A',
      total: 5,
      description: 'measurements are inside the range',
      riskLevel: 'Low',
      icon: liverIcon,
      iconBg: 'bg-gradient-to-br from-orange-400 to-orange-300'
    },
    {
      id: 3,
      title: 'Kidney Health',
      subParameters: [
        'SERUM CREATININE'
      ],
      score: 'N/A',
      total: 1,
      description: 'measurements are inside the range',
      riskLevel: 'Low',
      icon: liverIcon,
      iconBg: 'bg-gradient-to-br from-green-500 to-green-400'
    },
    {
      id: 4,
      title: 'Lipid Profile',
      subParameters: [
        'SERUM CHOLESTEROL',
        'SERUM TRIGLYCERIDES',
        'HDL CHOLESTEROL'
      ],
      score: 'N/A',
      total: 3,
      description: 'measurements are inside the range',
      riskLevel: 'Low',
      icon: bloodHealthIcon,
      iconBg: 'bg-gradient-to-br from-pink-400 to-pink-600'
    },
    {
      id: 5,
      title: 'Blood Sugar & HbA1c',
      subParameters: [
        'BLOOD SUGAR FASTING',
        'HbA1c',
        'GLYCOSYLATED HAEMOGLOBIN (HBA1C)'
      ],
      score: 'N/A',
      total: 3,
      description: 'measurements are inside the range',
      riskLevel: 'Low',
      icon: bloodHealthIcon,
      iconBg: 'bg-gradient-to-br from-pink-400 to-pink-600'
    },
    {
      id: 6,
      title: 'Infectious Disease Markers',
      subParameters: [
        'HIV 1 & 2 Antibodies Screening',
        'HBsAg'
      ],
      score: 'N/A',
      total: 2,
      description: 'measurements are inside the range',
      riskLevel: 'Low',
      icon: bloodHealthIcon,
      iconBg: 'bg-gradient-to-br from-pink-400 to-pink-600'
    }
  ];

  //  UPDATED: Function to fetch current underwriting request status
  const fetchCurrentStatus = async () => {
    if (!proposer_id) {
      console.debug('[DocumentUpload][MedicalTable] No proposer_id found in URL params');
      setCurrentStatus("");
      return;
    }

    try {
      console.info('[DocumentUpload][MedicalTable] Fetching underwriting status for proposer_id:', proposer_id);

      const response = await fetch(`${NODE_API_URL}/api/underwriting/underwriting-status/${proposer_id}`);

      if (response.ok) {
        const statusData = await response.json();
        console.debug('[DocumentUpload][MedicalTable] Fetched status from underwriting_requests:', statusData);

        //  FIXED: Ensure both status and message are set properly
        setCurrentStatus(statusData.status || "");
        setModalMessage(statusData.message || ''); // This should contain the actual message
        console.debug('[DocumentUpload][MedicalTable] Current status set to:', statusData.status);
        console.debug('[DocumentUpload][MedicalTable] Current message set to:', statusData.message);
      } else {
        console.error('[DocumentUpload][MedicalTable] Failed to fetch status:', response.status, response.statusText);
        setCurrentStatus('NOT RETRIEVED');
      }
    } catch (error) {
      console.error('[DocumentUpload][MedicalTable] Error fetching underwriting status:', error.message);
      setCurrentStatus('NOT RETRIEVED');
    }
  };

  //  UPDATED: Function to update underwriting request status 
  const updateUnderwritingStatus = async (newStatus, message) => {
    if (!proposer_id) {
      alert('Proposer ID not found. Please refresh and try again.');
      return;
    }

    setStatusUpdateLoading(true);

    try {
      console.info('[DocumentUpload][MedicalTable] Updating status:', { status: newStatus, message, proposer_id });

      const response = await fetch(`${NODE_API_URL}/api/underwriting/underwriting-requests/${proposer_id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: newStatus,
          message: message //  Include the message in the request
        })
      });

      console.debug('[DocumentUpload][MedicalTable] Update response status:', response.status);

      if (response.ok) {
        const data = await response.json();

        //  UPDATED: Don't reload, just update state and show success message
        const statusMessages = {
          'Approved': 'Application approved successfully! ',
          'Rejected': 'Application rejected. ',
          'Needs Investigation': 'Application marked for investigation. 🔍'
        };

        console.info('[DocumentUpload][MedicalTable] Status updated successfully:', { hasData: !!data });

        //  REMOVED: window.location.reload() - this was causing navigation
        // Just return success so modal can handle the UI update

      } else {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to update status: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.error('[DocumentUpload][MedicalTable] Error updating status:', error.message);
      throw error; //  Throw error so modal can handle it
    } finally {
      setStatusUpdateLoading(false);
    }
  };


  // Function to reset parameters to default N/A state
  const resetParametersToDefault = () => {
    setProcessedHealthAnalysis(null);
    setExpandedHealthMetricId(null);
    setExtractedText(null);
    setExtractionError(null);
    console.debug('[DocumentUpload][MedicalTable] Parameters reset to default N/A state');
  };

  // Function to combine results from multiple processed documents
  const combineProcessedResults = (resultsArray) => {
    const combined = {
      totalParams: 0,
      processedDocuments: resultsArray.length,
      successfulDocuments: 0,
      combinedParameters: {}
    };

    const allHealthMetricsData = {};

    resultsArray.forEach((result, index) => {
      if (result.success && result.range_analysis) {
        combined.successfulDocuments++;
        combined.totalParams += result.range_analysis.totalParams || 0;

        // Combine out of range parameters
        if (result.range_analysis.outOfRangeParams) {
          result.range_analysis.outOfRangeParams.forEach(param => {
            const paramKey = param.parameter || `Unknown_${index}`;
            if (!combined.combinedParameters[paramKey]) {
              combined.combinedParameters[paramKey] = {
                parameter: param.parameter,
                values: [],
                count: 0,
                reference_range: param.reference_range,
                unit: param.unit
              };
            }
            combined.combinedParameters[paramKey].values.push({
              value: param.value,
              documentIndex: index + 1
            });
            combined.combinedParameters[paramKey].count++;
          });
        }

        // Process health metrics analysis
        if (result.healthAnalysis) {
          Object.keys(result.healthAnalysis).forEach(metricId => {
            if (!allHealthMetricsData[metricId]) {
              // Initialize with fixed total from healthMetrics
              const metric = healthMetrics.find(m => m.id === parseInt(metricId));
              allHealthMetricsData[metricId] = {
                totalParams: metric ? metric.total : 0,
                presentParameters: []
              };
            }

            const metric = result.healthAnalysis[metricId];
            // Merge parameters arrays (avoid duplicates)
            if (metric.presentParameters) {
              metric.presentParameters.forEach(param => {
                if (!allHealthMetricsData[metricId].presentParameters.some(p => p.name === param.name)) {
                  allHealthMetricsData[metricId].presentParameters.push(param);
                }
              });
            }
          });
        }
      }
    });

    // Convert combined parameters to array
    combined.outOfRangeParams = Object.values(combined.combinedParameters);

    return { combined, allHealthMetricsData };
  };
  //  ADD THIS NEW FUNCTION
  const handleConfirmClick = async () => {
    if (!modalMessage.trim()) {
      alert('Please enter a message before confirming.');
      return;
    }

    setModalStatus('loading');

    try {
      let newStatus = '';
      if (modalType === 'approve') {
        await updateUnderwritingStatus('Approved', modalMessage.trim());
        newStatus = 'Approved';
      } else if (modalType === 'reject') {
        await updateUnderwritingStatus('Rejected', modalMessage.trim());
        newStatus = 'Rejected';
      } else if (modalType === 'investigate') {
        await updateUnderwritingStatus('Needs Investigation', modalMessage.trim());
        newStatus = 'Needs Investigation';
      }

      //  SHOW SUCCESS POPUP
      setModalStatus('success');

      //  AUTO-CLOSE AFTER 2 SECONDS
      setTimeout(() => {
        setModalOpen(false);
        setModalMessage('');
        setCurrentStatus(newStatus);
        //  REMOVED: window.location.reload() - NO MORE ABRUPT RELOAD
      }, 2000);

    } catch (err) {
      setModalError(typeof err === 'string' ? err : (err.message || 'Unknown error'));
      setModalStatus('error');
    }
  };


  // Helper function to analyze existing extracted data
  const analyzeExistingExtractedData = (extractedData) => {
    let totalParams = 0;
    let outOfRangeParams = [];

    if (extractedData && extractedData.results && Array.isArray(extractedData.results)) {
      extractedData.results.forEach((testItem, index) => {
        if (testItem.value !== undefined && testItem.reference_range) {
          totalParams++;
          // You can add range checking logic here if needed
          // For now, we'll assume the data was already analyzed
        }
      });
    }

    return {
      totalParams,
      outOfRangeParams,
      allParams: extractedData.results || []
    };
  };

  // Enhanced function with strict parameter matching and filtered parameter display
  const mapRangeAnalysisToHealthMetrics = (rangeAnalysis, extractedResults) => {
    if (!rangeAnalysis && !extractedResults) return null;

    // Function to clean parameter names for precise matching
    const cleanParameterName = (paramName) => {
      return paramName
        .toLowerCase()
        .replace(/\([^)]*\)/g, '') // Remove content in parentheses
        .replace(/[^\w\s]/g, ' ') // Replace special characters with spaces
        .replace(/\s+/g, ' ') // Replace multiple spaces with single space
        .trim();
    };

    // Function to check if value is in normal range (exact backend logic)
    const checkValueInNormalRange = (value, referenceRange) => {
      try {
        const numValue = parseFloat(String(value).replace(/^0+/, '') || '0');
        if (isNaN(numValue)) return false;

        let normalRange;
        if (typeof referenceRange === 'object' && referenceRange.Normal) {
          normalRange = referenceRange.Normal;
        } else {
          return false;
        }

        const rangeStr = String(normalRange).trim();

        // Parse different range formats (matching backend exactly)
        const rangeMatch = rangeStr.match(/^(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)$/);
        if (rangeMatch) {
          const min = parseFloat(rangeMatch[1]);
          const max = parseFloat(rangeMatch[1]);
          return numValue >= min && numValue <= max;
        }

        const lessThanRangeMatch = rangeStr.match(/^<\s*(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)$/);
        if (lessThanRangeMatch) {
          const upperLimit = parseFloat(lessThanRangeMatch[2]);
          return numValue <= upperLimit;
        }

        const zeroRangeMatch = rangeStr.match(/^0\s*-\s*(\d+(?:\.\d+)?)$/);
        if (zeroRangeMatch) {
          const max = parseFloat(zeroRangeMatch[2]);
          return numValue >= 0 && numValue <= max;
        }

        const lessThanMatch = rangeStr.match(/^<\s*(\d+(?:\.\d+)?)$/);
        if (lessThanMatch) {
          const max = parseFloat(lessThanMatch[2]);
          return numValue < max;
        }

        const greaterEqualMatch = rangeStr.match(/^>=\s*(\d+(?:\.\d+)?)$/);
        if (greaterEqualMatch) {
          const min = parseFloat(greaterEqualMatch[2]);
          return numValue >= min;
        }

        const greaterThanMatch = rangeStr.match(/^>\s*(\d+(?:\.\d+)?)$/);
        if (greaterThanMatch) {
          const min = parseFloat(greaterThanMatch[2]);
          return numValue > min;
        }

        return false;
      } catch (error) {
        return false;
      }
    };

    // Get actual test results from JSON
    let testResults = [];
    if (extractedResults && extractedResults.results) {
      testResults = extractedResults.results;
    } else if (rangeAnalysis && rangeAnalysis.allParams) {
      testResults = rangeAnalysis.allParams; // Use allParams to display all parameters
    }

    // Create a map of actual tested parameter names (cleaned) for strict matching
    const actualTestedParams = new Map();
    testResults.forEach(testItem => {
      const testName = testItem.test_name || testItem.parameter || '';
      const cleanedTestName = cleanParameterName(testName);
      actualTestedParams.set(cleanedTestName, {
        originalName: testName,
        value: testItem.value,
        referenceRange: testItem.reference_range,
        unit: testItem.unit,
        status: testItem.status,
        item: testItem
      });
    });

    const processedData = {};

    // For each health metric category
    healthMetrics.forEach((metric) => {
      // Track only parameters that are actually present in the document
      const presentParameters = [];
      let testedInThisCategory = 0;

      // Check each sub-parameter in this metric against actual tested parameters only
      metric.subParameters.forEach(subParam => {
        const cleanedSubParam = cleanParameterName(subParam);
        let wasMatched = false;

        // STRICT MATCHING: Only match if parameter name appears in actual tested parameters
        for (const [cleanedTestName, testData] of actualTestedParams.entries()) {
          const isExactMatch = cleanedTestName === cleanedSubParam;
          const isPartialMatch =
            (cleanedTestName.includes(cleanedSubParam) && cleanedSubParam.length > 2) ||
            (cleanedSubParam.includes(cleanedTestName) && cleanedTestName.length > 2);

          // Additional specific matching for common abbreviations
          const isAbbreviationMatch =
            (cleanedSubParam.includes('hb') && cleanedTestName.includes('haemoglobin')) ||
            (cleanedSubParam.includes('haemoglobin') && cleanedTestName.includes('hb')) ||
            (cleanedSubParam.includes('esr') && cleanedTestName.includes('westergren')) ||
            (cleanedSubParam.includes('westergren') && cleanedTestName.includes('esr')) ||
            (cleanedSubParam.includes('rbc') && cleanedTestName.includes('red blood cell')) ||
            (cleanedSubParam.includes('red blood cell') && cleanedTestName.includes('rbc')) ||
            (cleanedSubParam.includes('absolute counts') && cleanedTestName.includes('absolute'));

          if (isExactMatch || isPartialMatch || isAbbreviationMatch) {
            wasMatched = true;
            testedInThisCategory++;

            // Add to present parameters list
            presentParameters.push({
              name: subParam,
              value: testData.value,
              unit: testData.unit,
              referenceRange: testData.referenceRange,
              status: testData.status
            });
            break; // Only match once per sub-parameter
          }
        }
      });

      // Store results for this metric with fixed total
      processedData[metric.id] = {
        totalParams: metric.total, // Use fixed total from healthMetrics
        presentParameters: presentParameters,
        // Store the raw test data for reference
        rawTestData: testResults
      };
    });

    return processedData;
  };

  // Function to get filtered health metrics (only show metrics with detected parameters)
  const getFilteredHealthMetrics = () => {
    if (!processedHealthAnalysis) {
      // Before processing: show message to process document
      return [];
    }

    // Filter to only include metrics that have detected parameters
    return healthMetrics.filter(metric => {
      return processedHealthAnalysis[metric.id] &&
        processedHealthAnalysis[metric.id].presentParameters.length > 0;
    });
  };

  // Function to check if all documents are fully processed
  const areAllDocumentsProcessed = () => {
    if (medicalDocuments.length === 0) return false;

    return medicalDocuments.every(doc => {
      const status = documentProcessingStatus[doc.document_id];
      return status === 'success' || status === 'failed';
    });
  };

  // Function to calculate overall health score percentage - FINAL CORRECT VERSION
  const calculateOverallHealthScore = () => {
    if (!processedHealthAnalysis) {
      return { score: 'N/A', inRange: 0, total: 0 };
    }

    let totalInRangeParams = 0;
    let totalAllSubParams = 0;

    // Get filtered health metrics (only those that are displayed)
    const filteredMetrics = getFilteredHealthMetrics();

    // Count ALL subParameters from DISPLAYED health metrics
    filteredMetrics.forEach(metric => {
      // Add total count of subParameters for this metric
      totalAllSubParams += metric.subParameters ? metric.subParameters.length : 0;

      const metricData = processedHealthAnalysis[metric.id];
      if (metricData && metricData.presentParameters) {
        const presentParams = metricData.presentParameters;

        // Count parameters that are in normal range
        presentParams.forEach(param => {
          if (param.status === 'Normal' || param.status === 'normal' ||
            isParameterInRange(param.value, param.referenceRange)) {
            param.status = 'Normal'; // Standardize status
            totalInRangeParams++;
          }
          else {
            param.status = 'Out of Range'; // Standardize status
          }
        });
      }
    });

    const percentage = totalAllSubParams > 0 ? Math.round((totalInRangeParams / totalAllSubParams) * 100) : 0;

    return {
      score: totalAllSubParams > 0 ? `${percentage}%` : 'N/A',
      inRange: totalInRangeParams,
      total: totalAllSubParams,
      percentage: percentage
    };
  };

  // Helper function to check if a parameter is in normal range
  const isParameterInRange = (value, referenceRange) => {
    if (!value || !referenceRange) return false;

    try {
      const numValue = parseFloat(String(value).replace(/[^\d.-]/g, ''));
      if (isNaN(numValue)) return false;

      let rangeString = '';
      if (typeof referenceRange === 'object' && referenceRange !== null) {
        if (referenceRange.Normal) {
          rangeString = referenceRange.Normal;
        } else if (referenceRange['Reference Range']) {
          rangeString = referenceRange['Reference Range'];
        } else {
          return true; // Assume in range if can't determine
        }
      } else {
        rangeString = String(referenceRange);
      }

      // Basic range checking
      const simpleRange = rangeString.match(/^(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)$/);
      if (simpleRange) {
        const min = parseFloat(simpleRange[1]);
        const max = parseFloat(simpleRange[2]);
        return numValue >= min && numValue <= max;
      }

      const lessThan = rangeString.match(/^<\s*(\d+(?:\.\d+)?)$/);
      if (lessThan) {
        const max = parseFloat(lessThan[1]);
        return numValue < max;
      }

      // Default to in range if can't parse
      return true;
    } catch (error) {
      return true; // Assume in range on error
    }
  };

  // Function to toggle health metric expansion
  const toggleHealthMetricExpansion = (metricId) => {
    setExpandedHealthMetricId(expandedHealthMetricId === metricId ? null : metricId);
  };

  // Function to fetch proposer health metrics
  const fetchProposerHealthMetrics = async () => {
    if (!proposer_id) return;

    setLoadingHealthData(true);

    try {
      const response = await fetch(`${NODE_API_URL}/api/medical-document-processing/proposer-health-metrics/${proposer_id}`);

      if (response.ok) {
        const data = await response.json();

        if (data.success && Array.isArray(data.data)) {
          setProposerHealthData(data.data);
        } else {
          console.error('[DocumentUpload][MedicalTable] Invalid health metrics response:', data);
          setProposerHealthData([]);
        }
      } else {
        console.error('[DocumentUpload][MedicalTable] Failed to fetch health metrics:', response.status);
        setProposerHealthData([]);
      }
    } catch (error) {
      console.error('[DocumentUpload][MedicalTable] Error fetching health metrics:', error);
      setProposerHealthData([]);
    } finally {
      setLoadingHealthData(false);
    }
  };

  // Function to fetch medical documents by proposer ID
  const fetchMedicalDocuments = async () => {
    if (!proposer_id) return;

    setMedicalDocumentsLoading(true);
    setMedicalDocumentsError(null);

    try {
      console.info('[DocumentUpload][MedicalTable] Fetching medical documents for proposer:', proposer_id);
      const response = await fetch(`http://localhost:5000/api/documents/${proposer_id}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch medical documents: ${response.status}`);
      }

      const documents = await response.json();
      console.debug('[DocumentUpload][MedicalTable] All documents received:', { count: documents.length });

      // Filter to only show medical documents
      const medicalDocs = documents.filter(doc => {
        const docType = (doc.document_type || '').toLowerCase();
        const docName = (doc.name || '').toLowerCase();
        const isMedical = docType.includes('medical') || docName.includes('medical');
        console.debug('[DocumentUpload][MedicalTable] Filtering document:', { id: doc.id, type: docType, name: docName, isMedical });
        return isMedical;
      });

      console.debug('[DocumentUpload][MedicalTable] Filtered medical documents:', { count: medicalDocs.length });

      // Map the filtered documents with extracted_data properly handled
      const mappedMedicalDocs = medicalDocs.map(doc => ({
        document_id: doc.id,
        document_type: doc.document_type || doc.name,
        validated: doc.checklist === 'Verified',
        source_url: doc.source_url,
        member_id: doc.member_id,
        proposal_number: doc.proposal_number,
        proposer_id: doc.proposer_id,
        customer_name: doc.customer_name,
        // Handle extracted_data properly - parse if string, keep if object
        extracted_data: (() => {
          try {
            if (doc.metadata) {
              return typeof doc.metadata === 'string' ? JSON.parse(doc.metadata) : doc.metadata;
            }
            return null;
          } catch (e) {
            console.warn(`Failed to parse metadata for document ${doc.id}:`, e);
            return null;
          }
        })(),
        status: doc.status
      }));

      setMedicalDocuments(mappedMedicalDocs);
      console.debug('[DocumentUpload][MedicalTable] Medical documents set with extracted data:', { count: mappedMedicalDocs.length });

      // Immediately process verification data from existing extracted_data
      const immediateVerifications = [];
      const immediateProcessedDocs = {};
      let hasProcessedData = false;

      mappedMedicalDocs.forEach(doc => {
        if (doc.extracted_data && Object.keys(doc.extracted_data).length > 0) {
          hasProcessedData = true;

          // Set document as processed
          immediateProcessedDocs[doc.document_id] = {
            extractedData: { extracted_data: doc.extracted_data },
            processedAt: new Date().toISOString(),
            documentInfo: { id: doc.document_id, type: doc.document_type },
            memberId: doc.member_id,
            extractedText: doc.extracted_data,
            fromExistingData: true
          };

          // Extract verification data immediately
          const identityVerification = extractIdentityFromExistingData(doc.extracted_data, doc);
          if (identityVerification) {
            immediateVerifications.push({
              documentId: doc.document_id,
              documentType: doc.document_type,
              memberId: doc.member_id,
              verification: identityVerification,
              proposer_name: doc.customer_name
            });
          }

          // Set processing status
          setDocumentProcessingStatus(prev => ({
            ...prev,
            [doc.document_id]: 'success'
          }));
        }
      });

      // Update states immediately if we have processed data
      if (hasProcessedData) {
        setProcessedDocuments(prev => ({ ...prev, ...immediateProcessedDocs }));
        setAllNameVerifications(immediateVerifications);
        setIsDocumentsProcessed(true);

        // Process health analysis from existing data
        const healthResults = mappedMedicalDocs
          .filter(doc => doc.extracted_data && Object.keys(doc.extracted_data).length > 0)
          .map(doc => ({
            documentId: doc.document_id,
            documentType: doc.document_type,
            memberId: doc.member_id,
            success: true,
            range_analysis: analyzeExistingExtractedData(doc.extracted_data),
            extracted_data: doc.extracted_data,
            healthAnalysis: mapRangeAnalysisToHealthMetrics(null, doc.extracted_data),
            identity_verification: extractIdentityFromExistingData(doc.extracted_data, doc),
            proposer_info: { customer_name: doc.customer_name },
            fromExistingData: true
          }));

        if (healthResults.length > 0) {
          const { combined, allHealthMetricsData } = combineProcessedResults(healthResults);
          setProcessedHealthAnalysis(allHealthMetricsData);
        }
      }

      // Log which documents have existing data
      mappedMedicalDocs.forEach(doc => {
        const hasData = doc.extracted_data && Object.keys(doc.extracted_data).length > 0;
        console.debug('[DocumentUpload][MedicalTable] Document extracted data check:', { documentId: doc.document_id, hasData });
      });

    } catch (err) {
      console.error('[DocumentUpload][MedicalTable] Error fetching medical documents:', err);
      setMedicalDocumentsError(err.message);
      setMedicalDocuments([]);
    } finally {
      setMedicalDocumentsLoading(false);
    }
  };

  // Helper function to get count of parameters in normal range for a specific metric
  const getNormalParameterCount = (metricId) => {
    if (!processedHealthAnalysis || !processedHealthAnalysis[metricId]) {
      return 0;
    }

    const metricData = processedHealthAnalysis[metricId];
    if (!metricData.presentParameters) {
      return 0;
    }

    return metricData.presentParameters.filter(param => {
      // Check if parameter is in normal range
      return param.status === 'Normal' || param.status === 'normal' ||
        isParameterInRange(param.value, param.referenceRange);
    }).length;
  };

  // Helper function to extract identity verification from existing extracted_data
  const extractIdentityFromExistingData = (extractedData, docInfo) => {
    if (!extractedData || !extractedData.patient_info) {
      return null;
    }

    const patientInfo = extractedData.patient_info;

    const verification = {
      nameMatch: null,
      ageMatch: null,
      sexMatch: null,
      confidence: 0,
      issues: [],
      details: {
        patientName: patientInfo.Name || null,
        proposerName: docInfo.customer_name || null,
        patientAge: patientInfo.Age || null,
        proposerAge: null,
        patientSex: patientInfo.Sex || null,
        proposerSex: null
      }
    };

    // Simple name matching
    if (patientInfo.Name && docInfo.customer_name) {
      const patientName = String(patientInfo.Name).toLowerCase().trim();
      const proposerName = String(docInfo.customer_name).toLowerCase().trim();

      verification.nameMatch = patientName.includes(proposerName) ||
        proposerName.includes(patientName) ||
        patientName === proposerName;
      if (!verification.nameMatch) {
        verification.issues.push('Names do not match');
      }
    } else {
      verification.issues.push('Missing name data for comparison');
    }

    // Calculate confidence
    const checks = [verification.nameMatch].filter(check => check !== null);
    const passedChecks = checks.filter(Boolean);
    verification.confidence = checks.length > 0 ? Math.round((passedChecks.length / checks.length) * 100) : 0;

    return verification;
  };

  // REPLACE the existing handleProcessAllDocuments function with this enhanced version:
  const handleProcessAllDocuments = async () => {
    if (medicalDocuments.length === 0) {
      console.debug('[DocumentUpload][MedicalTable] No documents to process');
      return;
    }

    // Clear the processDocs query parameter from URL if present
    const searchParams = new URLSearchParams(location.search);
    if (searchParams.get('processDocs') === 'true') {
      searchParams.delete('processDocs');
      const newUrl = `${location.pathname}${searchParams.toString() ? '?' + searchParams.toString() : ''}`;
      window.history.replaceState({}, '', newUrl);
    }

    console.info('[DocumentUpload][MedicalTable] Enhanced batch processing started:', { documentCount: medicalDocuments.length });
    resetParametersToDefault();
    setIsBatchProcessing(true);
    setBatchProcessingProgress(0);
    setBatchProcessingStatus('Checking existing processed documents...');
    setBatchResults([]);
    setAllNameVerifications([]);

    const results = [];
    const nameVerifications = [];

    // Separate documents into already processed and need processing
    const documentsWithData = [];
    const documentsNeedingProcessing = [];

    medicalDocuments.forEach(doc => {
      if (doc.extracted_data && Object.keys(doc.extracted_data).length > 0) {
        documentsWithData.push(doc);
        console.debug('[DocumentUpload][MedicalTable] Document already has extracted data:', { documentId: doc.document_id });
      } else {
        documentsNeedingProcessing.push(doc);
        console.debug('[DocumentUpload][MedicalTable] Document needs processing:', { documentId: doc.document_id });
      }
    });

    const totalDocuments = medicalDocuments.length;
    const alreadyProcessedCount = documentsWithData.length;
    const needProcessingCount = documentsNeedingProcessing.length;

    setBatchProcessingStatus(`Found ${alreadyProcessedCount} already processed, ${needProcessingCount} need processing`);

    try {
      // Process already extracted documents first
      documentsWithData.forEach((doc, index) => {
        const extractedData = doc.extracted_data;

        // Process individual document health analysis using existing data
        let healthAnalysis = null;
        if (extractedData) {
          // Parse if it's a string, otherwise use directly
          const parsedData = typeof extractedData === 'string' ? JSON.parse(extractedData) : extractedData;
          healthAnalysis = mapRangeAnalysisToHealthMetrics(null, parsedData);

          // Create range analysis from existing data
          const rangeAnalysis = analyzeExistingExtractedData(parsedData);

          // Extract name verification from existing data
          const identityVerification = extractIdentityFromExistingData(parsedData, doc);
          if (identityVerification) {
            nameVerifications.push({
              documentId: doc.document_id,
              documentType: doc.document_type,
              memberId: doc.member_id,
              verification: identityVerification,
              proposer_name: doc.customer_name
            });
          }

          results.push({
            documentId: doc.document_id,
            documentType: doc.document_type,
            memberId: doc.member_id,
            success: true,
            range_analysis: rangeAnalysis,
            extracted_data: parsedData,
            healthAnalysis: healthAnalysis,
            identity_verification: extractIdentityFromExistingData(parsedData, doc),
            proposer_info: { customer_name: doc.customer_name },
            fromExistingData: true
          });

          // Store in processedDocuments state
          setProcessedDocuments(prev => ({
            ...prev,
            [doc.document_id]: {
              extractedData: { extracted_data: parsedData },
              processedAt: new Date().toISOString(),
              documentInfo: { id: doc.document_id, type: doc.document_type },
              memberId: doc.member_id,
              extractedText: parsedData,
              fromExistingData: true
            }
          }));

          setDocumentProcessingStatus(prev => ({
            ...prev,
            [doc.document_id]: 'success'
          }));
        }
      });

      // Now process documents that need processing
      for (let i = 0; i < documentsNeedingProcessing.length; i++) {
        const doc = documentsNeedingProcessing[i];
        const overallProgress = Math.round(((alreadyProcessedCount + i + 1) / totalDocuments) * 100);

        // Validate proposer_id
        if (!doc.proposer_id) {
          console.warn(`Skipping document ${doc.document_id}: Missing proposer_id`, { doc });
          results.push({
            documentId: doc.document_id,
            documentType: doc.document_type,
            memberId: doc.member_id,
            success: false,
            error: 'Missing proposer_id'
          });
          setDocumentProcessingStatus(prev => ({
            ...prev,
            [doc.document_id]: 'failed'
          }));
          continue;
        }

        setBatchProcessingProgress(overallProgress);
        setBatchProcessingStatus(`Processing document ${alreadyProcessedCount + i + 1} of ${totalDocuments}: ${doc.document_type}`);

        try {
          const response = await fetch(
            `http://localhost:5000/api/medical-document-processing/extract-document/${doc.document_id}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                member_id: doc.member_id,
                proposer_id: doc.proposer_id,
                proposal_number: doc.proposal_number
              })
            }
          );

          const result = await response.json();

          if (response.ok && result.success) {
            // Process individual document health analysis
            let healthAnalysis = null;
            if (result.range_analysis || result.extracted_data?.results) {
              healthAnalysis = mapRangeAnalysisToHealthMetrics(
                result.range_analysis,
                result.extracted_data
              );
            }

            results.push({
              documentId: doc.document_id,
              documentType: doc.document_type,
              memberId: doc.member_id,
              success: true,
              range_analysis: result.range_analysis,
              extracted_data: result.extracted_data,
              healthAnalysis: healthAnalysis,
              identity_verification: result.identity_verification,
              proposer_info: result.proposer_info
            });

            // Store name verification for existing data
            if (extractedData.patient_info) {
              const identityVerification = extractIdentityFromExistingData(parsedData, doc);
              if (identityVerification) {
                nameVerifications.push({
                  documentId: doc.document_id,
                  documentType: doc.document_type,
                  memberId: doc.member_id,
                  verification: identityVerification,
                  proposer_name: doc.customer_name
                });
              }
            }

            setDocumentProcessingStatus(prev => ({
              ...prev,
              [doc.document_id]: 'success'
            }));

            setProcessedDocuments(prev => ({
              ...prev,
              [doc.document_id]: {
                extractedData: result,
                processedAt: new Date().toISOString(),
                documentInfo: result.document_info,
                memberId: doc.member_id,
                extractedText: result.extracted_data,
                proposer_info: result.proposer_info
              }
            }));

          } else {
            console.error(`[DocumentUpload][MedicalTable] Document ${doc.document_id} failed:`, result.error);
            results.push({
              documentId: doc.document_id,
              documentType: doc.document_type,
              memberId: doc.member_id,
              success: false,
              error: result.error || `HTTP ${response.status}`
            });
            setDocumentProcessingStatus(prev => ({
              ...prev,
              [doc.document_id]: 'failed'
            }));
          }
        } catch (docError) {
          console.error(`[DocumentUpload][MedicalTable] Error processing document ${doc.document_id}:`, docError);
          results.push({
            documentId: doc.document_id,
            documentType: doc.document_type,
            memberId: doc.member_id,
            success: false,
            error: docError.message
          });
          setDocumentProcessingStatus(prev => ({
            ...prev,
            [doc.document_id]: 'failed'
          }));
        }

        // Small delay between processing documents
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // Combine all results
      const { combined, allHealthMetricsData } = combineProcessedResults(results);
      setBatchResults(results);
      setCombinedResults(combined);
      setAllNameVerifications(nameVerifications);
      setProcessedHealthAnalysis(allHealthMetricsData);
      setBatchProcessingStatus(`Completed: ${combined.successfulDocuments}/${totalDocuments} documents (${alreadyProcessedCount} from existing data, ${needProcessingCount - (totalDocuments - combined.successfulDocuments)} newly processed)`);

      console.info('[DocumentUpload][MedicalTable] Enhanced batch processing completed');
      console.debug('[DocumentUpload][MedicalTable] Combined results:', { hasData: !!combined });
      console.debug('[DocumentUpload][MedicalTable] Health metrics data:', { hasData: !!allHealthMetricsData });
      console.debug('[DocumentUpload][MedicalTable] Processing summary:', { existingData: alreadyProcessedCount, newlyProcessed: needProcessingCount });

      // Refresh medical documents list
      fetchMedicalDocuments();

    } catch (error) {
      console.error('[DocumentUpload][MedicalTable] Enhanced batch processing failed:', error.message);
      setBatchProcessingStatus('Batch processing failed: ' + error.message);
    } finally {
      setTimeout(() => {
        setIsBatchProcessing(false);
        setBatchProcessingProgress(0);
        setIsDocumentsProcessed(true);
        setShowLoadingScreen(false);
      }, 2000);
    }
  };
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
        {/*  REPLACE WITH JUST THE TICK ICON: */}
        <img
          src={tickIconUrl}
          alt="Success"
          style={{
            width: 200,
            height: 200,
            display: 'block',
            marginLeft: 'auto',
            marginRight: 'auto',
            marginBottom: 20 // Add some spacing below the icon
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

        {/* Rest of your component stays the same... */}
        <p style={{
          margin: '0 0 20px 0',
          color: '#6b7280',
          fontSize: '16px',
          lineHeight: '1.5'
        }}>
          {message && message.trim() ? message : 'Notes has been issued successfully!'}
        </p>

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





  // Get current member's health data for display
  const getCurrentMemberHealthData = () => {
    if (!proposerHealthData.length) return null;

    const currentProposer = proposerHealthData[0];
    if (!currentProposer?.insured_members?.length) return null;

    const memberWithHealthData = currentProposer.insured_members[selectedMemberIndex] ||
      currentProposer.insured_members.find(member =>
        member.height_cm && member.weight_kg
      ) ||
      currentProposer.insured_members[0];

    return memberWithHealthData;
  };

  // Function to cycle through members
  const handleCycleMember = () => {
    if (proposerHealthData.length > 0 && proposerHealthData?.insured_members?.length > 1) {
      const totalMembers = proposerHealthData.insured_members.length;
      setSelectedMemberIndex((prev) => (prev + 1) % totalMembers);
    }
  };

  // Function to get current proposer's health measurements
  const getCurrentProposerMeasurements = () => {
    if (loadingHealthData) {
      return [
        { name: 'Height', value: 'Loading...', bgColor: 'bg-blue-50' },
        { name: 'Weight', value: 'Loading...', bgColor: 'bg-white' },
        { name: 'BMI', value: 'Loading...', bgColor: 'bg-blue-50' }
      ];
    }

    if (!proposerHealthData || proposerHealthData.length === 0) {
      return [
        { name: 'Height', value: 'N/A', bgColor: 'bg-blue-50' },
        { name: 'Weight', value: 'N/A', bgColor: 'bg-white' },
        { name: 'BMI', value: 'N/A', bgColor: 'bg-blue-50' }
      ];
    }

    const memberData = getCurrentMemberHealthData();

    if (!memberData) {
      return [
        { name: 'Height', value: 'No Data', bgColor: 'bg-blue-50' },
        { name: 'Weight', value: 'No Data', bgColor: 'bg-white' },
        { name: 'BMI', value: 'No Data', bgColor: 'bg-blue-50' }
      ];
    }

    return [
      {
        name: 'Height',
        value: memberData?.height_cm ? `${memberData.height_cm} cm` : 'N/A',
        bgColor: 'bg-blue-50',
        memberName: memberData?.name
      },
      {
        name: 'Weight',
        value: memberData?.weight_kg ? `${memberData.weight_kg} kg` : 'N/A',
        bgColor: 'bg-white',
        memberName: memberData?.name
      },
      {
        name: 'BMI',
        value: memberData?.bmi ? `${memberData.bmi}` : 'N/A',
        bgColor: 'bg-blue-50',
        memberName: memberData?.name
      }
    ];
  };
//  ADD THIS: Force enable body scroll at all times
useEffect(() => {
  // Ensure body scroll is never locked
  document.body.style.overflow = '';
  document.body.style.position = '';
  document.body.style.top = '';
  
  return () => {
    // Cleanup on unmount
    document.body.style.overflow = '';
    document.body.style.position = '';
    document.body.style.top = '';
  };
}, []);

  // Fetch all documents - Updated to use medical documents by proposer ID
  useEffect(() => {
    fetchMedicalDocuments();
  }, [proposer_id]);

  // Fetch proposer health metrics
  useEffect(() => {
    fetchProposerHealthMetrics();
  }, [proposer_id]);

  //  UPDATED: Fetch initial status when component mounts
  useEffect(() => {
    fetchCurrentStatus();
  }, [proposer_id]);

  //  NEW: Listen for status updates
  useEffect(() => {
    const handleStatusUpdate = (event) => {
      const { proposer_id: updatedProposerId, status } = event.detail;

      // Only update if it's for the current proposer
      if (updatedProposerId === proposer_id) {
        console.debug('[DocumentUpload][MedicalTable] Status updated via event:', status);
        setCurrentStatus(status);
      }
    };

    // Listen for custom status update events
    window.addEventListener('statusUpdated', handleStatusUpdate);

    return () => {
      window.removeEventListener('statusUpdated', handleStatusUpdate);
    };
  }, [proposer_id]);;
  // Add this useEffect to control body scroll when parameters are expanded
  // useEffect(() => {
  //   if (expandedHealthMetricId !== null) {
  //     // Disable body scroll when parameters are expanded
  //     document.body.style.overflow = 'hidden';
  //   } else {
  //     // Re-enable body scroll when parameters are collapsed
  //     document.body.style.overflow = '';
  //   }

  //   // Cleanup on component unmount
  //   return () => {
  //     document.body.style.overflow = '';
  //   };
  // }, [expandedHealthMetricId]);


  // Effect to detect processDocs parameter and trigger auto-processing
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const shouldProcessDocs = searchParams.get('processDocs') === 'true';

    if (shouldProcessDocs && !autoProcessingTriggered && medicalDocuments.length > 0) {
      console.info('[DocumentUpload][MedicalTable] Auto-processing medical documents triggered from dashboard');
      setAutoProcessingTriggered(true);
      setShowLoadingScreen(true); // Show loading screen
      setIsDocumentsProcessed(false); // Mark as not processed yet

      // Small delay to ensure components are fully loaded
      setTimeout(() => {
        handleProcessAllDocuments();
      }, 1000);
    } else if (!shouldProcessDocs) {
      const hasExistingData = medicalDocuments.some(doc =>
        doc.extracted_data && Object.keys(doc.extracted_data).length > 0
      );

      if (hasExistingData) {
        setIsDocumentsProcessed(true);
      }
      setShowLoadingScreen(false);
    }
  }, [location.search, medicalDocuments.length, autoProcessingTriggered]);

  // Reset auto-processing trigger when proposer changes
  useEffect(() => {
    setAutoProcessingTriggered(false);
    setIsDocumentsProcessed(false);
    setShowLoadingScreen(false);
    setAllNameVerifications([]); // Clear previous verification data
    setProcessedDocuments({});   // Clear previous processed documents
    setProcessedHealthAnalysis(null); // Clear previous health analysis
  }, [proposer_id]);


  const handlePreviewClick = async (documentId) => {
    try {
      setPreviewError(null);
      const response = await fetch(`${NODE_API_URL}/api/documents/preview/${documentId}`);
      if (!response.ok) throw new Error(`Failed to fetch document ${documentId}: ${response.statusText}`);
      const data = await response.json();
      if (data?.pdfUrl) setPreviewUrl(data.pdfUrl);
      else throw new Error('PDF URL not found');
    } catch (error) {
      console.error('[DocumentUpload][MedicalTable] Error fetching PDF URL:', error);
      setPreviewError(error.message);
    }
  };

  const closePreview = () => {
    setPreviewUrl(null);
    setPreviewError(null);
  };

  const closeExtraction = () => {
    setExtractedText(null);
    setExtractionError(null);
  };

  const handleViewStoredJSON = (documentId) => {
    const storedData = processedDocuments[documentId];
    if (storedData) {
      setViewingStoredJSON(storedData);
    }
  };

  const closeStoredJSONView = () => {
    setViewingStoredJSON(null);
  };

  // Helper functions for medical document display
  const formatDocumentType = (docType) => {
    const docTypeStr = docType.split('/').pop().split('.').shift();
    return docTypeStr.charAt(0).toUpperCase() + docTypeStr.slice(1) || 'Medical Document';
  };

  const getDocumentTypeBadge = (docType) => {
    const type = docType?.toLowerCase() || '';
    if (type.includes('medical') || type.includes('health')) {
      return 'bg-green-100 text-green-700 border-green-200';
    } else if (type.includes('lab') || type.includes('test')) {
      return 'bg-blue-100 text-blue-700 border-blue-200';
    } else if (type.includes('report')) {
      return 'bg-purple-100 text-purple-700 border-purple-200';
    }
    return 'bg-gray-100 text-gray-700 border-gray-200';
  };

  const healthMeasurements = getCurrentProposerMeasurements();

  const reportMenuOptions = [
    { label: 'Download Report', action: 'download' },
    { label: 'Share Report', action: 'share' },
    { label: 'Print Report', action: 'print' },
    { label: 'Export as PDF', action: 'export' }
  ];

  const measurementMenuOptions = [
    { label: 'Edit Value', action: 'edit' },
    { label: 'View History', action: 'history' },
    { label: 'Add Note', action: 'note' },
    { label: 'Mark as Verified', action: 'verify' },
    { label: 'Switch Member', action: 'switch-member' },
    { label: 'Refresh Data', action: 'refresh-data' }
  ];

  const getRiskLevelColor = (level) => {
    switch (level) {
      case 'Low':
        return 'bg-blue-100 text-blue-700';
      case 'Medium':
        return 'bg-blue-100 text-blue-700';
      case 'High':
        return 'bg-blue-100 text-blue-700';
      default:
        return 'bg-blue-100 text-blue-700';
    }
  };

  const getRiskIcon = (level) => {
    switch (level) {
      case 'Low':
        return lowArrow;
      case 'Medium':
        return mediumArrow;
      case 'High':
        return highArrow;
      default:
        return lowArrow;
    }
  };

  const handleDropdownToggle = (type, index) => {
    const dropdownId = `${type}-${index}`;
    setOpenDropdown(openDropdown === dropdownId ? null : dropdownId);
  };

  const handleMenuOptionClick = (action, itemName) => {
    console.info('[DocumentUpload][MedicalTable] Menu option clicked:', { action, itemName });
    setOpenDropdown(null);

    if (action === 'switch-member') {
      handleCycleMember();
    } else if (action === 'refresh-data') {
      fetchProposerHealthMetrics();
    }
  };

  const handleBackdropClick = () => {
    setOpenDropdown(null);
    setExpandedHealthMetricId(null);
  };

  // Function to handle tab switching to Financial Review
  const handleFinancialReviewClick = () => {
    setActiveTab('Financial Review');
  };

  // Get filtered metrics to display
  const filteredHealthMetrics = getFilteredHealthMetrics();

  // Use medical documents from proposer instead of all documents
  const displayDocuments = medicalDocumentsLoading ? [] : medicalDocuments;

  // Return loading screen if processing is in progress
  if (showLoadingScreen && !isDocumentsProcessed) {
    return (
      <div
        className="w-full min-h-[calc(100vh-2rem)] flex flex-col items-center justify-center p-8 relative"
        style={{
          backgroundColor: 'rgba(255, 255, 255, 0.85)',
          backdropFilter: 'blur(10px)',
          borderRadius: '12px',
          border: '1px solid rgba(59, 130, 246, 0.3)'
        }}
      >
        <img
          src="../src/assets/underwriter-dashboard-icons/watermark.svg"
          alt="Watermark"
          className="fixed bottom-0 right-0 w-64 sm:w-80 md:w-96 opacity-30 pointer-events-none select-none z-0"
        />

        <div className="text-center max-w-md relative z-10">
          <div className="relative mb-8">
            <div className="relative w-20 h-20 mx-auto">
              {/* Spinning ring around the logo */}
              <div className="absolute top-0 left-0 w-full h-full border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>

              {/* Company logo centered inside the spinning ring */}
              <div className="absolute inset-0 flex items-center justify-center">
                <img src={companyLogo} alt="Company Logo" className="w-12 h-12" />
              </div>
            </div>
          </div>

          {/* Status Text */}
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Processing Medical Documents
          </h3>
          <p className="text-gray-600 mb-4">
            Please wait while we analyze all medical documents with AI...
          </p>

          {/* Progress Bar */}
          {isBatchProcessing && (
            <div className="w-full bg-blue-100 rounded-full h-3 mb-4">
              <div
                className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                style={{ width: `${batchProcessingProgress}%` }}
              />
            </div>
          )}

          {/* Progress Text */}
          {isBatchProcessing && (
            <div className="text-sm text-blue-700 mb-2">
              {batchProcessingProgress}% Complete
            </div>
          )}

          {/* Status Message */}
          <div className="text-sm text-gray-500">
            {batchProcessingStatus || 'Initializing processing...'}
          </div>

          {/* Processing Steps */}
          <div className="mt-6 text-xs text-gray-400 space-y-1">
            <div className="flex items-center justify-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isBatchProcessing ? 'bg-blue-600 animate-pulse' : 'bg-gray-300'}`}></div>
              <span>Extracting text from documents</span>
            </div>
            <div className="flex items-center justify-center gap-2">
              <div className={`w-2 h-2 rounded-full ${batchProcessingProgress > 50 ? 'bg-blue-600 animate-pulse' : 'bg-gray-300'}`}></div>
              <span>Analyzing health parameters</span>
            </div>
            <div className="flex items-center justify-center gap-2">
              <div className={`w-2 h-2 rounded-full ${batchProcessingProgress > 80 ? 'bg-blue-600 animate-pulse' : 'bg-gray-300'}`}></div>
              <span>Verifying identity information</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Return null or loading state if documents haven't been processed yet for normal navigation
  if (activeTab !== 'Health Review' || (!areAllDocumentsProcessed() && medicalDocuments.length > 0)) {
    return (
      <div className="w-full min-h-[calc(100vh-2rem)] flex flex-col items-center justify-center p-8">
        <div className="text-center max-w-md">
          <div className="relative w-20 h-20 mx-auto mb-4">
            {/* Spinning ring around the logo */}
            <div className="absolute top-0 left-0 w-full h-full border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>

            {/* Company logo centered inside the spinning ring */}
            <div className="absolute inset-0 flex items-center justify-center">
              <img src={companyLogo} alt="Company Logo" className="w-12 h-12" />
            </div>
          </div>
          {/* Status Text */}
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Processing Medical Documents
          </h3>
          <p className="text-gray-600 mb-4">
            Please wait while we analyze all medical documents with AI...
          </p>

          {/* Progress Bar */}
          {(isBatchProcessing || (Object.keys(documentProcessingStatus).length > 0 && !areAllDocumentsProcessed())) && (
            <div className="w-full bg-blue-100 rounded-full h-3 mb-4">
              <div
                className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                style={{
                  width: `${(() => {
                    const processedCount = Object.values(documentProcessingStatus).filter(
                      status => status === 'success' || status === 'failed'
                    ).length;
                    const totalCount = medicalDocuments.length || 1;
                    return Math.round((processedCount / totalCount) * 100);
                  })()}%`
                }}
              />
            </div>
          )}

          {/* Progress Text */}
          {(isBatchProcessing || (Object.keys(documentProcessingStatus).length > 0 && !areAllDocumentsProcessed())) && (
            <div className="text-sm text-blue-700 mb-2">
              {(() => {
                const processedCount = Object.values(documentProcessingStatus).filter(
                  status => status === 'success' || status === 'failed'
                ).length;
                const totalCount = medicalDocuments.length;
                const progress = totalCount > 0 ? Math.round((processedCount / totalCount) * 100) : 0;
                return `${progress}% Complete (${processedCount} of ${totalCount})`;
              })()}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className="w-full flex flex-col gap-3 relative"
      style={{
        maxHeight: '90vh', //  INCREASED: Changed from 85vh to 90vh for bigger tables
        overflowY: 'auto',
        backgroundColor: 'rgba(255, 255, 255, 0.85)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(59, 130, 246, 0.3)',
        borderRadius: '12px',
        padding: isDesktop ? '20px' : isTablet ? '15px' : '10px',
        zIndex: 10,
        overscrollBehavior: 'contain'
      }}
    >
      {/* WATERMARK: Fixed positioning - only one watermark */}
      {/* <img
        src="../src/assets/underwriter-dashboard-icons/watermark.svg"
        alt="Watermark"
        className="fixed bottom-0 right-0 w-64 sm:w-80 md:w-96 opacity-30 pointer-events-none select-none z-0"
      /> */}

      {/* Backdrop for dropdowns and expanded metrics */}
      {/* {(openDropdown || expandedHealthMetricId) && (
        <div
          className="fixed inset-0 z-40"
          onClick={(e) => {
            //  ONLY close dropdowns/expansion, don't prevent default scroll
            setOpenDropdown(null);
            setExpandedHealthMetricId(null);
          }}
          style={{
            pointerEvents: 'auto', //  Allow click events
            backgroundColor: 'transparent' //  Invisible backdrop
          }}
        />
      )} */}

      {/* Document Preview Modal */}
      {/* Document Preview Modal - UPDATED FOR BETTER SIZING */}
      {previewUrl && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 50,
          fontFamily: 'PP Neue Montreal, "PP Neue Montreal", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", sans-serif',
          padding: isMobileOrSmaller ? '40px 20px' : '60px 32px'  // More top/bottom padding
        }}>
          <div style={{
            width: isMobileOrSmaller ? '85vw' : '82vw',
            height: isMobileOrSmaller ? '75vh' : '70vh', // Reduced height significantly
            maxWidth: '1200px',
            maxHeight: '700px', // Reduced max height
            background: '#FFFFFF',
            borderRadius: 12,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
          }}>
            {/* Header - Always visible with proper spacing */}
            <div style={{
              padding: isDesktop ? '16px 20px' : isMobile ? '12px 16px' : '14px 18px', // Reduced header padding
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderBottom: '2px solid #E8E7E7',
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
                    fontSize: isDesktop ? 18 : isTablet ? 16 : 14,
                    color: '#0F012A'
                  }}>
                    Document Preview
                  </div>
                  <div style={{
                    fontSize: 11,
                    color: '#6F677F'
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
                  color: '#EF4444',
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
                    color: '#6F677F',
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
                      background: '#0252A9',
                      color: 'white',
                      border: 'none',
                      borderRadius: 6,
                      cursor: 'pointer',
                      fontWeight: 600,
                      fontSize: 14,
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.background = '#316BE3';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.background = '#0252A9';
                    }}
                  >
                    Close Preview
                  </button>
                </div>
              ) : (
                <iframe
                  title="preview"
                  src={previewUrl}
                  style={{
                    width: '100%',
                    height: '100%',
                    border: 'none',
                    display: 'block'
                  }}
                  loading="lazy"
                  onLoad={() => {
                    console.debug('[DocumentUpload][MedicalTable] Medical document preview loaded successfully');
                  }}
                  onError={() => {
                    console.error('[DocumentUpload][MedicalTable] Error loading medical document preview');
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

      {/* Stored JSON Modal */}
      {viewingStoredJSON && (
        <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex justify-center items-center p-4">
          <div className={`bg-white rounded-lg shadow-2xl overflow-hidden relative ${isDesktop ? 'max-w-6xl w-[95vw] max-h-[90vh]' : 'w-[95vw] max-h-[85vh]'
            }`}>
            <div className="flex justify-between items-center p-4 border-b border-gray-200 bg-white">
              <div className="flex-1">
                <h3 className={`font-semibold text-gray-900 ${isDesktop ? 'text-lg' : 'text-base'}`}>
                  Stored Extracted JSON & Analysis
                </h3>
                <p className={`text-gray-500 mt-1 ${isDesktop ? 'text-sm' : 'text-xs'}`}>
                  Processed: {new Date(viewingStoredJSON.processedAt).toLocaleString()}
                </p>
              </div>
              <div className="flex items-center gap-3 ml-4">
                <button
                  onClick={closeStoredJSONView}
                  className="p-2 text-gray-400 hover:text-gray-600 text-xl font-bold transition-colors"
                  aria-label="Close stored JSON view"
                >
                  ×
                </button>
              </div>
            </div>
            <div className={`p-4 overflow-y-auto ${isDesktop ? 'max-h-[calc(90vh-5rem)]' : 'max-h-[calc(85vh-4rem)]'}`}>
              <div>
                <h4 className={`font-semibold text-gray-900 mb-2 ${isDesktop ? 'text-base' : 'text-sm'}`}>
                  📄 Raw Extracted Data
                </h4>
                <pre className={`whitespace-pre-wrap text-gray-800 bg-gray-50 p-4 rounded-lg max-h-96 overflow-y-auto ${isDesktop ? 'text-sm' : 'text-xs'
                  }`}>
                  {JSON.stringify(viewingStoredJSON.extractedData.extracted_data, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Combined Results Modal */}
      {showCombinedResultsModal && combinedResults && (
        <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex justify-center items-center p-4">
          <div className={`bg-white rounded-lg shadow-2xl overflow-hidden relative ${isDesktop ? 'max-w-4xl w-[90vw] max-h-[90vh]' : 'w-[95vw] max-h-[85vh]'
            }`}>
            <div className="flex justify-between items-center p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
              <div className="flex-1">
                <h3 className={`font-semibold text-gray-900 ${isDesktop ? 'text-xl' : 'text-lg'}`}>
                  Combined Results from All Documents
                </h3>
                <p className={`text-gray-600 mt-1 ${isDesktop ? 'text-sm' : 'text-xs'}`}>
                  Analysis results from {combinedResults.processedDocuments} processed medical documents
                </p>
              </div>
              <button
                onClick={() => setShowCombinedResultsModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600 text-2xl font-bold transition-colors"
                aria-label="Close combined results"
              >
                ×
              </button>
            </div>
            <div className="flex justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => setShowCombinedResultsModal(false)}
                className={`text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors ${isDesktop ? 'px-4 py-2' : 'px-3 py-1 text-sm'
                  }`}
              >
                Close
              </button>
              <button
                onClick={() => {
                  console.debug('[DocumentUpload][MedicalTable] Export combined results:', { hasData: !!combinedResults });
                }}
                className={`bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors ${isDesktop ? 'px-4 py-2' : 'px-3 py-1 text-sm'
                  }`}
              >
                Export Results
              </button>
            </div>
          </div>
        </div>
      )}

      {(previewError || extractionError) && (
        <div className={`text-red-600 mt-2 p-3 bg-red-50 rounded-lg border border-red-200 ${isDesktop ? 'text-sm' : 'text-xs'
          }`}>
          <strong>Error:</strong> {previewError || extractionError}
        </div>
      )}

      {/* Header */}
      <div className={`flex justify-between items-center ${isDesktop ? 'px-2 py-1' : 'px-1 py-1'}`}>
        <div className="flex items-center gap-2">
          <div className="flex flex-col">
            <div className="flex items-center gap-1">
              <h2 className={`font-medium text-gray-900 ${isDesktop ? 'text-xl' : isTablet ? 'text-lg' : 'text-base'}`}>
                Health Review
              </h2>
              <img
                src={questionCircleIcon}
                alt="Info"
                className="w-3 h-3 opacity-50"
              />
            </div>
            <p className={`text-gray-500 mt-0.5 ${isDesktop ? 'text-xs' : 'text-xs'}`}>
              Proposer ID: #{proposer_id} - Health metrics, document analysis & identity verification
            </p>
          </div>
        </div>
      </div>

      {/* Main Content - Responsive Layout */}
      <div className={`${isDesktop ? 'flex gap-4 flex-1 overflow-hidden' : 'flex flex-col gap-3 flex-1'}`}>
        {/* Left Column with health metrics - Responsive */}
        <div className={`${isDesktop ? 'flex-1' : 'w-full'} flex flex-col gap-3 relative z-10`}>

          {/* Health Score Card - Responsive */}
          <div
            className={`relative w-full rounded-xl overflow-hidden flex justify-between items-start gap-3 flex-shrink-0 z-20 ${isDesktop ? 'h-20 p-2' : isTablet ? 'h-18 p-2' : 'h-16 p-2'
              }`}
            style={{
              background: 'linear-gradient(0deg, #7AA5FF 0%, #3371F2 0%, #0F1522 100%), #FFECCE'
            }}
          >
            <div
              className="absolute top-0 left-0 w-[303px] h-[206px] transform -rotate-12 origin-top-left"
              style={{
                background: 'linear-gradient(51deg, rgba(92, 118, 171, 0.20) 0%, rgba(165.50, 177, 200.50, 0.20) 60%, rgba(76, 99, 146, 0.20) 93%)'
              }}
            />
            <div
              className="absolute top-0 right-0 w-full h-full transform -rotate-3 origin-top-left"
              style={{
                background: 'linear-gradient(51deg, rgba(92, 118, 171, 0.20) 0%, rgba(165.50, 177, 200.50, 0.20) 60%, rgba(76, 99, 146, 0.20) 93%)'
              }}
            />
            <div className="absolute top-2 right-2 opacity-20 z-10">
              <img
                src={watermarkIcon}
                alt="Watermark"
                className={`select-none pointer-events-none ${isDesktop ? 'w-8 h-8' : 'w-6 h-6'}`}
              />
            </div>
            <div className="relative z-10 w-full h-full flex flex-col justify-between">
              <div className="flex items-center gap-3">
                <div className={`bg-gradient-to-br from-blue-600 to-blue-400/40 rounded-full flex items-center justify-center ${isDesktop ? 'w-8 h-8' : 'w-6 h-6'
                  }`}>
                  <img src={healthScoreIcon} alt="Health Score" className={isDesktop ? 'w-4 h-4' : 'w-3 h-3'} />
                </div>
                <div className="flex flex-col">
                  <span className={`text-white font-medium ${isDesktop ? 'text-xs' : 'text-xs'}`}>Health Score</span>
                  <div className="flex items-end gap-1">
                    {(() => {
                      const healthScore = calculateOverallHealthScore();
                      return (
                        <>
                          <span className={`text-[#8FB1F8] font-medium ${isDesktop ? 'text-2xl' : isTablet ? 'text-xl' : 'text-lg'}`}>
                            {healthScore.total > 0 ? healthScore.percentage : 'N/A'}
                          </span>
                          <span className={`text-white font-medium ${isDesktop ? 'text-2xl' : isTablet ? 'text-xl' : 'text-lg'}`}>/</span>
                          <span className={`text-[#8FB1F8] font-medium ${isDesktop ? 'text-2xl' : isTablet ? 'text-xl' : 'text-lg'}`}>100</span>
                        </>
                      );
                    })()}
                  </div>
                </div>
              </div>
              {isDesktop && (
                <div className="flex items-center justify-between w-full mt-2">
                  {/* Optional: Add additional info about parameters */}
                  {(() => {
                    const healthScore = calculateOverallHealthScore();
                    return healthScore.total > 0 && (
                      <div className="flex items-center gap-1">
                        <span className="text-white text-xs font-medium">
                          {healthScore.inRange}/{healthScore.total} parameters in range
                        </span>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          </div>

          {/* Health Metrics Cards Container -  INCREASED HEIGHT */}
          {/* Health Metrics Cards Container -  FIXED SCROLL FREEZE */}
          <div
            ref={scrollContainerRef}
            className="flex flex-col gap-1 flex-1 relative"
            style={{
              maxHeight: '45vh',
              overflowY: 'auto',
              overflowX: 'hidden',
              WebkitOverflowScrolling: 'touch',
              scrollBehavior: 'smooth',
              paddingBottom: '20px',
              overscrollBehavior: 'contain', //  KEY FIX: Prevent scroll propagation
            }}
          >
            {filteredHealthMetrics.length > 0 ? (
              filteredHealthMetrics.map((metric) => {
                const analysis = processedHealthAnalysis[metric.id];
                if (!analysis) return null;

                const totalSubParams = metric.total;
                const presentParams = analysis.presentParameters || [];
                const outOfRangeCount = presentParams.filter(param =>
                  param.status && param.status.toLowerCase() === 'out of range'
                ).length;
                const inRangeCount = presentParams.length - outOfRangeCount;

                const inRangePercentage = totalSubParams > 0 ? (inRangeCount / totalSubParams) * 100 : 0;
                let riskLevel;
                if (inRangePercentage > 90) {
                  riskLevel = 'Low';
                } else if (inRangePercentage >= 70 && inRangePercentage <= 90) {
                  riskLevel = 'Medium';
                } else {
                  riskLevel = 'High';
                }

                return (
                  <div
                    key={metric.id}
                    id={`metric-${metric.id}`} //  ADD ID for scroll targeting
                    className={`w-full transition-all duration-300 flex-shrink-0 relative ${expandedHealthMetricId === metric.id
                      ? `${isDesktop ? 'p-3' : 'p-2'} bg-blue-50 rounded-lg border border-blue-200`
                      : `${isDesktop ? 'p-2' : 'p-1'} bg-blue-50/50 rounded-lg border border-blue-100/30`
                      }`}
                  >
                    {/* Main Health Metric Row */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`${metric.iconBg} rounded-full flex items-center justify-center ${isDesktop ? 'w-8 h-8' : 'w-6 h-6'}`}>
                          <img src={metric.icon} alt={metric.title} className={isDesktop ? 'w-4 h-4' : 'w-3 h-3'} />
                        </div>
                        <div className="flex flex-col">
                          <span className={`text-gray-900 font-medium mb-0.5 ${isDesktop ? 'text-xs' : 'text-xs'}`}>
                            {metric.title}
                          </span>
                          <div className="flex items-end gap-1">
                            <span className={`text-gray-900 font-medium ${isDesktop ? 'text-lg' : isTablet ? 'text-base' : 'text-sm'}`}>
                              {getNormalParameterCount(metric.id)}
                            </span>
                            <span className={`text-blue-300 font-medium ${isDesktop ? 'text-lg' : isTablet ? 'text-base' : 'text-sm'}`}>
                              /{totalSubParams}
                            </span>
                            <span className={`text-gray-900 ${isDesktop ? 'text-xs' : 'text-xs'}`}>
                              {isMobile ? 'in range' : 'measurements are inside the range'}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {!isMobile && (
                          <div className={`px-2 py-0.5 ${getRiskLevelColor(riskLevel)} rounded flex items-center gap-1`}>
                            <img src={getRiskIcon(riskLevel)} alt={`${riskLevel} Risk`} className="w-2 h-2" />
                            <span className="text-xs font-medium">Risk: {riskLevel}</span>
                          </div>
                        )}
                        <button
                          onClick={(e) => {
                            //  FIXED: Remove all event blocking
                            const wasExpanded = expandedHealthMetricId === metric.id;

                            // Toggle the expansion state
                            setExpandedHealthMetricId(wasExpanded ? null : metric.id);

                            //  SMOOTH SCROLL: After state update, scroll to show content
                            if (!wasExpanded) {
                              setTimeout(() => {
                                const element = document.getElementById(`metric-${metric.id}`);
                                if (element && scrollContainerRef.current) {
                                  element.scrollIntoView({
                                    behavior: 'smooth',
                                    block: 'nearest',
                                    inline: 'nearest'
                                  });
                                }
                              }, 100);
                            }
                          }}
                          className="p-0.5 hover:bg-blue-100 rounded transition-colors"
                          aria-label={`Toggle ${metric.title} parameters`}
                          style={{ cursor: 'pointer' }} //  Ensure proper cursor
                        >
                          <img
                            src={chevronDownIcon}
                            alt="Expand"
                            className={`w-3 h-3 text-gray-600 transition-transform duration-200 ${expandedHealthMetricId === metric.id ? 'rotate-180' : ''
                              }`}
                          />
                        </button>
                      </div>
                    </div>

                    {/*  EXPANDED CONTENT - PROPER CONTAINER */}
                    {expandedHealthMetricId === metric.id && (
                      <div
                        className="mt-2 space-y-2"
                        style={{
                          maxHeight: '300px', //  LIMIT HEIGHT
                          overflowY: 'auto',   //  ALLOW SCROLL
                          overflowX: 'hidden',
                          paddingRight: '4px'  //  SPACE FOR SCROLLBAR
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <h6 className={`font-medium text-gray-800 ${isDesktop ? 'text-xs' : 'text-xs'}`}>
                            {metric.title} Parameters
                          </h6>
                          <div className="flex items-center gap-2">
                            <span className={`text-gray-500 bg-gray-100 px-1 py-0.5 rounded ${isDesktop ? 'text-xs' : 'text-xs'}`}>
                              {presentParams.length} of {totalSubParams} detected
                            </span>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <div
                            className="flex flex-wrap"
                            style={{
                              gap: isDesktop ? 8 : isTablet ? 7 : isMobile ? 6 : 5,
                              padding: isDesktop ? '4px 2px' : '3px 1px',
                              justifyContent: 'flex-start',
                              alignItems: 'flex-start',
                            }}
                          >
                            {presentParams.map((param, idx) => {
                              let displayValue = 'N/A';
                              if (param.value !== undefined && param.value !== null) {
                                const num = parseFloat(param.value);
                                displayValue = !isNaN(num) ? num.toFixed(2) : String(param.value);
                              }

                              let paramStyles = 'bg-[#D3E1FF] border-[#0252A9]/20 text-[#0252A9]';

                              if (param.status === "Normal" || param.status === "normal") {
                                paramStyles = 'bg-[#E2EAFB] text-[#0252A9]';
                              } else if (param.status === "Out of Range" || param.status === "out of range") {
                                paramStyles = 'bg-orange-100 text-orange-800';
                              }

                              return (
                                <div
                                  key={idx}
                                  className={`inline-flex flex-col items-center justify-center rounded-lg border ${paramStyles}`}
                                  style={{
                                    minWidth: isDesktop ? '65px' : '54px',
                                    height: isDesktop ? '32px' : '28px',
                                    margin: isDesktop ? '2px 2px' : '2px 1px',
                                    padding: isDesktop ? '4px 2px' : '3px 1px',
                                    flex: '0 1 auto'
                                  }}
                                >
                                  <span
                                    className="font-medium truncate w-full text-center"
                                    style={{
                                      fontSize: isDesktop ? '9px' : '8px',
                                      lineHeight: '10px'
                                    }}
                                  >
                                    {isMobile ? param.name.substring(0, 6) + '...' : param.name.substring(0, 8)}
                                  </span>
                                  <div className="flex items-center justify-center" style={{ marginTop: '1px' }}>
                                    <span
                                      className="font-medium"
                                      style={{
                                        fontSize: isDesktop ? '11px' : '10px',
                                        lineHeight: '12px'
                                      }}
                                    >
                                      {displayValue}
                                    </span>
                                    <span
                                      className="font-medium ml-0.5"
                                      style={{
                                        fontSize: isDesktop ? '10px' : '9px',
                                        lineHeight: '11px'
                                      }}
                                    >
                                      {param.unit || ''}
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        <div className={`mt-2 p-1 bg-blue-50 rounded ${isDesktop ? 'text-xs' : 'text-xs'}`}>
                          <span className="font-medium text-blue-900">Analysis Complete:</span>
                          <span className="text-blue-700 ml-1">
                            Found {presentParams.length} of {totalSubParams} parameters
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="text-center py-4">
                <div className={`text-gray-500 font-medium mb-1 ${isDesktop ? 'text-base' : isTablet ? 'text-sm' : 'text-xs'}`}>
                  {processedHealthAnalysis === null
                    ? 'Process documents to see health parameters'
                    : 'No health parameters detected'
                  }
                </div>
                <p className={`text-gray-400 ${isDesktop ? 'text-xs' : 'text-xs'}`}>
                  {processedHealthAnalysis === null
                    ? 'Click "Process All Documents" to analyze medical documents'
                    : 'No recognizable health test parameters found'
                  }
                </p>
              </div>
            )}
          </div>



        </div>

        {/* Right Column with documents and health matrix - Responsive with INCREASED HEIGHTS */}
        <div className={`${isDesktop ? 'w-72 flex-shrink-0' : 'w-full'} flex flex-col gap-2 relative z-10`}>

          {/* Medical Documents Reports Table -  INCREASED HEIGHT */}
          {/* Medical Documents - FIXED TO SHOW FULL NAMES */}
          <div className="bg-white/50 rounded-xl border border-gray-300/30 overflow-visible relative">
            <div
              className={`text-white font-medium rounded-t-xl border-b border-gray-900/10 flex items-center justify-between ${isDesktop ? 'px-2 py-1 text-xs' : 'px-1 py-1 text-xs'}`}
              style={{
                background: 'linear-gradient(219deg, #7AA5FF 0%, #3371F2 0%, #0F1522 100%), #D6E3FC'
              }}
            >
              <div className="px-1">Medical Documents</div>
            </div>

            {/*  REDUCED HEIGHT: Changed from 250px to 180px to make room */}
            <div className={`border border-white/10 rounded-b-xl overflow-y-auto ${isDesktop ? 'max-h-[180px]' : 'max-h-[150px]'}`}>
              {displayDocuments.length > 0 ? (
                displayDocuments.map((doc, index) => (
                  <div
                    key={doc.document_id}
                    className={`flex items-start justify-between px-1 py-2 border-b border-gray-200 ${index % 2 ? 'bg-blue-50' : 'bg-white'} relative`}
                  >
                    <div className="flex-1 px-1">
                      {/*  FIRST LINE: Document name and status badges in single line */}
                      <div className="flex items-center mb-1">
                        <span
                          className={`text-gray-800 font-medium ${isDesktop ? 'text-xs' : 'text-xs'} truncate flex-1`}
                          style={{
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            lineHeight: '1.3'
                          }}
                        >
                          {formatDocumentType(doc.document_type)}
                          {/* {formatDocumentType(doc.source_url)} */}
                        </span>
                        {documentProcessingStatus[doc.document_id] === 'success' && (
                          <span className="text-xs bg-green-100 text-green-700 px-1 py-0.5 rounded ml-1 flex-shrink-0">
                            ✓
                          </span>
                        )}
                        {documentProcessingStatus[doc.document_id] === 'failed' && (
                          <span className="text-xs bg-red-100 text-red-700 px-1 py-0.5 rounded ml-1 flex-shrink-0">
                            ✗
                          </span>
                        )}
                      </div>

                      {/*  SECOND LINE: DB badge only */}
                      <div className="flex items-start">
                        <span
                          className={`text-xs px-1 py-0.5 rounded border font-medium ${getDocumentTypeBadge(doc.document_type)}`}
                          style={{
                            lineHeight: '1.2'
                          }}
                        >
                          DB
                        </span>
                        <span
                          className={`text-xs px-1 py-0.5 rounded border font-medium ${getDocumentTypeBadge(doc.document_type)}`}
                          style={{
                            lineHeight: '1.2'
                          }}
                        >
                          {doc.document_type}
                        </span>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="px-1 py-1 flex flex-col items-center gap-1">
                      <button
                        className={`border border-blue-400 text-blue-400 rounded-md flex items-center justify-center hover:bg-blue-50 transition-colors ${isDesktop ? 'w-5 h-5' : 'w-4 h-4'}`}
                        onClick={() => handlePreviewClick(doc.document_id)}
                        aria-label={`View ${doc.document_type} document`}
                      >
                        <img src={viewIcon} alt="View" className="w-2 h-2" />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className={`px-2 py-3 text-gray-400 text-center ${isDesktop ? 'text-xs' : 'text-xs'}`}>
                  {proposer_id ? `No medical documents found for proposer ID #${proposer_id}` : 'No medical documents found.'}
                </div>
              )}
            </div>

          </div>


          {/* Health Matrix Measurements Table -  INCREASED HEIGHT */}
          {/* Health Matrix - FIXED TO SHOW FULL NAMES */}
          <div className="bg-white/50 rounded-xl border border-gray-300/30 overflow-visible relative">
            <div
              className={`text-white font-medium rounded-t-xl border-b border-gray-900/10 flex items-center justify-between ${isDesktop ? 'px-2 py-1 text-xs' : 'px-1 py-1 text-xs'}`}
              style={{
                background: 'linear-gradient(219deg, #7AA5FF 0%, #3371F2 0%, #0F1522 100%), #D6E3FC'
              }}
            >
              <div className="px-1">Health Matrix</div>
              {proposerHealthData.length > 0 && proposerHealthData[0]?.insured_members?.length > 1 && (
                <div className="flex items-center gap-1">
                  <span className="text-xs text-white/80">
                    Member {selectedMemberIndex + 1}/{proposerHealthData[0].insured_members.length}
                  </span>
                  <button
                    onClick={handleCycleMember}
                    className="text-white/80 hover:text-white text-xs bg-white/20 px-1 py-0.5 rounded transition-colors"
                    title="Switch to next member"
                  >
                    ⟲
                  </button>
                </div>
              )}
            </div>

            <div className="border border-white/10 rounded-b-xl">
              {healthMeasurements.map((measurement, index) => (
                <div
                  key={measurement.name}
                  className={`flex items-center justify-between px-1 py-2 border-b border-gray-200 last:border-b-0 ${measurement.bgColor} relative`}
                >
                  <div className="flex-1 px-1">
                    {/*  FULL MEASUREMENT NAME WITH WRAPPING */}
                    <span
                      className={`text-gray-800 font-medium ${isDesktop ? 'text-xs' : 'text-xs'}`}
                      style={{
                        wordWrap: 'break-word',
                        whiteSpace: 'normal',
                        lineHeight: '1.3',
                        display: 'block'
                      }}
                    >
                      {measurement.name} {/*  FULL NAME, NO TRUNCATION */}
                    </span>
                  </div>

                  <div className="px-1">
                    <div
                      className={`px-2 py-1 border rounded-md font-medium text-center ${isDesktop ? 'text-xs min-w-[50px]' : 'text-xs min-w-[45px]'} ${measurement.value === 'N/A' || measurement.value.includes('Loading') || measurement.value.includes('No')
                        ? 'border-gray-400 text-gray-600 bg-gray-50'
                        : 'border-blue-400 text-blue-400 bg-blue-50'
                        }`}
                      style={{
                        wordWrap: 'break-word',
                        whiteSpace: 'normal'
                      }}
                    >
                      {measurement.value} {/*  FULL VALUE */}
                    </div>
                  </div>

                  {/* Dropdown */}
                  <div className="px-1 flex items-center relative">
                    <button
                      onClick={() => handleDropdownToggle('measurement', index)}
                      className="w-2 h-2 text-gray-600 hover:text-gray-800 transition-colors"
                    >
                      <img src={EllipsisOutlined} alt="More" className="w-2 h-2" />
                    </button>
                  </div>
                </div>
              ))}




              {/* Loading indicator */}
              {loadingHealthData && (
                <div className={`px-3 py-2 text-center text-gray-500 border-t border-gray-200 ${isDesktop ? 'text-xs' : 'text-xs'
                  }`}>
                  <div className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-1" />
                  Updating health metrics...
                </div>
              )}

              {/* Show member info when multiple members available */}
              {!loadingHealthData && proposerHealthData.length > 0 && proposerHealthData[0]?.insured_members?.length > 1 && (
                <div className={`px-3 py-1 text-gray-500 bg-blue-25 border-t border-gray-200 text-center ${isDesktop ? 'text-xs' : 'text-xs'
                  }`}>
                  Showing member {selectedMemberIndex + 1} of {proposerHealthData[0].insured_members.length} |
                  <span className="ml-1 font-medium">
                    {getCurrentMemberHealthData()?.name || 'Unknown'}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Name Verification Results - FIXED TO SHOW FULL NAMES */}
          <div className="bg-white/50 rounded-xl border border-gray-300/30 overflow-visible relative">
            <div
              className={`text-white font-medium rounded-t-xl border-b border-gray-900/10 ${isDesktop ? 'px-2 py-1 text-xs' : 'px-1 py-1 text-xs'}`}
              style={{
                background: 'linear-gradient(219deg, #7AA5FF 0%, #3371F2 0%, #0F1522 100%), #D6E3FC'
              }}
            >
              <div className="px-1">Name Verification Results</div>
            </div>

            {/*  REDUCED HEIGHT: Changed from 150px to 120px */}
            <div className={`border border-white/10 rounded-b-xl overflow-y-auto ${isDesktop ? 'max-h-[120px]' : 'max-h-[100px]'}`}>
              {allNameVerifications.length > 0 ? (
                allNameVerifications.map((nameVerif, index) => (
                  <div key={nameVerif.documentId} className={`p-2 border-b border-gray-200 last:border-b-0 ${index % 2 ? 'bg-blue-50' : 'bg-white'}`}>
                    <div className="flex items-start justify-between mb-2">
                      {/*  FULL DOCUMENT TYPE NAME WITH WRAPPING */}
                      <span
                        className={`font-medium text-gray-800 ${isDesktop ? 'text-xs' : 'text-xs'} flex-1 mr-2`}
                        style={{
                          wordWrap: 'break-word',
                          whiteSpace: 'normal',
                          lineHeight: '1.3'
                        }}
                      >
                        {formatDocumentType(nameVerif.documentType)} {/*  FULL NAME, NO TRUNCATION */}
                      </span>

                      <div className={`px-1 py-0.5 rounded text-xs font-medium flex items-center gap-1 flex-shrink-0 ${nameVerif.verification.nameMatch === true
                        ? 'bg-green-100 text-green-800'
                        : nameVerif.verification.nameMatch === false
                          ? 'bg-red-100 text-red-800'
                          : 'bg-gray-100 text-gray-800'
                        }`}>
                        <span>
                          {nameVerif.verification.nameMatch === true ? '✓' :
                            nameVerif.verification.nameMatch === false ? '✗' : '?'}
                        </span>
                        <span>{nameVerif.verification.confidence}%</span>
                      </div>
                    </div>

                    {/*  FULL DETAILS WITH WRAPPING */}
                    {nameVerif.verification.details && (
                      <div className="space-y-1">
                        {nameVerif.verification.details.patientName && (
                          <div className="text-xs text-gray-600">
                            <span className="font-medium">Doc: </span>
                            <span style={{ wordWrap: 'break-word', whiteSpace: 'normal' }}>
                              {nameVerif.verification.details.patientName} {/*  FULL NAME */}
                            </span>
                          </div>
                        )}
                        {nameVerif.verification.details.proposerName && (
                          <div className="text-xs text-gray-600">
                            <span className="font-medium">Prop: </span>
                            <span style={{ wordWrap: 'break-word', whiteSpace: 'normal' }}>
                              {nameVerif.verification.details.proposerName} {/*  FULL NAME */}
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Issues - also with full text */}
                    {nameVerif.verification.issues && nameVerif.verification.issues.length > 0 && (
                      <div className="mt-1">
                        <div
                          className="text-xs text-red-600 bg-red-50 px-1 py-0.5 rounded"
                          style={{ wordWrap: 'break-word', whiteSpace: 'normal' }}
                        >
                          {nameVerif.verification.issues[0]} {/*  FULL ISSUE TEXT */}
                        </div>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="p-2 text-center">
                  <div className={`text-gray-400 mb-1 ${isDesktop ? 'text-xs' : 'text-xs'}`}>
                    No Verification Data
                  </div>
                  <div className={`text-gray-500 ${isDesktop ? 'text-xs' : 'text-xs'}`}>
                    Process documents to verify identities
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>
      </div >

      {/*  Bottom Status Action Buttons - Responsive */}
      < div className={`flex gap-1 mt-1 pt-1 border-t border-gray-200 ${isDesktop || isTablet ? 'justify-end' : 'justify-center'}`}>
        {/* Status Message or Action Buttons */}
        {
          (currentStatus === 'Approved' || currentStatus === 'Rejected') ? (
            <div
              className={`flex items-center gap-2 ${isDesktop ? 'text-sm' : isTablet ? 'text-sm' : 'text-xs'} text-gray-800 rounded-lg px-4 py-2 max-w-[70%] border border-gray-200 shadow-sm ${currentStatus === 'Approved' ? 'bg-gradient-to-r from-green-50 to-green-100' : 'bg-gradient-to-r from-red-50 to-red-100'
                }`}
              style={{
                fontFamily: 'PP Neue Montreal, sans-serif',
                lineHeight: '1.5',
                overflowWrap: 'break-word'
              }}
            >
              <span className="font-semibold text-gray-900">
                {currentStatus === 'Approved' ? 'Approval Reason: ' : 'Rejection Reason: '}
              </span>

              {/*  FIXED: Show the actual message, with fallback only if truly empty */}
              <span className="text-gray-700">
                {modalMessage?.trim() ? modalMessage : 'No message provided'}
              </span>
            </div>
          ) : (
            <div
              style={{
                display: 'flex',
                gap: isDesktop ? 12 : isTablet ? 10 : isMobile ? 8 : 6,
                justifyContent: 'flex-end',
                alignItems: 'center'
              }}
            >
              <button
                onClick={() => {
                  setModalOpen(true);
                  setModalType('approve');
                  setModalStatus('confirm');
                  setModalError('');
                  setModalMessage('');
                }}
                disabled={statusUpdateLoading || currentStatus === 'Approved'}
                style={{
                  minWidth: 100,
                  height: isMobile ? 34 : isTablet ? 36 : isDesktop ? 38 : 40,
                  padding: '8px 18px',
                  background: currentStatus === 'Approved' ? '#E2EAFB' : '#0252A9',
                  color: currentStatus === 'Approved' ? '#0252A9' : 'white',
                  borderRadius: 12,
                  border: 'none',
                  fontFamily: 'PP Neue Montreal, "PP Neue Montreal", sans-serif',
                  fontWeight: 500,
                  fontSize: isMobile ? 12 : isTablet ? 13 : isDesktop ? 14 : 15,
                  boxShadow: '0 4px 12px rgba(5, 82, 169, 0.18)',
                  cursor: (statusUpdateLoading || currentStatus === 'Approved') ? 'not-allowed' : 'pointer',
                  opacity: (statusUpdateLoading || currentStatus === 'Approved') ? 0.7 : 1,
                  transition: 'all 0.2s'
                }}
              >
                {statusUpdateLoading && currentStatus !== 'Approved'
                  ? 'Processing...'
                  : 'Approve'}
              </button>
              <button
                onClick={() => {
                  setModalOpen(true);
                  setModalType('reject');
                  setModalStatus('confirm');
                  setModalError('');
                  setModalMessage('');
                }}
                disabled={statusUpdateLoading || currentStatus === 'Rejected'}
                style={{
                  minWidth: 100,
                  height: isMobile ? 34 : isTablet ? 36 : isDesktop ? 38 : 40,
                  padding: '8px 18px',
                  background: currentStatus === 'Rejected' ? '#E2EAFB' : '#0252A9',
                  color: currentStatus === 'Rejected' ? '#0252A9' : 'white',
                  borderRadius: 12,
                  border: 'none',
                  fontFamily: 'PP Neue Montreal, "PP Neue Montreal", sans-serif',
                  fontWeight: 500,
                  fontSize: isMobile ? 12 : isTablet ? 13 : isDesktop ? 14 : 15,
                  boxShadow: '0 4px 12px rgba(5, 82, 169, 0.18)',
                  cursor: (statusUpdateLoading || currentStatus === 'Rejected') ? 'not-allowed' : 'pointer',
                  opacity: (statusUpdateLoading || currentStatus === 'Rejected') ? 0.7 : 1,
                  transition: 'all 0.2s'
                }}
              >
                {statusUpdateLoading && currentStatus !== 'Rejected'
                  ? 'Processing...'
                  : 'Reject'}
              </button>
              <button
                onClick={() => {
                  setModalOpen(true);
                  setModalType('investigate');
                  setModalStatus('confirm');
                  setModalError('');
                  setModalMessage('');
                }}
                disabled={statusUpdateLoading || currentStatus === 'Needs Investigation'}
                style={{
                  minWidth: 140,
                  height: 'auto', //  CHANGED: Allow height to adjust with text
                  minHeight: isMobile ? 34 : isTablet ? 36 : isDesktop ? 38 : 40, //  ADDED: Minimum height
                  padding: '8px 12px', //  CHANGED: Reduced horizontal padding like finance table
                  background: currentStatus === 'Needs Investigation' ? '#E2EAFB' : '#0252A9',
                  color: currentStatus === 'Needs Investigation' ? '#0252A9' : 'white',
                  borderRadius: 12,
                  border: 'none',
                  fontFamily: 'PP Neue Montreal, "PP Neue Montreal", sans-serif',
                  fontWeight: 500,
                  fontSize: isMobile ? 12 : isTablet ? 13 : isDesktop ? 14 : 15,
                  boxShadow: '0 4px 12px rgba(5, 82, 169, 0.18)',
                  cursor: (statusUpdateLoading || currentStatus === 'Needs Investigation') ? 'not-allowed' : 'pointer',
                  opacity: (statusUpdateLoading || currentStatus === 'Needs Investigation') ? 0.7 : 1,
                  transition: 'all 0.2s',
                  whiteSpace: 'normal', //  ADDED: Allow text wrapping
                  wordBreak: 'break-word', //  ADDED: Break words if needed
                  textAlign: 'center', //  ADDED: Center the text
                  lineHeight: '1.2', //  ADDED: Better line spacing
                  display: 'inline-block' //  ADDED: Better layout for wrapping
                }}
              >
                {statusUpdateLoading && currentStatus !== 'Needs Investigation'
                  ? 'Processing...'
                  : 'Needs Investigation'}
              </button>
              <button
                onClick={() => {
                  setModalOpen(true);
                  setModalType('escalate');
                  setModalStatus('confirm');
                  setModalError('');
                  setModalMessage('');
                }}
                disabled={statusUpdateLoading || currentStatus === 'Needs Investigation'}
                style={{
                  minWidth: 140,
                  height: 'auto', //  CHANGED: Allow height to adjust with text
                  minHeight: isMobile ? 34 : isTablet ? 36 : isDesktop ? 38 : 40, //  ADDED: Minimum height
                  padding: '8px 12px', //  CHANGED: Reduced horizontal padding like finance table
                  background: currentStatus === 'Needs Investigation' ? '#E2EAFB' : '#0252A9',
                  color: currentStatus === 'Needs Investigation' ? '#0252A9' : 'white',
                  borderRadius: 12,
                  border: 'none',
                  fontFamily: 'PP Neue Montreal, "PP Neue Montreal", sans-serif',
                  fontWeight: 500,
                  fontSize: isMobile ? 12 : isTablet ? 13 : isDesktop ? 14 : 15,
                  boxShadow: '0 4px 12px rgba(5, 82, 169, 0.18)',
                  cursor: (statusUpdateLoading || currentStatus === 'Needs Investigation') ? 'not-allowed' : 'pointer',
                  opacity: (statusUpdateLoading || currentStatus === 'Needs Investigation') ? 0.7 : 1,
                  transition: 'all 0.2s',
                  whiteSpace: 'normal', //  ADDED: Allow text wrapping
                  wordBreak: 'break-word', //  ADDED: Break words if needed
                  textAlign: 'center', //  ADDED: Center the text
                  lineHeight: '1.2', //  ADDED: Better line spacing
                  display: 'inline-block' //  ADDED: Better layout for wrapping
                }}
              >
                Escalate to Head
              </button>

            </div>
          )
        }
      </div >

      {/*  UPDATED MODAL with Required Message Input */}
      {
        modalOpen && (
          <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            fontFamily: 'PP Neue Montreal, "PP Neue Montreal", sans-serif'
          }}>
            <div style={{
              minWidth: 320, maxWidth: 420, //  Slightly wider for input field
              background: 'white',
              borderRadius: 16,
              padding: 32,
              boxShadow: '0 6px 32px rgba(50,50,93,0.12)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center'
            }}>
              {/* Confirm */}
              {modalStatus === 'confirm' && (
                <>
                  <img src={companyLogo} style={{ width: 60, height: 60, marginBottom: 20 }} alt="Logo" />
                  <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 8 }}>
                    {modalType === 'approve' && 'Confirm Approve?'}
                    {modalType === 'reject' && 'Confirm Reject?'}
                    {modalType === 'investigate' && 'Confirm Mark for Investigation?'}
                  </div>
                  <div style={{ color: '#666', fontSize: 15, marginBottom: 16 }}>
                    {modalType === 'approve' && 'Please provide a reason for approving this proposal:'}
                    {modalType === 'reject' && 'Please provide a reason for rejecting this proposal:'}
                    {modalType === 'investigate' && 'Please provide notes for further investigation:'}
                  </div>

                  {/*  NEW: Required Message Input */}
                  <textarea
                    value={modalMessage}
                    onChange={(e) => setModalMessage(e.target.value)}
                    placeholder={
                      modalType === 'approve' ? 'Enter approval reason...' :
                        modalType === 'reject' ? 'Enter rejection reason...' :
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
                      fontFamily: 'PP Neue Montreal, "PP Neue Montreal", sans-serif',
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

                        setModalStatus('loading');

                        try {
                          let newStatus = '';
                          if (modalType === 'approve') {
                            await updateUnderwritingStatus('Approved', modalMessage.trim());
                            newStatus = 'Approved';
                          } else if (modalType === 'reject') {
                            await updateUnderwritingStatus('Rejected', modalMessage.trim());
                            newStatus = 'Rejected';
                          } else if (modalType === 'investigate') {
                            await updateUnderwritingStatus('Needs Investigation', modalMessage.trim());
                            newStatus = 'Needs Investigation';
                          }

                          //  FIXED: Update both status and message immediately
                          setCurrentStatus(newStatus);
                          setModalMessage(modalMessage.trim()); //  Keep the message for display

                          // Show success popup
                          setSuccessMessage(modalMessage.trim());
                          setShowSuccessPopup(true);
                          setModalOpen(false);

                          // Auto-dismiss success popup after 3 seconds
                          setTimeout(() => {
                            setShowSuccessPopup(false);
                            //  DON'T clear modalMessage here - keep it for status display
                          }, 3000);

                        } catch (err) {
                          setModalError(typeof err === 'string' ? err : (err.message || 'Unknown error'));
                          setModalStatus('error');
                        }
                      }}
                    >
                      Yes, Confirm
                    </button>

                    {/*  FIXED: Cancel button instead of duplicate "Yes, Confirm" */}
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
                        setModalOpen(false);
                        setModalMessage(''); //  Clear message on cancel
                      }}
                    >
                      Cancel
                    </button>

                  </div>
                </>
              )}
              <style>{`
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`}</style>

              {/* Loading */}
              {modalStatus === 'loading' && (
                <>
                  {/*  UPDATED: Blue rotating circle with logo in center */}
                  <div style={{
                    position: 'relative',
                    width: 60,
                    height: 60,
                    marginBottom: 20,
                  }}>
                    {/* Spinning blue border */}
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

                    {/* Company logo in center */}
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

              {/* Success */}



              {/* Error */}
              {modalStatus === 'error' && (
                <>
                  <div style={{
                    width: 60, height: 60, background: '#fee2e2', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20
                  }}>
                    <svg width="32" height="32" viewBox="0 0 32 32">
                      <circle cx="16" cy="16" r="15" fill="#fff" stroke="#e53e3e" strokeWidth="2" />
                      <line x1="10" y1="10" x2="22" y2="22" stroke="#e53e3e" strokeWidth="2" />
                      <line x1="22" y1="10" x2="10" y2="22" stroke="#e53e3e" strokeWidth="2" />
                    </svg>
                  </div>
                  <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 4, color: '#e53e3e' }}>Error</div>
                  <div style={{ color: '#e53e3e', fontSize: 15, whiteSpace: 'break-spaces' }}>{modalError}</div>
                  <button
                    style={{ marginTop: 12, padding: '7px 20px', borderRadius: 6, border: 'none', background: '#0252A9', color: '#fff', fontWeight: 600, fontSize: 14 }}
                    onClick={() => setModalStatus('confirm')}
                  >
                    Try again
                  </button>
                </>
              )}
            </div>
          </div>

        )
      }
      {showSuccessPopup && (
        <SuccessPopup
          message={successMessage}
          onDismiss={() => {
            setShowSuccessPopup(false);
            setModalMessage('');
          }}
        />
      )}


    </div >
  );
};

export default DocumentUploadScreenMedicalTable;