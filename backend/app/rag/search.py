"""
FinSight AI -- Lexical search primitives
========================================
A small, dependency-free BM25 used for the knowledge base and for searching a
user's own text (transaction notes/merchants, past conversations).
"""

from __future__ import annotations

import math
import re
from collections import Counter

_TOKEN_RE = re.compile(r"[a-z0-9]+")
_STOPWORDS = {
    "a", "an", "and", "are", "as", "at", "be", "by", "can", "do", "does", "for", "from", "how", "i", "if", "in",
    "is", "it", "its", "me", "my", "of", "on", "or", "should", "so", "that", "the", "this", "to", "was", "what",
    "when", "which", "who", "why", "will", "with", "you", "your", "much", "many", "get", "about", "there",
}


def tokenize(text: str) -> list[str]:
    tokens = []
    for tok in _TOKEN_RE.findall((text or "").lower()):
        if tok in _STOPWORDS:
            continue
        # Light stemming: plural "s" (keep short tokens and section codes like "80c" intact).
        if len(tok) > 4 and tok.endswith("s") and not tok.endswith("ss"):
            tok = tok[:-1]
        tokens.append(tok)
    return tokens


class BM25:
    def __init__(self, documents: list[str], k1: float = 1.5, b: float = 0.75):
        self.k1, self.b = k1, b
        self.docs = [Counter(tokenize(d)) for d in documents]
        self.lengths = [sum(c.values()) for c in self.docs]
        self.avg_len = (sum(self.lengths) / len(self.lengths)) if self.lengths else 0.0
        df: Counter = Counter()
        for c in self.docs:
            df.update(c.keys())
        n = len(self.docs)
        self.idf = {t: math.log(1 + (n - f + 0.5) / (f + 0.5)) for t, f in df.items()}

    def scores(self, query: str) -> list[float]:
        terms = tokenize(query)
        out = []
        for counts, length in zip(self.docs, self.lengths):
            score = 0.0
            for t in terms:
                tf = counts.get(t, 0)
                if not tf:
                    continue
                norm = tf * (self.k1 + 1) / (tf + self.k1 * (1 - self.b + self.b * length / (self.avg_len or 1)))
                score += self.idf.get(t, 0.0) * norm
            out.append(score)
        return out

    def top(self, query: str, k: int = 5, min_score: float = 0.0) -> list[tuple[int, float]]:
        ranked = sorted(enumerate(self.scores(query)), key=lambda x: x[1], reverse=True)
        return [(i, s) for i, s in ranked[:k] if s > min_score]


def reciprocal_rank_fusion(*rankings: list[int], k: int = 60) -> list[int]:
    """Merge several ranked id lists into one."""
    scores: dict[int, float] = {}
    for ranking in rankings:
        for rank, idx in enumerate(ranking):
            scores[idx] = scores.get(idx, 0.0) + 1.0 / (k + rank + 1)
    return [i for i, _ in sorted(scores.items(), key=lambda x: x[1], reverse=True)]
