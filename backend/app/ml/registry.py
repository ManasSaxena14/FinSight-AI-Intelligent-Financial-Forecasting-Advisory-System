"""
FinSight AI -- Model registry
=============================
Single source of truth for what is running: a version for every model
component, fingerprints of the reference dataset and knowledge corpus, and the
LLMs in use. Built at startup (logged once) and served as a model card at
GET /api/ml/model-info. Bump a version whenever its component's behaviour changes.
"""

from __future__ import annotations

import hashlib
import logging
import os
from datetime import datetime, timezone

from app.config import settings

logger = logging.getLogger(__name__)

COMPONENTS = {
    "forecaster": {"version": "2.1", "method": "Per-category damped Holt (6+ months) / exponential smoothing, "
                   "shrunk to a peer prior while history is short; 80% intervals; rolling one-step backtest."},
    "overspend_risk": {"version": "1.0", "method": "P(spending > income) from the forecast's normal distribution."},
    "anomalies": {"version": "1.1", "method": "Robust z-score (median/MAD) on income-normalised spend vs. the user's "
                  "own 3+ earlier months; peer percentile + IsolationForest mix score for cold start."},
    "goal_planner": {"version": "1.2", "method": "Monte Carlo (4,000 paths) with catch-up contributions, month-by-month "
                     "forecast savings, earlier-deadline goals reserved first."},
    "budgets": {"version": "1.1", "method": "Forecast capped at the usual (median) level, discretionary cuts first, "
                "benchmark floors; pace checks skip lump-sum categories."},
    "health_score": {"version": "1.0", "method": "Transparent rules: savings-rate curve minus concentration penalties."},
    "recurring": {"version": "1.0", "method": "Merchant grouping with cadence (weekly/monthly/quarterly/yearly) and "
                  "amount-consistency checks."},
    "agent": {"version": "1.3", "method": "Streaming tool-calling agent (14 tools), RAG citations, PII redaction, "
              "proposals require user confirmation."},
}

_card: dict | None = None


def _file_sha(path: str) -> str | None:
    try:
        h = hashlib.sha256()
        with open(path, "rb") as f:
            for block in iter(lambda: f.read(1 << 16), b""):
                h.update(block)
        return h.hexdigest()[:16]
    except OSError:
        return None


def build() -> dict:
    """Assemble the static part of the model card (cheap; cached for the process)."""
    global _card
    from app.ml.population import DATA_CSV, get_population_model
    from app.rag.knowledge_base import get_knowledge_base

    population = get_population_model()
    kb = get_knowledge_base()
    docs = {}
    for chunk in kb.chunks:
        docs.setdefault(chunk.doc, {"title": chunk.title, "as_of": chunk.as_of, "sections": 0})
        docs[chunk.doc]["sections"] += 1
    corpus_hash = hashlib.sha256("".join(c.text for c in kb.chunks).encode()).hexdigest()[:16]

    _card = {
        "built_at": datetime.now(timezone.utc).isoformat(),
        "components": COMPONENTS,
        "reference_data": {
            "file": os.path.basename(DATA_CSV),
            "sha256": _file_sha(DATA_CSV),
            "rows": population.size,
            "note": "Synthetic, cross-sectional. Used only for cold-start priors and peer benchmarks.",
        },
        "knowledge_base": {
            "version": corpus_hash,
            "documents": len(docs),
            "chunks": len(kb.chunks),
            "retrieval": kb.mode,
            "docs": [{"id": k, **v} for k, v in sorted(docs.items())],
        },
        "llm": {
            "chat": settings.GROQ_CHAT_MODEL,
            "fast": settings.GROQ_FAST_MODEL,
            "vision": settings.GROQ_VISION_MODEL,
            "speech": settings.GROQ_SPEECH_MODEL,
            "provider": "Groq",
        },
    }
    logger.info(
        "Model registry: forecaster v%s, agent v%s, KB %s (%d chunks, %s), reference data %s",
        COMPONENTS["forecaster"]["version"], COMPONENTS["agent"]["version"], corpus_hash, len(kb.chunks), kb.mode,
        _card["reference_data"]["sha256"],
    )
    return _card


def card() -> dict:
    return _card or build()
