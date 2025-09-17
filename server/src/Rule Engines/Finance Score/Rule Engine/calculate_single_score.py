#!/usr/bin/env python3
"""
Single Finance Score Calculator

This script calculates the finance score for a single proposer using the existing
finance score engine. It reads input data from environment variables and outputs
the calculated score as JSON.
"""

import os
import sys
import json
import pandas as pd
import logging
from datetime import datetime

# Add the current directory to Python path to import local modules
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

try:
    from finance_score_engine import FinanceScoreCalculator
except ImportError as e:
    print(f"Error importing FinanceScoreCalculator: {e}", file=sys.stderr)
    sys.exit(1)

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s | %(levelname)s | %(name)s | %(message)s')
logger = logging.getLogger(__name__)

def main():
    """Calculate finance score for a single proposer."""
    try:
        # Get finance data from environment variable
        finance_data_json = os.environ.get('FINANCE_DATA')
        if not finance_data_json:
            logger.error("FINANCE_DATA environment variable not set")
            print(json.dumps({"error": "FINANCE_DATA environment variable not set"}), file=sys.stderr)
            sys.exit(1)

        # Parse the finance data
        try:
            finance_data = json.loads(finance_data_json)
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse FINANCE_DATA JSON: {e}")
            print(json.dumps({"error": f"Failed to parse FINANCE_DATA JSON: {e}"}), file=sys.stderr)
            sys.exit(1)

        logger.info(f"Calculating finance score for proposer_id: {finance_data.get('proposer_id')}")

        # Validate required fields
        required_fields = ['proposal_number', 'proposer_id', 'annual_income', 'premium', 'sum_assured']
        missing_fields = [field for field in required_fields if field not in finance_data or finance_data[field] is None]
        
        if missing_fields:
            error_msg = f"Missing required fields: {missing_fields}"
            logger.error(error_msg)
            print(json.dumps({"error": error_msg}), file=sys.stderr)
            sys.exit(1)

        # Convert to DataFrame (single row)
        df = pd.DataFrame([finance_data])
        
        # Initialize the finance score calculator
        calculator = FinanceScoreCalculator()
        
        # Calculate the finance score
        result_df = calculator.calculate(df)
        
        if result_df is None or result_df.empty:
            error_msg = "Failed to calculate finance score - no results returned"
            logger.error(error_msg)
            print(json.dumps({"error": error_msg}), file=sys.stderr)
            sys.exit(1)

        # Extract the result for the single row
        result = result_df.iloc[0].to_dict()
        
        # Prepare the response
        response = {
            "proposal_number": result.get('proposal_number'),
            "proposer_id": result.get('proposer_id'),
            "sar_income_ratio": result.get('sar_income_ratio'),
            "tsar_income_ratio": result.get('tsar_income_ratio'),
            "premium_income_ratio": result.get('premium_income_ratio'),
            "sar_score": result.get('sar_score'),
            "tsar_score": result.get('tsar_score'),
            "premium_score": result.get('premium_score'),
            "final_finance_score": result.get('final_finance_score'),
            "risk_category": result.get('risk_category'),
            "underwriting_flag": result.get('underwriting_flag'),
            "score_factors": result.get('score_factors'),
            "validation_issues": result.get('validation_issues'),
            "calculated_at": datetime.now().isoformat()
        }

        # Output the result as JSON
        print(json.dumps(response, indent=2, default=str))
        logger.info(f"Finance score calculation completed successfully for proposer_id: {finance_data.get('proposer_id')}")

    except Exception as e:
        error_msg = f"Unexpected error during finance score calculation: {str(e)}"
        logger.error(error_msg, exc_info=True)
        print(json.dumps({"error": error_msg}), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
