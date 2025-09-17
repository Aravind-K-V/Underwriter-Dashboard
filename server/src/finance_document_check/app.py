import os
import requests
import json
import psycopg2
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response, JSONResponse
from pydantic import BaseModel
import re
import logging
from typing import Dict, Optional, List, Union
from datetime import datetime
import time
from dotenv import load_dotenv
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity

# ✅ DISTILBERT IMPORTS
try:
    from transformers import AutoTokenizer, AutoModel
    import torch
    DISTILBERT_AVAILABLE = True
except ImportError:
    DISTILBERT_AVAILABLE = False
    logging.error("❌ transformers/torch not available. Install: pip install torch transformers")

# Load environment variables
load_dotenv()

# --- CONFIG FROM ENV ---
DB_CONFIG = {
    "host": os.getenv("DB_HOST"),
    "port": os.getenv("DB_PORT"),
    "database": os.getenv("DB_NAME"),
    "user": os.getenv("DB_USER"),
    "password": os.getenv("DB_PASSWORD")
}

AWS_ACCESS_KEY_ID = os.getenv("AWS_ACCESS_KEY_ID")
AWS_SECRET_ACCESS_KEY = os.getenv("AWS_SECRET_ACCESS_KEY")
AWS_REGION = os.getenv("AWS_REGION")
IDP_API_KEY = os.getenv("IDP_API_KEY")
IDP_API_URL = os.getenv("IDP_API_URL", "http://205.147.102.131:8000/upload/documents")
PYTHON_API_PORT = int(os.getenv("PORT", "8091"))

HEADERS = {"Authorization": f"Bearer {IDP_API_KEY}"}

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ✅ JSON SERIALIZATION HELPERS
def convert_numpy_to_python(obj):
    """Convert numpy types to Python native types for JSON serialization"""
    if isinstance(obj, np.generic):
        return obj.item()
    elif isinstance(obj, np.ndarray):
        return obj.tolist()
    elif isinstance(obj, dict):
        return {key: convert_numpy_to_python(value) for key, value in obj.items()}
    elif isinstance(obj, list):
        return [convert_numpy_to_python(item) for item in obj]
    else:
        return obj

def safe_json_response(data):
    """Create JSON response with numpy type conversion"""
    converted_data = convert_numpy_to_python(data)
    return JSONResponse(content=converted_data)

