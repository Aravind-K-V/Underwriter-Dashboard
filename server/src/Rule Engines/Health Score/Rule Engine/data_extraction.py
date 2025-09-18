import os
import json
import logging
from typing import Any, Dict, List, Optional

import psycopg2
from psycopg2 import errors as pg_errors
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv


# -----------------------------------------------------------------------------
# Logging configuration
# -----------------------------------------------------------------------------
_THIS_DIR = os.path.dirname(os.path.abspath(__file__))
_ENV_PATH = os.path.abspath(os.path.join(_THIS_DIR, "..", ".env"))
load_dotenv(dotenv_path=_ENV_PATH)
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO").upper()
logging.basicConfig(
    level=getattr(logging, LOG_LEVEL, logging.INFO),
    format="%(asctime)s [%(levelname)s] %(name)s - %(message)s",
)
logger = logging.getLogger("health_score_data_extraction")


# -----------------------------------------------------------------------------
# Database connection
# -----------------------------------------------------------------------------
def connect_db() -> psycopg2.extensions.connection:
    """Create and return a PostgreSQL DB connection using environment variables.

    Expected environment variables:
      - DB_HOST
      - DB_PORT
      - DB_NAME
      - DB_USER
      - DB_PASSWORD
    """
    database_url = os.getenv("DATABASE_URL")
    if database_url:
        logger.debug("Connecting to DB via DATABASE_URL")
        conn = psycopg2.connect(database_url)
        conn.autocommit = False
        return conn

    db_params = {
        "host": os.getenv("DB_HOST"),
        "port": int(os.getenv("DB_PORT")),
        "dbname": os.getenv("DB_NAME"),
        "user": os.getenv("DB_USER"),
        "password": os.getenv("DB_PASSWORD"),
    }
    logger.debug("Connecting to DB with params (host=%s, port=%s, dbname=%s, user=%s)",
                 db_params["host"], db_params["port"], db_params["dbname"], db_params["user"])
    conn = psycopg2.connect(**db_params)
    conn.autocommit = False
    return conn


# -----------------------------------------------------------------------------
# Helper utilities
# -----------------------------------------------------------------------------
def _fetch_one(cursor, query: str, params: tuple) -> Optional[Dict[str, Any]]:
    cursor.execute(query, params)
    row = cursor.fetchone()
    return dict(row) if row is not None else None


def _fetch_all(cursor, query: str, params: tuple) -> List[Dict[str, Any]]:
    cursor.execute(query, params)
    rows = cursor.fetchall()
    return [dict(r) for r in rows]


# -----------------------------------------------------------------------------
# Data accessors (modular queries)
# -----------------------------------------------------------------------------
def get_proposer_data(proposer_id: int, conn: Optional[psycopg2.extensions.connection] = None) -> Optional[Dict[str, Any]]:
    own_conn = conn is None
    try:
        if own_conn:
            conn = connect_db()
        assert conn is not None
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            query = (
                """
                SELECT
                    p.*
                FROM proposer p
                WHERE p.proposer_id = %s
                """
            )
            return _fetch_one(cur, query, (proposer_id,))
    except Exception as exc:
        logger.exception("Error fetching proposer data for proposer_id=%s", proposer_id)
        raise exc
    finally:
        if own_conn and conn is not None:
            conn.close()


def get_insured_members(proposer_id: int, conn: Optional[psycopg2.extensions.connection] = None) -> List[Dict[str, Any]]:
    own_conn = conn is None
    try:
        if own_conn:
            conn = connect_db()
        assert conn is not None
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            query = (
                """
                SELECT m.*
                FROM insured_member m
                WHERE m.proposer_id = %s
                ORDER BY m.member_id
                """
            )
            return _fetch_all(cur, query, (proposer_id,))
    except Exception as exc:
        logger.exception("Error fetching insured members for proposer_id=%s", proposer_id)
        raise exc
    finally:
        if own_conn and conn is not None:
            conn.close()


