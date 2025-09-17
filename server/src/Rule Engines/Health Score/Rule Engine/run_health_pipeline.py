import os
import shutil
import logging
from typing import List

from data_extraction import export_non_stp_mc_required_proposals
from health_score_engine import main as run_scoring


LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO").upper()
logging.basicConfig(
    level=getattr(logging, LOG_LEVEL, logging.INFO),
    format="%(asctime)s [%(levelname)s] %(name)s - %(message)s",
)
logger = logging.getLogger("run_health_pipeline")


def ensure_clean_input_dir(path: str, clean: bool = True) -> None:
    os.makedirs(path, exist_ok=True)
    if clean:
        for name in os.listdir(path):
            file_path = os.path.join(path, name)
            try:
                if os.path.isfile(file_path) or os.path.islink(file_path):
                    os.unlink(file_path)
                elif os.path.isdir(file_path):
                    shutil.rmtree(file_path)
            except Exception:
                logger.exception("Failed to remove %s", file_path)


def run_pipeline() -> None:
    input_dir = os.getenv("HEALTH_INPUT_DIR", "input")
    clean_input = os.getenv("CLEAN_INPUT", "true").lower() == "true"

    logger.info("Step 1/2: Preparing input directory at %s (clean=%s)", input_dir, clean_input)
    ensure_clean_input_dir(input_dir, clean=clean_input)

    logger.info("Step 2/2: Extracting Non-STP proposals with mc_required=true")
    written: List[str] = export_non_stp_mc_required_proposals(input_dir)
    logger.info("Extracted %d proposal inputs", len(written))

    logger.info("Running health score engine for %d inputs", len(written))
    run_scoring()
    logger.info("Pipeline completed successfully")


if __name__ == "__main__":
    run_pipeline()