class DistilBERTSemanticFieldMatcher:
    """Production-ready DistilBERT-only semantic field matcher for document processing"""
    
    def __init__(self):
        # Document-specific field extraction mapping
        self.document_expected_fields = {
            "pan": ["name", "dob", "pan_number"],
            "pan card": ["name", "dob", "pan_number"],
            "itr": ["name", "pan_number", "salary"],
            "itr document": ["name", "pan_number", "salary"],
            "bank statement": ["name", "salary"],
            "payslip": ["name", "salary"],
            "gst_form": ["name", "pan_number", "salary"]
        }
        
        self.salary_keywords = [
            "salary", "pay", "wage", "compensation", "payroll", "income", "earning", "deposit",
            "net_salary", "net_change", "gross_salary", "total_income", "annual_income", "ctc", "take_home"
        ]
        
        # ✅ INITIALIZE DISTILBERT MODEL ONLY
        self._initialize_distilbert_model()
        
        # Performance optimization: cache embeddings
        self.embedding_cache = {}
        self.cache_limit = 2000  # Prevent unlimited memory growth
        
        logger.info(f"✅ DistilBERT Semantic Field Matcher initialized")
        logger.info(f"   - DistilBERT model: {'✅' if self.distilbert_model else '❌'}")

    def _initialize_distilbert_model(self):
        """Initialize DistilBERT model only"""
        self.distilbert_model = None
        self.distilbert_tokenizer = None
        
        if DISTILBERT_AVAILABLE:
            try:
                logger.info("📥 Loading DistilBERT model (this may take a few moments)...")
                self.distilbert_tokenizer = AutoTokenizer.from_pretrained('distilbert-base-uncased')
                self.distilbert_model = AutoModel.from_pretrained('distilbert-base-uncased')
                self.distilbert_model.eval()  # Set to evaluation mode
                
                # Move to GPU if available
                self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
                self.distilbert_model.to(self.device)
                
                logger.info(f"✅ DistilBERT loaded successfully on {self.device}")
            except Exception as e:
                logger.error(f"❌ Failed to load DistilBERT model: {e}")
                self.distilbert_model = None
                self.distilbert_tokenizer = None
        else:
            logger.error("❌ DistilBERT not available. Install: pip install torch transformers")

    def _get_distilbert_embedding(self, text: str) -> np.ndarray:
        """Get DistilBERT embedding with caching for performance"""
        if not self.distilbert_model or not text:
            return np.zeros(768)  # DistilBERT embedding size
        
        text_clean = str(text).strip().lower()
        
        # Use cache for repeated queries
        if text_clean in self.embedding_cache:
            return self.embedding_cache[text_clean]
        
        try:
            # Tokenize and encode
            inputs = self.distilbert_tokenizer(
                text_clean, 
                return_tensors='pt', 
                truncation=True, 
                padding=True, 
                max_length=128
            )
            
            # Move inputs to device
            inputs = {key: value.to(self.device) for key, value in inputs.items()}
            
            with torch.no_grad():
                outputs = self.distilbert_model(**inputs)
                last_hidden_state = outputs.last_hidden_state
                
                # Use mean pooling for better sentence representation
                attention_mask = inputs['attention_mask']
                input_mask_expanded = attention_mask.unsqueeze(-1).expand(last_hidden_state.size()).float()
                sum_embeddings = torch.sum(last_hidden_state * input_mask_expanded, 1)
                sum_mask = torch.sum(input_mask_expanded, 1)
                sum_mask = torch.clamp(sum_mask, min=1e-9)
                mean_embeddings = sum_embeddings / sum_mask
                
                # Convert to numpy
                embedding = mean_embeddings.cpu().numpy()[0]
            
            # Cache management: limit cache size
            if len(self.embedding_cache) >= self.cache_limit:
                # Remove oldest 200 entries
                keys_to_remove = list(self.embedding_cache.keys())[:200]
                for key in keys_to_remove:
                    del self.embedding_cache[key]
                logger.info(f"🗑️ Cleaned embedding cache (removed {len(keys_to_remove)} entries)")
            
            self.embedding_cache[text_clean] = embedding
            return embedding
            
        except Exception as e:
            logger.warning(f"⚠️ DistilBERT embedding error for '{text}': {e}")
            return np.zeros(768)

    def _calculate_distilbert_similarity(self, text1: str, text2: str, context: str = "") -> float:
        """Calculate semantic similarity using DistilBERT embeddings"""
        if not self.distilbert_model:
            logger.error("❌ DistilBERT model not available")
            return 0.0
        
        # Add context to improve semantic understanding
        enhanced_text1 = f"{context} {text1}".strip() if context else text1
        enhanced_text2 = f"{context} {text2}".strip() if context else text2
        
        emb1 = self._get_distilbert_embedding(enhanced_text1)
        emb2 = self._get_distilbert_embedding(enhanced_text2)
        
        try:
            similarity = cosine_similarity([emb1], [emb2])[0][0]
            # ✅ CONVERT TO PYTHON NATIVE FLOAT
            return float(max(0.0, min(1.0, similarity)))  # Clamp between 0-1
        except Exception as e:
            logger.warning(f"⚠️ DistilBERT similarity calculation error: {e}")
            return 0.0

    def _distilbert_name_matching(self, extracted: str, reference: str) -> float:
        """Advanced name matching using DistilBERT"""
        if not extracted or not reference:
            return 0.0
        
        extracted_clean = str(extracted).strip()
        reference_clean = str(reference).strip()
        
        # 1. EXACT MATCH
        if extracted_clean.lower() == reference_clean.lower():
            logger.info(f"👤 EXACT name match: '{extracted_clean}' = '{reference_clean}'")
            return 1.0
        
        # 2. DISTILBERT SEMANTIC SIMILARITY
        semantic_score = self._calculate_distilbert_similarity(extracted_clean, reference_clean, "person full name")
        logger.info(f"👤 DistilBERT semantic name score: {semantic_score:.3f}")
        
        # 3. TOKEN-BASED MATCHING WITH DISTILBERT
        token_score = self._token_name_matching_distilbert(extracted_clean, reference_clean)
        logger.info(f"👤 DistilBERT token name score: {token_score:.3f}")
        
        # 4. WEIGHTED COMBINATION
        final_score = (semantic_score * 0.7) + (token_score * 0.3)
        
        logger.info(f"👤 FINAL DistilBERT name match: '{extracted_clean}' vs '{reference_clean}' = {final_score:.3f}")
        return final_score

    def _token_name_matching_distilbert(self, name1: str, name2: str) -> float:
        """Token-based name matching with DistilBERT semantic similarity"""
        tokens1 = set(name1.lower().split())
        tokens2 = set(name2.lower().split())
        
        if not tokens1 or not tokens2:
            return 0.0
        
        # Direct token overlap
        direct_overlap = len(tokens1.intersection(tokens2))
        total_tokens = len(tokens1.union(tokens2))
        
        # Semantic token matching using DistilBERT
        semantic_matches = 0
        for token1 in tokens1:
            best_match = 0.0
            for token2 in tokens2:
                if token1 == token2:
                    best_match = 1.0
                    break
                else:
                    sem_sim = self._calculate_distilbert_similarity(token1, token2)
                    best_match = max(best_match, sem_sim)
            
            if best_match > 0.8:  # High threshold for token matching
                semantic_matches += best_match
        
        # Combine direct and semantic token matching
        direct_ratio = direct_overlap / total_tokens if total_tokens > 0 else 0.0
        semantic_ratio = semantic_matches / max(len(tokens1), len(tokens2)) if tokens1 or tokens2 else 0.0
        
        return max(direct_ratio, semantic_ratio)

    def _distilbert_salary_matching(self, extracted: str, reference: str) -> float:
        """Advanced salary matching with 10% tolerance and DistilBERT semantic understanding"""
        try:
            # 1. NUMERIC EXTRACTION
            extracted_num = float(re.sub(r'[^\d.]', '', str(extracted)))
            reference_num = float(re.sub(r'[^\d.]', '', str(reference)))
            
            if extracted_num == reference_num:
                logger.info(f"💰 EXACT salary match: {extracted_num} = {reference_num}")
                return 1.0
            
            # 2. 10% TOLERANCE RULE
            if reference_num == 0:
                return 1.0 if extracted_num == 0 else 0.0
            
            percentage_diff = abs(extracted_num - reference_num) / reference_num * 100
            
            # Within 10% = perfect match
            if percentage_diff <= 10.0:
                logger.info(f"💰 SALARY TOLERANCE MATCH: {percentage_diff:.2f}% difference (within 10%)")
                return 1.0
            
            # Beyond 50% = very poor match
            max_acceptable_diff = 50.0
            if percentage_diff >= max_acceptable_diff:
                logger.warning(f"💰 SALARY MAJOR MISMATCH: {percentage_diff:.2f}% difference")
                
                # Try DistilBERT semantic matching as last resort
                semantic_score = self._calculate_distilbert_similarity(
                    f"salary amount {extracted}", 
                    f"salary amount {reference}",
                    "financial compensation money"
                ) * 0.3  # Heavily penalized
                
                return semantic_score
            
            # Linear scaling between 10% and 50%
            numeric_score = 1.0 - ((percentage_diff - 10.0) / (max_acceptable_diff - 10.0))
            
            # 3. DISTILBERT SEMANTIC CONTEXT MATCHING
            semantic_score = self._calculate_distilbert_similarity(
                f"salary income {extracted}", 
                f"salary income {reference}",
                "financial amount compensation"
            )
            
            # Weighted combination (favor numeric)
            final_score = (numeric_score * 0.8) + (semantic_score * 0.2)
            
            logger.info(f"💰 DISTILBERT SALARY SCALED MATCH: {percentage_diff:.2f}% diff, Numeric:{numeric_score:.3f}, Semantic:{semantic_score:.3f}, Final:{final_score:.3f}")
            return max(0.0, final_score)
            
        except (ValueError, ZeroDivisionError, TypeError) as e:
            logger.error(f"❌ Salary numeric extraction failed: {str(e)}")
            
            # Fallback to pure DistilBERT semantic matching
            semantic_score = self._calculate_distilbert_similarity(
                str(extracted), 
                str(reference),
                "salary income amount compensation"
            )
            logger.info(f"💰 DISTILBERT SALARY SEMANTIC FALLBACK: {semantic_score:.3f}")
            return semantic_score

    def _distilbert_date_matching(self, extracted: str, reference: str) -> float:
        """Advanced date matching with normalization and DistilBERT semantic understanding"""
        if not extracted or not reference:
            return 0.0
        
        # 1. STRICT DATE NORMALIZATION
        try:
            extracted_normalized = self._normalize_date_strict(extracted)
            reference_normalized = self._normalize_date_strict(reference)
            
            if extracted_normalized == reference_normalized:
                logger.info(f"📅 EXACT date match: '{extracted}' -> '{extracted_normalized}'")
                return 1.0
            
            # 2. DISTILBERT SEMANTIC SIMILARITY FOR DATE FORMATS
            semantic_score = self._calculate_distilbert_similarity(
                extracted_normalized, 
                reference_normalized,
                "date of birth calendar date"
            )
            
            logger.info(f"📅 DISTILBERT DATE semantic match: '{extracted}' vs '{reference}' = {semantic_score:.3f}")
            return semantic_score
            
        except Exception as e:
            logger.error(f"❌ Date matching error: {e}")
            return 0.0

    def _distilbert_pan_matching(self, extracted: str, reference: str) -> float:
        """PAN number matching with format validation and DistilBERT semantic fallback"""
        if not extracted or not reference:
            return 0.0
        
        # PAN format: AAAAA9999A
        pan_pattern = re.compile(r'^[A-Z]{5}[0-9]{4}[A-Z]{1}$')
        
        extracted_clean = extracted.upper().strip()
        reference_clean = reference.upper().strip()
        
        # 1. EXACT MATCH
        if extracted_clean == reference_clean:
            logger.info(f"🆔 EXACT PAN match: '{extracted_clean}'")
            return 1.0
        
        # 2. FORMAT VALIDATION
        extracted_valid = bool(pan_pattern.match(extracted_clean))
        reference_valid = bool(pan_pattern.match(reference_clean))
        
        if extracted_valid and reference_valid:
            # Character-by-character comparison for valid PANs
            matches = sum(1 for a, b in zip(extracted_clean, reference_clean) if a == b)
            char_similarity = matches / len(reference_clean)
            
            logger.info(f"🆔 PAN character match: '{extracted_clean}' vs '{reference_clean}' = {char_similarity:.3f}")
            
            # High threshold for PAN numbers (must be very similar)
            return char_similarity if char_similarity >= 0.9 else 0.0
        
        else:
            logger.warning(f"⚠️ Invalid PAN format detected: '{extracted_clean}' or '{reference_clean}'")
            
            # DistilBERT semantic similarity for malformed PANs (reduced confidence)
            semantic_score = self._calculate_distilbert_similarity(
                extracted_clean, 
                reference_clean,
                "PAN permanent account number identification"
            ) * 0.5  # Penalty for invalid format
            
            logger.info(f"🆔 DISTILBERT PAN semantic fallback: {semantic_score:.3f}")
            return semantic_score

    # ✅ MAIN DISTILBERT FIELD SIMILARITY METHOD
    def _calculate_field_similarity(self, field_name: str, extracted: str, reference: str) -> float:
        """Production DistilBERT field similarity calculation"""
        
        logger.info(f"🔍 Calculating {field_name} DistilBERT similarity: '{extracted}' vs '{reference}'")
        
        if field_name == "pan_number":
            return self._distilbert_pan_matching(extracted, reference)
        
        elif field_name == "dob":
            return self._distilbert_date_matching(extracted, reference)
        
        elif field_name == "name":
            return self._distilbert_name_matching(extracted, reference)
        
        elif field_name == "salary":
            return self._distilbert_salary_matching(extracted, reference)
        
        else:
            # Generic DistilBERT semantic matching for other fields
            semantic_score = self._calculate_distilbert_similarity(extracted, reference, field_name)
            logger.info(f"🔍 Generic {field_name} DistilBERT semantic match: {semantic_score:.3f}")
            return semantic_score

    # ✅ ALL OTHER METHODS (document processing, multi-page, etc.)
    def merge_multi_page_data(self, pages_data: List[dict]) -> dict:
        """Merge data from multiple pages into a single comprehensive object"""
        merged_data = {}
        all_transactions = []
        page_count = 0
        logger.info(f"📄 Merging data from {len(pages_data)} pages")
        
        for page_data in pages_data:
            if not isinstance(page_data, dict):
                continue
            page_count += 1
            logger.info(f"📋 Processing page {page_count}: {list(page_data.keys())}")
            
            # Skip pages with only text content or minimal data
            if len(page_data) <= 2 and any(key in page_data for key in ["text", "page"]):
                logger.info(f"⏭️ Skipping page {page_count} - contains only text/page info")
                continue
            
            for key, value in page_data.items():
                if key in ["page"]:
                    continue
                
                # Handle transactions specially - merge all pages
                if key in ["transaction_history", "transactions"]:
                    if isinstance(value, list):
                        all_transactions.extend(value)
                        logger.info(f"📊 Added {len(value)} transactions from page {page_count}")
                    continue
                
                # For other fields, use first non-null value found
                if key not in merged_data and value is not None:
                    merged_data[key] = value
                    logger.info(f"✅ Added field from page {page_count}: '{key}': '{value}'")
        
        if all_transactions:
            merged_data["transaction_history"] = all_transactions
            merged_data["transactions"] = all_transactions
            logger.info(f"📊 Total merged transactions: {len(all_transactions)}")
        
        logger.info(f"✅ Multi-page merge complete. Final keys: {list(merged_data.keys())}")
        return merged_data

    def detect_document_type(self, json_data: Union[dict, list]) -> str:
        """Auto-detect document type from JSON structure"""
        data_to_check = json_data
        if isinstance(json_data, list):
            if len(json_data) == 0:
                return "unknown"
            
            best_page = None
            best_score = 0
            for page in json_data:
                if isinstance(page, dict):
                    if len(page) <= 2 and any(key in page for key in ["text", "page"]):
                        continue
                    score = len([k for k, v in page.items() if v is not None and k != "page"])
                    if score > best_score:
                        best_score = score
                        best_page = page
            data_to_check = best_page if best_page else json_data[0]
            logger.info(f"📄 Multi-page document detected. Using page with {best_score} fields for type detection.")
        
        if not isinstance(data_to_check, dict):
            return "unknown"
        
        data_str = json.dumps(data_to_check).lower()
        
        # Check for bank statement indicators
        bank_indicators = ["account_holder", "account_number", "transaction_history", "transactions", 
                          "opening_balance", "closing_balance", "statement_period", "deposits", "payments"]
        if any(indicator in data_to_check for indicator in bank_indicators):
            logger.info("🏦 Detected document type: bank_statement")
            return "bank statement"
        
        # Check for ITR form indicators
        itr_indicators = ["acknowledgement number", "assessment year", "total income", "itr", 
                         "income tax", "filing", "pan", "net tax payable"]
        if any(indicator in data_str for indicator in itr_indicators):
            logger.info("📄 Detected document type: itr_form")
            return "itr document"
        
        # Check for PAN card indicators
        pan_indicators = ["pan", "permanent account", "income tax department"]
        if any(indicator in data_str for indicator in pan_indicators):
            logger.info("🆔 Detected document type: pan_card")
            return "pan"
        
        logger.info("❓ Could not detect document type, defaulting to: payslip")
        return "payslip"

    def extract_salary_from_bank_statement(self, json_data: dict) -> Optional[float]:
        """Extract salary from bank statement transactions or summary fields and convert to annual"""
        salary_amounts = []
        transactions = []
        if "transaction_history" in json_data:
            transactions = json_data["transaction_history"]
        elif "transactions" in json_data:
            transactions = json_data["transactions"]
        
        logger.info(f"🏦 Processing {len(transactions)} transactions for salary detection")
        
        for transaction in transactions:
            description = transaction.get("description", "").lower()
            if any(keyword in description for keyword in self.salary_keywords):
                amount = None
                if "deposits" in transaction and transaction["deposits"]:
                    amount = transaction["deposits"]
                elif "credit" in transaction and transaction["credit"]:
                    amount = transaction["credit"]
                
                if amount:
                    cleaned_amount = self._clean_amount(amount)
                    if cleaned_amount and cleaned_amount > 0:
                        salary_amounts.append(cleaned_amount)
                        logger.info(f"💰 Found monthly salary transaction: {description} - {amount} ({cleaned_amount})")
        
        # If no transaction-based salary found, look for summary fields
        if not salary_amounts:
            logger.info("🔍 No transaction salaries found, checking summary fields")
            summary_patterns = ["net change", "net_change", "net salary", "net_salary", "total credit", "total_credit"]
            
            for key, value in json_data.items():
                if value is None:
                    continue
                
                key_lower = key.lower()
                for pattern in summary_patterns:
                    # Use DistilBERT semantic similarity instead of fuzzy ratio
                    if pattern in key_lower or self._calculate_distilbert_similarity(key_lower, pattern) > 0.85:
                        cleaned_amount = self._clean_amount(value)
                        if cleaned_amount and cleaned_amount > 0:
                            salary_amounts.append(cleaned_amount)
                            logger.info(f"💰 Found summary salary field: {key} - {value} ({cleaned_amount})")
                            break
                if salary_amounts:
                    break
        
        if salary_amounts:
            monthly_salary = max(salary_amounts)  # Get highest monthly salary
            # ✅ CONVERT MONTHLY TO ANNUAL FOR BANK STATEMENTS
            annual_salary = monthly_salary * 12
            logger.info(f"🏆 Selected monthly salary: {monthly_salary}")
            logger.info(f"📅 Converted to annual salary: {annual_salary} (monthly × 12)")
            return annual_salary
        
        logger.info("⚠️ No salary found in bank statement")
        return None

    def extract_salary_from_itr(self, json_data: dict) -> Optional[float]:
        """Extract salary/income from ITR form"""
        income_fields = ["Total Income", "total_income", "Gross Total Income", "gross_total_income",
                         "Income from Salary", "salary_income", "Annual Income", "annual_income"]
        
        for field in income_fields:
            if field in json_data:
                amount = json_data[field]
                cleaned_amount = self._clean_amount(amount)
                if cleaned_amount:
                    logger.info(f"💰 Found ITR income: {field} - {amount} ({cleaned_amount})")
                    return cleaned_amount
        
        logger.info("⚠️ No income fields found in ITR form")
        return None

    def _clean_amount(self, amount: Union[str, int, float]) -> Optional[float]:
        """Clean and convert amount to float"""
        if amount is None:
            return None
        
        if isinstance(amount, (int, float)):
            return float(amount)
        
        if isinstance(amount, str):
            cleaned = re.sub(r'[$₹,\s]', '', amount.strip())
            try:
                return float(cleaned)
            except ValueError:
                logger.warning(f"⚠️ Could not convert amount: {amount}")
                return None
        
        return None

    def _find_field_value(self, json_data: dict, field_type: str) -> Optional[str]:
        """Find field value using DistilBERT semantic similarity with PAN regex extraction"""
        field_patterns = {
            "name": ["name", "full_name", "fullname", "customer_name", "applicant_name", 
                    "employee_name", "client_name", "person_name", "individual_name",
                    "holder_name", "account_holder", "cardholder_name"],
            "dob": ["dob", "date_of_birth", "birth_date", "birthdate", "date_birth", "born_date"],
            "pan_number": ["pan", "pan_number", "pannumber", "pan_card", "pancard", "pan_card_number", "pan_no"],
            "salary": ["salary", "net_salary", "net_change", "net change", "gross_salary", "total_income", "annual_income", 
                    "ctc", "take_home", "income", "earning", "total_salary"]
        }
        
        patterns = field_patterns.get(field_type, [])
        
        # Direct field matching (exact)
        for pattern in patterns:
            if pattern in json_data and json_data[pattern] is not None:
                value = json_data[pattern]
                # ✅ SPECIAL PAN NUMBER EXTRACTION
                if field_type == "pan_number":
                    extracted_pan = self._extract_pan_from_text(str(value))
                    if extracted_pan:
                        return extracted_pan
                return value
        
        # DistilBERT semantic field matching
        for key, value in json_data.items():
            if value is None:
                continue
            
            key_lower = key.lower()
            for pattern in patterns:
                if pattern in key_lower:
                    # ✅ SPECIAL PAN NUMBER EXTRACTION
                    if field_type == "pan_number":
                        extracted_pan = self._extract_pan_from_text(str(value))
                        if extracted_pan:
                            return extracted_pan
                    return value
                
                # Use DistilBERT semantic similarity
                semantic_similarity = self._calculate_distilbert_similarity(key_lower, pattern)
                if semantic_similarity > 0.80:
                    logger.info(f"🔍 DistilBERT semantic field match: '{key}' -> '{pattern}' (similarity: {semantic_similarity:.3f})")
                    # ✅ SPECIAL PAN NUMBER EXTRACTION
                    if field_type == "pan_number":
                        extracted_pan = self._extract_pan_from_text(str(value))
                        if extracted_pan:
                            return extracted_pan
                    return value
        
        return None
    def _extract_pan_from_text(self, text: str) -> Optional[str]:
        """Extract PAN number from text using regex"""
        import re
        # PAN format: AAAAA9999A (5 letters, 4 digits, 1 letter)
        pan_pattern = re.compile(r'[A-Z]{5}[0-9]{4}[A-Z]{1}')
        match = pan_pattern.search(text.upper())
        if match:
            extracted_pan = match.group()
            logger.info(f"🆔 Extracted PAN from text '{text}' -> '{extracted_pan}'")
            return extracted_pan
        
        logger.warning(f"⚠️ No valid PAN found in text: '{text}'")
        return None

    def _search_pan_in_all_fields(self, json_data: dict) -> Optional[str]:
        """Search for PAN number across all fields in the JSON data"""
        import re
        pan_pattern = re.compile(r'[A-Z]{5}[0-9]{4}[A-Z]{1}')
        
        # Search in all string values in the JSON
        for key, value in json_data.items():
            if value is None:
                continue
                
            # Convert value to string and search for PAN pattern
            value_str = str(value).upper()
            match = pan_pattern.search(value_str)
            if match:
                extracted_pan = match.group()
                logger.info(f"🆔 Found PAN number '{extracted_pan}' in field '{key}': '{value}'")
                return extracted_pan
        
        # If not found in direct fields, search in nested structures
        for key, value in json_data.items():
            if isinstance(value, dict):
                nested_pan = self._search_pan_in_all_fields(value)
                if nested_pan:
                    return nested_pan
            elif isinstance(value, list):
                for item in value:
                    if isinstance(item, dict):
                        nested_pan = self._search_pan_in_all_fields(item)
                        if nested_pan:
                            return nested_pan
                    elif isinstance(item, str):
                        match = pan_pattern.search(item.upper())
                        if match:
                            extracted_pan = match.group()
                            logger.info(f"🆔 Found PAN number '{extracted_pan}' in list item: '{item}'")
                            return extracted_pan
        
        logger.warning("⚠️ No PAN number found in any field")
        return None

    def _find_field_value(self, json_data: dict, field_type: str) -> Optional[str]:
        """Find field value using DistilBERT semantic similarity with enhanced PAN regex extraction"""
        field_patterns = {
            "name": ["name", "full_name", "fullname", "customer_name", "applicant_name", 
                    "employee_name", "client_name", "person_name", "individual_name",
                    "holder_name", "account_holder", "cardholder_name"],
            "dob": ["dob", "date_of_birth", "birth_date", "birthdate", "date_birth", "born_date"],
            "pan_number": ["pan", "pan_number", "pannumber", "pan_card", "pancard", "pan_card_number", "pan_no"],
            "salary": ["salary", "net_salary", "net_change", "net change", "gross_salary", "total_income", "annual_income", 
                    "ctc", "take_home", "income", "earning", "total_salary"]
        }
        
        patterns = field_patterns.get(field_type, [])
        
        # ✅ SPECIAL HANDLING FOR PAN NUMBER - SEARCH ACROSS ALL FIELDS FIRST
        if field_type == "pan_number":
            # Try to find PAN number anywhere in the JSON data
            pan_from_search = self._search_pan_in_all_fields(json_data)
            if pan_from_search:
                return pan_from_search
        
        # Direct field matching (exact)
        for pattern in patterns:
            if pattern in json_data and json_data[pattern] is not None:
                value = json_data[pattern]
                # ✅ SPECIAL PAN NUMBER EXTRACTION
                if field_type == "pan_number":
                    extracted_pan = self._extract_pan_from_text(str(value))
                    if extracted_pan:
                        return extracted_pan
                return value
        
        # DistilBERT semantic field matching
        for key, value in json_data.items():
            if value is None:
                continue
            
            key_lower = key.lower()
            for pattern in patterns:
                if pattern in key_lower:
                    # ✅ SPECIAL PAN NUMBER EXTRACTION
                    if field_type == "pan_number":
                        extracted_pan = self._extract_pan_from_text(str(value))
                        if extracted_pan:
                            return extracted_pan
                    return value
                
                # Use DistilBERT semantic similarity
                semantic_similarity = self._calculate_distilbert_similarity(key_lower, pattern)
                if semantic_similarity > 0.80:
                    logger.info(f"🔍 DistilBERT semantic field match: '{key}' -> '{pattern}' (similarity: {semantic_similarity:.3f})")
                    # ✅ SPECIAL PAN NUMBER EXTRACTION
                    if field_type == "pan_number":
                        extracted_pan = self._extract_pan_from_text(str(value))
                        if extracted_pan:
                            return extracted_pan
                    return value
        
        return None

    def extract_fields_from_json(self, json_data: Union[dict, list], document_type: str = None) -> dict:
        """Extract and map fields based on document type with DistilBERT semantic logic"""
        
        try:
            # Handle error responses from IDP
            if isinstance(json_data, dict) and "error" in json_data:
                logger.error(f"❌ IDP returned error: {json_data}")
                return {}
            
            # Multi-page handling
            if isinstance(json_data, list) and len(json_data) > 1:
                logger.info(f"📄 Multi-page document detected with {len(json_data)} pages")
                valid_pages = []
                for i, page in enumerate(json_data):
                    if isinstance(page, dict):
                        if len(page) <= 2 and any(key in page for key in ["text", "page"]):
                            logger.info(f"⏭️ Skipping page {i+1} - contains only text/metadata")
                            continue
                        valid_pages.append(page)
                        logger.info(f"✅ Including page {i+1} with {len(page)} fields")
                
                if not valid_pages:
                    logger.warning("⚠️ No valid pages found in multi-page document")
                    return {}
                
                json_data = self.merge_multi_page_data(valid_pages)
                logger.info(f"📄 Multi-page merge completed. Final structure has {len(json_data)} fields")
            
            elif isinstance(json_data, list) and len(json_data) == 1:
                json_data = json_data[0]
            
            # Auto-detect document type if not provided
            if not document_type:
                document_type = self.detect_document_type(json_data)
            
            document_type_lower = document_type.lower()
            expected_fields = self.document_expected_fields.get(document_type_lower, ["name", "salary"])
            
            # Initialize result structure
            standardized_data = {}
            
            if not isinstance(json_data, dict):
                logger.error(f"❌ Invalid JSON structure after processing: {type(json_data)}")
                return {field: None for field in expected_fields}
            
            logger.info(f"🔍 Processing {document_type} - Expected fields: {expected_fields}")
            
            # DOCUMENT-SPECIFIC EXTRACTION LOGIC
            if document_type_lower in ["pan", "pan card"]:
                # PAN: Extract name, dob, pan_number ONLY
                standardized_data["name"] = self._find_field_value(json_data, "name")
                standardized_data["dob"] = self._standardize_dob(self._find_field_value(json_data, "dob"))
                standardized_data["pan_number"] = self._find_field_value(json_data, "pan_number")
                logger.info(f"🆔 PAN document processed: {standardized_data}")
                
            elif document_type_lower in ["itr", "itr document"]:
                # ITR: Extract name, pan_number, salary ONLY
                standardized_data["name"] = self._find_field_value(json_data, "name")
                standardized_data["pan_number"] = self._find_field_value(json_data, "pan_number")
                
                # Special ITR salary extraction
                salary_from_itr = self.extract_salary_from_itr(json_data)
                if not salary_from_itr:
                    salary_from_itr = self._standardize_salary(self._find_field_value(json_data, "salary"))
                
                if salary_from_itr and salary_from_itr > 0:
                    standardized_data["salary"] = salary_from_itr
                else:
                    standardized_data["salary"] = None
                    
                logger.info(f"📄 ITR document processed: {standardized_data}")
                
            elif document_type_lower == "bank statement":
                # Bank Statement: Extract name, salary ONLY
                standardized_data["name"] = self._find_field_value(json_data, "name")
                
                # Special bank statement salary extraction
                salary_from_bank = self.extract_salary_from_bank_statement(json_data)
                if not salary_from_bank:
                    salary_from_bank = self._standardize_salary(self._find_field_value(json_data, "salary"))
                
                if salary_from_bank and salary_from_bank > 0:
                    standardized_data["salary"] = salary_from_bank
                else:
                    standardized_data["salary"] = None
                    
                logger.info(f"🏦 Bank statement processed: {standardized_data}")
                
            else:
                # Fallback for other document types
                for field in expected_fields:
                    if field == "salary":
                        salary_value = self._standardize_salary(self._find_field_value(json_data, "salary"))
                        standardized_data[field] = salary_value if salary_value and salary_value > 0 else None
                    elif field == "dob":
                        standardized_data[field] = self._standardize_dob(self._find_field_value(json_data, field))
                    else:
                        standardized_data[field] = self._find_field_value(json_data, field)
                
                logger.info(f"📋 Generic document processed: {standardized_data}")
            
            logger.info(f"✅ FINAL EXTRACTION: {standardized_data}")
            return standardized_data
            
        except Exception as e:
            logger.error(f"❌ Error in field extraction: {str(e)}")
            expected_fields = self.document_expected_fields.get(document_type.lower() if document_type else "payslip", ["name", "salary"])
            return {field: None for field in expected_fields}

    def compare_fields(self, extracted_data: dict, reference_data: dict, document_type: str) -> Dict[str, dict]:
        """Compare extracted vs reference data using DistilBERT semantic approach"""
        results = {}
        document_type_lower = document_type.lower()
        expected_fields = self.document_expected_fields.get(document_type_lower, ["name", "salary"])
        
        logger.info(f"🔍 DISTILBERT COMPARING {document_type} fields: {expected_fields}")
        
        for field_name in expected_fields:
            extracted_value = extracted_data.get(field_name)
            reference_value = reference_data.get(field_name)
            
            if extracted_value is not None and reference_value is not None:
                try:
                    extracted_str = str(extracted_value).strip()
                    reference_str = str(reference_value).strip()
                    
                    if not extracted_str or not reference_str:
                        results[field_name] = self._create_comparison_result(
                            extracted_value, reference_value, 0.0, False, "empty_values"
                        )
                        continue
                    
                    # ✅ USE DISTILBERT SEMANTIC SIMILARITY
                    similarity = self._calculate_field_similarity(field_name, extracted_str, reference_str)
                    match_threshold = self._get_match_threshold(field_name)
                    is_match = similarity >= match_threshold
                    
                    results[field_name] = self._create_comparison_result(
                        extracted_value, reference_value, similarity, is_match, "compared", match_threshold
                    )
                    
                    status = "✅ MATCH" if is_match else "❌ NO MATCH"
                    logger.info(f"🔍 {field_name}: '{extracted_str}' vs '{reference_str}' = {similarity:.3f} ({status})")
                    
                except Exception as e:
                    logger.error(f"❌ Error comparing {field_name}: {str(e)}")
                    results[field_name] = self._create_comparison_result(
                        extracted_value, reference_value, 0.0, False, f"error: {str(e)}"
                    )
            else:
                results[field_name] = self._create_comparison_result(
                    extracted_value, reference_value, 0.0, False, "missing_data"
                )
        
        return results

    def _normalize_date_strict(self, date_str: str) -> str:
        """Normalize date to YYYY-MM-DD format strictly for comparison"""
        try:
            date_formats = [
                "%Y/%m/%d", "%d/%m/%Y", "%Y-%m-%d", "%d-%m-%Y", 
                "%d.%m.%Y", "%Y.%m.%d", "%m/%d/%Y"
            ]
            
            for fmt in date_formats:
                try:
                    dt = datetime.strptime(date_str.strip(), fmt)
                    normalized = dt.strftime("%Y-%m-%d")
                    logger.info(f"📅 Date normalized: '{date_str}' -> '{normalized}'")
                    return normalized
                except ValueError:
                    continue
            
            logger.warning(f"⚠️ Could not normalize date: {date_str}")
            return date_str.strip()
            
        except Exception as e:
            logger.error(f"❌ Error normalizing date: {e}")
            return date_str

    def _create_comparison_result(self, extracted, reference, similarity, match, status, threshold=None):
        """Create standardized comparison result with safe JSON serialization"""
        result = {
            "extracted": extracted,
            "reference": reference,
            "similarity": float(round(similarity, 4)),  # ✅ Ensure it's Python float
            "match": bool(match),  # ✅ Ensure it's Python bool
            "status": str(status)  # ✅ Ensure it's Python string
        }
        if threshold is not None:
            result["threshold"] = float(threshold)  # ✅ Ensure it's Python float
        return result

    def _get_match_threshold(self, field_name: str) -> float:
        """Get match thresholds for different field types"""
        thresholds = {
            "name": 0.80,        
            "dob": 0.95,         
            "pan_number": 1.0,   
            "salary": 1.0
        }
        return thresholds.get(field_name, 0.80)

    def _standardize_salary(self, salary_value):
        """Convert salary to float with validation"""
        if salary_value is None:
            return None
        
        if isinstance(salary_value, (int, float)):
            return float(salary_value) if salary_value > 0 else None
        elif isinstance(salary_value, str):
            cleaned = re.sub(r'[₹,$,\s]', '', salary_value)
            try:
                result = float(cleaned)
                return result if result > 0 else None
            except ValueError:
                logger.warning(f"⚠️ Could not convert salary: {salary_value}")
                return None
        return None

    def _standardize_dob(self, dob_value):
        """Standardize DOB to YYYY-MM-DD format"""
        if not dob_value:
            return None
        
        if isinstance(dob_value, str):
            dob_clean = dob_value.strip()
            
            date_formats = [
                "%d/%m/%Y", "%d-%m-%Y", "%Y-%m-%d", "%m/%d/%Y", 
                "%Y/%m/%d", "%d.%m.%Y", "%Y.%m.%d"
            ]
            
            for fmt in date_formats:
                try:
                    dt = datetime.strptime(dob_clean, fmt)
                    normalized = dt.strftime("%Y-%m-%d")
                    logger.info(f"📅 DOB standardized: '{dob_value}' -> '{normalized}'")
                    return normalized
                except ValueError:
                    continue
            
            logger.warning(f"⚠️ Could not parse DOB: {dob_value}")
            return dob_clean
            
        elif hasattr(dob_value, 'strftime'):
            return dob_value.strftime("%Y-%m-%d")
        else:
            return self._standardize_dob(str(dob_value))

