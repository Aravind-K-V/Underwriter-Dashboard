import express from 'express';
import pool from '../config/db.js';
import { prettyLog } from '../config/logger.js';

const router = express.Router();

// Function to clean range strings by removing units
const cleanRangeString = (rangeStr) => {
  const unitsToRemove = [
    'mg/dl', 'mg/dL', 'mg/100ml', 'mg/100mL', 'mg%',
    'g/dl', 'g/dL', 'g/100ml', 'g/100mL', 'g%',
    'mmol/L', 'mmol/l', 'mEq/L', 'mEq/l',
    'IU/L', 'IU/l', 'U/L', 'U/l',
    'pg/ml', 'pg/mL', 'ng/ml', 'ng/mL', 'ug/ml', 'ug/mL',
    'cells/ul', 'cells/μL', 'cells/mcL',
    '%', 'percent', 'fl', 'fL', 'pg',
    'mm/hr', 'mm/hour', 'sec', 'seconds',
    'years', 'year', 'yrs', 'yr',
    'cm', 'kg', 'bpm', 'mmHg'
  ];

  let cleaned = rangeStr.trim();
  unitsToRemove.forEach(unit => {
    const regex = new RegExp(`\\s*${unit.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*`, 'gi');
    cleaned = cleaned.replace(regex, ' ');
  });
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  return cleaned;
};

// Direct range checking function
const checkIfValueInNormalRange = (value, referenceRange, testName = '') => {
  try {
    // Convert value to number, handling strings like "03", "00"
    let cleanValue = String(value).trim().replace(/[^\d.-]/g, '');
    if (cleanValue.startsWith('0') && cleanValue.length > 1 && !cleanValue.startsWith('0.')) {
      cleanValue = cleanValue.replace(/^0+/, '') || '0';
    }
    const numValue = parseFloat(cleanValue);

    if (isNaN(numValue) || !isFinite(numValue)) {
      prettyLog('Invalid numeric value detected', { testName, value, cleanValue, numValue }, { level: 'warn' });
      return false;
    }

    prettyLog('Processing test value', { testName, value: numValue, referenceRange }, { level: 'debug' });

    let rangeString = '';
    if (typeof referenceRange === 'object' && referenceRange !== null) {
      if (referenceRange['Non Reactive']) {
        const testNameUpper = (testName || '').toUpperCase();
        if (testNameUpper.includes('HIV') || testNameUpper.includes('HBSAG')) {
          rangeString = referenceRange['Non Reactive'];
        } else {
          prettyLog('Non-infectious test with infectious range format', { testName }, { level: 'warn' });
          return false;
        }
      } else if (referenceRange['Reference Range']) {
        rangeString = referenceRange['Reference Range'];
      } else if (referenceRange.Normal) {
        rangeString = referenceRange.Normal;
      } else {
        prettyLog('Unknown object range format', { testName, referenceRange }, { level: 'warn' });
        return false;
      }
    } else {
      rangeString = String(referenceRange);
    }

    rangeString = rangeString.replace(/[\u200B-\u200D\uFEFF]/g, '');
    const originalRangeString = rangeString;
    rangeString = cleanRangeString(rangeString);

    prettyLog('Range string cleanup completed', { testName, original: originalRangeString, cleaned: rangeString }, { level: 'debug' });

    const testNameUpper = (testName || '').toUpperCase();
    if (testNameUpper.includes('CHOLESTEROL') && !testNameUpper.includes('HDL')) {
      if (originalRangeString.includes('<200') || originalRangeString.includes('< 200')) {
        const result = numValue < 200;
        prettyLog('CHOLESTEROL override applied', { value: numValue, threshold: 200, result }, { level: 'debug' });
        return result;
      }
    } else if (testNameUpper.includes('TRIGLYCERIDE')) {
      if (originalRangeString.includes('<150') || originalRangeString.includes('< 150')) {
        const result = numValue < 150;
        prettyLog('TRIGLYCERIDE override applied', { value: numValue, threshold: 150, result }, { level: 'debug' });
        return result;
      }
    }

    let match = rangeString.match(/^(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)$/);
    if (match) return numValue >= parseFloat(match[1]) && numValue <= parseFloat(match[2]);

    match = rangeString.match(/^(\d+(?:\.\d+)?)\s+\-\s+(\d+(?:\.\d+)?)$/);
    if (match) return numValue >= parseFloat(match[1]) && numValue <= parseFloat(match[2]);

    match = rangeString.match(/^(\d+(?:\.\d+)?)\s+to\s+(\d+(?:\.\d+)?)$/i);
    if (match) return numValue >= parseFloat(match[1]) && numValue <= parseFloat(match[2]);

    match = rangeString.match(/^<\s*(\d+(?:\.\d+)?)$/);
    if (match) return numValue < parseFloat(match[1]);

    match = rangeString.match(/^>\s*(\d+(?:\.\d+)?)$/);
    if (match) return numValue > parseFloat(match[1]);

    match = rangeString.match(/^<=\s*(\d+(?:\.\d+)?)$/);
    if (match) return numValue <= parseFloat(match[1]);

    match = rangeString.match(/^>=\s*(\d+(?:\.\d+)?)$/);
    if (match) return numValue >= parseFloat(match[1]);

    match = rangeString.match(/^0\s*-\s*(\d+(?:\.\d+)?)$/);
    if (match) return numValue >= 0 && numValue <= parseFloat(match[1]);

    match = rangeString.match(/^<\s*(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)$/);
    if (match) return numValue <= parseFloat(match[2]);

    prettyLog('No pattern matched for test', { testName, rangeString, originalRangeString }, { level: 'warn' });
    return false;

  } catch (error) {
    prettyLog('Range checking error occurred', { testName, value, referenceRange, error: error.message }, { level: 'error' });
    return false;
  }
};

