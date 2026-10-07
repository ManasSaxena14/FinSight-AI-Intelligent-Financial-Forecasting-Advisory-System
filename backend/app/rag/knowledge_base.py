"""
FinSight AI -- Knowledge base retrieval (RAG)
=============================================
Curated, sourced Markdown documents in app/rag/knowledge are split into
section-sized chunks and searched with BM25. When the optional `fastembed`
package is installed, chunks are also embedded (bge-small) and the two
rankings are merged with reciprocal-rank fusion (hybrid search).

The corpus is small (tens of chunks), so an in-memory index is faster and
simpler than a vector database; swap in Atlas Vector Search if it grows into
thousands of documents.
"""

from __future__ import annotations

import hashlib
import logging
import os
import re
from dataclasses import dataclass

import numpy as np

from app.rag.search import BM25, reciprocal_rank_fusion

logger = logging.getLogger(__name__)

KNOWLEDGE_DIR = os.path.join(os.path.dirname(__file__), "knowledge")
CACHE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "data", ".rag_cache"))
EMBED_MODEL = "BAAI/bge-small-en-v1.5"
MIN_SECTION_WORDS = 25
HEADING_WEIGHT = 0.8

# Common Indian personal-finance acronyms, expanded so they match the documents' wording.
ACRONYMS = {
    "ltcg": "long-term capital gains", "stcg": "short-term capital gains", "fd": "fixed deposit",
    "fds": "fixed deposits", "rd": "recurring deposit", "hra": "house rent allowance hra", "emi": "emi loan",
    "ppf": "ppf public provident fund", "epf": "epf provident fund", "nps": "nps national pension system",
    "elss": "elss tax-saving funds", "sip": "sip systematic investment plan", "dicgc": "dicgc deposit insurance",
    "itr": "income tax return regime", "ssy": "sukanya samriddhi", "mf": "mutual fund", "cc": "credit card",
}


def expand_query(query: str) -> str:
    extra = [ACRONYMS[t] for t in re.findall(r"[a-z]+", query.lower()) if t in ACRONYMS]
    return f"{query} {' '.join(extra)}" if extra else query


@dataclass(frozen=True)
class Chunk:
    id: str
    doc: str
    title: str
    section: str
    text: str
    sources: str
    as_of: str

    def citation(self) -> dict:
        return {"id": self.id, "title": self.title, "section": self.section, "as_of": self.as_of,
                "sources": self.sources, "snippet": self.text[:280]}


def _parse_doc(path: str) -> list[Chunk]:
    raw = open(path, encoding="utf-8").read()
    meta: dict[str, str] = {}
    body = raw
    match = re.match(r"^---\n(.*?)\n---\n", raw, re.S)
    if match:
        for line in match.group(1).splitlines():
            if ":" in line:
                key, value = line.split(":", 1)
                meta[key.strip()] = value.strip()
        body = raw[match.end():]
    slug = os.path.splitext(os.path.basename(path))[0]
    title = meta.get("title", slug)
    sections: list[list[str]] = []  # [heading, text]
    for part in re.split(r"\n(?=## )", body.strip()):
        lines = part.strip().splitlines()
        if not lines:
            continue
        heading = lines[0].lstrip("# ").strip() if lines[0].startswith("##") else title
        text = "\n".join(lines[1:] if lines[0].startswith("##") else lines).strip()
        if not text:
            continue
        # Fold tiny sections ("Note", "Which to use") into the previous one so they can't
        # outrank real answers just for being short.
        if sections and len(text.split()) < MIN_SECTION_WORDS:
            sections[-1][1] += f"\n\n{heading}: {text}"
        else:
            sections.append([heading, text])
    return [Chunk(f"{slug}#{i}", slug, title, heading, text, meta.get("sources", ""), meta.get("as_of", ""))
            for i, (heading, text) in enumerate(sections)]


class KnowledgeBase:
    def __init__(self, directory: str = KNOWLEDGE_DIR):
        self.chunks: list[Chunk] = []
        for name in sorted(os.listdir(directory)):
            if name.endswith(".md"):
                self.chunks.extend(_parse_doc(os.path.join(directory, name)))
        # Index title + section + text so headings count towards relevance.
        self._texts = [f"{c.title}. {c.section}. {c.text}" for c in self.chunks]
        self._bm25 = BM25(self._texts, b=0.4)
        # A query term in a section heading is strong evidence the section is *about* it.
        self._headings = BM25([c.section for c in self.chunks], b=0.0)
        self._embedder = None
        self._vectors: np.ndarray | None = None
        self._init_embeddings()
        logger.info("Knowledge base ready: %d chunks, retrieval=%s", len(self.chunks), self.mode)

    @property
    def mode(self) -> str:
        return "hybrid (BM25 + embeddings)" if self._vectors is not None else "BM25"

    def _init_embeddings(self) -> None:
        if os.getenv("FINSIGHT_DISABLE_EMBEDDINGS"):
            return
        try:
            from fastembed import TextEmbedding  # optional dependency
        except Exception:
            return
        try:
            digest = hashlib.sha1("\n".join(self._texts).encode()).hexdigest()[:12]
            cache = os.path.join(CACHE_DIR, f"kb-{digest}.npy")
            self._embedder = TextEmbedding(EMBED_MODEL)
            if os.path.exists(cache):
                self._vectors = np.load(cache)
            else:
                self._vectors = np.array(list(self._embedder.embed(self._texts)), dtype=np.float32)
                os.makedirs(CACHE_DIR, exist_ok=True)
                np.save(cache, self._vectors)
            self._vectors /= np.linalg.norm(self._vectors, axis=1, keepdims=True) + 1e-9
        except Exception:
            logger.exception("Embeddings unavailable; falling back to BM25 only")
            self._embedder, self._vectors = None, None

    def search(self, query: str, k: int = 4) -> list[Chunk]:
        if not query.strip() or not self.chunks:
            return []
        query = expand_query(query)
        body, heads = self._bm25.scores(query), self._headings.scores(query)
        combined = [b + HEADING_WEIGHT * h for b, h in zip(body, heads)]
        lexical = [i for i in sorted(range(len(combined)), key=lambda i: combined[i], reverse=True)[:12] if combined[i] > 0]
        if self._vectors is not None and self._embedder is not None:
            q = np.array(list(self._embedder.query_embed(query))[0], dtype=np.float32)
            q /= np.linalg.norm(q) + 1e-9
            sims = self._vectors @ q
            semantic = [int(i) for i in np.argsort(-sims)[:12] if sims[i] > 0.35]
            order = reciprocal_rank_fusion(lexical, semantic)
        else:
            order = lexical
        return [self.chunks[i] for i in order[:k]]


_kb: KnowledgeBase | None = None


def get_knowledge_base() -> KnowledgeBase:
    global _kb
    if _kb is None:
        _kb = KnowledgeBase()
    return _kb
