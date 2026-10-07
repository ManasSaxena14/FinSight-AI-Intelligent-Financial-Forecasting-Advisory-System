"""Minimal in-memory stand-in for the Motor collections the app uses (tests only)."""

from __future__ import annotations

import copy
from typing import Any


def _get(doc: dict, key: str) -> Any:
    return doc.get(key)


def _matches(doc: dict, query: dict) -> bool:
    for key, cond in query.items():
        value = _get(doc, key)
        if isinstance(cond, dict):
            for op, arg in cond.items():
                if op == "$exists" and (key in doc) != arg:
                    return False
                if op == "$ne" and value == arg:
                    return False
        elif value != cond:
            return False
    return True


class FakeCursor:
    def __init__(self, docs: list[dict]):
        self._docs = docs

    def sort(self, key, direction=None):
        keys = key if isinstance(key, list) else [(key, direction)]
        for k, d in reversed(keys):
            self._docs.sort(key=lambda doc: (doc.get(k) is None, doc.get(k)), reverse=d == -1)
        return self

    def limit(self, n: int):
        self._docs = self._docs[:n]
        return self

    def __aiter__(self):
        self._iter = iter(self._docs)
        return self

    async def __anext__(self):
        try:
            return copy.deepcopy(next(self._iter))
        except StopIteration:
            raise StopAsyncIteration

    async def to_list(self, length=None):
        return [copy.deepcopy(d) for d in self._docs[:length]]


class FakeCollection:
    def __init__(self):
        self.docs: list[dict] = []

    def find(self, query: dict | None = None):
        return FakeCursor([d for d in self.docs if _matches(d, query or {})])

    async def find_one(self, query: dict):
        for d in self.docs:
            if _matches(d, query):
                return copy.deepcopy(d)
        return None

    async def insert_one(self, doc: dict):
        self.docs.append(copy.deepcopy(doc))

    async def insert_many(self, docs: list[dict]):
        for d in docs:
            self.docs.append(copy.deepcopy(d))

    async def update_one(self, query: dict, update: dict, upsert: bool = False):
        for d in self.docs:
            if _matches(d, query):
                d.update(copy.deepcopy(update.get("$set", {})))
                for key in update.get("$unset", {}):
                    d.pop(key, None)
                return
        if upsert:
            doc = {k: v for k, v in query.items() if not isinstance(v, dict)}
            doc.update(copy.deepcopy(update.get("$setOnInsert", {})))
            doc.update(copy.deepcopy(update.get("$set", {})))
            self.docs.append(doc)

    async def delete_one(self, query: dict):
        for i, d in enumerate(self.docs):
            if _matches(d, query):
                del self.docs[i]
                return type("R", (), {"deleted_count": 1})()
        return type("R", (), {"deleted_count": 0})()

    async def find_one_and_delete(self, query: dict):
        doc = await self.find_one(query)
        if doc:
            await self.delete_one(query)
        return doc

    async def count_documents(self, query: dict):
        return sum(1 for d in self.docs if _matches(d, query))

    async def create_index(self, *args, **kwargs):
        return None

    def aggregate(self, pipeline: list[dict]):
        match = pipeline[0]["$match"]
        group = pipeline[1]["$group"]
        field = next(v for k, v in group.items() if k != "_id")["$sum"].lstrip("$")
        name = next(k for k in group if k != "_id")
        rows = [d for d in self.docs if _matches(d, match)]
        return FakeCursor([{"_id": None, name: sum(r.get(field, 0) for r in rows)}] if rows else [])


class FakeDB:
    def __init__(self):
        self._collections: dict[str, FakeCollection] = {}

    def __getitem__(self, name: str) -> FakeCollection:
        return self._collections.setdefault(name, FakeCollection())