// Direct analysis function
const analyzeTestResults = (extractedData) => {
  let totalParams = 0;
  let outOfRangeParams = [];

  // Look for results array specifically
  if (extractedData && extractedData.results && Array.isArray(extractedData.results)) {
    extractedData.results.forEach((testItem, index) => {
      // Check if this item has value and reference_range
      if (testItem.value !== undefined && testItem.reference_range) {
        totalParams++;

        const isInRange = checkIfValueInNormalRange(testItem.value, testItem.reference_range, testItem.test_name);

        if (!isInRange) {
          outOfRangeParams.push({
            parameter: testItem.test_name || `Test ${index + 1}`,
            value: testItem.value,
            unit: testItem.unit || '',
            reference_range: testItem.reference_range,
            range_field: 'reference_range',
            reason: 'Value outside Normal range'
          });
        }
      }
    });
  }

  // Debug logging of analysis results
  console.debug('[MedicalProcessing][Analysis] Simplified analysis debug:', {
    hasResultsArray: !!extractedData?.results,
    resultsArrayLength: extractedData?.results?.length || 0,
    totalParams,
    outOfRangeParams: outOfRangeParams.length
  });

  return {
    totalParams,
    outOfRangeParams
  };
};

// SAFE Identity verification function
const verifyPatientIdentity = (extractedData, proposerData) => {
  // Default safe result
  const verification = {
    nameMatch: null,
    ageMatch: null,
    sexMatch: null,
    confidence: 0,
    issues: [],
    details: {
      patientName: null,
      proposerName: null,
      patientAge: null,
      proposerAge: null,
      patientSex: null,
      proposerSex: null
    }
  };

  try {
    // Safely extract patient info
    const patientInfo = extractedData?.patient_info;
    if (!patientInfo || !proposerData) {
      verification.issues.push('Missing patient or proposer data for verification');
      return verification;
    }

    // Store details safely
    verification.details.patientName = patientInfo.Name || null;
    verification.details.proposerName = proposerData.customer_name || null;
    verification.details.patientAge = patientInfo.Age || null;
    verification.details.proposerAge = proposerData.age || null;
    verification.details.patientSex = patientInfo.Sex || null;
    verification.details.proposerSex = proposerData.sex || null;

    // SIMPLE Name verification (basic implementation)
    if (patientInfo.Name && proposerData.customer_name) {
      const patientName = String(patientInfo.Name).toLowerCase().trim();
      const proposerName = String(proposerData.customer_name).toLowerCase().trim();

      if (patientName.includes('xxx')) {
        // Handle anonymized names
        const tokens = patientName.split(' ').filter(t => !t.includes('xxx') && t.length > 1);
        if (tokens.length === 0) {
          verification.nameMatch = null;
          verification.issues.push('Name completely anonymized');
        } else {
          verification.nameMatch = tokens.some(token => proposerName.includes(token));
          if (!verification.nameMatch) {
            verification.issues.push('No matching name tokens found');
          }
        }
      } else {
        verification.nameMatch = patientName.includes(proposerName) || proposerName.includes(patientName);
        if (!verification.nameMatch) {
          verification.issues.push('Names do not match');
        }
      }
    } else {
      verification.issues.push('Missing name data');
    }

    // SIMPLE Age verification
    if (patientInfo.Age && proposerData.age) {
      const patientAge = parseInt(String(patientInfo.Age).replace(/\D/g, ''));
      const proposerAge = parseInt(proposerData.age);

      if (!isNaN(patientAge) && !isNaN(proposerAge)) {
        verification.ageMatch = Math.abs(patientAge - proposerAge) <= 1;
        if (!verification.ageMatch) {
          verification.issues.push(`Age mismatch: ${patientAge} vs ${proposerAge}`);
        }
      } else {
        verification.issues.push('Invalid age data');
      }
    } else {
      verification.issues.push('Missing age data');
    }

    // SIMPLE Sex verification
    if (patientInfo.Sex && proposerData.sex) {
      verification.sexMatch = String(patientInfo.Sex).toUpperCase() === String(proposerData.sex).toUpperCase();
      if (!verification.sexMatch) {
        verification.issues.push('Gender mismatch');
      }
    } else {
      verification.issues.push('Missing gender data');
    }

    // Calculate confidence
    const checks = [verification.nameMatch, verification.ageMatch, verification.sexMatch];
    const validChecks = checks.filter(check => check !== null);
    const passedChecks = validChecks.filter(Boolean);

    verification.confidence = validChecks.length > 0 ?
      Math.round((passedChecks.length / validChecks.length) * 100) : 0;

  } catch (error) {
    verification.issues.push(`Verification error: ${error.message}`);
    prettyLog('Identity verification error', { error: error.message }, { level: 'error' });
  }

  return verification;
};

