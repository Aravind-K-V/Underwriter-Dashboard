import json
import yaml
import os
import re
import logging
from typing import Dict, List, Any, Tuple, Optional
from datetime import datetime
from dataclasses import dataclass

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

@dataclass
class TestResult:
    """Data class for test results"""
    test_name: str
    value: Any
    unit: str
    category: str
    score: int
    condition: str
    message: str = ""

@dataclass
class ProposerHealthScore:
    """Data class for proposer health score results"""
    proposer_id: int
    total_score: int
    max_possible_score: int
    percentage_score: float
    risk_level: str
    red_flags: List[str]
    test_results: List[TestResult]
    recommendations: List[str]

class HealthScoreRuleEngine:
    def __init__(self, rules_file_path: str, data_folder_path: str):
        """
        Initialize the Health Score Rule Engine
        
        Args:
            rules_file_path: Path to the YAML rules file
            data_folder_path: Path to the folder containing proposer JSON files
        """
        self.rules_file_path = rules_file_path
        self.data_folder_path = data_folder_path
        self.rules = self._load_rules()
        self.scoring_framework = self.rules.get('scoring_framework', {})
        self.red_flag_rules = self.rules.get('red_flag_rules', [])
        
        logger.info(f"Health Score Rule Engine initialized")
        logger.info(f"Rules loaded from: {rules_file_path}")
        logger.info(f"Data folder: {data_folder_path}")
    
    def _load_rules(self) -> Dict:
        """Load rules from YAML file"""
        try:
            with open(self.rules_file_path, 'r', encoding='utf-8') as file:
                rules = yaml.safe_load(file)
            logger.info("Rules loaded successfully from YAML file")
            return rules
        except Exception as e:
            logger.error(f"Failed to load rules from {self.rules_file_path}: {e}")
            raise
    
    def _load_proposer_data(self, proposer_id: int) -> Dict:
        """Load proposer data from JSON file"""
        filename = f"proposer_{proposer_id}_data.json"
        filepath = os.path.join(self.data_folder_path, filename)
        
        try:
            with open(filepath, 'r', encoding='utf-8') as file:
                data = json.load(file)
            logger.info(f"Data loaded for proposer {proposer_id}")
            return data
        except FileNotFoundError:
            logger.error(f"File not found: {filepath}")
            raise
        except Exception as e:
            logger.error(f"Failed to load data for proposer {proposer_id}: {e}")
            raise
    
    def _parse_range_condition(self, condition: str) -> Tuple[Optional[float], Optional[float]]:
        """
        Parse range conditions like '13-17', '<40', '>100', etc.
        
        Returns:
            Tuple of (min_value, max_value) where None means no limit
        """
        condition = condition.strip()
        
        # Handle range like '13-17'
        if '-' in condition and not condition.startswith('<') and not condition.startswith('>'):
            parts = condition.split('-')
            if len(parts) == 2:
                try:
                    min_val = float(parts[0])
                    max_val = float(parts[1])
                    return (min_val, max_val)
                except ValueError:
                    pass
        
        # Handle conditions like '<40', '>100', '≥160'
        if condition.startswith('≥'):
            try:
                return (float(condition[1:]), None)
            except ValueError:
                pass
        elif condition.startswith('<='):
            try:
                return (None, float(condition[2:]))
            except ValueError:
                pass
        elif condition.startswith('>='):
            try:
                return (float(condition[2:]), None)
            except ValueError:
                pass
        elif condition.startswith('<'):
            try:
                return (None, float(condition[1:]))
            except ValueError:
                pass
        elif condition.startswith('>'):
            try:
                return (float(condition[1:]), None)
            except ValueError:
                pass
        
        return (None, None)
    
    def _check_condition(self, value: float, condition: str) -> bool:
        """Check if a value meets a specific condition"""
        if condition in ['negative', 'non_reactive', 'normal']:
            return str(value).lower() in ['negative', 'non_reactive', 'normal', '0', 'false']
        
        if condition in ['positive_high', 'positive_low', 'reactive']:
            return str(value).lower() in ['positive', 'reactive', 'positive_high', 'positive_low', '1', 'true']
        
        # Handle OR conditions
        if ' OR ' in condition:
            conditions = condition.split(' OR ')
            return any(self._check_single_condition(value, cond.strip()) for cond in conditions)
        
        return self._check_single_condition(value, condition)
    
    def _check_single_condition(self, value: float, condition: str) -> bool:
        """Check a single condition"""
        min_val, max_val = self._parse_range_condition(condition)
        
        if min_val is not None and max_val is not None:
            # Range condition
            return min_val <= value <= max_val
        elif min_val is not None:
            # Greater than or equal condition
            return value >= min_val
        elif max_val is not None:
            # Less than condition - fix boundary logic
            return value <= max_val
        
        return False
    
    def _get_test_category_and_rules(self, test_name: str) -> Tuple[str, Dict]:
        """Get the category and rules for a specific test"""
        test_name_lower = test_name.lower().replace(' ', '_').replace('-', '_')
        
        # Mapping of test names to rule categories
        test_mappings = {
            # CBC tests
            'hemoglobin': ('cbc_rules', 'hemoglobin'),
            'haemoglobin': ('cbc_rules', 'hemoglobin'),
            'hb': ('cbc_rules', 'hemoglobin'),
            'wbc': ('cbc_rules', 'wbc_count'),
            'tlc': ('cbc_rules', 'wbc_count'),
            'total_leucocyte_count': ('cbc_rules', 'wbc_count'),
            'white_blood_cell': ('cbc_rules', 'wbc_count'),
            'platelets': ('cbc_rules', 'platelets'),
            'platelet_count': ('cbc_rules', 'platelets'),
            'neutrophil': ('cbc_rules', 'neutrophils'),
            'neutrophils': ('cbc_rules', 'neutrophils'),
            'lymphocyte': ('cbc_rules', 'lymphocytes'),
            'lymphocytes': ('cbc_rules', 'lymphocytes'),
            'monocyte': ('cbc_rules', 'monocytes'),
            'monocytes': ('cbc_rules', 'monocytes'),
            'eosinophil': ('cbc_rules', 'eosinophils'),
            'eosinophils': ('cbc_rules', 'eosinophils'),
            'basophil': ('cbc_rules', 'basophils'),
            'basophils': ('cbc_rules', 'basophils'),
            'esr': ('cbc_rules', 'esr'),
            'westergren': ('cbc_rules', 'esr'),
            'crp': ('cbc_rules', 'crp'),
            
            # Renal function tests
            'creatinine': ('renal_function_rules', 'creatinine'),
            'blood_urea': ('renal_function_rules', 'blood_urea'),
            'urea': ('renal_function_rules', 'blood_urea'),
            'uric_acid': ('renal_function_rules', 'uric_acid'),
            
            # Liver function tests
            'bilirubin': ('liver_function_rules', 'bilirubin'),
            'sgpt': ('liver_function_rules', 'sgpt_alt'),
            'alt': ('liver_function_rules', 'sgpt_alt'),
            'sgot': ('liver_function_rules', 'sgot_ast'),
            'ast': ('liver_function_rules', 'sgot_ast'),
            'alkaline_phosphatase': ('liver_function_rules', 'alkaline_phosphatase'),
            'albumin': ('liver_function_rules', 'albumin'),
            
            # Lipid profile
            'cholesterol': ('lipid_profile_rules', 'total_cholesterol'),
            'total_cholesterol': ('lipid_profile_rules', 'total_cholesterol'),
            'ldl': ('lipid_profile_rules', 'ldl'),
            'hdl': ('lipid_profile_rules', 'hdl'),
            'triglycerides': ('lipid_profile_rules', 'triglycerides'),
            
            # Sugar tests
            'fasting_glucose': ('sugar_tests_rules', 'fasting_sugar'),
            'fasting_sugar': ('sugar_tests_rules', 'fasting_sugar'),
            'glucose': ('sugar_tests_rules', 'fasting_sugar'),
            'blood_sugar_fasting': ('sugar_tests_rules', 'fasting_sugar'),
            'blood_sugar': ('sugar_tests_rules', 'fasting_sugar'),
            'postprandial': ('sugar_tests_rules', 'postprandial'),
            'hba1c': ('sugar_tests_rules', 'hba1c'),
            
            # Thyroid
            'tsh': ('thyroid_rules', 'tsh'),
            'free_t4': ('thyroid_rules', 'free_t4'),
            't4': ('thyroid_rules', 'free_t4'),
            
            # Vitamins
            'vitamin_d': ('vitamin_mineral_rules', 'vitamin_d'),
            'vitamin_b12': ('vitamin_mineral_rules', 'vitamin_b12'),
            'calcium': ('vitamin_mineral_rules', 'calcium'),
            
            # Cardiac
            'nt_probnp': ('cardiac_rules', 'nt_probnp'),
            'troponin': ('cardiac_rules', 'troponin'),
            
            # Vitals
            'systolic_bp': ('vitals_bmi_rules', 'blood_pressure'),
            'diastolic_bp': ('vitals_bmi_rules', 'blood_pressure'),
            'blood_pressure': ('vitals_bmi_rules', 'blood_pressure'),
            'bmi': ('vitals_bmi_rules', 'bmi'),
        }
        
        # Find matching test - check exact matches first, then substring matches
        # First try exact matches
        if test_name_lower in test_mappings:
            category, rule_key = test_mappings[test_name_lower]
            rules = self.rules.get(category, {}).get(rule_key, {})
            return category, rules
        
        # Then try substring matches, but prioritize longer keys first
        sorted_keys = sorted(test_mappings.keys(), key=len, reverse=True)
        for key in sorted_keys:
            if key in test_name_lower:
                category, rule_key = test_mappings[key]
                rules = self.rules.get(category, {}).get(rule_key, {})
                return category, rules
        
        logger.warning(f"No rules found for test: {test_name}")
        return "unknown", {}
    
    def _evaluate_test(self, test_name: str, value: Any, gender: str = "male", age: int = 30) -> TestResult:
        """Evaluate a single test against the rules"""
        category, rules = self._get_test_category_and_rules(test_name)
        
        if not rules:
            # No rules found - consider as normal (0 points deduction)
            return TestResult(
                test_name=test_name,
                value=value,
                unit="",
                category="unknown",
                score=0,  # 0 points deduction for unknown tests
                condition="normal",
                message=f"No rules found for {test_name} - considered normal (0 points deducted)"
            )
        
        # Convert value to float if possible
        try:
            if isinstance(value, str):
                # Clean the value - remove leading zeros but preserve decimal values
                clean_value = value.strip()
                # Handle values that start with decimal point (e.g., ".69" -> "0.69")
                if clean_value.startswith('.') and len(clean_value) > 1:
                    clean_value = '0' + clean_value
                elif clean_value.startswith('0') and '.' not in clean_value and len(clean_value) > 1:
                    clean_value = clean_value.lstrip('0') or '0'
                numeric_value = float(clean_value)
            else:
                numeric_value = float(value)
            
            # Handle unit conversions for specific tests - be more precise
            test_name_lower = test_name.lower()
            # Only convert WBC/TLC counts, not individual cell percentages
            if any(term in test_name_lower for term in ['wbc', 'tlc']) and 'total' in test_name_lower:
                # If the value appears to be in thousands format (typical: 8.4 x10³/µL)
                if numeric_value < 100:
                    numeric_value = numeric_value * 1000
            elif 'leucocyte' in test_name_lower and 'count' in test_name_lower and not any(cell in test_name_lower for cell in ['neutrophil', 'lymphocyte', 'eosinophil', 'basophil', 'monocyte']):
                # Total leucocyte count conversion
                if numeric_value < 100:
                    numeric_value = numeric_value * 1000
            elif 'platelet' in test_name_lower:
                # Platelet count conversion - if value is in thousands format (typical: 250 x10³/µL)
                if numeric_value < 1000:
                    numeric_value = numeric_value * 1000
                    
        except (ValueError, TypeError):
            numeric_value = value
        
        # Handle gender-specific rules
        if isinstance(rules, dict) and gender.lower() in rules:
            test_rules = rules[gender.lower()]
        else:
            test_rules = rules
        
        # Handle age-specific rules (for NT-proBNP)
        if test_name.lower() in ['nt_probnp', 'nt-probnp'] and isinstance(test_rules, dict):
            if age > 75 and 'over_75' in test_rules:
                test_rules = test_rules['over_75']
            elif 'under_75' in test_rules:
                test_rules = test_rules['under_75']
        
        # Evaluate conditions
        unit = test_rules.get('unit', '')
        
        # Check each condition level - IMPORTANT: Check most severe conditions first!
        conditions = ['severe', 'abnormal', 'borderline', 'normal']
        for condition in conditions:
            if condition in test_rules:
                condition_rule = test_rules[condition]
                if self._check_condition(numeric_value, condition_rule):
                    score = self.scoring_framework.get(condition, 0)
                    return TestResult(
                        test_name=test_name,
                        value=numeric_value,
                        unit=unit,
                        category=category,
                        score=score,
                        condition=condition,
                        message=f"{test_name}: {numeric_value} {unit} - {condition.title()}"
                    )
        
        # If no condition matched, consider as normal (0 points deduction)
        return TestResult(
            test_name=test_name,
            value=numeric_value,
            unit=unit,
            category=category,
            score=0,  # 0 points deduction when condition cannot be determined
            condition="normal",
            message=f"{test_name}: {numeric_value} {unit} - Could not determine condition, considered normal (0 points deducted)"
        )
    
    def _check_red_flags(self, test_results: List[TestResult]) -> List[str]:
        """Check for red flag conditions"""
        red_flags = []
        
        # Check explicit red flag rules first
        for red_flag_rule in self.red_flag_rules:
            parameter = red_flag_rule['parameter']
            condition = red_flag_rule['condition']
            message = red_flag_rule['message']
            
            # Find matching test result
            for test_result in test_results:
                test_name_lower = test_result.test_name.lower()
                
                # Check for parameter match - be very specific to avoid false positives
                match_found = False
                
                if parameter == "hemoglobin":
                    # Only match actual hemoglobin blood level tests, not HbA1c or Hepatitis B
                    if (("haemoglobin" in test_name_lower or "hemoglobin" in test_name_lower) 
                        and "hba1c" not in test_name_lower 
                        and "glycoxylated" not in test_name_lower
                        and "hbs" not in test_name_lower
                        and "hepatitis" not in test_name_lower):
                        match_found = True
                    # Also match simple "Hb" but not "HbA1c" or "HBs"
                    elif ((" hb " in f" {test_name_lower} " or test_name_lower.startswith("hb ") or test_name_lower.endswith(" hb"))
                          and "hba1c" not in test_name_lower 
                          and "hbs" not in test_name_lower):
                        match_found = True
                        
                elif parameter == "creatinine":
                    if "creatinine" in test_name_lower:
                        match_found = True
                        
                elif parameter == "troponin":
                    if "troponin" in test_name_lower:
                        match_found = True
                        
                elif parameter == "nt_probnp":
                    if ("nt" in test_name_lower and "probnp" in test_name_lower) or "nt-probnp" in test_name_lower:
                        match_found = True
                
                if match_found:
                    try:
                        numeric_value = float(test_result.value)
                        if self._check_condition(numeric_value, condition):
                            red_flags.append(f"RED FLAG: {message}")
                            logger.warning(f"Red flag detected for {test_result.test_name}: {message}")
                    except (ValueError, TypeError):
                        # Handle non-numeric values
                        if condition in str(test_result.value).lower():
                            red_flags.append(f"RED FLAG: {message}")
                            logger.warning(f"Red flag detected for {test_result.test_name}: {message}")
        
        # Only use explicit red flag rules - do not automatically flag severe conditions
        # Red flags should only be triggered by the specific parameters defined in red_flag_rules:
        # 1. hemoglobin (< 7)
        # 2. creatinine (> 2.5) 
        # 3. troponin (positive_high)
        # 4. nt_probnp (> 1000)
        
        logger.info(f"Total red flags detected: {len(red_flags)}")
        return red_flags
    
    def _calculate_risk_level(self, percentage_score: float, has_red_flags: bool) -> str:
        """Calculate risk level based on score and red flags"""
        if has_red_flags:
            return "CRITICAL"
        
        risk_ranges = self.rules.get('risk_assessment', {}).get('total_score_ranges', {})
        
        if percentage_score > 80:
            return "SAFE"
        elif percentage_score >= 60:
            return "LOW_RISK"
        elif percentage_score >= 40:
            return "MEDIUM_RISK"
        elif percentage_score >= 20:
            return "HIGH_RISK"
        else:
            return "CRITICAL"
    
    def _extract_tests_from_document(self, extracted_data: Dict) -> List[Dict]:
        """Extract test results from various possible data structures"""
        tests = []
        
        # Handle results array structure (most common in medical documents)
        if 'results' in extracted_data and isinstance(extracted_data['results'], list):
            for result in extracted_data['results']:
                if isinstance(result, dict) and 'test_name' in result and 'value' in result:
                    # Clean and normalize the test value
                    value = result['value']
                    if isinstance(value, str):
                        # Remove leading zeros and clean the value
                        value = value.strip().lstrip('0') or '0'
                    
                    tests.append({
                        'test_name': result['test_name'],
                        'value': value,
                        'unit': result.get('unit', ''),
                        'reference_range': result.get('reference_range', '')
                    })
        
        # Handle patient_info structure for vitals
        if 'patient_info' in extracted_data:
            patient_info = extracted_data['patient_info']
            
            # Extract vitals if available
            if 'vitals' in patient_info:
                vitals = patient_info['vitals']
                for vital_name, vital_value in vitals.items():
                    if vital_value is not None:
                        tests.append({
                            'test_name': vital_name,
                            'value': vital_value,
                            'unit': '',
                            'reference_range': ''
                        })
        
        # Handle direct key-value pairs for additional tests
        for key, value in extracted_data.items():
            if key not in ['patient_info', 'results', 'document_info', 'title'] and value is not None:
                # Check if this looks like a medical test
                medical_keywords = ['glucose', 'cholesterol', 'hemoglobin', 'creatinine', 'bp', 'pressure', 
                                  'sugar', 'albumin', 'bilirubin', 'urea', 'calcium', 'sodium', 'potassium']
                if any(term in key.lower() for term in medical_keywords):
                    tests.append({
                        'test_name': key,
                        'value': value,
                        'unit': '',
                        'reference_range': ''
                    })
        
        return tests

    def _generate_recommendations(self, test_results: List[TestResult], red_flags: List[str]) -> List[str]:
        """Generate health recommendations based on test results"""
        recommendations = []
        
        if red_flags:
            recommendations.append("URGENT: Immediate medical consultation required due to critical test values")
        
        # Analyze test results for recommendations
        abnormal_tests = [test for test in test_results if test.condition in ['abnormal', 'severe']]
        
        if abnormal_tests:
            recommendations.append("Follow-up required for abnormal test results")
            
            # Category-specific recommendations
            categories = set(test.category for test in abnormal_tests)
            
            if 'cbc_rules' in categories:
                recommendations.append("Complete Blood Count abnormalities detected - hematology consultation recommended")
            
            if 'renal_function_rules' in categories:
                recommendations.append("Kidney function issues detected - nephrology consultation recommended")
            
            if 'liver_function_rules' in categories:
                recommendations.append("Liver function abnormalities - hepatology consultation recommended")
            
            if 'cardiac_rules' in categories:
                recommendations.append("Cardiac markers abnormal - cardiology consultation required")
            
            if 'sugar_tests_rules' in categories:
                recommendations.append("Blood sugar abnormalities - endocrinology consultation recommended")
        
        borderline_tests = [test for test in test_results if test.condition == 'borderline']
        if borderline_tests:
            recommendations.append("Regular monitoring recommended for borderline values")
        
        if not abnormal_tests and not red_flags:
            recommendations.append("Overall good health indicators - maintain current lifestyle")
        
        return recommendations
    
    def evaluate_proposer(self, proposer_id: int, gender: str = "male", age: int = 30) -> ProposerHealthScore:
        """Evaluate health score for a specific proposer"""
        logger.info(f"Starting health score evaluation for proposer {proposer_id}")
        
        # Load proposer data
        proposer_data = self._load_proposer_data(proposer_id)
        documents = proposer_data.get('documents', [])
        
        test_results = []
        
        # Process each document
        for document in documents:
            extracted_data = document.get('extracted_data', {})
            
            if isinstance(extracted_data, dict):
                # Use improved test extraction
                tests = self._extract_tests_from_document(extracted_data)
                
                for test in tests:
                    test_result = self._evaluate_test(
                        test['test_name'],
                        test['value'],
                        gender=gender,
                        age=age
                    )
                    test_results.append(test_result)
        
        # Calculate scores using new deduction-based system
        base_score = self.scoring_framework.get('base_score', 160)
        total_deductions = sum(abs(test.score) for test in test_results if test.score < 0)
        final_score = base_score - total_deductions
        
        # Ensure score doesn't go below 0
        final_score = max(0, final_score)
        
        # Calculate percentage score (final_score out of base_score)
        percentage_score = (final_score / base_score * 100) if base_score > 0 else 0
        
        # Check for red flags
        red_flags = self._check_red_flags(test_results)
        
        # Calculate risk level
        risk_level = self._calculate_risk_level(percentage_score, bool(red_flags))
        
        # Generate recommendations
        recommendations = self._generate_recommendations(test_results, red_flags)
        
        result = ProposerHealthScore(
            proposer_id=proposer_id,
            total_score=final_score,
            max_possible_score=base_score,
            percentage_score=round(percentage_score, 2),
            risk_level=risk_level,
            red_flags=red_flags,
            test_results=test_results,
            recommendations=recommendations
        )
        
        logger.info(f"Health score evaluation completed for proposer {proposer_id}")
        logger.info(f"Score: {final_score}/{base_score} ({percentage_score:.2f}%) - Risk Level: {risk_level}")
        
        return result
    
    def evaluate_all_proposers(self) -> Dict[int, ProposerHealthScore]:
        """Evaluate health scores for all proposers in the data folder"""
        logger.info("Starting evaluation for all proposers")
        
        # Get all proposer files
        proposer_files = [f for f in os.listdir(self.data_folder_path) if f.startswith('proposer_') and f.endswith('.json')]
        proposer_ids = []
        
        for filename in proposer_files:
            try:
                proposer_id = int(filename.split('_')[1])
                proposer_ids.append(proposer_id)
            except (ValueError, IndexError):
                logger.warning(f"Could not extract proposer ID from filename: {filename}")
        
        results = {}
        
        for proposer_id in proposer_ids:
            try:
                result = self.evaluate_proposer(proposer_id)
                results[proposer_id] = result
            except Exception as e:
                logger.error(f"Failed to evaluate proposer {proposer_id}: {e}")
        
        logger.info(f"Completed evaluation for {len(results)} proposers")
        return results
    
    def save_results(self, results: Dict[int, ProposerHealthScore], output_dir: str = "health_score_results"):
        """Save evaluation results to JSON files"""
        os.makedirs(output_dir, exist_ok=True)
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        
        # Save individual results
        for proposer_id, result in results.items():
            result_dict = {
                "proposer_id": result.proposer_id,
                "evaluation_timestamp": datetime.now().isoformat(),
                "final_health_score": result.total_score,
                "base_score": result.max_possible_score,
                "percentage_score": result.percentage_score,
                "risk_level": result.risk_level,
                "red_flags": result.red_flags,
                "recommendations": result.recommendations,
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
                ]
            }
            
            filename = f"proposer_{proposer_id}_health_score_{timestamp}.json"
            filepath = os.path.join(output_dir, filename)
            
            with open(filepath, 'w', encoding='utf-8') as f:
                json.dump(result_dict, f, indent=2, ensure_ascii=False)
        
        # Save summary report
        summary = {
            "evaluation_summary": {
                "timestamp": datetime.now().isoformat(),
                "total_proposers": len(results),
                "risk_distribution": {},
                "average_score": 0,
                "red_flag_count": 0
            },
            "proposer_summary": {}
        }
        
        # Calculate summary statistics
        risk_counts = {}
        total_score = 0
        red_flag_count = 0
        
        for proposer_id, result in results.items():
            risk_level = result.risk_level
            risk_counts[risk_level] = risk_counts.get(risk_level, 0) + 1
            total_score += result.percentage_score
            red_flag_count += len(result.red_flags)
            
            summary["proposer_summary"][str(proposer_id)] = {
                "percentage_score": result.percentage_score,
                "risk_level": result.risk_level,
                "red_flags_count": len(result.red_flags),
                "total_tests": len(result.test_results)
            }
        
        summary["evaluation_summary"]["risk_distribution"] = risk_counts
        summary["evaluation_summary"]["average_score"] = round(total_score / len(results), 2) if results else 0
        summary["evaluation_summary"]["red_flag_count"] = red_flag_count
        
        summary_filename = f"health_score_summary_{timestamp}.json"
        summary_filepath = os.path.join(output_dir, summary_filename)
        
        with open(summary_filepath, 'w', encoding='utf-8') as f:
            json.dump(summary, f, indent=2, ensure_ascii=False)
        
        logger.info(f"Results saved to {output_dir}")
        logger.info(f"Summary report: {summary_filepath}")

