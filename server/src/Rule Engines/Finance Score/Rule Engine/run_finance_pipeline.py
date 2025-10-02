"""Orchestrator for the Finance Score pipeline.

This script coordinates extraction (gated by validated+finreview) and scoring
using the YAML-configured rule engine, and writes per-proposal inputs and
scored outputs to a structured dated folder under this directory.
"""

import sys
import logging
from dotenv import load_dotenv
import os

load_dotenv()
logging.basicConfig(level=logging.INFO, format='%(asctime)s | %(levelname)s | %(name)s | %(message)s')
logger = logging.getLogger(__name__)

try:
    from data_extraction import FinanceScoreDataExtractor
    from finance_score_engine import FinanceScoreCalculator
except ImportError:
    from .data_extraction import FinanceScoreDataExtractor
    from .finance_score_engine import FinanceScoreCalculator

def main():
    """Run the extraction→scoring pipeline and write per-proposal artifacts.

    Returns 0 on success, non-zero on early termination (no eligible proposals
    or no scores produced). Paths are resolved within this directory by default.
    """
    base_dir = os.path.dirname(os.path.abspath(__file__))
    rules_path = os.environ.get('FIN_RULES_YAML', os.path.join(base_dir, 'finance_score_rules.yaml'))
    output_dir = os.environ.get('FIN_OUTPUT_DIR', os.path.join(base_dir, 'finance_scores'))

    logger.info("Finance Score pipeline started")
    extractor = FinanceScoreDataExtractor()
    
    # Debug schema if needed
    if os.environ.get('DEBUG_SCHEMA', 'false').lower() == 'true':
        logger.info("Running schema debug...")
        extractor.debug_schema()
    
    data_df = extractor.extract()

    if data_df is None or data_df.empty:
        logger.warning("No eligible proposals found (validated+finreview). Exiting.")
        return 1

    # Validate DOB data
    if 'dob' not in data_df.columns:
        logger.error("DOB column is missing from extracted data. Running schema debug...")
        extractor.debug_schema()
        return 1
    
    dob_null_count = data_df['dob'].isnull().sum()
    if dob_null_count == len(data_df):
        logger.error("All DOB values are null. Running schema debug...")
        extractor.debug_schema()
        return 1
    elif dob_null_count > 0:
        logger.warning(f"Found {dob_null_count} null DOB values out of {len(data_df)} records")

    calculator = FinanceScoreCalculator(rules_path=rules_path, output_dir=output_dir)

    extractor.export_per_proposal_inputs(data_df, calculator.output_dir, id_col='proposal_number')

    finance_df = calculator.calculate(data_df)
    if finance_df is None or finance_df.empty:
        logger.warning("No finance scores were produced. Exiting.")
        return 1

    calculator.export_per_proposal(finance_df, id_col='proposal_number')

    logger.info(f"Finance Score pipeline completed successfully. Artifacts: {calculator.output_dir}")
    return 0

if __name__ == '__main__':
    sys.exit(main()) 