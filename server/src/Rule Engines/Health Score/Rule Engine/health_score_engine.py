import os
import json
import math
import glob
import logging
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple

import yaml


LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO").upper()
logging.basicConfig(
    level=getattr(logging, LOG_LEVEL, logging.INFO),
    format="%(asctime)s [%(levelname)s] %(name)s - %(message)s",
)
logger = logging.getLogger("health_score_engine")


RULES_FILE = os.getenv("HEALTH_RULES_FILE", "health_score_rules.yaml")
INPUT_DIR = os.getenv("HEALTH_INPUT_DIR", "input")
OUTPUT_DIR = os.getenv("HEALTH_OUTPUT_DIR", os.path.join("health_scores", datetime.now().strftime("%Y%m%d")))


def load_rules(path: str) -> Dict[str, Any]:
    with open(path, "r", encoding="utf-8") as f:
        return yaml.safe_load(f)


def pct_outside_range(value: Optional[float], lower: float, upper: float) -> Optional[float]:
    if value is None:
        return None
    if lower <= value <= upper:
        return 0.0
    if value < lower and lower > 0:
        return abs(value - lower) / lower
    if value > upper and upper > 0:
        return abs(value - upper) / upper
    return None


def score_banded(pct_outside: Optional[float], bands: List[Tuple[float, float, int]]) -> int:
    if pct_outside is None:
        return 0
    for lo, hi, pts in bands:
        if lo <= pct_outside <= hi:
            return pts
    # greater than last band
    return bands[-1][2]


def normalize_enum(value: Optional[str]) -> Optional[str]:
    if value is None:
        return None
    return str(value).strip().upper().replace(" ", "_")


def compute_lifestyle(member: Dict[str, Any], rules: Dict[str, Any]) -> Tuple[int, Dict[str, int]]:
    comp_rules = rules.get("components", {}).get("lifestyle", {})
    subs = comp_rules.get("subcomponents", {})
    points_breakdown: Dict[str, int] = {}
    total = 0

    # smoking
    smoking_cfg = subs.get("smoking", {})
    smoking_map = smoking_cfg.get("mapping", {})
    member_lifestyle = member.get("lifestyle") or {}
    smoking_raw = normalize_enum(member_lifestyle.get("smoking_status"))
    smoking_points = int(smoking_map.get(smoking_raw or "UNKNOWN", smoking_map.get("UNKNOWN", 0)))
    points_breakdown["smoking"] = smoking_points
    total += smoking_points

    # alcohol
    alcohol_cfg = subs.get("alcohol", {})
    alcohol_map = alcohol_cfg.get("mapping", {})
    alcohol_raw = normalize_enum(member_lifestyle.get("alcohol_consumption"))
    alcohol_points = int(alcohol_map.get(alcohol_raw or "UNKNOWN", alcohol_map.get("UNKNOWN", 0)))
    points_breakdown["alcohol"] = alcohol_points
    total += alcohol_points

    # physical activity
    pa_cfg = subs.get("physical_activity", {})
    minutes = member_lifestyle.get("physical_activity")
    try:
        minutes_val = float(minutes) if minutes is not None else None
    except Exception:
        minutes_val = None
    pa_points = 0
    if minutes_val is not None and minutes_val >= 150:
        pa_points = 10
    elif minutes_val is not None and 75 <= minutes_val < 150:
        pa_points = 6
    else:
        pa_points = 2
    points_breakdown["physical_activity"] = pa_points
    total += pa_points

    # diet
    diet_cfg = subs.get("diet", {})
    diet_map = diet_cfg.get("mapping", {})
    diet_raw = normalize_enum(member_lifestyle.get("diet"))
    diet_points = int(diet_map.get(diet_raw or "UNKNOWN", diet_map.get("UNKNOWN", 0)))
    points_breakdown["diet"] = diet_points
    total += diet_points

    # sleep
    sleep_cfg = subs.get("sleep", {})
    sleep_hours = member_lifestyle.get("sleep_hours")
    sleep_quality = normalize_enum(member_lifestyle.get("sleep_quality"))
    try:
        sh = float(sleep_hours) if sleep_hours is not None else None
    except Exception:
        sh = None
    sleep_points = 0
    if sh is not None and 7 <= sh <= 9 and sleep_quality != "POOR":
        sleep_points = 6
    elif (sh is not None and 6 <= sh < 7) or (sh is not None and 9 < sh <= 10):
        sleep_points = 3
    else:
        sleep_points = 0
    points_breakdown["sleep"] = sleep_points
    total += sleep_points

    return total, points_breakdown