// Helper function to combine multiple page responses
const combinePageResponses = (pages) => {
  try {
    if (!pages || pages.length === 0) {
      throw new Error('No pages to combine');
    }

    if (pages.length === 1) return pages[0];

    const combinedResult = { ...pages[0] };

    // Mark as multi-page document
    combinedResult.total_pages = pages.length;
    combinedResult.pages_combined = pages.map((p, idx) => p.page || idx + 1);
    if (combinedResult.page !== undefined) {
      delete combinedResult.page;
    }

    // Merge results arrays from all pages
    const allResults = [];
    for (let i = 0; i < pages.length; i++) {
      const page = pages[i];
      if (page.results && Array.isArray(page.results)) {
        allResults.push(...page.results);
      }
    }

    // Set combined results
    if (allResults.length > 0) {
      combinedResult.results = allResults;
    }

    // Merge other common fields
    const fieldsToMerge = ['test', 'tests', 'measurements', 'data'];
    for (let i = 1; i < pages.length; i++) {
      const currentPage = pages[i];

      fieldsToMerge.forEach(field => {
        if (currentPage[field] && typeof currentPage[field] === 'object') {
          if (!combinedResult[field]) {
            combinedResult[field] = {};
          }

          if (Array.isArray(currentPage[field])) {
            if (!Array.isArray(combinedResult[field])) {
              combinedResult[field] = [];
            }
            combinedResult[field] = [...combinedResult[field], ...currentPage[field]];
          } else {
            combinedResult[field] = {
              ...combinedResult[field],
              ...currentPage[field]
            };
          }
        }
      });
    }

    prettyLog('Successfully combined all pages', {
      totalPages: pages.length,
      totalResults: combinedResult.results?.length || 0,
      combinedFields: Object.keys(combinedResult)
    }, { level: 'info' });

    return combinedResult;
  } catch (error) {
    prettyLog('Error combining pages', { error: error.message }, { level: 'error' });
    throw new Error(`Failed to combine page responses: ${error.message}`);
  }
};

