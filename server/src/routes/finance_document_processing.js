
import express from 'express';
import pool from '../config/db.js';
import { prettyLog } from '../config/logger.js';
import { compareDocumentData, ensureProcessingResultsTable } from '../utils/documentUtils.js';
import axios from 'axios';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const router = express.Router();

// Get current file directory for Python script paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// IDP Document Processing Endpoint
router.post('/process-document/:document_id', async (req, res) => {
  const { document_id } = req.params;
  const { proposer_id } = req.body;

  console.info('[FinanceProcessing][ProcessDocument] IDP processing request received:', { document_id, proposer_id });
  prettyLog('IDP processing request received', { document_id, proposer_id }, { level: 'info' });

  if (!document_id) {
    console.warn('[FinanceProcessing][ProcessDocument] Missing document_id parameter');
    return res.status(400).json({ error: 'Document ID is required' });
  }

  if (!proposer_id) {
    console.warn('[FinanceProcessing][ProcessDocument] Missing proposer_id parameter');
    return res.status(400).json({ error: 'Proposer ID is required for comparison' });
  }

  try {
    // Fetch document metadata
    const documentQuery = `
      SELECT d.id, d.document_type, d.source_url, d.validated, p.proposal_number
      FROM documents d
      LEFT JOIN proposal pr ON d.proposal_number = pr.proposal_number
      LEFT JOIN proposer p ON pr.proposer_id = p.proposer_id
      WHERE d.id = $1
    `;
    const documentResult = await pool.query(documentQuery, [document_id]);

    if (documentResult.rows.length === 0) {
      console.warn('[FinanceProcessing][ProcessDocument] Document not found for IDP processing:', document_id);
      prettyLog('Document not found for IDP processing', { document_id }, { level: 'warn' });
      return res.status(404).json({ error: `Document with ID ${document_id} not found` });
    }

    const documentData = documentResult.rows[0];
    const proposal_number = documentData.proposal_number;
    const documentType = documentData.document_type;

    if (!proposal_number) {
      console.warn('[FinanceProcessing][ProcessDocument] No proposal number found for document:', document_id);
      prettyLog('No proposal number found for document', { document_id }, { level: 'warn' });
      return res.status(400).json({ error: 'No proposal number found for this document' });
    }

    console.debug('[FinanceProcessing][ProcessDocument] Document info retrieved for IDP:', {
      document_id,
      document_type: documentType,
      proposal_number,
    });
    prettyLog('Document info retrieved for IDP', {
      document_id,
      document_type: documentType,
      proposal_number,
    }, { level: 'info' });

    // Call Python API
    const pythonApiUrl = process.env.PYTHON_API_URL;
    let extractedData;
    try {
      console.info('[FinanceProcessing][ProcessDocument] Calling Python API:', { document_id, proposal_number });
      prettyLog('Calling Python API', { document_id, proposal_number }, { level: 'info' });
      
      const response = await axios.post(
        `${pythonApiUrl}/process-document`,
        { proposal_number: parseInt(proposal_number) },
        {
          headers: {
            'Authorization': `Bearer ${process.env.IDP_API_KEY}`,
            'Content-Type': 'application/json',
          },
          timeout: 60000,
        }
      );

      extractedData = response.data;
      console.debug('[FinanceProcessing][ProcessDocument] Python API response received successfully:', { document_id, hasData: !!extractedData });
      prettyLog('Python API response received successfully', { document_id, hasData: !!extractedData }, { level: 'info' });
    } catch (error) {
      console.error('[FinanceProcessing][ProcessDocument] Python API call failed:', error.message);
      prettyLog('Python API call failed', { error: error.message }, { level: 'error' });
      return res.status(500).json({ error: 'Failed to process document with Python API', details: error.message });
    }

    // Fetch proposer data
    const proposerQuery = `
      SELECT proposer_id, customer_name, dob, pan_number, annual_income
      FROM proposer 
      WHERE proposer_id = $1
    `;
    const proposerResult = await pool.query(proposerQuery, [proposer_id]);

    if (proposerResult.rows.length === 0) {
      console.warn('[FinanceProcessing][ProcessDocument] Proposer not found for comparison:', proposer_id);
      prettyLog('Proposer not found for comparison', { proposer_id }, { level: 'warn' });
      return res.status(404).json({ error: `Proposer with ID ${proposer_id} not found` });
    }

    const proposerData = proposerResult.rows[0];
    console.debug('[FinanceProcessing][ProcessDocument] Proposer data retrieved for comparison:', { proposer_id, customer_name: proposerData.customer_name });
    prettyLog('Proposer data retrieved for comparison', { proposer_id, customer_name: proposerData.customer_name }, { level: 'info' });

    // Extract relevant document data
    const docData = extractedData[documentType.toLowerCase()] || {};
    const extractedFields = {
      name: docData.name || null,
      salary: docData.salary || null,
      dob: docData.dob || null,
      pan: docData.pan_number || null,
    };

    // Compare data
    const comparisonResult = compareDocumentData(extractedFields, proposerData, documentType);
    console.debug('[FinanceProcessing][ProcessDocument] Document comparison completed:', { document_id, overall_score: comparisonResult.overall_score });
    prettyLog('Document comparison completed successfully', { document_id, overall_score: comparisonResult.overall_score }, { level: 'info' });

    // Update document status
    const isVerified = comparisonResult.overall_score >= 0.8;
    const updateQuery = `
      UPDATE documents 
      SET validated = $1, extracted_data = $2 
      WHERE id = $3
      RETURNING *
    `;
    await pool.query(updateQuery, [
      isVerified,
      JSON.stringify(extractedData),
      document_id,
    ]);

    console.info('[FinanceProcessing][ProcessDocument] Document validation status updated:', {
      document_id,
      isVerified,
      overall_score: comparisonResult.overall_score,
    });
    prettyLog('Document validation status updated successfully', {
      document_id,
      isVerified,
      overall_score: comparisonResult.overall_score,
    }, { level: 'info' });

    // Store processing results
    // await ensureProcessingResultsTable();
    // const insertResultQuery = `
    //   INSERT INTO document_processing_results 
    //   (document_id, proposer_id, extracted_data, comparison_result, overall_match, processed_at)
    //   VALUES ($1, $2, $3, $4, $5, NOW())
    //   ON CONFLICT (document_id) 
    //   DO UPDATE SET 
    //     extracted_data = EXCLUDED.extracted_data,
    //     comparison_result = EXCLUDED.comparison_result,
    //     overall_match = EXCLUDED.overall_match,
    //     processed_at = EXCLUDED.processed_at
    // `;
    // await pool.query(insertResultQuery, [
    //   document_id,
    //   proposer_id,
    //   JSON.stringify(extractedData),
    //   JSON.stringify(comparisonResult),
    //   isVerified,
    // ]);

    const response = {
      success: true,
      document_info: { id: documentData.id, type: documentType, proposal_number },
      extracted_data: extractedFields,
      proposer_data: proposerData,
      comparison: comparisonResult,
      overall_match: isVerified,
      confidence_score: comparisonResult.overall_score,
      message: isVerified
        ? `Document verified successfully! ${Math.round(comparisonResult.overall_score * 100)}% match confidence.`
        : `Document verification failed. Only ${Math.round(comparisonResult.overall_score * 100)}% match confidence.`,
    };

    console.info('[FinanceProcessing][ProcessDocument] IDP processing completed successfully:', { document_id, overall_match: isVerified, confidence_score: comparisonResult.overall_score });
    prettyLog('IDP processing completed successfully', { document_id, overall_match: isVerified, confidence_score: comparisonResult.overall_score }, { level: 'info' });
    res.status(200).json(response);
  } catch (error) {
    console.error('[FinanceProcessing][ProcessDocument] IDP processing failed:', error.message);
    prettyLog('IDP processing failed', { error: error.message }, { level: 'error' });
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// Finance Score Calculation Endpoint
router.get('/finance-score/:proposer_id', async (req, res) => {
  const { proposer_id } = req.params;

  console.info('[FinanceProcessing][FinanceScore] Finance score calculation request received:', { proposer_id });
  prettyLog('Finance score calculation request received', { proposer_id }, { level: 'info' });

  if (!proposer_id) {
    console.warn('[FinanceProcessing][FinanceScore] Missing proposer_id parameter');
    return res.status(400).json({ error: 'Proposer ID is required' });
  }

  try {
    // First, check if the proposer exists and has required data
    const proposerQuery = `
      SELECT 
        p.proposer_id,
        p.customer_name,
        p.annual_income,
        p.initial_cash_benefit_chosen as premium_amount,
        p.dob,
        p.age,
        p.occupation,
        p.prev_policy_no,
        pr.proposal_number
      FROM proposer p
      LEFT JOIN proposal pr ON p.proposer_id = pr.proposer_id
      WHERE p.proposer_id = $1
    `;
    
    const proposerResult = await pool.query(proposerQuery, [proposer_id]);

    if (proposerResult.rows.length === 0) {
      console.warn('[FinanceProcessing][FinanceScore] Proposer not found:', proposer_id);
      prettyLog('Proposer not found for finance score calculation', { proposer_id }, { level: 'warn' });
      return res.status(404).json({ error: `Proposer with ID ${proposer_id} not found` });
    }

    const proposerData = proposerResult.rows[0];
    const proposal_number = proposerData.proposal_number;

    if (!proposal_number) {
      console.warn('[FinanceProcessing][FinanceScore] No proposal number found for proposer:', proposer_id);
      prettyLog('No proposal number found for proposer', { proposer_id }, { level: 'warn' });
      return res.status(400).json({ error: 'No proposal number found for this proposer' });
    }

    // Get sum assured from insured_member table
    const sumAssuredQuery = `
      SELECT COALESCE(SUM(sum_insured), 0) as total_sum_assured
      FROM insured_member 
      WHERE proposer_id = $1
    `;
    
    const sumAssuredResult = await pool.query(sumAssuredQuery, [proposer_id]);
    const totalSumAssured = sumAssuredResult.rows[0]?.total_sum_assured || 0;

    // Get other insurance sum assured from proposer table (previous policy)
    const otherInsuranceSumAssured = parseFloat(proposerData.prev_policy_no) || 0;

    // Prepare data for finance score calculation
    const financeData = {
      proposal_number: parseInt(proposal_number),
      proposer_id: parseInt(proposer_id),
      stated_age: proposerData.age || 0,
      dob: proposerData.dob,
      occupation: proposerData.occupation || '',
      annual_income: parseFloat(proposerData.annual_income) || 0,
      premium: parseFloat(proposerData.premium_amount) || 0,
      sum_assured: parseFloat(totalSumAssured) || 0,
      other_insurance_sum_assured: parseFloat(otherInsuranceSumAssured) || 0
    };

    console.debug('[FinanceProcessing][FinanceScore] Prepared finance data:', financeData);
    prettyLog('Prepared finance data for calculation', financeData, { level: 'info' });

    // Calculate finance score using Python script
    const financeScore = await calculateFinanceScore(financeData);

    if (!financeScore) {
      console.error('[FinanceProcessing][FinanceScore] Failed to calculate finance score');
      prettyLog('Failed to calculate finance score', { proposer_id }, { level: 'error' });
      return res.status(500).json({ error: 'Failed to calculate finance score' });
    }

    // Store the finance score result in risk_assessments table
    try {
      // First, get the request_id from underwriting_requests table
      const requestIdQuery = `
        SELECT request_id 
        FROM underwriting_requests 
        WHERE proposer_id = $1 
        ORDER BY created_at DESC 
        LIMIT 1
      `;
      
      const requestIdResult = await pool.query(requestIdQuery, [proposer_id]);
      const request_id = requestIdResult.rows[0]?.request_id;

      if (request_id) {
        // Map finance score to outcome
        let outcome = 'pending';
        if (financeScore.underwriting_flag === 'Pass') {
          outcome = 'approved';
        } else if (financeScore.underwriting_flag === 'Decline') {
          outcome = 'reject';
        }

        const insertScoreQuery = `
          INSERT INTO risk_assessments (request_id, proposal_number, financial_score, outcome, created_at, updated_at)
          VALUES ($1, $2, $3, $4, NOW(), NOW())
          ON CONFLICT (request_id) 
          DO UPDATE SET 
            financial_score = EXCLUDED.financial_score,
            outcome = EXCLUDED.outcome,
            updated_at = EXCLUDED.updated_at
        `;
        
        await pool.query(insertScoreQuery, [
          request_id,
          proposal_number,
          financeScore.final_finance_score,
          outcome
        ]);
        
        console.info('[FinanceProcessing][FinanceScore] Finance score stored in risk_assessments table');
        prettyLog('Finance score stored in risk_assessments table', { 
          proposer_id, 
          request_id, 
          score: financeScore.final_finance_score,
          outcome 
        }, { level: 'info' });
      } else {
        console.warn('[FinanceProcessing][FinanceScore] No underwriting request found for proposer:', proposer_id);
        prettyLog('No underwriting request found for proposer', { proposer_id }, { level: 'warn' });
      }
    } catch (dbError) {
      console.warn('[FinanceProcessing][FinanceScore] Failed to store finance score in risk_assessments table:', dbError.message);
      prettyLog('Failed to store finance score in risk_assessments table', { error: dbError.message }, { level: 'warn' });
      // Continue with response even if database storage fails
    }

    const response = {
      success: true,
      proposer_id: parseInt(proposer_id),
      proposal_number: parseInt(proposal_number),
      finance_score: financeScore.final_finance_score,
      risk_category: financeScore.risk_category,
      underwriting_flag: financeScore.underwriting_flag,
      score_details: {
        sar_income_ratio: financeScore.sar_income_ratio,
        tsar_income_ratio: financeScore.tsar_income_ratio,
        premium_income_ratio: financeScore.premium_income_ratio,
        sar_score: financeScore.sar_score,
        tsar_score: financeScore.tsar_score,
        premium_score: financeScore.premium_score,
        score_factors: financeScore.score_factors
      },
      input_data: financeData,
      calculated_at: new Date().toISOString()
    };

    console.info('[FinanceProcessing][FinanceScore] Finance score calculation completed successfully:', { 
      proposer_id, 
      finance_score: financeScore.final_finance_score,
      risk_category: financeScore.risk_category 
    });
    prettyLog('Finance score calculation completed successfully', { 
      proposer_id, 
      finance_score: financeScore.final_finance_score,
      risk_category: financeScore.risk_category 
    }, { level: 'info' });

    res.status(200).json(response);

  } catch (error) {
    console.error('[FinanceProcessing][FinanceScore] Finance score calculation failed:', error.message);
    prettyLog('Finance score calculation failed', { error: error.message }, { level: 'error' });
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// Get stored finance score from risk_assessments table
router.get('/finance-score-stored/:proposer_id', async (req, res) => {
  const { proposer_id } = req.params;

  console.info('[FinanceProcessing][FinanceScoreStored] Fetching stored finance score:', { proposer_id });
  prettyLog('Fetching stored finance score', { proposer_id }, { level: 'info' });

  if (!proposer_id) {
    console.warn('[FinanceProcessing][FinanceScoreStored] Missing proposer_id parameter');
    return res.status(400).json({ error: 'Proposer ID is required' });
  }

  try {
    // Get the stored finance score from risk_assessments table
    const storedScoreQuery = `
      SELECT 
        ra.request_id,
        ra.proposal_number,
        ra.financial_score,
        ra.outcome,
        ra.created_at,
        ra.updated_at,
        ur.proposer_id
      FROM risk_assessments ra
      INNER JOIN underwriting_requests ur ON ra.request_id = ur.request_id
      WHERE ur.proposer_id = $1
      ORDER BY ra.updated_at DESC
      LIMIT 1
    `;
    
    const storedScoreResult = await pool.query(storedScoreQuery, [proposer_id]);

    if (storedScoreResult.rows.length === 0) {
      console.info('[FinanceProcessing][FinanceScoreStored] No stored finance score found for proposer:', proposer_id);
      prettyLog('No stored finance score found for proposer', { proposer_id }, { level: 'info' });
      return res.status(404).json({ error: 'No stored finance score found for this proposer' });
    }

    const storedScore = storedScoreResult.rows[0];

    // Map outcome back to risk category and underwriting flag
    let risk_category = 'Unknown';
    let underwriting_flag = 'Manual Review';
    
    if (storedScore.financial_score === 1) {
      risk_category = 'Safe';
      underwriting_flag = 'Pass';
    } else if (storedScore.financial_score === 2) {
      risk_category = 'Low Risk';
      underwriting_flag = 'Pass';
    } else if (storedScore.financial_score === 3) {
      risk_category = 'Medium Risk';
      underwriting_flag = 'Pass';
    } else if (storedScore.financial_score === 4) {
      risk_category = 'High Risk';
      underwriting_flag = 'Manual Review';
    } else if (storedScore.financial_score === 5) {
      risk_category = 'Reject';
      underwriting_flag = 'Decline';
    }

    const response = {
      success: true,
      proposer_id: parseInt(proposer_id),
      proposal_number: storedScore.proposal_number,
      request_id: storedScore.request_id,
      finance_score: storedScore.financial_score,
      risk_category: risk_category,
      underwriting_flag: underwriting_flag,
      outcome: storedScore.outcome,
      stored_at: storedScore.created_at,
      updated_at: storedScore.updated_at,
      source: 'stored'
    };

    console.info('[FinanceProcessing][FinanceScoreStored] Stored finance score retrieved successfully:', { 
      proposer_id, 
      finance_score: storedScore.financial_score,
      outcome: storedScore.outcome
    });
    prettyLog('Stored finance score retrieved successfully', { 
      proposer_id, 
      finance_score: storedScore.financial_score,
      outcome: storedScore.outcome
    }, { level: 'info' });

    res.status(200).json(response);

  } catch (error) {
    console.error('[FinanceProcessing][FinanceScoreStored] Failed to fetch stored finance score:', error.message);
    prettyLog('Failed to fetch stored finance score', { error: error.message }, { level: 'error' });
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// Helper function to calculate finance score using Python script
async function calculateFinanceScore(financeData) {
  return new Promise((resolve, reject) => {
    const pythonScriptPath = path.join(__dirname, '..', 'Rule Engines', 'Finance Score', 'Rule Engine', 'calculate_single_score.py');
    
    console.debug('[FinanceProcessing][FinanceScore] Running Python script:', pythonScriptPath);
    
    const pythonProcess = spawn('python', [pythonScriptPath], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: {
        ...process.env,
        FINANCE_DATA: JSON.stringify(financeData)
      }
    });

    let output = '';
    let errorOutput = '';

    pythonProcess.stdout.on('data', (data) => {
      output += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    pythonProcess.on('close', (code) => {
      if (code !== 0) {
        console.error('[FinanceProcessing][FinanceScore] Python script failed with code:', code);
        console.error('[FinanceProcessing][FinanceScore] Python error output:', errorOutput);
        reject(new Error(`Python script failed with code ${code}: ${errorOutput}`));
        return;
      }

      try {
        const result = JSON.parse(output);
        console.debug('[FinanceProcessing][FinanceScore] Python script output parsed successfully');
        resolve(result);
      } catch (parseError) {
        console.error('[FinanceProcessing][FinanceScore] Failed to parse Python script output:', parseError.message);
        console.error('[FinanceProcessing][FinanceScore] Raw output:', output);
        reject(new Error(`Failed to parse Python script output: ${parseError.message}`));
      }
    });

    pythonProcess.on('error', (error) => {
      console.error('[FinanceProcessing][FinanceScore] Python process error:', error.message);
      reject(new Error(`Python process error: ${error.message}`));
    });
  });
}

export default router;
