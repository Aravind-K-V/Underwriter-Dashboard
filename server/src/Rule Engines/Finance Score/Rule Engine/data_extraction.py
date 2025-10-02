"""Data extraction utilities for Finance Score rule engine.

This module connects to PostgreSQL, applies business gating (validated documents
and finance review requirement), aggregates required metrics, and returns a
minimal dataset for downstream scoring. It also supports exporting per-proposal
input snapshots to JSON for auditability and traceability.
"""

import os
import pandas as pd
from datetime import datetime
from typing import Optional, Dict, List
import logging
from dotenv import load_dotenv

# Load environment variables from .env file (optional)
load_dotenv()

# Configure logging once for this module
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s | %(levelname)s | %(name)s | %(message)s'
)
logger = logging.getLogger(__name__)

class FinanceScoreDataExtractor:
    """Extracts and exports the minimal data required for Finance Score.

    Responsibilities:
    - Establish DB connection from environment configuration
    - Enforce gating (validated documents, finance review required)
    - Aggregate required amounts (sum assured, other insurance)
    - Return minimal columns needed for scoring
    - Export per-proposal input JSONs for audit
    """

    def __init__(self):
        """Initialize extractor with connection and table configuration from env.

        Required env vars: DB_HOST, DB_NAME, DB_USER, DB_PASSWORD.
        Optional: DB_PORT (default 5432), DB_SCHEMA (default public), TBL_* overrides.
        """
        self.connection_params = {
            'host': os.environ.get('DB_HOST'),
            'port': os.environ.get('DB_PORT', '5432'),
            'database': os.environ.get('DB_NAME'),
            'user': os.environ.get('DB_USER'),
            'password': os.environ.get('DB_PASSWORD')
        }
        
        # Optional: schema and table names (env-overridable) - default to match actual schema case
        self.db_schema = os.environ.get('DB_SCHEMA', 'public')
        self.tbl_documents = os.environ.get('TBL_DOCUMENTS', 'documents')
        self.tbl_proposal = os.environ.get('TBL_PROPOSAL', 'proposal')
        self.tbl_proposer = os.environ.get('TBL_PROPOSER', 'proposer')  # Use lowercase to match actual schema
        self.tbl_insured_member = os.environ.get('TBL_INSURED_MEMBER', 'insured_member')
        self.tbl_previous_insurance = os.environ.get('TBL_PREVIOUS_INSURANCE', 'previous_insurance_details')
        self.tbl_rule_engine_trail = os.environ.get('TBL_RULE_ENGINE_TRAIL', 'rule_engine_trail')
        
        # Validate required environment variables
        required_params = ['host', 'database', 'user', 'password']
        missing_params = [param for param in required_params if not self.connection_params[param]]
        
        if missing_params:
            raise ValueError(f"Missing required environment variables: {', '.join([f'DB_{param.upper()}' for param in missing_params])}")
        
        # Internal cache of available columns per table
        self._table_columns_cache: Dict[str, set] = {}
        self._existing_tables: set = set()
        logger.debug("Extractor initialized with schema=%s", self.db_schema)
        
    def _qual(self, table_name: str) -> str:
        """Return schema-qualified and quoted identifier for a table name."""
        return f'"{self.db_schema}"."{table_name}"' if self.db_schema else f'"{table_name}"'
    
    def _cache_columns(self, conn) -> None:
        """Populate caches: list of existing tables and their columns in schema."""
        if self._table_columns_cache:
            return
        try:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT table_name
                    FROM information_schema.tables
                    WHERE table_schema = %s
                    """,
                    [self.db_schema]
                )
                self._existing_tables = {r[0] for r in cur.fetchall()}
            
            query = f"""
                SELECT table_name, column_name
                FROM information_schema.columns
                WHERE table_schema = %s
                  AND table_name IN (%s)
            """
            target_tables = [
                self.tbl_documents,
                self.tbl_proposal,
                self.tbl_proposer,
                self.tbl_insured_member,
                self.tbl_previous_insurance,
                self.tbl_rule_engine_trail
            ]
            placeholders = ','.join(['%s'] * len(target_tables))
            final_query = query % ('%s', placeholders)
            with conn.cursor() as cur:
                cur.execute(final_query, [self.db_schema, *target_tables])
                rows = cur.fetchall()
                for table_name, column_name in rows:
                    if table_name not in self._table_columns_cache:
                        self._table_columns_cache[table_name] = set()
                    self._table_columns_cache[table_name].add(column_name)
            # Introspection complete
        except Exception as e:
            logger.warning(f"Could not introspect schema for dynamic query building: {e}")
    
    def _has_table(self, table: str) -> bool:
        """Check if table is present in current schema (based on cache)."""
        return bool(self._existing_tables and table in self._existing_tables)
    
    def _first_existing_col(self, table: str, candidates: List[str]) -> Optional[str]:
        """Return first existing column from candidates for a table, else None."""
        cols = self._table_columns_cache.get(table)
        if not cols:
            return None
        for cand in candidates:
            if cand in cols:
                return cand
        return None
    
    def _resolve_col_expr(self, alias: str, table: str, candidates: List[str], fallback: Optional[str] = None) -> Optional[str]:
        """Resolve an available column expression alias."col"
        in preference order of candidates; falls back when provided."""
        existing = self._first_existing_col(table, candidates)
        col = existing or fallback
        return f'{alias}."{col}"' if col else None
        
    def get_connection(self):
        """Create a PostgreSQL connection (psycopg2) or SQLAlchemy engine fallback."""
        try:
            import psycopg2
            conn = psycopg2.connect(
                host=self.connection_params['host'],
                port=self.connection_params['port'],
                database=self.connection_params['database'],
                user=self.connection_params['user'],
                password=self.connection_params['password']
            )
            logger.info("Connected to PostgreSQL using psycopg2")
            return conn, 'psycopg2'
        except ImportError:
            try:
                from sqlalchemy import create_engine
                connection_string = f"postgresql://{self.connection_params['user']}:{self.connection_params['password']}@{self.connection_params['host']}:{self.connection_params['port']}/{self.connection_params['database']}"
                engine = create_engine(connection_string)
                logger.info("Using SQLAlchemy engine for PostgreSQL connection")
                return engine, 'sqlalchemy'
            except ImportError:
                raise ImportError("Neither psycopg2 nor SQLAlchemy is installed. Please install one of them.")

    def build_finance_score_query(self, conn=None) -> str:
        """Build SQL for the minimal dataset required to compute Finance Score.

        The query enforces the following gates:
        - documents.validated = TRUE
        - rule_engine_trail.finreview_required = TRUE
        And aggregates:
        - member_sum_assured: SUM(insured_member.sum_insured) per proposer
        - previous_insurance_summary: SUM(previous sum insured) per proposer (optional table)
        """
        try:
            if conn is not None and conn.__class__.__module__.startswith('psycopg2'):
                self._cache_columns(conn)
        except Exception as e:
            logger.debug(f"Skipping introspection: {e}")
        
        q_docs = self._qual(self.tbl_documents)
        q_prop = self._qual(self.tbl_proposal)
        q_proser = self._qual(self.tbl_proposer)
        q_member = self._qual(self.tbl_insured_member)
        q_prev = self._qual(self.tbl_previous_insurance)
        q_ret = self._qual(self.tbl_rule_engine_trail)
        
        # Resolve needed columns
        proposal_number = self._resolve_col_expr('p', self.tbl_proposal, ['proposal_number', 'proposal_no'], 'proposal_number')
        proposer_id_expr = 'pr."proposer_id"'
        occupation = self._resolve_col_expr('pr', self.tbl_proposer, ['occupation']) or 'pr.occupation'
        annual_income = self._resolve_col_expr('pr', self.tbl_proposer, ['annual_income', 'income', 'yearly_income']) or 'pr.annual_income'
        # Premium is stored on proposer in current schema (see schema debug)
        premium = self._resolve_col_expr('pr', self.tbl_proposer, ['premium_amount', 'premium']) or '0'
        stated_age = self._resolve_col_expr('pr', self.tbl_proposer, ['age']) or 'pr.age'
        dob = self._resolve_col_expr('pr', self.tbl_proposer, ['dob', 'date_of_birth']) or 'pr.dob'
        
        # Minimal diagnostics for critical fields
        if dob == 'pr.dob' and not self._first_existing_col(self.tbl_proposer, ['dob', 'date_of_birth']):
            logger.warning("DOB column not found in proposer table; check schema or env overrides")
        
        insured_member_sum = self._resolve_col_expr('im', self.tbl_insured_member, ['sum_insured', 'sum_assured'], 'sum_insured')
        insured_member_proposer_fk = self._resolve_col_expr('im', self.tbl_insured_member, ['proposer_id'], 'proposer_id')
        
        prev_ins_sum = self._resolve_col_expr('pi', self.tbl_previous_insurance, ['sum_insured', 'sum_assured'], 'sum_insured')
        prev_ins_proposer_fk = self._resolve_col_expr('pi', self.tbl_previous_insurance, ['proposer_id'], 'proposer_id')
        
        has_member = self._has_table(self.tbl_insured_member) if self._existing_tables else True
        has_prev = self._has_table(self.tbl_previous_insurance) if self._existing_tables else False
        
        cte_parts: List[str] = []
        
        # Only need validated links, no extracted JSON
        cte_docs = f"""
        validated_documents AS (
            SELECT DISTINCT 
                d."proposer_id",
                d."member_id",
                {self._resolve_col_expr('d', self.tbl_documents, ['proposal_number', 'proposal_no'], 'proposal_number')} as proposal_number
            FROM {q_docs} d
            WHERE {self._resolve_col_expr('d', self.tbl_documents, ['validated', 'is_validated'], 'validated')} = TRUE
        )"""
        cte_parts.append(cte_docs)
        
        # Filter set from Rule_Engine_Trail where finreview_required = TRUE
        cte_finreview = f"""
        finreview_required_set AS (
            SELECT DISTINCT ret."proposal_number"
            FROM {q_ret} ret
            WHERE COALESCE(ret."finreview_required", FALSE) = TRUE
        )"""
        cte_parts.append(cte_finreview)
        
        if has_prev:
            cte_prev = f"""
            previous_insurance_summary AS (
                SELECT 
                    {prev_ins_proposer_fk} as proposer_id,
                    COALESCE(SUM({prev_ins_sum}), 0) as other_insurance_sum_assured
                FROM {q_prev} pi
                GROUP BY {prev_ins_proposer_fk}
            )"""
        else:
            cte_prev = f"""
            previous_insurance_summary AS (
                SELECT 
                    pr."proposer_id" as proposer_id,
                    0::numeric as other_insurance_sum_assured
                FROM {q_proser} pr
            )"""
        cte_parts.append(cte_prev)
        
        if has_member:
            cte_member = f"""
            member_sum_assured AS (
                SELECT 
                    {insured_member_proposer_fk} as proposer_id,
                    COALESCE(SUM({insured_member_sum}), 0) as sum_assured
                FROM {q_member} im
                GROUP BY {insured_member_proposer_fk}
            )"""
        else:
            cte_member = f"""
            member_sum_assured AS (
                SELECT 
                    pr."proposer_id" as proposer_id,
                    0::numeric as sum_assured
                FROM {q_proser} pr
            )"""
        cte_parts.append(cte_member)
        
        ctes_sql = ",\n".join(cte_parts)
        
        query = f"""
        WITH
        {ctes_sql}
        SELECT DISTINCT
            {proposal_number} as proposal_number,
            {proposer_id_expr} as proposer_id,
            COALESCE({stated_age}, 0) as stated_age,
            COALESCE({dob}::text, '') as dob,
            COALESCE({occupation}::text, '') as occupation,
            COALESCE({annual_income}, 0) as annual_income,
            COALESCE({premium}, 0) as premium,
            COALESCE(msa.sum_assured, 0) as sum_assured,
            COALESCE(pis.other_insurance_sum_assured, 0) as other_insurance_sum_assured
        FROM {q_prop} p
        INNER JOIN {q_proser} pr ON p."proposer_id" = pr."proposer_id"
        INNER JOIN validated_documents vd ON vd.proposal_number = {proposal_number} 
            AND vd."proposer_id" = pr."proposer_id"
        INNER JOIN finreview_required_set fr ON fr."proposal_number" = {proposal_number}
        LEFT JOIN member_sum_assured msa ON msa.proposer_id = pr."proposer_id"
        LEFT JOIN previous_insurance_summary pis ON pis.proposer_id = pr."proposer_id"
        ORDER BY {proposal_number}, pr."proposer_id";
        """
        # SQL ready for execution
        return query

    def extract(self) -> pd.DataFrame:
        """Execute extraction and return a DataFrame with required fields only."""
        try:
            logger.info("Starting data extraction for Finance Score (filtered by finreview_required)")
            conn, conn_type = self.get_connection()
            if conn_type == 'psycopg2':
                query = self.build_finance_score_query(conn)
            else:
                query = self.build_finance_score_query()
            logger.debug("Executing SQL query to fetch proposals")
            if conn_type == 'psycopg2':
                df = pd.read_sql_query(query, conn)
                conn.close()
            else:
                df = pd.read_sql_query(query, conn)
                conn.dispose()
            if df.empty:
                logger.warning("No proposals matched finreview_required = TRUE with validated documents")
                return df
            logger.info(f"Extraction complete. Proposals fetched: {len(df)}")
            # Validate critical columns presence and completeness
            required_columns = ['proposal_number', 'proposer_id', 'dob', 'annual_income']
            missing_columns = [col for col in required_columns if col not in df.columns]
            if missing_columns:
                logger.error(f"Missing required columns: {missing_columns}")
            if 'dob' in df.columns:
                dob_null_count = df['dob'].isnull().sum()
                if dob_null_count > 0:
                    logger.warning(f"DOB nulls: {dob_null_count}/{len(df)}")
            return df
        except Exception as e:
            logger.error("Error extracting finance score data", exc_info=True)
            raise

    def export_data(self, df: pd.DataFrame, format_type: str = 'json', filename: str = 'finance_score_data') -> str:
        """Export a full dataset snapshot (JSON or Parquet) with a timestamped filename."""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        if format_type.lower() == 'json':
            filename = f"{filename}_{timestamp}.json"
            df.to_json(filename, orient='records', indent=2)
        elif format_type.lower() == 'parquet':
            filename = f"{filename}_{timestamp}.parquet"
            df.to_parquet(filename, index=False)
        else:
            raise ValueError("Supported formats: json, parquet")
        logger.info(f"Data exported to {filename}")
        return filename

    def debug_schema(self) -> None:
        """Debug method to check actual database schema and sample data."""
        try:
            conn, conn_type = self.get_connection()
            q_proser = self._qual(self.tbl_proposer)
            
            # Check proposer table columns
            schema_query = f"""
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_schema = '{self.db_schema}' AND table_name = '{self.tbl_proposer}'
            ORDER BY ordinal_position;
            """
            
            if conn_type == 'psycopg2':
                with conn.cursor() as cur:
                    cur.execute(schema_query)
                    columns = cur.fetchall()
                    logger.info(f"Proposer table schema ({len(columns)} columns):")
                    for col_name, data_type, is_nullable in columns:
                        logger.info(f"  {col_name}: {data_type} (nullable: {is_nullable})")
                
                # Check sample DOB data
                try:
                    sample_query = f"""
                    SELECT proposer_id, dob, age, customer_name
                    FROM {q_proser}
                    WHERE dob IS NOT NULL
                    LIMIT 5;
                    """
                    with conn.cursor() as cur:
                        cur.execute(sample_query)
                        samples = cur.fetchall()
                        logger.info(f"Sample DOB data ({len(samples)} records):")
                        for prop_id, dob, age, name in samples:
                            logger.info(f"  ID: {prop_id}, DOB: {dob}, Age: {age}, Name: {name}")
                except Exception as e:
                    logger.error(f"Could not query sample DOB data: {e}")
                    # Try to list available tables
                    with conn.cursor() as cur:
                        cur.execute("""
                            SELECT table_name 
                            FROM information_schema.tables 
                            WHERE table_schema = 'public' 
                            AND table_name ILIKE '%proposer%'
                            ORDER BY table_name;
                        """)
                        tables = cur.fetchall()
                        logger.info(f"Tables with 'proposer' in name: {[t[0] for t in tables]}")
                
                conn.close()
            else:
                # SQLAlchemy fallback
                df_schema = pd.read_sql_query(schema_query, conn)
                logger.info(f"Proposer table schema ({len(df_schema)} columns):")
                for _, row in df_schema.iterrows():
                    logger.info(f"  {row['column_name']}: {row['data_type']} (nullable: {row['is_nullable']})")
                conn.dispose()
                
        except Exception as e:
            logger.error(f"Error debugging schema: {e}", exc_info=True)

    def export_per_proposal_inputs(self, df: pd.DataFrame, output_dir: str, id_col: str = 'proposal_number') -> None:
        """Write one JSON per proposal with extracted input fields.

        Files are written to a stable path: <output_dir>/inputs/finance_input_<proposal>.json
        This promotes auditability by preserving the exact features used for scoring.
        """
        if df is None or df.empty:
            logger.info("No extracted inputs to export")
            return
        inputs_dir = os.path.join(output_dir, 'inputs')
        os.makedirs(inputs_dir, exist_ok=True)
        count = 0
        fields = ['proposal_number', 'proposer_id', 'stated_age', 'dob', 'occupation', 'annual_income', 'premium', 'sum_assured', 'other_insurance_sum_assured']
        for _, row in df.iterrows():
            pid = row[id_col]
            record = {k: row.get(k) for k in fields}
            out_path = os.path.join(inputs_dir, f"finance_input_{pid}.json")
            try:
                with open(out_path, 'w', encoding='utf-8') as fh:
                    import json
                    # Convert date objects to string format for JSON serialization
                    def json_serializer(obj):
                        if hasattr(obj, 'isoformat'):  # datetime.date objects
                            return obj.isoformat()
                        return str(obj) if obj is not None else None
                    json.dump(record, fh, indent=2, default=json_serializer)
                count += 1
            except Exception:
                logger.error("Failed to write input JSON for proposal %s", pid, exc_info=True)
        logger.info(f"Exported {count} per-proposal input JSON files to {inputs_dir}") 