// Streaming response handling
const handleStreamingIDPResponse = async (response) => {
  let reader = null;
  const pages = [];
  try {
    reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let totalBytesReceived = 0;
    let lastActivityTime = Date.now();
    const startTime = Date.now();

    prettyLog('Starting to process streaming response', {
      contentType: response.headers.get('content-type'),
      transferEncoding: response.headers.get('transfer-encoding')
    }, { level: 'info' });

    // Extended timeouts for multi-page documents
    const ACTIVITY_TIMEOUT = 15 * 60 * 1000; // 15 minutes total
    const CHUNK_TIMEOUT = 5 * 60 * 1000; // 5 minutes per chunk
    const MAX_IDLE_TIME = 3 * 60 * 1000; // 3 minutes between chunks

    let consecutiveTimeouts = 0;
    const MAX_CONSECUTIVE_TIMEOUTS = 2; // Allow 2 timeouts before giving up

    while (true) {
      try {
        const readPromise = reader.read();
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Chunk read timeout')), CHUNK_TIMEOUT);
        });

        const { done, value } = await Promise.race([readPromise, timeoutPromise]);

        // Reset timeout counter on successful read
        consecutiveTimeouts = 0;

        if (done) {
          prettyLog('Stream reading completed successfully', {
            totalPages: pages.length,
            totalBytes: totalBytesReceived,
            processingTimeMs: Date.now() - startTime
          }, { level: 'info' });
          break;
        }

        if (value) {
          totalBytesReceived += value.length;
          lastActivityTime = Date.now();

          buffer += decoder.decode(value, { stream: true });

          // Process all complete JSON objects in buffer
          let jsonStartIndex = 0;

          while (jsonStartIndex < buffer.length) {
            const jsonStart = buffer.indexOf('{', jsonStartIndex);
            if (jsonStart === -1) break;

            let braceCount = 0;
            let jsonEnd = -1;

            for (let i = jsonStart; i < buffer.length; i++) {
              if (buffer[i] === '{') braceCount++;
              if (buffer[i] === '}') braceCount--;
              if (braceCount === 0) {
                jsonEnd = i;
                break;
              }
            }

            if (jsonEnd === -1) break; // Incomplete JSON, wait for more data

            const jsonString = buffer.substring(jsonStart, jsonEnd + 1);
            try {
              const pageData = JSON.parse(jsonString);
              pages.push(pageData);

              prettyLog('Successfully parsed page', {
                pageNumber: pages.length,
                pageSize: jsonString.length,
                totalBytesReceived,
                hasResults: !!pageData.results,
                resultsCount: pageData.results?.length || 0
              }, { level: 'info' });
            } catch (parseError) {
              prettyLog('Failed to parse JSON chunk', {
                error: parseError.message,
                chunkPreview: jsonString.substring(0, 200) + '...',
                chunkLength: jsonString.length
              }, { level: 'warn' });
            }
            jsonStartIndex = jsonEnd + 1;
          }

          // Update buffer
          buffer = jsonStartIndex < buffer.length ? buffer.substring(jsonStartIndex) : '';

          // Check for overall timeout
          if (Date.now() - lastActivityTime > ACTIVITY_TIMEOUT) {
            prettyLog('Overall activity timeout detected', {
              lastActivity: new Date(lastActivityTime).toISOString(),
              pagesReceived: pages.length,
              totalTimeMs: Date.now() - startTime
            }, { level: 'warn' });
            break;
          }
        }
      } catch (chunkError) {
        consecutiveTimeouts++;

        prettyLog('Error reading chunk from stream', {
          error: chunkError.message,
          consecutiveTimeouts,
          pagesReceivedSoFar: pages.length,
          bytesReceivedSoFar: totalBytesReceived,
          timeSinceLastActivity: Date.now() - lastActivityTime
        }, { level: 'warn' });

        // Handle timeouts more gracefully
        if (chunkError.message.includes('timeout')) {
          if (pages.length > 0 && consecutiveTimeouts < MAX_CONSECUTIVE_TIMEOUTS) {
            prettyLog('Chunk timeout but continuing due to partial data', {
              pagesReceived: pages.length,
              consecutiveTimeouts
            }, { level: 'warn' });

            await new Promise(resolve => setTimeout(resolve, 1000));
            continue;
          } else if (pages.length > 0) {
            prettyLog('Multiple timeouts, proceeding with partial data', {
              pagesReceived: pages.length,
              consecutiveTimeouts
            }, { level: 'warn' });
            break;
          }
        }

        throw chunkError;
      }
    }

    if (pages.length === 0) {
      throw new Error('No valid JSON pages found in streaming response');
    }

    return combinePageResponses(pages);
  } catch (error) {
    prettyLog('Error processing streaming response', {
      error: error.message,
      errorType: error.constructor.name,
      pagesReceived: pages.length
    }, { level: 'error' });

    // If we have some pages, return partial data
    if (pages.length > 0) {
      return combinePageResponses(pages);
    }

    throw error;
  } finally {
    if (reader) {
      try {
        await reader.cancel();
      } catch (cancelError) {
        prettyLog('Error canceling reader', { error: cancelError.message }, { level: 'error' });
      }
    }
  }
};

// Test endpoint
router.get('/test', (req, res) => {
  console.info('[MedicalProcessing][Test] Test endpoint accessed');
  prettyLog('Test endpoint accessed successfully', { level: 'info' });
  res.json({
    message: 'Medical processing routes are working!',
    timestamp: new Date().toISOString(),
    availableRoutes: [
      'GET /test',
      'GET /test-database-connection',
      'GET /proposer-health-metrics/:proposer_id?',
      'GET /medical-documents/:proposer_id',
      'GET /document-details/:document_id',
      'POST /extract-document/:document_id'
    ]
  });
});

// Database connection test
router.get('/test-database-connection', async (req, res) => {
  try {
    console.info('[MedicalProcessing][DBTest] Testing database connection and data availability');
    prettyLog('Testing database connection and data availability', { level: 'info' });

    const connectionTest = await pool.query('SELECT NOW() as current_time');
    const proposerCount = await pool.query('SELECT COUNT(*) as count FROM Proposer');
    const memberCount = await pool.query('SELECT COUNT(*) as count FROM Insured_Member');
    const healthDataCount = await pool.query(`
      SELECT COUNT(*) as count 
      FROM Insured_Member 
      WHERE height_cm IS NOT NULL AND weight_kg IS NOT NULL
    `);

    const sampleData = await pool.query(`
      SELECT p.customer_name, p.proposer_id, im.name, im.height_cm, im.weight_kg
      FROM Proposer p
      LEFT JOIN Insured_Member im ON p.proposer_id = im.proposer_id
      LIMIT 3
    `);

    const testResults = {
      database_connected: true,
      current_time: connectionTest.rows[0].current_time,
      proposer_count: parseInt(proposerCount.rows[0].count),
      insured_member_count: parseInt(memberCount.rows[0].count),
      members_with_health_data: parseInt(healthDataCount.rows[0].count),
      sample_data: sampleData.rows
    };

    console.debug('[MedicalProcessing][DBTest] Database test completed successfully:', testResults);
    prettyLog('Database test completed successfully', testResults, { level: 'info' });

    res.json({
      success: true,
      ...testResults
    });

  } catch (error) {
    console.error('[MedicalProcessing][DBTest] Database test failed:', error.message);
    prettyLog('Database test failed', { error: error.message }, { level: 'error' });

    res.status(500).json({
      success: false,
      error: 'Database connection test failed',
      details: error.message
    });
  }
});

