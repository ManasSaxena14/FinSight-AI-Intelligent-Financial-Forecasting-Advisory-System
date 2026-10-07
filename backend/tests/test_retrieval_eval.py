"""Retrieval quality gate for the advisor's knowledge base (runs offline in CI)."""

import json
import os

from app.rag.knowledge_base import get_knowledge_base

CASES = json.load(open(os.path.join(os.path.dirname(__file__), "..", "evals", "retrieval_cases.json")))


def evaluate(k: int = 3) -> dict:
    kb = get_knowledge_base()
    hits1 = hitsk = 0
    rr = 0.0
    misses = []
    for case in CASES:
        docs = [c.doc for c in kb.search(case["q"], k=10)]
        rank = docs.index(case["doc"]) + 1 if case["doc"] in docs else None
        hits1 += rank == 1
        hitsk += bool(rank and rank <= k)
        rr += 1 / rank if rank else 0
        if rank != 1:
            misses.append((case["q"], case["doc"], docs[:3]))
    n = len(CASES)
    return {"n": n, "hit@1": hits1 / n, f"hit@{k}": hitsk / n, "mrr": rr / n, "misses": misses}


def test_retrieval_quality_gate():
    result = evaluate()
    print(f"\nRetrieval eval: {result}")
    assert result["n"] >= 30
    assert result["hit@3"] >= 0.9, result["misses"]
    assert result["hit@1"] >= 0.75, result["misses"]
