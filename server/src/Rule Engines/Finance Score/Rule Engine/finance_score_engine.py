"""Finance Score rule engine implementation.

This module loads YAML-configured rules, computes component scores from
pre-processed inputs, aggregates a final normalized financial score, and derives
risk categories and underwriting flags. It also produces per-proposal JSON
artifacts for auditability and downstream consumption.
"""

import os
import json
import pandas as pd
import logging
from typing import Dict, Any, List
from datetime import datetime

import yaml

logger = logging.getLogger(__name__)

class FinanceScoreCalculator:
    def __init__(self, rules_path: str = None, output_dir: str = None):
        base_dir = os.path.dirname(os.path.abspath(__file__))
        default_rules = os.path.join(base_dir, 'finance_score_rules.yaml')
        default_output = os.path.join(base_dir, 'finance_scores')
        self.rules_path = rules_path or os.environ.get('FIN_RULES_YAML', default_rules)
        base_output = output_dir or os.environ.get('FIN_OUTPUT_DIR', default_output)
        # Structured output: base/YYYYMMDD/
        date_folder = datetime.now().strftime('%Y%m%d')
        self.output_root = base_output
        self.output_dir = os.path.join(base_output, date_folder)
        os.makedirs(self.output_dir, exist_ok=True)
        self.rules = self._load_rules()
        logger.info(f"Loaded rules from {self.rules_path}")
        logger.info(f"Output directory set to {self.output_dir}")

    def _load_rules(self) -> Dict[str, Any]:
        if not os.path.exists(self.rules_path):
            raise FileNotFoundError(f"Rules YAML not found at {self.rules_path}")
        with open(self.rules_path, 'r', encoding='utf-8') as fh:
            data = yaml.safe_load(fh)
        if not data:
            raise ValueError("Rules YAML is empty or invalid")
        return data

    def _preprocess(self, df: pd.DataFrame) -> pd.DataFrame:
        def to_float_safe(x):
            try:
                if pd.isna(x):
                    return None
                if isinstance(x, str):
                    x = x.replace(',', '').strip()
                val = float(x)
                return val if val >= 0 else None
            except Exception:
                return None
        df = df.copy()
        for col in ['annual_income', 'premium', 'sum_assured', 'other_insurance_sum_assured']:
            if col in df.columns:
                df[col] = df[col].apply(to_float_safe)
        if 'occupation' in df.columns:
            df['occupation'] = df['occupation'].astype(str).str.strip().str.lower()
        return df

    def _score_from_bands(self, value, bands):
        if value is None or pd.isna(value):
            return None
        for band in bands:
            min_v = band.get('min', None)
            max_v = band.get('max', None)
            inclusive_max = band.get('inclusive_max', True)
            score = band['score']
            ok_min = True if min_v is None else (value >= min_v)
            if max_v is None:
                ok_max = True
            else:
                ok_max = (value <= max_v) if inclusive_max else (value < max_v)
            if ok_min and ok_max:
                return score
        return None

    def _compute_component_scores(self, df: pd.DataFrame) -> pd.DataFrame:
        rules = self.rules
        weights = rules.get('weights', {})
        components = rules.get('components', {})

        df = self._preprocess(df)
        logger.info("Computing SAR/TSAR/Premium ratios")
        df['sar_income_ratio'] = df.apply(lambda r: (r['sum_assured'] / r['annual_income']) if (pd.notna(r['annual_income']) and r['annual_income'] > 0 and pd.notna(r['sum_assured'])) else None, axis=1)
        df['tsar_income_ratio'] = df.apply(lambda r: ((r['sum_assured'] + r['other_insurance_sum_assured']) / r['annual_income']) if (pd.notna(r['annual_income']) and r['annual_income'] > 0 and pd.notna(r['sum_assured']) and pd.notna(r['other_insurance_sum_assured'])) else None, axis=1)
        df['premium_income_ratio'] = df.apply(lambda r: (r['premium'] / r['annual_income']) if (pd.notna(r['annual_income']) and r['annual_income'] > 0 and pd.notna(r['premium'])) else None, axis=1)

        sar_bands = components.get('sar_income_ratio', [])
        tsar_bands = components.get('tsar_income_ratio', [])
        premium_bands = components.get('premium_income_ratio', [])

        logger.info("Scoring components using YAML bands")
        df['sar_score'] = df['sar_income_ratio'].apply(lambda v: self._score_from_bands(v, sar_bands))
        df['tsar_score'] = df['tsar_income_ratio'].apply(lambda v: self._score_from_bands(v, tsar_bands))
        df['premium_score'] = df['premium_income_ratio'].apply(lambda v: self._score_from_bands(v, premium_bands))

        w_sar = float(weights.get('sar_income_ratio', 0.5))
        w_tsar = float(weights.get('tsar_income_ratio', 0.25))
        w_prem = float(weights.get('premium_income_ratio', 0.25))
        logger.info(f"Applying weights: SAR={w_sar}, TSAR={w_tsar}, Premium={w_prem}")

        df['weighted_score'] = (
            df['sar_score'].astype('float') * w_sar +
            df['tsar_score'].astype('float') * w_tsar +
            df['premium_score'].astype('float') * w_prem
        )
        df['final_finance_score'] = df['weighted_score'].round().astype('Int64')

        def top_factors(row) -> List[Dict[str, Any]]:
            parts = []
            parts.append({'feature': 'sar_income_ratio', 'score': row.get('sar_score'), 'weight': w_sar, 'contribution': (row.get('sar_score') or 0) * w_sar})
            parts.append({'feature': 'tsar_income_ratio', 'score': row.get('tsar_score'), 'weight': w_tsar, 'contribution': (row.get('tsar_score') or 0) * w_tsar})
            parts.append({'feature': 'premium_income_ratio', 'score': row.get('premium_score'), 'weight': w_prem, 'contribution': (row.get('premium_score') or 0) * w_prem})
            parts.sort(key=lambda x: x['contribution'], reverse=True)
            return parts[:3]
        df['score_factors'] = df.apply(top_factors, axis=1)
        return df

    def _apply_decisions(self, df: pd.DataFrame) -> pd.DataFrame:
        decisions = self.rules.get('decisions', {})
        categories = decisions.get('risk_categories', [])
        flags = decisions.get('underwriting_flags', [])

        def category_fn(score):
            if pd.isna(score):
                return None
            for rule in categories:
                if rule['score'] == int(score):
                    return rule['label']
            return None

        def flag_fn(row):
            score = row['final_finance_score']
            sar = row.get('sar_score')
            prem = row.get('premium_score')
            if pd.isna(score):
                return 'Manual Review'
            for rule in flags:
                cond = rule.get('when', {})
                ok = True
                if 'final_score_in' in cond and int(score) not in cond['final_score_in']:
                    ok = False
                if ok and 'premium_score_in' in cond and prem not in cond['premium_score_in']:
                    ok = False
                if ok and 'sar_score_in' in cond and sar not in cond['sar_score_in']:
                    ok = False
                if ok:
                    return rule.get('flag', 'Manual Review')
            return 'Manual Review'

        logger.info("Applying decision rules for category and underwriting flag")
        df['risk_category'] = df['final_finance_score'].apply(category_fn)
        df['underwriting_flag'] = df.apply(flag_fn, axis=1)
        return df

    def _validate_rows(self, df: pd.DataFrame) -> pd.DataFrame:
        required = ['annual_income', 'premium', 'sum_assured']
        def validate_row(row):
            issues = []
            for col in required:
                if col not in row or pd.isna(row[col]) or row[col] is None:
                    issues.append(f"missing_{col}")
            return issues
        df = df.copy()
        df['validation_issues'] = df.apply(validate_row, axis=1)
        return df

    def calculate(self, df: pd.DataFrame) -> pd.DataFrame:
        if df is None or df.empty:
            logger.warning("No data provided to FinanceScoreCalculator.calculate")
            return df
        logger.info(f"Calculating Finance Scores for {len(df)} proposals")
        df = self._compute_component_scores(df)
        df = self._apply_decisions(df)
        df = self._validate_rows(df)
        logger.info("Finance Score calculation completed")
        return df

    def export_per_proposal(self, df: pd.DataFrame, id_col: str = 'proposal_number') -> None:
        if df is None or df.empty:
            logger.info("No rows to export")
            return
        count = 0
        for _, row in df.iterrows():
            pid = row[id_col]
            record = {
                'proposal_number': row.get('proposal_number'),
                'proposer_id': row.get('proposer_id'),
                'sar_income_ratio': row.get('sar_income_ratio'),
                'tsar_income_ratio': row.get('tsar_income_ratio'),
                'premium_income_ratio': row.get('premium_income_ratio'),
                'sar_score': row.get('sar_score'),
                'tsar_score': row.get('tsar_score'),
                'premium_score': row.get('premium_score'),
                'final_finance_score': row.get('final_finance_score'),
                'risk_category': row.get('risk_category'),
                'underwriting_flag': row.get('underwriting_flag'),
                'score_factors': row.get('score_factors'),
                'validation_issues': row.get('validation_issues')
            }
            out_path = os.path.join(self.output_dir, f"finance_score_{pid}.json")
            with open(out_path, 'w', encoding='utf-8') as fh:
                json.dump(record, fh, indent=2, default=lambda o: None)
            count += 1
        logger.info(f"Exported {count} per-proposal JSON files to {self.output_dir}") 