// Get proposer health metrics
router.get('/proposer-health-metrics/:proposer_id?', async (req, res) => {
  const { proposer_id } = req.params;

  console.info('[MedicalProcessing][HealthMetrics] Fetching proposer health metrics:', proposer_id);
  prettyLog('Fetching proposer health metrics', { proposer_id }, { level: 'info' });

  try {
    let query = `
      SELECT 
        p.proposer_id,
        p.customer_name,
        p.age,
        p.sex as proposer_sex,
        im.member_id,
        im.name as member_name,
        im.relationship_with_proposer,
        im.height_cm,
        im.weight_kg,
        im.sex as member_sex,
        CASE 
          WHEN im.height_cm IS NOT NULL AND im.weight_kg IS NOT NULL 
          THEN ROUND((im.weight_kg / POWER((im.height_cm/100.0), 2))::numeric, 2)
          ELSE NULL 
        END as bmi
      FROM Proposer p
      LEFT JOIN Insured_Member im ON p.proposer_id = im.proposer_id
      WHERE ($1::INT IS NULL OR p.proposer_id = $1)
      ORDER BY p.proposer_id, im.member_id
    `;

    const params = proposer_id ? [proposer_id] : [null];

    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      console.warn('[MedicalProcessing][HealthMetrics] No proposer health metrics found:', proposer_id);
      prettyLog('No proposer health metrics found', { proposer_id }, { level: 'warn' });
      return res.status(404).json({
        error: 'No proposer data found',
        success: false,
        data: []
      });
    }

    // Group results by proposer
    const proposerHealthData = result.rows.reduce((acc, row) => {
      const {
        proposer_id,
        customer_name,
        age,
        proposer_sex,
        member_id,
        member_name,
        relationship_with_proposer,
        height_cm,
        weight_kg,
        member_sex,
        bmi
      } = row;

      if (!acc[proposer_id]) {
        acc[proposer_id] = {
          proposer_id,
          customer_name,
          age,
          sex: proposer_sex,
          insured_members: []
        };
      }

      if (member_id) {
        acc[proposer_id].insured_members.push({
          member_id,
          name: member_name,
          relationship: relationship_with_proposer,
          height_cm,
          weight_kg,
          sex: member_sex,
          bmi,
          has_health_metrics: height_cm !== null && weight_kg !== null
        });
      }

      return acc;
    }, {});

    const responseData = Object.values(proposerHealthData);

    const response = {
      success: true,
      data: responseData,
      metadata: {
        total_proposers: responseData.length,
        total_insured_members: result.rows.filter(row => row.member_id).length,
        proposers_with_health_data: responseData.filter(p =>
          p.insured_members.some(m => m.has_health_metrics)
        ).length
      },
      message: `Found health metrics for ${responseData.length} proposer(s)`
    };

    console.debug('[MedicalProcessing][HealthMetrics] Health metrics retrieved successfully:', { proposer_id, totalProposers: responseData.length });
    prettyLog('Health metrics retrieved successfully', { proposer_id, totalProposers: responseData.length }, { level: 'info' });
    res.json(response);

  } catch (error) {
    console.error('[MedicalProcessing][HealthMetrics] Error fetching proposer health metrics:', error.message);
    prettyLog('Error fetching proposer health metrics', {
      error: error.message,
      stack: error.stack,
      proposer_id
    }, { level: 'error' });

    res.status(500).json({
      error: 'Failed to fetch proposer health metrics',
      details: error.message,
      success: false,
      data: []
    });
  }
});

