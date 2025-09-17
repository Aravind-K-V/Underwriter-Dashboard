
import express from 'express';
import pool from '../config/db.js';
import { prettyLog } from '../config/logger.js';
import { compareDocumentData, ensureProcessingResultsTable } from '../utils/documentUtils.js';
import axios from 'axios';

const router = express.Router();

// IDP Document Processing Endpoint
router.post('/process-document/:document_id', async (req, res) => {
  const { document_id } = req.params;
  const { proposer_id } = req.body;

  prettyLog('IDP processing request', { document_id, proposer_id });

  if (!document_id) {
    return res.status(400).json({ error: 'Document ID is required' });
  }

  if (!proposer_id) {
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
      prettyLog('Document not found for IDP processing', { document_id });
      return res.status(404).json({ error: `Document with ID ${document_id} not found` });
    }

    const documentData = documentResult.rows[0];
    const proposal_number = documentData.proposal_number;
    const documentType = documentData.document_type;

    if (!proposal_number) {
      prettyLog('No proposal number found for document', { document_id });
      return res.status(400).json({ error: 'No proposal number found for this document' });
    }

    prettyLog('Document info retrieved for IDP', {
      document_id,
      document_type: documentType,
      proposal_number,
    });

    // Call Python API
    const pythonApiUrl = process.env.PYTHON_API_URL;
    let extractedData;
    try {
      prettyLog('Calling Python API', { document_id, proposal_number });
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
      prettyLog('Python API response received', { data: extractedData });
    } catch (error) {
      prettyLog('Python API call failed', { error: error.message });
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
      prettyLog('Proposer not found for comparison', { proposer_id });
      return res.status(404).json({ error: `Proposer with ID ${proposer_id} not found` });
    }

    const proposerData = proposerResult.rows[0];
    prettyLog('Proposer data retrieved for comparison', proposerData);

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
    prettyLog('Document comparison completed', comparisonResult);

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

    prettyLog('Document validation status updated', {
      document_id,
      isVerified,
      overall_score: comparisonResult.overall_score,
    });

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

    res.status(200).json(response);
  } catch (error) {
    prettyLog('IDP processing failed', { error: error.message });
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

export default router;
