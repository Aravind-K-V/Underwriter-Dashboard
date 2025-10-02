
import pkg from 'fastest-levenshtein';
const { compare } = pkg;
import pool from '../config/db.js';
import { prettyLog } from '../config/logger.js';

export const ensureProcessingResultsTable = async () => {
  try {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS document_processing_results (
        id SERIAL PRIMARY KEY,
        document_id INT REFERENCES documents(id),
        proposer_id INT REFERENCES proposer(proposer_id),
        extracted_data JSONB,
        comparison_result JSONB,
        overall_match BOOLEAN,
        processed_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(document_id)
      )
    `;
    await pool.query(createTableQuery);
    prettyLog('Document processing results table ensured successfully', null, { level: 'info' });
  } catch (error) {
    prettyLog('Failed to create document_processing_results table', { error: error.message }, { level: 'error' });
    throw error;
  }
};

export const compareDocumentData = (extractedData, proposerData, documentType) => {
  const comparisons = {};
  let totalScore = 0;
  let fieldsCompared = 0;

  const verificationSources = {
    name: documentType.toLowerCase() === 'pan_card' ? 'PAN Office' : documentType.toLowerCase() === 'bank_statement' ? 'Bank Statement' : 'Salary Slip',
    dob: 'PAN Office',
    pan: 'PAN Office',
    salary: documentType.toLowerCase() === 'bank_statement' ? 'Bank Statement' : 'Salary Slip',
  };

  const normalizeString = (str) => {
    if (!str) return '';
    // Remove middle initials, extra spaces, and normalize case
    return str.toString().trim().toLowerCase().replace(/\b\w+\.\s*/g, '').replace(/\s+/g, ' ');
  };

  // Compare name with relaxed matching
  if (extractedData.name && proposerData.customer_name) {
    const extractedName = normalizeString(extractedData.name);
    const proposerName = normalizeString(proposerData.customer_name);
    const similarity = compare(extractedName, proposerName);
    // Lower threshold for names to account for variations
    const confidence = similarity >= 0.85 ? 0.95 : similarity >= 0.6 ? 0.75 : 0.2;
    comparisons.name = {
      extracted: extractedData.name,
      database: proposerData.customer_name,
      match: similarity >= 0.6,
      confidence,
      source: verificationSources.name,
    };
    totalScore += confidence;
    fieldsCompared++;
  } else {
    comparisons.name = {
      extracted: extractedData.name,
      database: proposerData.customer_name,
      match: false,
      confidence: 0,
      source: verificationSources.name,
    };
  }

  // Compare DOB (only for PAN card)
  if (documentType.toLowerCase() === 'pan_card' && extractedData.dob && proposerData.dob) {
    const extractedDob = normalizeString(extractedData.dob);
    const proposerDob = normalizeString(proposerData.dob);
    const match = extractedDob === proposerDob;
    comparisons.dob = {
      extracted: extractedData.dob,
      database: proposerData.dob,
      match,
      confidence: match ? 0.99 : 0,
      source: verificationSources.dob,
    };
    totalScore += match ? 0.99 : 0;
    fieldsCompared++;
  }

  // Compare PAN number (only for PAN card)
  if (documentType.toLowerCase() === 'pan_card' && extractedData.pan && proposerData.pan_number) {
    const match = normalizeString(extractedData.pan) === normalizeString(proposerData.pan_number);
    comparisons.pan = {
      extracted: extractedData.pan,
      database: proposerData.pan_number,
      match,
      confidence: match ? 0.99 : 0,
      source: verificationSources.pan,
    };
    totalScore += match ? 0.99 : 0;
    fieldsCompared++;
  }

  // Compare salary (for bank statement or payslip)
  if (['bank_statement', 'payslip'].includes(documentType.toLowerCase()) && extractedData.salary !== null && proposerData.annual_income) {
    const monthlyIncome = proposerData.annual_income / 12;
    const match = Math.abs(extractedData.salary - monthlyIncome) <= monthlyIncome * 0.1;
    const confidence = match ? 0.9 : 0.2;
    comparisons.salary = {
      extracted: extractedData.salary,
      database: monthlyIncome,
      match,
      confidence,
      source: verificationSources.salary,
    };
    totalScore += confidence;
    fieldsCompared++;
  } else if (['bank_statement', 'payslip'].includes(documentType.toLowerCase())) {
    comparisons.salary = {
      extracted: extractedData.salary,
      database: proposerData.annual_income ? proposerData.annual_income / 12 : null,
      match: false,
      confidence: 0,
      source: verificationSources.salary,
    };
  }

  const overallScore = fieldsCompared > 0 ? totalScore / fieldsCompared : 0;

  prettyLog('Document comparison completed', {
    documentType,
    fieldsCompared,
    overallScore,
    comparisons
  }, { level: 'debug' });

  return {
    comparisons,
    overall_score: overallScore,
    fields_compared: fieldsCompared,
    summary: {
      matches: Object.values(comparisons).filter((comp) => comp.match).length,
      total_fields: fieldsCompared,
    },
  };
};