// Get medical documents by proposer_id
router.get('/medical-documents/:proposer_id', async (req, res) => {
  const { proposer_id } = req.params;

  prettyLog('Fetching medical documents for proposer', { proposer_id }, { level: 'info' });

  try {
    // Validate proposer_id
    if (!proposer_id || isNaN(proposer_id)) {
      return res.status(400).json({
        error: 'Invalid proposer ID provided',
        success: false
      });
    }

    // Query to get medical documents for the proposer
    const documentsQuery = `
      SELECT 
        d.id as document_id,
        d.proposal_number,
        d.member_id,
        d.document_type,
        d.source_url,
        d.extracted_data,
        d.validated,
        p.proposer_id,
        prop.customer_name,
        im.name as member_name,
        im.relationship_with_proposer,
        d.created_at as upload_date
      FROM Documents d
      LEFT JOIN Proposal p ON d.proposal_number = p.proposal_number
      LEFT JOIN Proposer prop ON p.proposer_id = prop.proposer_id
      LEFT JOIN Insured_Member im ON d.member_id = im.member_id
      WHERE p.proposer_id = $1
        AND (d.document_type ILIKE '%medical%' 
          OR d.document_type ILIKE '%health%'
          OR d.document_type ILIKE '%lab%'
          OR d.document_type ILIKE '%test%'
          OR d.document_type ILIKE '%report%'
          OR d.document_type ILIKE '%blood%'
          OR d.document_type ILIKE '%urine%'
          OR d.document_type ILIKE '%x-ray%'
          OR d.document_type ILIKE '%mri%'
          OR d.document_type ILIKE '%ct%'
          OR d.document_type ILIKE '%scan%')
      ORDER BY d.created_at DESC, d.id DESC
    `;

    const result = await pool.query(documentsQuery, [proposer_id]);

    if (result.rows.length === 0) {
      prettyLog('No medical documents found for proposer', { proposer_id }, { level: 'warn' });
      return res.json({
        success: true,
        data: {
          proposer_id: parseInt(proposer_id),
          customer_name: null,
          total_documents: 0,
          documents_by_member: [],
          all_documents: []
        },
        metadata: {
          total_members_with_documents: 0,
          validated_documents: 0,
          processed_documents: 0
        },
        message: `No medical documents found for proposer ID ${proposer_id}`
      });
    }

    // Process and organize the documents
    const documents = result.rows.map(row => ({
      document_id: row.document_id,
      proposal_number: row.proposal_number,
      member_id: row.member_id,
      member_name: row.member_name || 'Unknown Member',
      relationship: row.relationship_with_proposer || 'Self',
      document_type: row.document_type,
      source_url: row.source_url,
      validated: row.validated || false,
      has_extracted_data: !!row.extracted_data,
      extracted_data_preview: row.extracted_data ?
        JSON.stringify(JSON.parse(row.extracted_data)).substring(0, 200) + '...' : null,
      upload_date: row.upload_date
    }));

    // Group documents by member for better organization
    const documentsByMember = documents.reduce((acc, doc) => {
      const memberId = doc.member_id || 'self';
      if (!acc[memberId]) {
        acc[memberId] = {
          member_id: doc.member_id,
          member_name: doc.member_name,
          relationship: doc.relationship,
          documents: []
        };
      }
      acc[memberId].documents.push(doc);
      return acc;
    }, {});

    const response = {
      success: true,
      data: {
        proposer_id: parseInt(proposer_id),
        customer_name: result.rows[0]?.customer_name || 'Unknown Customer',
        total_documents: documents.length,
        documents_by_member: Object.values(documentsByMember),
        all_documents: documents
      },
      metadata: {
        total_members_with_documents: Object.keys(documentsByMember).length,
        validated_documents: documents.filter(d => d.validated).length,
        processed_documents: documents.filter(d => d.has_extracted_data).length
      },
      message: `Found ${documents.length} medical document(s) for proposer ID ${proposer_id}`
    };

    prettyLog('Successfully retrieved medical documents', {
      proposer_id,
      total_documents: documents.length,
      members_count: Object.keys(documentsByMember).length
    }, { level: 'info' });

    res.json(response);

  } catch (error) {
    prettyLog('Error fetching medical documents for proposer', {
      proposer_id,
      error: error.message,
      stack: error.stack
    }, { level: 'error' });

    res.status(500).json({
      error: 'Failed to fetch medical documents',
      details: error.message,
      success: false
    });
  }
});