# ✅ DATABASE AND API FUNCTIONS (same as before)
def get_document_by_id(document_id: int):
    """Fetch document details from database INCLUDING extracted_data"""
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cursor = conn.cursor()
        
        query = """
            SELECT source_url, document_type, proposal_number, extracted_data, processing_status, validated
            FROM documents 
            WHERE id = %s
        """
        cursor.execute(query, (document_id,))
        result = cursor.fetchone()
        
        cursor.close()
        conn.close()
        
        if not result:
            raise HTTPException(status_code=404, detail=f"Document {document_id} not found")
        
        source_url, document_type, proposal_number, extracted_data, processing_status, validated = result
        
        return {
            "source_url": source_url,
            "document_type": document_type,
            "proposal_number": proposal_number,
            "extracted_data": extracted_data,
            "processing_status": processing_status,
            "validated": validated
        }
    except psycopg2.Error as e:
        logger.error(f"❌ Database error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

def save_extracted_data_to_db(document_id: int, extracted_data: dict, overall_match: bool, comparison_results: dict, accuracy_metrics: dict) -> bool:
    """Save extracted JSON data and update processing status with timestamp"""
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cursor = conn.cursor()
        
        full_data = {
            "extracted_data": extracted_data,
            "comparison_results": comparison_results,
            "accuracy_metrics": accuracy_metrics,
            "overall_match": overall_match
        }
        json_data = json.dumps(full_data, indent=2)
        
        update_query = """
            UPDATE Documents
            SET extracted_data = %s, 
                validated = %s, 
                processing_status = 'processed',
                processed_at = NOW()
            WHERE id = %s
        """
        cursor.execute(update_query, (json_data, overall_match, document_id))
        
        if cursor.rowcount == 0:
            logger.warning(f"⚠️ No document found with ID {document_id} to update")
            cursor.close()
            conn.close()
            return False
        
        conn.commit()
        cursor.close()
        conn.close()
        
        logger.info(f"💾 Successfully saved extracted data to document {document_id} - validated: {overall_match}")
        return True
        
    except psycopg2.Error as e:
        logger.error(f"❌ Database error saving extracted data for document {document_id}: {str(e)}")
        return False
    except Exception as e:
        logger.error(f"❌ Unexpected error saving extracted data for document {document_id}: {str(e)}")
        return False

# ✅ INITIALIZE DISTILBERT FIELD MATCHER
field_matcher = DistilBERTSemanticFieldMatcher()

def upload_document_to_idp(s3_link: str, document_type: str, document_id: int) -> dict:
    """Call IDP API to process document with production-ready error handling"""
    try:
        filename = s3_link.split("/")[-1]
        extension = filename.lower().split('.')[-1]
        
        if extension not in ['pdf', 'png', 'jpg', 'jpeg']:
            raise ValueError(f"Unsupported file type: {extension}")
        
        payload = {"s3_url": s3_link, "api_key": IDP_API_KEY}
        logger.info(f"📤 Calling IDP API for document {document_id}")
        
        start_time = time.time()
        response = requests.post(IDP_API_URL, json=payload, headers=HEADERS, timeout=60)
        response.raise_for_status()
        
        process_time = time.time() - start_time
        logger.info(f"✅ IDP API responded in {process_time:.2f}s for document {document_id}")
        
        try:
            return response.json()
        except json.JSONDecodeError as json_error:
            logger.warning(f"⚠️ JSON decode error: {json_error}")
            response_text = response.text.strip()
            return json.loads(response_text)
        
    except ValueError as e:
        logger.error(f"❌ Validation error: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except (requests.Timeout, requests.RequestException) as e:
        logger.error(f"❌ IDP API error: {str(e)}")
        raise HTTPException(status_code=503, detail="IDP service unavailable")

def get_reference_data(proposer_id: int) -> dict:
    """Get reference data for comparison from database"""
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cursor = conn.cursor()
        
        query = """
            SELECT customer_name, dob, pan_number, annual_income
            FROM proposer 
            WHERE proposer_id = %s
        """
        cursor.execute(query, (proposer_id,))
        result = cursor.fetchone()
        
        cursor.close()
        conn.close()
        
        if result:
            customer_name, dob, pan_number, annual_income = result
            return {
                "name": customer_name,
                "dob": str(dob) if dob else None,
                "pan_number": pan_number,
                "salary": float(annual_income) if annual_income else None
            }
        else:
            logger.warning(f"⚠️ No reference data found for proposer {proposer_id}")
            return {}
    except psycopg2.Error as e:
        logger.error(f"❌ Database error: {str(e)}")
        return {}

def process_idp_response(idp_response, document_type, document_id):
    """Process real IDP API response using DistilBERT semantic matcher"""
    try:
        logger.info(f"🔄 Processing IDP response for document {document_id} (type: {document_type})")
        
        if isinstance(idp_response, list):
            logger.info(f"📄 Multi-page document detected: {len(idp_response)} pages")
        
        standardized_data = field_matcher.extract_fields_from_json(idp_response, document_type)
        logger.info(f"✅ Extraction complete for document {document_id}: {standardized_data}")
        
        return standardized_data
    except Exception as e:
        logger.error(f"❌ Error processing document {document_id}: {str(e)}")
        expected_fields = field_matcher.document_expected_fields.get(document_type.lower(), ["name", "salary"])
        return {field: None for field in expected_fields}

# Pydantic Models
class DocumentProcessResponse(BaseModel):
    document_id: int
    document_type: str
    proposal_number: int
    extracted_data: dict
    reference_data: dict
    comparison_results: dict
    overall_match: bool
    processing_time: float
    status: str

# FastAPI Application
app = FastAPI(title="Production DistilBERT Semantic Document Processor")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"]
)

@app.options("/{path:path}")
async def options_handler(request: Request, path: str):
    return Response(
        status_code=200,
        headers={
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
            "Access-Control-Allow-Headers": "*",
            "Access-Control-Allow-Credentials": "true",
            "Access-Control-Max-Age": "3600"
        }
    )

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "distilbert_semantic_document_processor",
        "features": [
            "distilbert_semantic_field_matching",
            "10_percent_salary_tolerance", 
            "multi_page_support", 
            "database_storage",
            "strict_date_normalization",
            "skip_already_processed",
            "mean_pooling_embeddings"
        ],
        "models": {
            "semantic_model": "distilbert-base-uncased" if DISTILBERT_AVAILABLE else "not_available",
            "device": str(field_matcher.device) if DISTILBERT_AVAILABLE else "cpu"
        },
        "supported_documents": ["PAN", "ITR Document", "Bank Statement"],
        "salary_tolerance": "10%",
        "database_storage": True,
        "timestamp": datetime.now().isoformat()
    }

