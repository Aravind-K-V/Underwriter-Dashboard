import express from 'express';
import pool from '../config/db.js';
import { prettyLog } from '../config/logger.js';

const router = express.Router();

// Rule Engine Trail Endpoint
router.get('/review-flags/:proposer_id', async (req, res) => {
  const { proposer_id } = req.params;

  try {
    console.info('[Underwriting][ReviewFlags] Fetching review flags for proposer:', proposer_id);
    
    const query = `
      SELECT ret.finreview_required, ret.mc_required
      FROM underwriting_requests ur
      JOIN Rule_Engine_Trail ret ON ur.proposal_no = ret.proposal_number
      WHERE ur.proposer_id = $1
      ORDER BY ur.created_at DESC
      LIMIT 1
    `;

    const result = await pool.query(query, [proposer_id]);

    if (!result.rows.length) {
      console.warn('[Underwriting][ReviewFlags] No review flags found for proposer:', proposer_id);
      return res.json({ finreview_required: false, mc_required: false, message: 'No review flags found' });
    }

    console.debug('[Underwriting][ReviewFlags] Review flags retrieved successfully:', { proposer_id, flags: result.rows[0] });
    return res.json(result.rows[0]);
  } catch (error) {
    console.error('[Underwriting][ReviewFlags] Error fetching review flags:', error.message);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

// API endpoint to fetch underwriting status for header
router.get('/underwriting-status/:proposer_id', async (req, res) => {
  const { proposer_id } = req.params;
  
  try {
    console.info('[Underwriting][Status] Fetching underwriting status for proposer:', proposer_id);
    
    const query = `
      SELECT status, message, request_id, created_at, updated_at
      FROM underwriting_requests 
      WHERE proposer_id = $1 
      ORDER BY updated_at DESC, created_at DESC 
      LIMIT 1
    `;
    
    const result = await pool.query(query, [proposer_id]);
    
    if (result.rows.length === 0) {
      console.warn('[Underwriting][Status] No underwriting request found for proposer:', proposer_id);
      return res.json({
        status: 'Pending',
        message: 'No underwriting request found',
        has_data: false
      });
    }

    const statusData = result.rows[0];
    console.debug('[Underwriting][Status] Status retrieved successfully:', { proposer_id, status: statusData.status });
    
    res.json({
      status: statusData.status,
      message: statusData.message,
      request_id: statusData.request_id,
      created_at: statusData.created_at,
      updated_at: statusData.updated_at,
      has_data: true
    });

  } catch (error) {
    console.error('[Underwriting][Status] Error fetching underwriting status:', error.message);
    res.status(500).json({
      error: 'Failed to fetch underwriting status',
      message: error.message,
      has_data: false
    });
  }
});


// GET underwriting requests
router.get('/underwriting-requests/:proposer_id', async (req, res) => {
  const { proposer_id } = req.params;

  try {
    console.info('[Underwriting][Requests] Fetching underwriting request for proposer:', proposer_id);
    
    const query = `
      SELECT request_id, proposer_id, status, message, created_at, updated_at
      FROM underwriting_requests
      WHERE proposer_id = $1
      ORDER BY created_at DESC
      LIMIT 1
    `;

    const result = await pool.query(query, [proposer_id]);

    if (result.rows.length === 0) {
      console.warn('[Underwriting][Requests] No underwriting request found for proposer:', proposer_id);
      return res.status(404).json({
        success: false,
        message: 'No underwriting request found'
      });
    }

    const statusData = result.rows[0];
    console.debug('[Underwriting][Requests] Request retrieved successfully:', { proposer_id, status: statusData.status });
    
    res.json({
      status: statusData.status,
      message: statusData.message,
      request_id: statusData.request_id,
      created_at: statusData.created_at,
      updated_at: statusData.updated_at
    });
  } catch (error) {
    console.error('[Underwriting][Requests] Error fetching underwriting request:', error.message);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Create test request
// router.post('/create-test-request/:proposer_id', async (req, res) => {
//   const { proposer_id } = req.params;
//   const { payload_json, payload_text } = req.body;
  
//   console.info('[Underwriting][TestRequest] Creating test request for proposer:', proposer_id);

//   try {
//     // Check if a request already exists
//     const existingQuery = `
//       SELECT request_id, status 
//       FROM underwriting_requests 
//       WHERE proposer_id = $1
//       ORDER BY created_at DESC
//       LIMIT 1
//     `;
    
//     const existingResult = await pool.query(existingQuery, [proposer_id]);
    
//     if (existingResult.rows.length > 0) {
//       console.info('[Underwriting][TestRequest] Underwriting request already exists for proposer:', proposer_id);
//       return res.json({
//         success: true,
//         message: 'Test request already exists',
//         data: existingResult.rows[0],
//         existing: true
//       });
//     }

//     // Create new test request
//     const insertQuery = `
//       INSERT INTO underwriting_requests (proposer_id, payload_json, payload_text, status, message, created_at, updated_at)
//       VALUES ($1, $2, $3, 'Pending', 'Test request created', NOW(), NOW())
//       RETURNING *
//     `;
    
//     const insertResult = await pool.query(insertQuery, [
//       proposer_id, 
//       payload_json || null, 
//       payload_text || null
//     ]);
    
//     console.info('[Underwriting][TestRequest] Test request created successfully:', { proposer_id, requestId: insertResult.rows[0].request_id });
    
//     res.json({
//       success: true,
//       message: 'Test request created successfully',
//       data: insertResult.rows[0],
//       existing: false
//     });

//   } catch (error) {
//     console.error('[Underwriting][TestRequest] Error creating test request:', error.message);
//     res.status(500).json({
//       success: false,
//       error: 'Failed to create test request',
//       details: error.message
//     });
//   }
// });

// Alternative test endpoint
// router.post('/underwriting-requests/:proposer_id/test', async (req, res) => {
//   const { proposer_id } = req.params;
//   const { payload_json, payload_text } = req.body;
  
//   console.info('[Underwriting][TestRequest] Creating test request via alternative endpoint for proposer:', proposer_id);

//   try {
//     const existingQuery = `
//       SELECT request_id, status 
//       FROM underwriting_requests 
//       WHERE proposer_id = $1
//       ORDER BY created_at DESC
//       LIMIT 1
//     `;
    
//     const existingResult = await pool.query(existingQuery, [proposer_id]);
    
//     if (existingResult.rows.length > 0) {
//       console.info('[Underwriting][TestRequest] Test request already exists for proposer:', proposer_id);
//       return res.json({
//         success: true,
//         message: 'Test request already exists',
//         data: existingResult.rows[0],
//         existing: true
//       });
//     }

//     const insertQuery = `
//       INSERT INTO underwriting_requests (proposer_id, payload_json, payload_text, status, message, created_at, updated_at)
//       VALUES ($1, $2, $3, 'Pending', 'Test request created', NOW(), NOW())
//       RETURNING *
//     `;
    
//     const insertResult = await pool.query(insertQuery, [
//       proposer_id, 
//       payload_json || null, 
//       payload_text || null
//     ]);
    
//     console.info('[Underwriting][TestRequest] Test request created via alternative endpoint:', { proposer_id, requestId: insertResult.rows[0].request_id });
    
//     res.json({
//       success: true,
//       message: 'Test request created successfully',
//       data: insertResult.rows[0],
//       existing: false
//     });

//   } catch (error) {
//     console.error('[Underwriting][TestRequest] Error creating test request via alternative endpoint:', error.message);
//     res.status(500).json({
//       success: false,
//       error: 'Failed to create test request',
//       details: error.message
//     });
//   }
// });

// General create underwriting request endpoint
router.post('/underwriting-requests/:proposer_id', async (req, res) => {
  const { proposer_id } = req.params;
  const { payload_json, payload_text, status = 'Pending', message } = req.body;
  
  try {
    console.info('[Underwriting][Create] Creating underwriting request for proposer:', { proposer_id, status });
    
    const existingQuery = `
      SELECT request_id, status 
      FROM underwriting_requests 
      WHERE proposer_id = $1
      ORDER BY created_at DESC
      LIMIT 1
    `;
    
    const existingResult = await pool.query(existingQuery, [proposer_id]);
    
    if (existingResult.rows.length > 0) {
      console.info('[Underwriting][Create] Underwriting request already exists for proposer:', proposer_id);
      return res.json({
        success: true,
        message: 'Underwriting request already exists',
        data: existingResult.rows[0],
        existing: true
      });
    }

    const insertQuery = `
      INSERT INTO underwriting_requests (proposer_id, payload_json, payload_text, status, message, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
      RETURNING *
    `;
    
    const insertResult = await pool.query(insertQuery, [
      proposer_id, 
      payload_json || null, 
      payload_text || null,
      status,
      message || null
    ]);
    
    console.info('[Underwriting][Create] Underwriting request created successfully:', { proposer_id, requestId: insertResult.rows[0].request_id, status });
    
    res.json({
      success: true,
      message: 'Underwriting request created successfully',
      data: insertResult.rows[0],
      existing: false
    });

  } catch (error) {
    console.error('[Underwriting][Create] Error creating underwriting request:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to create underwriting request',
      details: error.message
    });
  }
});

// PATCH endpoint for updating status
router.patch('/underwriting-requests/:proposer_id/status', async (req, res) => {
  const { proposer_id } = req.params;
  const { status, message } = req.body;
  
  console.info('[Underwriting][StatusUpdate] PATCH request received for proposer:', { proposer_id, status, message });
  
  if (!proposer_id) {
    console.warn('[Underwriting][StatusUpdate] Missing proposer_id parameter');
    return res.status(400).json({
      success: false,
      error: 'Missing proposer_id parameter'
    });
  }

  if (!status) {
    console.warn('[Underwriting][StatusUpdate] Missing status in request body');
    return res.status(400).json({
      success: false,
      error: 'Missing status in request body'
    });
  }
  
  const validStatuses = ['Documents Uploaded', 'Approved', 'Needs Investigation', 'Rejected'];
  
  if (!validStatuses.includes(status)) {
    console.warn('[Underwriting][StatusUpdate] Invalid status provided:', { status, validStatuses });
    return res.status(400).json({
      success: false,
      error: 'Invalid status provided',
      validStatuses,
      received: status
    });
  }
  
  try {
    const checkQuery = `
      SELECT request_id 
      FROM underwriting_requests 
      WHERE proposer_id = $1
      ORDER BY created_at DESC
      LIMIT 1
    `;
    
    const checkResult = await pool.query(checkQuery, [proposer_id]);
    
    if (checkResult.rows.length === 0) {
      console.info('[Underwriting][StatusUpdate] Creating new underwriting request with status:', { proposer_id, status });
      
      const insertQuery = `
        INSERT INTO underwriting_requests (proposer_id, status, message, created_at, updated_at)
        VALUES ($1, $2, $3, NOW(), NOW())
        RETURNING *
      `;
      
      const insertResult = await pool.query(insertQuery, [proposer_id, status, message || null]);
      
      console.info('[Underwriting][StatusUpdate] New underwriting request created successfully:', { proposer_id, status, requestId: insertResult.rows[0].request_id });
      
      return res.status(200).json({
        success: true,
        message: `New underwriting request created with status: ${status}`,
        data: insertResult.rows[0],
        timestamp: new Date().toISOString()
      });
    } else {
      console.info('[Underwriting][StatusUpdate] Updating existing underwriting request status:', { proposer_id, status });
      
      const updateQuery = `
        UPDATE underwriting_requests
        SET status = $1, message = $2, updated_at = NOW()
        WHERE proposer_id = $3
        RETURNING *
      `;
      
      const updateResult = await pool.query(updateQuery, [status, message || null, proposer_id]);
      
      console.info('[Underwriting][StatusUpdate] Status updated successfully:', { proposer_id, status, requestId: updateResult.rows[0].request_id });
      
      return res.status(200).json({
        success: true,
        message: `Status successfully updated to ${status}`,
        data: updateResult.rows[0],
        timestamp: new Date().toISOString()
      });
    }
    
  } catch (error) {
    console.error('[Underwriting][StatusUpdate] Database error:', error.message);
    
    return res.status(500).json({
      success: false,
      error: 'Failed to update status',
      details: error.message,
      code: error.code,
      proposer_id: proposer_id
    });
  }
});

export default router;
