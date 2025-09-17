import express from 'express';
import pool from '../config/db.js';
import { s3Client } from '../config/aws.js';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { prettyLog } from '../config/logger.js';
const router = express.Router();

// Fetch all documents
router.get('/documents', async (req, res) => {
  prettyLog('Documents list requested');

  try {
    const query = `
      SELECT 
        d.id,
        d.document_type,
        d.extracted_data,
        d.validated,
        d.source_url,
        d.member_id,
        p.proposer_id
      FROM documents d
      LEFT JOIN proposal p ON d.proposal_number = p.proposal_number
    `;
    const result = await pool.query(query);

    const documents = result.rows.map(doc => ({
      id: doc.id,
      name: doc.document_type || 'Unknown Document',
      checklist: doc.validated ? 'Verified' : 'Processing',
      metadata: doc.extracted_data || 'Pending',
      status: doc.validated ? 'Processed and Verified' : 'Pending',
      source_url: doc.source_url,
      proposer_id: doc.proposer_id,
      member_id: doc.member_id,
      tag: {
        label: doc.validated ? 'Verified' : 'Processing',
        color: doc.validated ? '#10B981' : '#1677FF',
        bg: doc.validated ? '#D1FAE5' : '#E6F4FF',
        border: doc.validated ? '#10B981' : '#91CAFF',
      },
    }));
    console.log('Mapped all documents:', documents);
    res.json(documents);
  } catch (error) {
    prettyLog('Documents query failed', { error: error.message });
    res.status(500).json({ error: `Internal Server Error: ${error.message}` });
  }
});

// Fetch documents by proposer_id
router.get('/documents/:proposer_id', async (req, res) => {
  const { proposer_id } = req.params;
  console.log('Fetching documents for proposer_id:', proposer_id);

  try {
    const query = `
      SELECT 
        d.id,
        d.document_type,
        d.extracted_data,
        d.validated,
        d.source_url,
        d.proposal_number,
        d.member_id,
        p.proposer_id,
        prop.customer_name
      FROM documents d
      JOIN proposal p ON d.proposal_number = p.proposal_number
      JOIN proposer prop ON p.proposer_id = prop.proposer_id
      WHERE p.proposer_id = $1
      ORDER BY d.id DESC
    `;

    const result = await pool.query(query, [proposer_id]);
    console.log(`Found ${result.rows.length} documents for proposer ${proposer_id}`);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: `No documents found for proposer ${proposer_id}` });
    }

    const documents = result.rows.map(doc => ({
      id: doc.id,
      name: doc.document_type || 'Unknown Document',
      document_type: doc.document_type,
      checklist: doc.validated ? 'Verified' : 'Processing',
      metadata: doc.extracted_data || 'Pending',
      extracted_data: doc.extracted_data,  // ✅ Add this line
      validated: doc.validated,
      status: doc.validated ? 'Processed and Verified' : 'Pending',
      source_url: doc.source_url,
      proposer_id: doc.proposer_id,
      proposal_number: doc.proposal_number,
      member_id: doc.member_id,
      customer_name: doc.customer_name,
      date: new Date().toISOString(),
      tag: {
        label: doc.validated ? 'Verified' : 'Processing',
        color: doc.validated ? '#10B981' : '#1677FF',
        bg: doc.validated ? '#D1FAE5' : '#E6F4FF',
        border: doc.validated ? '#10B981' : '#91CAFF',
      },
    }));

    console.log('Mapped documents for proposer:', documents);
    res.json(documents);
  } catch (error) {
    console.error('Error fetching documents for proposer:', error.stack);
    res.status(500).json({ error: `Internal Server Error: ${error.message}` });
  }
});

// Fetch document pre-signed URL by document ID
router.get('/documents/preview/:id', async (req, res) => {
  console.log('Document preview function called with params:', req.params);
  const { id } = req.params;
  prettyLog('Document URL request', { documentId: id });

  try {
    const query = 'SELECT source_url, document_type FROM documents WHERE id = $1';
    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: `Document with ID ${id} not found` });
    }

    const { source_url, document_type } = result.rows[0];
    prettyLog('Document found', { documentId: id, document_type, source_url });

    if (!source_url || !source_url.startsWith('s3://')) {
      prettyLog('Invalid S3 URL', { documentId: id, source_url });
      return res.status(400).json({ error: `Invalid S3 URL for document ${id}: ${source_url}` });
    }

    const bucketName = source_url.split('/')[2];
    const key = source_url.split('/').slice(3).join('/');

    if (!bucketName || !key) {
      prettyLog('Failed to parse S3 URL', { documentId: id, source_url });
      return res.status(400).json({ error: `Failed to parse S3 URL for document ${id}` });
    }
    console.log('Generating pre-signed URL for preview:', { id, document_type, bucketName, key });
    const command = new GetObjectCommand({ Bucket: bucketName, Key: key });
    const presignedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });

    prettyLog('Pre-signed URL generated successfully', { documentId: id });
    res.json({ pdfUrl: presignedUrl });
  } catch (error) {
    console.error('Error fetching document preview URL:', error.stack);
    res.status(500).json({ error: `Internal Server Error: ${error.message}` });
  }
});

export default router;