# ✅ MAIN PROCESSING ENDPOINT
@app.post("/process-document/{document_id}")
async def process_single_document(document_id: int, request: Request):
    """Production endpoint with DistilBERT semantic matching"""
    try:
        start_time = time.time()
        logger.info(f"🚀 Processing document ID: {document_id} with DISTILBERT SEMANTIC MATCHING")
        
        # Get document details INCLUDING extracted_data
        doc_record = get_document_by_id(document_id)
        
        # Skip processing if extracted_data already exists
        if doc_record["extracted_data"] is not None and doc_record["extracted_data"].strip() != "":
            logger.info(f"⏭️ Document {document_id} already processed, returning existing data")
            
            try:
                # Parse existing extracted data
                existing_extracted = json.loads(doc_record["extracted_data"])
                
                # Get proposer information for comparison results
                conn = psycopg2.connect(**DB_CONFIG)
                cursor = conn.cursor()
                query = "SELECT proposer_id FROM Proposal WHERE proposal_number = %s"
                cursor.execute(query, (doc_record["proposal_number"],))
                proposer_result = cursor.fetchone()
                cursor.close()
                conn.close()
                
                if proposer_result:
                    proposer_id = proposer_result[0]
                    reference_data = get_reference_data(proposer_id)
                    
                    # Re-run comparison for frontend
                    comparison_results = field_matcher.compare_fields(
                        existing_extracted, reference_data, doc_record["document_type"]
                    )
                    
                    # Calculate accuracy metrics
                    expected_fields = field_matcher.document_expected_fields.get(doc_record["document_type"].lower(), ["name", "salary"])
                    match_count = sum(1 for result in comparison_results.values() if result.get('match', False))
                    compared_count = len([r for r in comparison_results.values() if r.get('status') == 'compared'])
                    expected_count = len(expected_fields)
                    
                    accuracy_metrics = {
                        "field_match_rate": round((match_count / compared_count * 100), 2) if compared_count > 0 else 0,
                        "completion_rate": round((compared_count / expected_count * 100), 2) if expected_count > 0 else 0,
                        "overall_accuracy": round((match_count / expected_count * 100), 2) if expected_count > 0 else 0
                    }
                    
                    overall_match = doc_record["validated"] if doc_record["validated"] is not None else False
                    
                    return safe_json_response({
                        "document_id": document_id,
                        "document_type": doc_record["document_type"],
                        "proposal_number": doc_record["proposal_number"],
                        "proposer_id": proposer_id,
                        "extracted_data": existing_extracted,
                        "reference_data": reference_data,
                        "comparison_results": comparison_results,
                        "overall_match": overall_match,
                        "accuracy_metrics": accuracy_metrics,
                        "processing_time": 0.001,
                        "status": "already_processed",
                        "matching_method": "distilbert_semantic_cached",
                        "message": "Document was already processed, returning cached results"
                    })
            except (json.JSONDecodeError, Exception) as e:
                logger.warning(f"⚠️ Error parsing existing extracted_data for document {document_id}: {e}")
        
        # NORMAL PROCESSING: Continue with IDP processing if no extracted_data
        logger.info(f"📄 Processing document {document_id} with DISTILBERT SEMANTIC MATCHING")
        
        # Get proposer information
        conn = psycopg2.connect(**DB_CONFIG)
        cursor = conn.cursor()
        query = "SELECT proposer_id FROM Proposal WHERE proposal_number = %s"
        cursor.execute(query, (doc_record["proposal_number"],))
        proposer_result = cursor.fetchone()
        cursor.close()
        conn.close()
        
        if not proposer_result:
            raise HTTPException(status_code=404, detail=f"Proposer not found for proposal {doc_record['proposal_number']}")
        
        proposer_id = proposer_result[0]
        
        # Get reference data from proposer table
        reference_data = get_reference_data(proposer_id)
        
        # Process document through IDP API
        idp_response = upload_document_to_idp(doc_record["source_url"], doc_record["document_type"], document_id)
        
        # Check if multi-page
        is_multi_page = isinstance(idp_response, list) and len(idp_response) > 1
        page_count = len(idp_response) if isinstance(idp_response, list) else 1
        
        # ✅ EXTRACT FIELDS USING DISTILBERT SEMANTIC APPROACH
        extracted_data = process_idp_response(idp_response, doc_record["document_type"], document_id)
        
        # ✅ COMPARE WITH REFERENCE DATA USING DISTILBERT SEMANTIC APPROACH
        comparison_results = field_matcher.compare_fields(
            extracted_data, reference_data, doc_record["document_type"]
        )
        
        # Calculate accuracy metrics
        expected_fields = field_matcher.document_expected_fields.get(doc_record["document_type"].lower(), ["name", "salary"])
        match_count = sum(1 for result in comparison_results.values() if result.get('match', False))
        compared_count = len([r for r in comparison_results.values() if r.get('status') == 'compared'])
        expected_count = len(expected_fields)
        
        accuracy_metrics = {
            "field_match_rate": round((match_count / compared_count * 100), 2) if compared_count > 0 else 0,
            "completion_rate": round((compared_count / expected_count * 100), 2) if expected_count > 0 else 0,
            "overall_accuracy": round((match_count / expected_count * 100), 2) if expected_count > 0 else 0
        }
        
        overall_match = (accuracy_metrics["field_match_rate"] >= 80.0 and 
                        accuracy_metrics["completion_rate"] >= 75.0)
        
        # Save extracted data with overall_match status to database
        save_success = save_extracted_data_to_db(document_id, extracted_data, overall_match, comparison_results, accuracy_metrics)
        
        response_data = {
            "document_id": document_id,
            "document_type": doc_record["document_type"],
            "proposal_number": doc_record["proposal_number"],
            "proposer_id": proposer_id,
            "is_multi_page": is_multi_page,
            "page_count": page_count,
            "extracted_data": extracted_data,
            "reference_data": reference_data,
            "comparison_results": comparison_results,
            "overall_match": overall_match,
            "accuracy_metrics": accuracy_metrics,
            "processing_time": round(time.time() - start_time, 3),
            "extraction_rules": {
                "PAN": "name, dob, pan_number",
                "ITR Document": "name, pan_number, salary", 
                "Bank Statement": "name, salary"
            },
            "matching_method": "distilbert_semantic",
            "models_used": {
                "semantic": "distilbert-base-uncased" if DISTILBERT_AVAILABLE else "not_available",
                "device": str(field_matcher.device) if DISTILBERT_AVAILABLE else "cpu"
            },
            "salary_tolerance": "10%",
            "data_saved_to_db": save_success,
            "status": "newly_processed"
        }
        
        logger.info(f"✅ Document {document_id} processed with DISTILBERT SEMANTIC MATCHING. Type: {doc_record['document_type']}, Multi-page: {is_multi_page}, Pages: {page_count}, Accuracy: {accuracy_metrics['overall_accuracy']}%")
        return safe_json_response(response_data)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error processing document {document_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=PYTHON_API_PORT, log_level="info")
