#!/usr/bin/env python3
"""
Single Health Score Calculator

This script calculates the health score for a single proposer using the existing
health score engine. It reads input data from stdin and outputs
the calculated score as JSON.
"""

import os
import sys
import json
import logging
from datetime import datetime

# Add the current directory to Python path to import local modules
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

try:
    from health_score_engine import HealthScoreRuleEngine
except ImportError as e:
    print(f"Error importing HealthScoreRuleEngine: {e}", file=sys.stderr)
    sys.exit(1)

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s | %(levelname)s | %(name)s | %(message)s')
logger = logging.getLogger(__name__)

def main():
    """Calculate health score for a single proposer."""
    try:
        # Read health data from stdin
        try:
            health_data_json = sys.stdin.read().strip()
            if not health_data_json:
                logger.error("No data received from stdin")
                print(json.dumps({"error": "No data received from stdin"}), file=sys.stderr)
                sys.exit(1)
        except Exception as e:
            logger.error(f"Failed to read from stdin: {e}")
            print(json.dumps({"error": f"Failed to read from stdin: {e}"}), file=sys.stderr)
            sys.exit(1)

        # Parse the health data
        try:
            health_data = json.loads(health_data_json)
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse JSON data: {e}")
            print(json.dumps({"error": f"Failed to parse JSON data: {e}"}), file=sys.stderr)
            sys.exit(1)

        logger.info(f"Calculating health score for proposer_id: {health_data.get('proposer_id')}")

        # Validate required fields
        required_fields = ['proposer_id', 'documents']
        missing_fields = [field for field in required_fields if field not in health_data or health_data[field] is None]
        
        if missing_fields:
            error_msg = f"Missing required fields: {missing_fields}"
            logger.error(error_msg)
            print(json.dumps({"error": error_msg}), file=sys.stderr)
            sys.exit(1)

        # Validate documents structure
        documents = health_data.get('documents', [])
        if not isinstance(documents, list) or len(documents) == 0:
            error_msg = "Documents must be a non-empty list"
            logger.error(error_msg)
            print(json.dumps({"error": error_msg}), file=sys.stderr)
            sys.exit(1)

        # Extract additional parameters
        proposer_id = health_data.get('proposer_id')
        gender = health_data.get('gender', 'male').lower()
        age = health_data.get('age', 30)

        # Validate gender and age
        if gender not in ['male', 'female']:
            logger.warning(f"Invalid gender '{gender}', defaulting to 'male'")
            gender = 'male'
        
        try:
            age = int(age)
            if age < 0 or age > 120:
                logger.warning(f"Invalid age '{age}', defaulting to 30")
                age = 30
        except (ValueError, TypeError):
            logger.warning(f"Invalid age '{age}', defaulting to 30")
            age = 30

        # Create temporary proposer data file for the engine
        import tempfile
        import shutil
        
        temp_dir = tempfile.mkdtemp()
        try:
            # Create proposer data file in expected format
            proposer_data = {
                "proposer_summary": {
                    "proposer_id": proposer_id,
                    "total_documents": len(documents),
                    "extraction_timestamp": datetime.now().isoformat()
                },
                "documents": documents
            }
            
            temp_file_path = os.path.join(temp_dir, f"proposer_{proposer_id}_data.json")
            with open(temp_file_path, 'w', encoding='utf-8') as f:
                json.dump(proposer_data, f, indent=2, ensure_ascii=False, default=str)
            
            # Initialize the health score rule engine
            rules_file = os.path.join(os.path.dirname(__file__), "health_score_rules.yaml")
            if not os.path.exists(rules_file):
                error_msg = f"Rules file not found: {rules_file}"
                logger.error(error_msg)
                print(json.dumps({"error": error_msg}), file=sys.stderr)
                sys.exit(1)
            
            engine = HealthScoreRuleEngine(rules_file, temp_dir)
            
            # Calculate the health score
            result = engine.evaluate_proposer(proposer_id, gender=gender, age=age)
            
            if result is None:
                error_msg = "Failed to calculate health score - no results returned"
                logger.error(error_msg)
                print(json.dumps({"error": error_msg}), file=sys.stderr)
                sys.exit(1)

            # Calculate deduction breakdown for the new scoring system
            deductions = [test for test in result.test_results if test.score < 0]
            total_deductions = sum(abs(test.score) for test in deductions)
            
            score_breakdown = {
                'normal': len([test for test in result.test_results if test.condition == 'normal']),
                'borderline': len([test for test in result.test_results if test.condition == 'borderline']),
                'abnormal': len([test for test in result.test_results if test.condition == 'abnormal']),
                'severe': len([test for test in result.test_results if test.condition == 'severe']),
                'unknown': len([test for test in result.test_results if test.category == 'unknown'])
            }

            # Prepare the response with new scoring system format
            response = {
                "proposer_id": result.proposer_id,
                "final_health_score": result.total_score,
                "base_score": result.max_possible_score,
                "total_points_deducted": total_deductions,
                "percentage_score": result.percentage_score, 
                "risk_level": result.risk_level,
                "red_flags": result.red_flags,
                "recommendations": result.recommendations,
                "scoring_breakdown": {
                    "normal_tests": score_breakdown['normal'],
                    "borderline_tests": score_breakdown['borderline'], 
                    "abnormal_tests": score_breakdown['abnormal'],
                    "severe_tests": score_breakdown['severe'],
                    "unknown_tests": score_breakdown['unknown'],
                    "deduction_details": {
                        "normal": "0 points per test",
                        "borderline": "-1 point per test", 
                        "abnormal": "-3 points per test",
                        "severe": "-5 points per test",
                        "unknown": "0 points per test (considered normal)"
                    }
                },
                "test_results": [
                    {
                        "test_name": test.test_name,
                        "value": test.value,
                        "unit": test.unit,
                        "category": test.category,
                        "score": test.score,
                        "condition": test.condition,
                        "message": test.message
                    }
                    for test in result.test_results
                ],
                "evaluation_metadata": {
                    "scoring_system": "deduction_based",
                    "scoring_description": "Base score 160, deduct points based on severity",
                    "gender": gender,
                    "age": age,
                    "total_tests_evaluated": len(result.test_results),
                    "total_documents_processed": len(documents),
                    "calculated_at": datetime.now().isoformat()
                }
            }

            # Output the result as JSON
            print(json.dumps(response, indent=2, default=str))
            logger.info(f"Health score calculation completed successfully for proposer_id: {proposer_id}")
            
        finally:
            # Clean up temporary directory
            shutil.rmtree(temp_dir, ignore_errors=True)

    except Exception as e:
        error_msg = f"Unexpected error during health score calculation: {str(e)}"
        logger.error(error_msg, exc_info=True)
        print(json.dumps({"error": error_msg}), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()