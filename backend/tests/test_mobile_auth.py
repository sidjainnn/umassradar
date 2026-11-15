from datetime import datetime, timedelta, timezone

import pytest
from fastapi import HTTPException

from app import security


class FakeSessions:
    def __init__(self, docs):
        self.docs = docs

    async def find_one(self, q):
        return next((d for d in self.docs if d["token_hash"] == q["token_hash"]), None)


class FakeUsers:
    async def find_one(self, q):
        return {"_id": q["_id"], "name": "Test"}


class FakeDB:
    def __init__(self, docs):
        self.sessions = FakeSessions(docs)
        self.users = FakeUsers()


@pytest.fixture
def db(monkeypatch):
    now = datetime.now(timezone.utc)
    docs = [{"token_hash": security.hash_token("good"), "user_id": "u1", "expires_at": now + timedelta(days=1)},
            {"token_hash": security.hash_token("old"), "user_id": "u2", "expires_at": now - timedelta(days=1)}]
    monkeypatch.setattr(security, "get_db", lambda: FakeDB(docs))


async def test_bearer_token_signs_in(db):
    user = await security.current_user(radar_session=None, authorization="Bearer good")
    assert user["_id"] == "u1"


async def test_cookie_still_works(db):
    assert (await security.current_user(radar_session="good", authorization=None))["_id"] == "u1"


async def test_expired_or_missing_tokens_are_rejected(db):
    for kwargs in ({"radar_session": None, "authorization": "Bearer old"},
                   {"radar_session": None, "authorization": "Bearer nope"},
                   {"radar_session": None, "authorization": None},
                   {"radar_session": None, "authorization": "Basic good"}):
        with pytest.raises(HTTPException):
            await security.current_user(**kwargs)