def get_lifestyle_info(member_id: int, conn: Optional[psycopg2.extensions.connection] = None) -> Optional[Dict[str, Any]]:
    own_conn = conn is None
    try:
        if own_conn:
            conn = connect_db()
        assert conn is not None
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            query = (
                """
                SELECT li.*
                FROM lifestyle_info li
                WHERE li.member_id = %s
                ORDER BY li.updated_at DESC NULLS LAST, li.created_at DESC NULLS LAST
                LIMIT 1
                """
            )
            return _fetch_one(cur, query, (member_id,))
    except Exception as exc:
        logger.exception("Error fetching lifestyle_info for member_id=%s", member_id)
        raise exc
    finally:
        if own_conn and conn is not None:
            conn.close()


def get_medical_conditions(member_id: int, conn: Optional[psycopg2.extensions.connection] = None) -> Optional[Dict[str, Any]]:
    own_conn = conn is None
    try:
        if own_conn:
            conn = connect_db()
        assert conn is not None
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            query = (
                """
                SELECT mc.*
                FROM medical_condition mc
                WHERE mc.person_id = %s
                ORDER BY mc.diagnosis_date DESC NULLS LAST
                LIMIT 1
                """
            )
            return _fetch_one(cur, query, (member_id,))
    except Exception as exc:
        logger.exception("Error fetching medical_condition for member_id=%s", member_id)
        raise exc
    finally:
        if own_conn and conn is not None:
            conn.close()


def get_armed_forces_info(member_id: int, conn: Optional[psycopg2.extensions.connection] = None) -> Optional[Dict[str, Any]]:
    own_conn = conn is None
    try:
        if own_conn:
            conn = connect_db()
        assert conn is not None
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            query = (
                """
                SELECT afi.*
                FROM armed_forces_info afi
                WHERE afi.insured_member_id = %s
                LIMIT 1
                """
            )
            return _fetch_one(cur, query, (member_id,))
    except Exception as exc:
        logger.exception("Error fetching armed_forces_info for member_id=%s", member_id)
        raise exc
    finally:
        if own_conn and conn is not None:
            conn.close()


def get_policy_details(proposer_id: int, conn: Optional[psycopg2.extensions.connection] = None) -> List[Dict[str, Any]]:
    """Fetch policies linked to proposals of the proposer."""
    own_conn = conn is None
    try:
        if own_conn:
            conn = connect_db()
        assert conn is not None
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            query = (
                """
                SELECT pol.*
                FROM policy pol
                JOIN proposal pr ON pr.proposal_number = pol.proposal_number
                WHERE pr.proposer_id = %s
                ORDER BY pol.created_at DESC, pol.policy_id DESC
                """
            )
            return _fetch_all(cur, query, (proposer_id,))
    except Exception as exc:
        logger.exception("Error fetching policy details for proposer_id=%s", proposer_id)
        raise exc
    finally:
        if own_conn and conn is not None:
            conn.close()


def get_proposals(proposer_id: int, conn: Optional[psycopg2.extensions.connection] = None) -> List[Dict[str, Any]]:
    own_conn = conn is None
    try:
        if own_conn:
            conn = connect_db()
        assert conn is not None
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            query = (
                """
                SELECT pr.*
                FROM proposal pr
                WHERE pr.proposer_id = %s
                ORDER BY pr.proposal_number
                """
            )
            return _fetch_all(cur, query, (proposer_id,))
    except Exception as exc:
        logger.exception("Error fetching proposals for proposer_id=%s", proposer_id)
        raise exc
    finally:
        if own_conn and conn is not None:
            conn.close()


def get_risk_assessments(proposer_id: int, conn: Optional[psycopg2.extensions.connection] = None) -> List[Dict[str, Any]]:
    own_conn = conn is None
    try:
        if own_conn:
            conn = connect_db()
        assert conn is not None
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            query = (
                """
                SELECT ra.*
                FROM risk_assessments ra
                JOIN proposal pr ON pr.proposal_number = ra.proposal_number
                WHERE pr.proposer_id = %s
                ORDER BY ra.created_at DESC, ra.id DESC
                """
            )
            return _fetch_all(cur, query, (proposer_id,))
    except Exception as exc:
        logger.exception("Error fetching risk_assessments for proposer_id=%s", proposer_id)
        raise exc
    finally:
        if own_conn and conn is not None:
            conn.close()