def main():
    """Main execution function"""
    try:
        # File paths
        rules_file = "health_score_rules.yaml"
        data_folder = "extracted_data/proposer_data"
        
        # Initialize the rule engine
        engine = HealthScoreRuleEngine(rules_file, data_folder)
        
        # Evaluate all proposers
        results = engine.evaluate_all_proposers()
        
        # Print results summary
        print(f"\n{'='*80}")
        print("HEALTH SCORE EVALUATION RESULTS")
        print(f"{'='*80}")
        
        for proposer_id, result in results.items():
            print(f"\nProposer ID: {proposer_id}")
            print(f"Health Score: {result.total_score}/{result.max_possible_score} ({result.percentage_score}%)")
            print(f"Risk Level: {result.risk_level}")
            print(f"Tests Evaluated: {len(result.test_results)}")
            
            # Show deduction summary
            deductions = [test for test in result.test_results if test.score < 0]
            total_deductions = sum(abs(test.score) for test in deductions)
            print(f"Total Points Deducted: {total_deductions}")
            
            if result.red_flags:
                print("🚨 RED FLAGS:")
                for flag in result.red_flags:
                    print(f"  - {flag}")
            
            print("📋 Recommendations:")
            for rec in result.recommendations[:3]:  # Show first 3 recommendations
                print(f"  - {rec}")
            
            print("-" * 40)
        
        # Save results
        engine.save_results(results)
        
        # Overall summary
        total_proposers = len(results)
        avg_score = sum(r.percentage_score for r in results.values()) / total_proposers if total_proposers > 0 else 0
        red_flag_total = sum(len(r.red_flags) for r in results.values())
        
        print(f"\n{'='*80}")
        print("OVERALL SUMMARY")
        print(f"{'='*80}")
        print(f"Total Proposers Evaluated: {total_proposers}")
        print(f"Average Health Score: {avg_score:.2f}%")
        print(f"Total Red Flags: {red_flag_total}")
        
        risk_distribution = {}
        for result in results.values():
            risk_level = result.risk_level
            risk_distribution[risk_level] = risk_distribution.get(risk_level, 0) + 1
        
        print("Risk Level Distribution:")
        for risk_level, count in risk_distribution.items():
            print(f"  {risk_level}: {count} proposers")
        
        print(f"{'='*80}\n")
        
    except Exception as e:
        logger.error(f"Health score evaluation failed: {e}")
        raise

if __name__ == "__main__":
    main()