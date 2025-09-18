import express from 'express';
import pool from '../config/db.js';
import { prettyLog } from '../config/logger.js';

const router = express.Router();
// Add this route to get premium amount
router.get('/proposers/:proposer_id/insurance-details', async (req, res) => {
  try {
    const { proposer_id } = req.params;
    console.info('[Proposers][InsuranceDetails] Fetching insurance details for proposer:', proposer_id);
    
    const result = await pool.query(
      'SELECT premium_amount FROM proposer WHERE proposer_id = $1',
      [proposer_id]
    );
    
    if (result.rows.length === 0) {
      console.warn('[Proposers][InsuranceDetails] Proposer not found:', proposer_id);
      return res.status(404).json({ error: 'Proposer not found' });
    }
    
    console.debug('[Proposers][InsuranceDetails] Insurance details retrieved successfully:', { proposer_id, premium_amount: result.rows[0].premium_amount });
    res.json({ premium_amount: result.rows[0].premium_amount });
  } catch (error) {
    console.error('[Proposers][InsuranceDetails] Error fetching premium amount:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add this route to get insured members
router.get('/insured-members/:proposer_id', async (req, res) => {
  try {
    const { proposer_id } = req.params;
    console.info('[Proposers][InsuredMembers] Fetching insured members for proposer:', proposer_id);
    
    const result = await pool.query(
      'SELECT member_id, name, sum_insured FROM insured_member WHERE proposer_id = $1',
      [proposer_id]
    );
    
    if (result.rows.length === 0) {
      console.warn('[Proposers][InsuredMembers] No insured members found for proposer:', proposer_id);
      return res.json({ sum_insured: null });
    }
    
    console.debug('[Proposers][InsuredMembers] Insured members retrieved successfully:', { proposer_id, memberCount: result.rows.length });
    // Return all members - frontend will handle aggregation
    res.json(result.rows);
  } catch (error) {
    console.error('[Proposers][InsuredMembers] Error fetching insured members:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/proposers/:proposer_id', async (req, res) => {
  const { proposer_id } = req.params;
  prettyLog('Proposer details request received', { proposer_id }, { level: 'info' });

  try {
    console.info('[Proposers][Details] Fetching proposer details:', proposer_id);
    
    const query = `
      SELECT 
    p1.proposer_id,
    p1.customer_name,
    p1.dob,
    p1.pan_number,
    p1.annual_income,
    p1.phone_number,
    p1.mobile,
    p1.email,
    p1.employment_type,
    p1.address,
    p1.city,
    p1.state,
    p1.pin_code,
    p2.proposal_number
FROM proposer p1
JOIN proposal p2 
    ON p1.proposer_id = p2.proposer_id
WHERE p1.proposer_id = $1;
    `;
    const result = await pool.query(query, [proposer_id]);

    prettyLog('Proposer query result', {
      proposer_id,
      found: result.rows.length > 0,
      employment_type: result.rows[0]?.employment_type // Add this for debugging
    }, { level: 'debug' });

    if (result.rows.length === 0) {
      prettyLog('Proposer not found', { proposer_id }, { level: 'warn' });
      console.warn('[Proposers][Details] Proposer not found:', proposer_id);
      return res.status(404).json({ error: `Proposer with ID ${proposer_id} not found` });
    }

    prettyLog('Proposer details retrieved successfully', { proposer_id, customer_name: result.rows[0].customer_name }, { level: 'info' });
    console.debug('[Proposers][Details] Proposer details retrieved successfully:', { proposer_id, customer_name: result.rows[0].customer_name });
    res.json(result.rows[0]);
  } catch (error) {
    prettyLog('Proposer lookup failed', {
      proposer_id,
      error: error.message
    }, { level: 'error' });
    console.error('[Proposers][Details] Error fetching proposer details:', error.message);
    res.status(500).json({ error: `Internal Server Error: ${error.message}` });
  }
});

export default router;