def get_underwriting_requests(proposer_id: int, conn: Optional[psycopg2.extensions.connection] = None) -> List[Dict[str, Any]]:
    """Fetch underwriting requests with joined rule engine trail."""
    own_conn = conn is None
    try:
        if own_conn:
            conn = connect_db()
        assert conn is not None
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            query = (
                """
                SELECT ur.*, ret.rule_status, ret.mc_required, ret.televideoagent_required, ret.finreview_required
                FROM rule_engine_trail ret
                LEFT JOIN underwriting_requests ur ON ur.request_id = ret.request_id
                JOIN proposal pr ON pr.proposal_number = ret.proposal_number
                WHERE pr.proposer_id = %s
                ORDER BY ur.created_at DESC, ur.request_id DESC
                """
            )
            return _fetch_all(cur, query, (proposer_id,))
    except Exception as exc:
        logger.exception("Error fetching underwriting_requests for proposer_id=%s", proposer_id)
        raise exc
    finally:
        if own_conn and conn is not None:
            conn.close()


def get_documents(proposer_id: int, conn: Optional[psycopg2.extensions.connection] = None) -> List[Dict[str, Any]]:
    """Fetch documents and processing results for all proposals of the proposer."""
    own_conn = conn is None
    try:
        if own_conn:
            conn = connect_db()
        assert conn is not None
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            try:
                query = (
                    """
                    SELECT d.*, dpr.extracted_data AS processed_extracted_data,
                           dpr.comparison_result, dpr.overall_match, dpr.processed_at
                    FROM documents d
                    JOIN proposal pr ON pr.proposal_number = d.proposal_number
                    LEFT JOIN document_processing_results dpr ON dpr.document_id = d.id
                    WHERE pr.proposer_id = %s
                    ORDER BY d.id DESC
                    """
                )
                return _fetch_all(cur, query, (proposer_id,))
            except pg_errors.UndefinedTable:
                logger.warning("document_processing_results not found; fetching documents without processing results")
                try:
                    conn.rollback()
                except Exception:
                    pass
                query = (
                    """
                    SELECT d.*
                    FROM documents d
                    JOIN proposal pr ON pr.proposal_number = d.proposal_number
                    WHERE pr.proposer_id = %s
                    ORDER BY d.id DESC
                    """
                )
                return _fetch_all(cur, query, (proposer_id,))
    except Exception as exc:
        logger.exception("Error fetching documents for proposer_id=%s", proposer_id)
        raise exc
    finally:
        if own_conn and conn is not None:
            conn.close()


# -----------------------------------------------------------------------------
# Additional helpers for proposal-centric exports
# -----------------------------------------------------------------------------
def get_non_stp_mc_required_proposals(conn: Optional[psycopg2.extensions.connection] = None) -> List[int]:
    """Return proposal numbers marked Non-STP with mc_required=true in rule_engine_trail."""
    own_conn = conn is None
    try:
        if own_conn:
            conn = connect_db()
        assert conn is not None
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            query = (
                """
                SELECT DISTINCT ret.proposal_number
                FROM rule_engine_trail ret
                WHERE ret.rule_status = %s
                  AND COALESCE(ret.mc_required, false) = true
                  AND ret.proposal_number IS NOT NULL
                ORDER BY ret.proposal_number
                """
            )
            rows = _fetch_all(cur, query, ("Non-STP",))
            return [int(r["proposal_number"]) for r in rows if r.get("proposal_number") is not None]
    except Exception as exc:
        logger.exception("Error fetching Non-STP mc_required proposal numbers")
        raise exc
    finally:
        if own_conn and conn is not None:
            conn.close()