// Get specific document details with full extracted data
router.get('/document-details/:document_id', async (req, res) => {
  const { document_id } = req.params;

  prettyLog('Fetching detailed document information', { document_id }, { level: 'info' });

  try {
    if (!document_id || isNaN(document_id)) {
      return res.status(400).json({
        error: 'Invalid document ID provided',
        success: false
      });
    }

    const documentQuery = `
      SELECT 
        d.*,
        p.proposer_id,
        prop.customer_name,
        im.name as member_name,
        im.relationship_with_proposer
      FROM Documents d
      LEFT JOIN Proposal p ON d.proposal_number = p.proposal_number
      LEFT JOIN Proposer prop ON p.proposer_id = prop.proposer_id
      LEFT JOIN Insured_Member im ON d.member_id = im.member_id
      WHERE d.id = $1
    `;

    const result = await pool.query(documentQuery, [document_id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Document not found',
        success: false
      });
    }

    const document = result.rows[0];
    let extractedData = null;

    if (document.extracted_data) {
      try {
        extractedData = JSON.parse(document.extracted_data);
      } catch (parseError) {
        prettyLog('Error parsing extracted data', { document_id, error: parseError.message }, { level: 'warn' });
      }
    }

    const response = {
      success: true,
      document: {
        id: document.id,
        proposal_number: document.proposal_number,
        proposer_id: document.proposer_id,
        customer_name: document.customer_name,
        member_id: document.member_id,
        member_name: document.member_name,
        relationship: document.relationship_with_proposer,
        document_type: document.document_type,
        source_url: document.source_url,
        validated: document.validated,
        created_at: document.created_at,
        extracted_data: extractedData
      }
    };

    prettyLog('Successfully retrieved document details', {
      document_id,
      has_extracted_data: !!extractedData
    }, { level: 'info' });

    res.json(response);

  } catch (error) {
    prettyLog('Error fetching document details', {
      document_id,
      error: error.message
    }, { level: 'error' });

    res.status(500).json({
      error: 'Failed to fetch document details',
      details: error.message,
      success: false
    });
  }
});