def extract_labs_from_documents(documents: List[Dict[str, Any]]) -> Dict[str, Any]:
    labs: Dict[str, Any] = {}
    for d in documents or []:
        data_text = d.get("extracted_data") or d.get("processed_extracted_data")
        if not data_text:
            continue
        try:
            payload = json.loads(data_text)
        except Exception:
            continue
        for key in ["hemoglobin", "hb", "wbc", "white_blood_cell", "platelets", "mcv", "hb_low_flag", "mcv_low_flag", "rdw_high_flag"]:
            if key in payload and payload.get(key) is not None:
                labs[key] = payload.get(key)
    return labs


def to_float(val: Any) -> Optional[float]:
    try:
        if val is None:
            return None
        return float(val)
    except Exception:
        return None


def compute_cbc(member: Dict[str, Any], proposal_docs: List[Dict[str, Any]], rules: Dict[str, Any]) -> Tuple[int, Dict[str, int]]:
    cbc_rules = rules.get("components", {}).get("cbc", {})
    markers_cfg = cbc_rules.get("markers", {})
    labs = extract_labs_from_documents(proposal_docs)
    demographics = member.get("demographics") or {}
    sex = normalize_enum(demographics.get("sex")) or "UNKNOWN"

    breakdown: Dict[str, int] = {}
    total = 0

    # Build bands from YAML
    def build_bands(_bands_cfg: List[Any]) -> List[Tuple[float, float, int]]:
        # Use a fixed canonical interpretation for percent-distance bands
        # irrespective of YAML serialization style (dict or string).
        return [
            (0.0, 0.0, 12),
            (0.0, 0.10, 10),
            (0.10, 0.20, 8),
            (0.20, 0.30, 4),
            (0.30, 0.40, 2),
            (0.40, float("inf"), 0),
        ]

    # Hemoglobin
    hb_cfg = markers_cfg.get("hemoglobin", {})
    hb_val = to_float(labs.get("hemoglobin") or labs.get("hb"))
    normal_ranges = hb_cfg.get("normal_ranges", {})
    rng = normal_ranges.get(sex.title(), normal_ranges.get("Unknown", [12.0, 17.5]))
    hb_pct = pct_outside_range(hb_val, rng[0], rng[1])
    hb_points = score_banded(hb_pct, build_bands(hb_cfg.get("bands", [])))
    breakdown["hemoglobin"] = hb_points
    total += hb_points

    # WBC
    wbc_cfg = markers_cfg.get("wbc", {})
    wbc_val = to_float(labs.get("wbc") or labs.get("white_blood_cell"))
    wbc_rng = wbc_cfg.get("normal_range", [4.0, 11.0])
    wbc_pct = pct_outside_range(wbc_val, wbc_rng[0], wbc_rng[1])
    wbc_points = score_banded(wbc_pct, build_bands(wbc_cfg.get("bands", [])))
    breakdown["wbc"] = wbc_points
    total += wbc_points

    # Platelets
    pl_cfg = markers_cfg.get("platelets", {})
    pl_val = to_float(labs.get("platelets"))
    pl_rng = pl_cfg.get("normal_range", [150, 400])
    pl_pct = pct_outside_range(pl_val, pl_rng[0], pl_rng[1])
    pl_points = score_banded(pl_pct, build_bands(pl_cfg.get("bands", [])))
    breakdown["platelets"] = pl_points
    total += pl_points

    # MCV
    mcv_cfg = markers_cfg.get("mcv", {})
    mcv_val = to_float(labs.get("mcv"))
    mcv_rng = mcv_cfg.get("normal_range", [80, 100])
    mcv_pct = pct_outside_range(mcv_val, mcv_rng[0], mcv_rng[1])
    mcv_points = score_banded(mcv_pct, build_bands(mcv_cfg.get("bands", [])))
    breakdown["mcv"] = mcv_points
    total += mcv_points

    # RBC pattern
    rbc_cfg = markers_cfg.get("rbc_pattern", {})
    hb_low_flag = bool(labs.get("hb_low_flag", False))
    mcv_low_flag = bool(labs.get("mcv_low_flag", False))
    rdw_high_flag = bool(labs.get("rdw_high_flag", False))
    if hb_low_flag and mcv_low_flag:
        rbc_points = 4
    elif (not hb_low_flag) and (not mcv_low_flag) and (not rdw_high_flag):
        rbc_points = 12
    else:
        rbc_points = 8
    breakdown["rbc_pattern"] = rbc_points
    total += rbc_points

    return total, breakdown


