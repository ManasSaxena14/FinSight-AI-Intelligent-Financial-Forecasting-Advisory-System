import os
import sys

os.environ.setdefault("FINSIGHT_DISABLE_EMBEDDINGS", "1")  # keep tests offline and fast

import pytest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from fastapi.testclient import TestClient  # noqa: E402

from app.main import app  # noqa: E402
from app.services import llm  # noqa: E402
from app.services.auth import get_current_user  # noqa: E402
from tests.fakedb import FakeDB  # noqa: E402

TEST_USER = {"id": "user-1", "name": "Test", "email": "test@example.com"}


@pytest.fixture(autouse=True)
def fresh_rate_limits():
    from app.services import rate_limit
    rate_limit.reset()
    yield


@pytest.fixture(autouse=True)
def no_llm(monkeypatch):
    """Never call Groq from tests; exercise the offline fallbacks."""
    monkeypatch.setattr(llm, "get_client", lambda: None)


@pytest.fixture
def fake_db(monkeypatch):
    db = FakeDB()

    async def _get_database():
        return db

    for module in ("app.routes.expenses", "app.routes.ml", "app.routes.premium", "app.routes.advisor", "app.routes.ai"):
        monkeypatch.setattr(f"{module}.get_database", _get_database)
    return db


@pytest.fixture
def client(fake_db):
    app.dependency_overrides[get_current_user] = lambda: TEST_USER
    # No `with`: skip the lifespan so tests never connect to MongoDB.
    yield TestClient(app)
    app.dependency_overrides.clear()


def month_history(rows):
    """rows: list of (period, income, {cat: amount})."""
    return [{"period": p, "income": i, "expenses": e} for p, i, e in rows]
