import { prettyLog } from '../config/logger.js';

export function levenshteinDistance(str1, str2) {
  const matrix = [];
  
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  return matrix[str2.length][str1.length];
}

export function calculateStringSimilarity(str1, str2) {
  if (!str1 || !str2) return 0;
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  const editDistance = levenshteinDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

export function comparePANNumbers(extractedPAN, dbPAN) {
  if (!extractedPAN || !dbPAN) {
    return { match: false, confidence: 0.0 };
  }

  const normalizedExtracted = extractedPAN.toString().replace(/\s+/g, '').toUpperCase();
  const normalizedDB = dbPAN.toString().replace(/\s+/g, '').toUpperCase();
  
  console.debug('[StringUtils][PAN] PAN comparison debug:', {
    original_extracted: extractedPAN,
    original_db: dbPAN,
    normalized_extracted: normalizedExtracted,
    normalized_db: normalizedDB
  });

  const panPattern = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
  const extractedValid = panPattern.test(normalizedExtracted);
  const dbValid = panPattern.test(normalizedDB);

  console.debug('[StringUtils][PAN] PAN format validation:', {
    extracted_valid: extractedValid,
    db_valid: dbValid,
    extracted_length: normalizedExtracted.length,
    db_length: normalizedDB.length
  });

  if (normalizedExtracted === normalizedDB) {
    return { 
      match: true, 
      confidence: 1.0,
      details: {
        exact_match: true,
        format_valid: extractedValid && dbValid,
        normalized_extracted: normalizedExtracted,
        normalized_db: normalizedDB
      }
    };
  }

  if (normalizedExtracted.includes(normalizedDB) || normalizedDB.includes(normalizedExtracted)) {
    return { 
      match: true, 
      confidence: 0.9,
      details: {
        partial_match: true,
        format_valid: extractedValid && dbValid,
        normalized_extracted: normalizedExtracted,
        normalized_db: normalizedDB
      }
    };
  }

  const similarity = calculateStringSimilarity(normalizedExtracted, normalizedDB);
  
  if (similarity >= 0.9) {
    return { 
      match: true, 
      confidence: similarity,
      details: {
        similarity_match: true,
        similarity_score: similarity,
        format_valid: extractedValid && dbValid,
        normalized_extracted: normalizedExtracted,
        normalized_db: normalizedDB
      }
    };
  } else if (similarity >= 0.7) {
    return { 
      match: false, 
      confidence: similarity,
      details: {
        low_similarity: true,
        similarity_score: similarity,
        format_valid: extractedValid && dbValid,
        normalized_extracted: normalizedExtracted,
        normalized_db: normalizedDB
      }
    };
  } else {
    return { 
      match: false, 
      confidence: 0.0,
      details: {
        no_match: true,
        similarity_score: similarity,
        format_valid: extractedValid && dbValid,
        normalized_extracted: normalizedExtracted,
        normalized_db: normalizedDB
      }
    };
  }
}