def get_proposal_by_number(proposal_number: int, conn: Optional[psycopg2.extensions.connection] = None) -> Optional[Dict[str, Any]]:
    own_conn = conn is None
    try:
        if own_conn:
            conn = connect_db()
        assert conn is not None
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            query = "SELECT * FROM proposal WHERE proposal_number = %s"
            return _fetch_one(cur, query, (proposal_number,))
    except Exception as exc:
        logger.exception("Error fetching proposal_number=%s", proposal_number)
        raise exc
    finally:
        if own_conn and conn is not None:
            conn.close()


def get_policies_by_proposal(proposal_number: int, conn: Optional[psycopg2.extensions.connection] = None) -> List[Dict[str, Any]]:
    own_conn = conn is None
    try:
        if own_conn:
            conn = connect_db()
        assert conn is not None
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            query = "SELECT * FROM policy WHERE proposal_number = %s ORDER BY created_at DESC, policy_id DESC"
            return _fetch_all(cur, query, (proposal_number,))
    except Exception as exc:
        logger.exception("Error fetching policies for proposal_number=%s", proposal_number)
        raise exc
    finally:
        if own_conn and conn is not None:
            conn.close()


def get_underwriting_by_proposal(proposal_number: int, conn: Optional[psycopg2.extensions.connection] = None) -> List[Dict[str, Any]]:
    own_conn = conn is None
    try:
        if own_conn:
            conn = connect_db()
        assert conn is not None
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            query = (
                """
                SELECT ur.*, ret.rule_status, ret.mc_required, ret.televideoagent_required, ret.finreview_required
                FROM rule_engine_trail ret
                LEFT JOIN underwriting_requests ur ON ur.request_id = ret.request_id
                WHERE ret.proposal_number = %s
                ORDER BY ur.created_at DESC NULLS LAST, ur.request_id DESC NULLS LAST
                """
            )
            return _fetch_all(cur, query, (proposal_number,))
    except Exception as exc:
        logger.exception("Error fetching underwriting_requests for proposal_number=%s", proposal_number)
        raise exc
    finally:
        if own_conn and conn is not None:
            conn.close()


def get_risk_assessments_by_proposal(proposal_number: int, conn: Optional[psycopg2.extensions.connection] = None) -> List[Dict[str, Any]]:
    own_conn = conn is None
    try:
        if own_conn:
            conn = connect_db()
        assert conn is not None
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            query = "SELECT * FROM risk_assessments WHERE proposal_number = %s ORDER BY created_at DESC, id DESC"
            return _fetch_all(cur, query, (proposal_number,))
    except Exception as exc:
        logger.exception("Error fetching risk_assessments for proposal_number=%s", proposal_number)
        raise exc
    finally:
        if own_conn and conn is not None:
            conn.close()


def get_documents_by_proposal(proposal_number: int, conn: Optional[psycopg2.extensions.connection] = None) -> List[Dict[str, Any]]:
    own_conn = conn is None
    try:
        if own_conn:
            conn = connect_db()
        assert conn is not None
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            try:
                query = (
                    """
                    SELECT d.*, dpr.extracted_data AS processed_extracted_data,
                           dpr.comparison_result, dpr.overall_match, dpr.processed_at
                    FROM documents d
                    LEFT JOIN document_processing_results dpr ON dpr.document_id = d.id
                    WHERE d.proposal_number = %s
                    ORDER BY d.id DESC
                    """
                )
                return _fetch_all(cur, query, (proposal_number,))
            except pg_errors.UndefinedTable:
                logger.warning("document_processing_results not found; fetching documents without processing results for proposal %s", proposal_number)
                try:
                    conn.rollback()
                except Exception:
                    pass
                query = (
                    """
                    SELECT d.*
                    FROM documents d
                    WHERE d.proposal_number = %s
                    ORDER BY d.id DESC
                    """
                )
                return _fetch_all(cur, query, (proposal_number,))
    except Exception as exc:
        logger.exception("Error fetching documents for proposal_number=%s", proposal_number)
        raise exc
    finally:
        if own_conn and conn is not None:
            conn.close()