// Main extraction endpoint with safe identity verification
router.post('/extract-document/:document_id', async (req, res) => {
  const { document_id } = req.params;
  const { member_id, proposal_number, proposer_id } = req.body;

  prettyLog('Document extraction request', {
    document_id,
    proposer_id,
    member_id,
    proposal_number
  }, { level: 'info' });

  // Validate inputs
  if (!document_id) {
    prettyLog('Missing document_id', { document_id }, { level: 'warn' });
    return res.status(400).json({ error: 'Document ID is required', success: false });
  }

  if (!proposer_id) {
    prettyLog('Missing proposer_id', { document_id, proposer_id }, { level: 'warn' });
    return res.status(400).json({ error: 'Proposer ID is required', success: false });
  }

  try {
    // Fetch document details
    const documentQuery = `
      SELECT d.id, d.document_type, d.source_url
      FROM documents d
      WHERE d.id = $1
    `;
    const documentResult = await pool.query(documentQuery, [document_id]);

    if (documentResult.rows.length === 0) {
      prettyLog('Document not found for extraction', { document_id }, { level: 'warn' });
      return res.status(404).json({ error: `Document with ID ${document_id} not found`, success: false });
    }

    const documentData = documentResult.rows[0];
    const s3_url = documentData.source_url;

    if (!s3_url) {
      prettyLog('No S3 URL found for document', { document_id }, { level: 'warn' });
      return res.status(400).json({ error: 'No S3 URL found for this document', success: false });
    }

    prettyLog('Document info retrieved for extraction', {
      document_id,
      document_type: documentData.document_type,
      s3_url
    }, { level: 'info' });

    const apiKey = process.env.IDP_API_KEY;
    if (!apiKey) {
      prettyLog('Missing IDP API key', { document_id }, { level: 'warn' });
      throw new Error('IDP API key not configured');
    }

    let extractedData;
    try {
      // Extended timeout for multi-page documents
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20 * 60 * 1000); // 20 minutes for large docs

      const idpResponse = await fetch('http://205.147.102.131:8000/upload/medical', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json, application/jsonl',
          'User-Agent': 'Underwriter-Dashboard/1.0',
          'Connection': 'keep-alive'
        },
        body: JSON.stringify({
          s3_url,
          api_key: apiKey
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!idpResponse.ok) {
        const errorText = await idpResponse.text();
        prettyLog('IDP API error response', {
          document_id,
          status: idpResponse.status,
          statusText: idpResponse.statusText,
          errorBody: errorText.substring(0, 500)
        }, { level: 'warn' });
        throw new Error(`IDP API error: ${idpResponse.status} ${idpResponse.statusText}`);
      }

      const contentType = idpResponse.headers.get('content-type');
      const transferEncoding = idpResponse.headers.get('transfer-encoding');

      if (transferEncoding === 'chunked' || contentType?.includes('jsonl') || contentType?.includes('stream')) {
        prettyLog('Processing streaming response for multi-page document', { document_id }, { level: 'info' });
        extractedData = await handleStreamingIDPResponse(idpResponse);
      } else {
        prettyLog('Processing regular JSON response', { document_id }, { level: 'info' });
        const responseText = await idpResponse.text();

        if (!responseText || responseText.trim() === '') {
          throw new Error('IDP API returned empty response');
        }

        try {
          extractedData = JSON.parse(responseText);
          prettyLog('Successfully parsed regular JSON response', { document_id }, { level: 'info' });
        } catch (parseError) {
          throw new Error(`IDP API returned invalid JSON: ${parseError.message}`);
        }
      }

      if (!extractedData || typeof extractedData !== 'object') {
        throw new Error(`IDP API returned invalid data structure. Expected object, got ${typeof extractedData}`);
      }

    } catch (fetchError) {
      prettyLog('IDP API call failed', {
        document_id,
        error: fetchError.message,
        errorName: fetchError.name,
        errorType: fetchError.constructor.name
      }, { level: 'error' });
      if (fetchError.name === 'AbortError') {
        throw new Error('IDP API request timed out - document processing took too long');
      }
      throw fetchError;
    }

    // Fetch proposer details using proposer_id
    let proposerData = null;
    try {
      const proposerQuery = `
        SELECT customer_name, age, sex
        FROM Proposer
        WHERE proposer_id = $1
      `;
      const proposerResult = await pool.query(proposerQuery, [proposer_id]);

      if (proposerResult.rows.length === 0) {
        prettyLog('Proposer not found', { document_id, proposer_id }, { level: 'warn' });
        return res.status(404).json({ error: `Proposer with ID ${proposer_id} not found`, success: false });
      }

      proposerData = proposerResult.rows[0];
      prettyLog('Proposer info retrieved', {
        document_id,
        proposer_id,
        customer_name: proposerData.customer_name
      }, { level: 'info' });
    } catch (proposerError) {
      prettyLog('Proposer query failed', {
        document_id,
        proposer_id,
        error: proposerError.message
      }, { level: 'error' });
      throw new Error(`Failed to fetch proposer data: ${proposerError.message}`);
    }

    // SAFE Identity verification
    let identityVerification = null;
    try {
      if (extractedData.patient_info) {
        identityVerification = verifyPatientIdentity(extractedData, proposerData);
        prettyLog('Identity verification completed', {
          document_id,
          proposer_id,
          confidence: identityVerification.confidence,
          issues: identityVerification.issues.length
        }, { level: 'info' });
      } else {
        prettyLog('Skipping identity verification - no patient info in extracted data', { document_id }, { level: 'warn' });
      }
    } catch (verificationError) {
      prettyLog('Identity verification failed safely', {
        document_id,
        proposer_id,
        error: verificationError.message
      }, { level: 'warn' });
      // Continue without failing the entire request
    }

    // Use simplified analysis function
    let rangeAnalysis = null;
    if (extractedData) {
      rangeAnalysis = analyzeTestResults(extractedData);
      prettyLog('Range analysis completed successfully', {
        document_id,
        totalParams: rangeAnalysis.totalParams,
        outOfRangeCount: rangeAnalysis.outOfRangeParams.length,
        normalRangeOnly: true,
        totalPagesProcessed: extractedData.total_pages || 1
      }, { level: 'info' });
    }

    // Update document with extracted data
    const updateQuery = `
      UPDATE documents
      SET extracted_data = $1
      WHERE id = $2
      RETURNING *
    `;
    await pool.query(updateQuery, [JSON.stringify(extractedData), document_id]);

    // SAFE Response with proposer name and optional identity verification
    const response = {
      success: true,
      document_info: {
        id: documentData.id,
        type: documentData.document_type,
        s3_url
      },
      proposer_info: {
        proposer_id,
        customer_name: proposerData.customer_name
      },
      extracted_data: extractedData,
      range_analysis: rangeAnalysis,
      message: extractedData.total_pages
        ? `Document data extracted successfully from ${extractedData.total_pages} pages`
        : 'Document data extracted successfully'
    };

    if (identityVerification) {
      response.identity_verification = identityVerification;
    }

    prettyLog('Document extraction completed successfully', {
      document_id,
      proposer_id,
      totalPages: extractedData.total_pages || 1,
      hasRangeAnalysis: !!rangeAnalysis,
      hasIdentityVerification: !!identityVerification,
      outOfRangeCount: rangeAnalysis ? rangeAnalysis.outOfRangeParams.length : 0,
      totalResultsExtracted: extractedData.results?.length || 0
    }, { level: 'info' });

    res.json(response);

  } catch (error) {
    prettyLog('Document extraction failed', {
      document_id,
      proposer_id,
      error: error.message,
      errorType: error.constructor.name
    }, { level: 'error' });

    let errorMessage = 'Failed to extract document data';
    let httpStatus = 500;

    if (error.message.includes('Authentication failed')) {
      errorMessage = 'Document processing service authentication failed - please check API key';
      httpStatus = 401;
    } else if (error.message.includes('timeout')) {
      errorMessage = 'Document processing timed out - please try again';
      httpStatus = 408;
    } else if (error.message.includes('JSON')) {
      errorMessage = 'Document processing service returned invalid data format';
    } else if (error.message.includes('Proposer')) {
      errorMessage = error.message;
      httpStatus = 404;
    }

    res.status(httpStatus).json({
      error: errorMessage,
      details: error.message,
      success: false,
      retryable: httpStatus === 408
    });
  }
});

export default router;