def bucket_and_flag(score: int, rules: Dict[str, Any]) -> Tuple[str, str]:
    for rule in rules.get("aggregation", {}).get("risk_buckets", []):
        cond = rule.get("if", "")
        try:
            if eval(cond, {"__builtins__": {}}, {"score": score}):
                return rule.get("category", "Unknown"), rule.get("underwriting_flag", "Manual Review")
        except Exception:
            continue
    return "Unknown", "Manual Review"


def compute_for_proposal(proposal_payload: Dict[str, Any], rules: Dict[str, Any]) -> Dict[str, Any]:
    proposal = proposal_payload.get("proposal", {})
    proposal_number = proposal.get("proposal_number")
    proposer = proposal_payload.get("proposer", {})
    members = proposal_payload.get("insured_members", [])
    documents = proposal_payload.get("documents", [])

    member_scores: List[Dict[str, Any]] = []
    lifestyle_total_all = 0
    cbc_total_all = 0

    for m in members:
        lifestyle_points, lifestyle_breakdown = compute_lifestyle(m, rules)
        cbc_points, cbc_breakdown = compute_cbc(m, documents, rules)
        member_score = {
            "member_id": m.get("member_id"),
            "lifestyle_points": lifestyle_points,
            "cbc_points": cbc_points,
            "component_breakdown": {
                "lifestyle": lifestyle_breakdown,
                "cbc": cbc_breakdown,
            },
        }
        member_scores.append(member_score)
        lifestyle_total_all += lifestyle_points
        cbc_total_all += cbc_points

    # Aggregate: average across members to stay within 100 max per rules
    num_members = max(1, len(members))
    lifestyle_avg = round(lifestyle_total_all / num_members)
    cbc_avg = round(cbc_total_all / num_members)
    final_score = int(round(lifestyle_avg + cbc_avg))
    category, uw_flag = bucket_and_flag(final_score, rules)

    return {
        "proposal_number": proposal_number,
        "proposer_id": proposal.get("proposer_id"),
        "health_score": final_score,
        "risk_category": category,
        "underwriting_flag": uw_flag,
        "members": member_scores,
        "component_totals": {
            "lifestyle": lifestyle_avg,
            "cbc": cbc_avg,
        },
    }


def main() -> None:
    rules = load_rules(RULES_FILE)
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    input_files = sorted(glob.glob(os.path.join(INPUT_DIR, "*.json")))
    results: List[Dict[str, Any]] = []
    for fp in input_files:
        try:
            with open(fp, "r", encoding="utf-8") as f:
                payload = json.load(f)
            result = compute_for_proposal(payload, rules)
            results.append(result)

            out_name = f"health_score_{result.get('proposal_number')}.json"
            out_path = os.path.join(OUTPUT_DIR, out_name)
            with open(out_path, "w", encoding="utf-8") as out:
                json.dump({"proposal": payload.get("proposal", {}), "score": result}, out, indent=2)
            logger.info("Wrote %s", out_path)
        except Exception:
            logger.exception("Failed processing %s", fp)

    # Summary file
    summary_path = os.path.join(OUTPUT_DIR, "summary.json")
    with open(summary_path, "w", encoding="utf-8") as f:
        json.dump({"results": results}, f, indent=2)
    logger.info("Wrote %s", summary_path)


if __name__ == "__main__":
    main()