def get_rule_engine_trail_by_proposal(proposal_number: int, conn: Optional[psycopg2.extensions.connection] = None) -> List[Dict[str, Any]]:
    own_conn = conn is None
    try:
        if own_conn:
            conn = connect_db()
        assert conn is not None
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            query = "SELECT * FROM rule_engine_trail WHERE proposal_number = %s ORDER BY request_id DESC"
            return _fetch_all(cur, query, (proposal_number,))
    except Exception as exc:
        logger.exception("Error fetching rule_engine_trail for proposal_number=%s", proposal_number)
        raise exc
    finally:
        if own_conn and conn is not None:
            conn.close()


def export_non_stp_mc_required_proposals(out_dir: str) -> List[str]:
    """Export details for each Non-STP + mc_required proposal into separate JSON files.

    Returns list of written file paths.
    """
    os.makedirs(out_dir, exist_ok=True)

    written_files: List[str] = []
    conn = None
    try:
        conn = connect_db()
        proposal_numbers = get_non_stp_mc_required_proposals(conn)
        logger.info("Found %d Non-STP proposals with mc_required", len(proposal_numbers))

        def _serialize(obj: Any) -> Any:
            if obj is None:
                return None
            if hasattr(obj, "isoformat"):
                try:
                    return obj.isoformat()
                except Exception:
                    return str(obj)
            return obj

        def _map_serialize(item: Dict[str, Any]) -> Dict[str, Any]:
            return {k: _serialize(v) for k, v in item.items()}

        for pno in proposal_numbers:
            proposal = get_proposal_by_number(pno, conn)
            if not proposal:
                logger.warning("Proposal %s not found; skipping export", pno)
                continue

            proposer_id = proposal.get("proposer_id")
            proposer = get_proposer_data(proposer_id, conn) if proposer_id is not None else None
            members = get_insured_members(proposer_id, conn) if proposer_id is not None else []

            export_payload = {
                "proposal": _map_serialize(proposal) if proposal else {},
                "proposer": _map_serialize(proposer) if proposer else {},
                "insured_members": [
                    {
                        "member_id": m.get("member_id"),
                        "name": m.get("name"),
                        "dob": _serialize(m.get("dob")),
                        "sex": m.get("sex"),
                        "relationship_with_proposer": m.get("relationship_with_proposer"),
                        "height_cm": m.get("height_cm"),
                        "weight_kg": float(m.get("weight_kg")) if m.get("weight_kg") is not None else None,
                        "sum_insured": float(m.get("sum_insured")) if m.get("sum_insured") is not None else None,
                    }
                    for m in (members or [])
                ],
                "policies": [_map_serialize(p) for p in get_policies_by_proposal(pno, conn)],
                "underwriting_requests": [_map_serialize(u) for u in get_underwriting_by_proposal(pno, conn)],
                "risk_assessments": [_map_serialize(r) for r in get_risk_assessments_by_proposal(pno, conn)],
                "documents": [_map_serialize(d) for d in get_documents_by_proposal(pno, conn)],
                "rule_engine_trail": [_map_serialize(t) for t in get_rule_engine_trail_by_proposal(pno, conn)],
            }

            filename = os.path.join(out_dir, f"proposal_{pno}_non_stp_mc.json")
            with open(filename, "w", encoding="utf-8") as f:
                json.dump(export_payload, f, ensure_ascii=False, indent=2, default=str)
            written_files.append(filename)
            logger.info("Wrote %s", filename)

        return written_files
    except Exception:
        logger.exception("Failed exporting Non-STP mc_required proposals")
        raise
    finally:
        if conn is not None:
            try:
                conn.close()
            except Exception:
                logger.warning("Error closing DB connection in export")
