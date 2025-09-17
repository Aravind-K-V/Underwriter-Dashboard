import express from 'express';
import pool from '../config/db.js';
import { prettyLog } from '../config/logger.js';

const router = express.Router();

// Get customers with rule engine data
router.get('/customers', async (req, res) => {
  prettyLog('Customers list requested');
  
  try {
    const { status } = req.query;
    let query = `
      SELECT 
        p.proposal_number,
        pr.proposer_id,
        pr.customer_name,
        p.product_name,
        pr.created_date AS proposal_date,
        ur.status AS tag,
        ret.mc_required,
        ret.finreview_required,
        ret.televideoagent_required,
        ret.rule_status
      FROM proposal p
      JOIN proposer pr ON p.proposer_id = pr.proposer_id
      JOIN Underwriting_Requests ur ON p.proposal_number = ur.proposal_no
      JOIN Rule_Engine_Trail ret ON p.proposal_number = ret.proposal_number
      WHERE ur.status IS NOT NULL
      AND ret.rule_status != 'STP-Accept'
    `;
    const params = [];

    // Handle different status filters
    if (status && status !== 'All Applications') {
      if (status === 'Pending') {
        // Show only applications with "Pending" status
        query += ' AND ur.status = $1';
        params.push('Pending');
      } else {
        // Handle other specific statuses (Approved, Rejected, etc.)
        query += ' AND ur.status = $1';
        params.push(status);
      }
    }

    const result = await pool.query(query, params);
    
    prettyLog('Customers query result', {
      totalCustomers: result.rows.length,
      status: status || 'All',
      customers: result.rows.length <= 5 ? result.rows : result.rows.slice(0, 5).concat([{ summary: `... and ${result.rows.length - 5} more` }])
    });
    
    res.json(result.rows);
  } catch (error) {
    prettyLog('Customers query failed', { error: error.message });
    res.status(500).send('Internal Server Error');
  }
});
// ✅ NEW: Update proposal status
router.patch('/proposal/:proposer_id/status', async (req, res) => {
  try {
    const { proposer_id } = req.params;
    const { status } = req.body;
    
    const query = `
      UPDATE Underwriting_Requests 
      SET status = $1, updated_at = NOW()
      FROM proposal p
      WHERE Underwriting_Requests.proposal_no = p.proposal_number 
      AND p.proposer_id = $2
      RETURNING *
    `;
    
    const result = await pool.query(query, [status, proposer_id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Proposal not found' });
    }
    
    prettyLog('Proposal status updated', { proposer_id, status });
    res.json({ success: true, updatedRecord: result.rows[0] });
  } catch (error) {
    console.error('Error updating proposal status:', error);
    res.status(500).json({ error: 'Failed to update proposal status' });
  }
});

// ✅ NEW: Get rule engine data for specific proposer
router.get('/review-flags/:proposer_id', async (req, res) => {
  try {
    const { proposer_id } = req.params;
    
    const query = `
      SELECT 
        ret.mc_required,
        ret.finreview_required,
        ret.televideoagent_required,
        ret.rule_status
      FROM proposal p
      JOIN Rule_Engine_Trail ret ON p.proposal_number = ret.proposal_number
      WHERE p.proposer_id = $1
      LIMIT 1
    `;
    
    const result = await pool.query(query, [proposer_id]);
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching review flags:', error);
    res.status(500).json({ error: 'Failed to fetch review flags' });
  }
});

export default router;