# -----------------------------------------------------------------------------
# Orchestrator
# -----------------------------------------------------------------------------
def get_health_score_data(proposer_id: int) -> Dict[str, Any]:
    """Return nested JSON-serializable data needed for health score computation."""
    logger.info("Beginning data extraction for proposer_id=%s", proposer_id)
    conn = None
    try:
        conn = connect_db()

        proposer = get_proposer_data(proposer_id, conn)
        if proposer is None:
            logger.warning("No proposer found for proposer_id=%s", proposer_id)
            proposer = {}

        members = get_insured_members(proposer_id, conn)
        enriched_members: List[Dict[str, Any]] = []
        for m in members:
            member_id = m.get("member_id")
            lifestyle = get_lifestyle_info(member_id, conn)
            medical = get_medical_conditions(member_id, conn)
            armed = get_armed_forces_info(member_id, conn)

            enriched_members.append(
                {
                    "member_id": member_id,
                    "demographics": {
                        "name": m.get("name"),
                        "dob": str(m.get("dob")) if m.get("dob") is not None else None,
                        "sex": m.get("sex"),
                        "relationship_with_proposer": m.get("relationship_with_proposer"),
                        "height_cm": m.get("height_cm"),
                        "weight_kg": float(m.get("weight_kg")) if m.get("weight_kg") is not None else None,
                        "gainful_annual_income": float(m.get("gainful_annual_income")) if m.get("gainful_annual_income") is not None else None,
                        "occupation_details": m.get("occupation_details"),
                        "city": m.get("city"),
                        "deductible": float(m.get("deductible")) if m.get("deductible") is not None else None,
                        "sum_insured": float(m.get("sum_insured")) if m.get("sum_insured") is not None else None,
                        "insured_address": m.get("insured_address"),
                        "is_pep_or_relative": m.get("is_pep_or_relative"),
                        "abha_number": m.get("abha_number"),
                        "ckyc_number": m.get("ckyc_number"),
                    },
                    "lifestyle": lifestyle or {},
                    "medical_conditions": medical or {},
                    "armed_forces_info": armed or {},
                }
            )

        policies = get_policy_details(proposer_id, conn)
        proposals = get_proposals(proposer_id, conn)
        risk_assessments = get_risk_assessments(proposer_id, conn)
        underwriting_requests = get_underwriting_requests(proposer_id, conn)
        documents = get_documents(proposer_id, conn)

        # Ensure date/time fields are JSON serializable
        def _serialize(obj: Any) -> Any:
            if obj is None:
                return None
            if hasattr(obj, "isoformat"):
                try:
                    return obj.isoformat()
                except Exception:
                    return str(obj)
            return obj

        def _map_serialize(item: Dict[str, Any]) -> Dict[str, Any]:
            return {k: _serialize(v) for k, v in item.items()}

        output = {
            "proposer": _map_serialize(proposer) if proposer else {},
            "insured_members": [
                {
                    **{
                        "member_id": im["member_id"],
                        "demographics": im["demographics"],
                    },
                    "lifestyle": _map_serialize(im.get("lifestyle", {})),
                    "medical_conditions": _map_serialize(im.get("medical_conditions", {})),
                    "armed_forces_info": _map_serialize(im.get("armed_forces_info", {})),
                }
                for im in enriched_members
            ],
            "policies": [_map_serialize(p) for p in policies],
            "proposals": [_map_serialize(p) for p in proposals],
            "risk_assessments": [_map_serialize(r) for r in risk_assessments],
            "underwriting_requests": [_map_serialize(u) for u in underwriting_requests],
            "documents": [_map_serialize(d) for d in documents],
        }

        logger.info("Data extraction completed for proposer_id=%s", proposer_id)
        return output
    except Exception:
        logger.exception("Failed to build health score data for proposer_id=%s", proposer_id)
        raise
    finally:
        if conn is not None:
            try:
                conn.close()
            except Exception:
                logger.warning("Error closing DB connection")


if __name__ == "__main__":
    outdir = os.getenv("NON_STP_EXPORT_DIR", "input")
    files = export_non_stp_mc_required_proposals(outdir)
    print(json.dumps({"written": files}, indent=2))


