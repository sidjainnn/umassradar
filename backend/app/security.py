import hashlib
import secrets
from datetime import datetime, timedelta, timezone

from cryptography.fernet import Fernet, InvalidToken
from fastapi import Cookie, HTTPException, Response

from app.config import get_settings
from app.db import get_db

SESSION_COOKIE = "radar_session"
SESSION_DAYS = 120  # one semester per device


def _fernet() -> Fernet:
    key = get_settings().token_encryption_key
    if not key:
        raise RuntimeError("TOKEN_ENCRYPTION_KEY is not set")
    return Fernet(key.encode())


def encrypt_token(token: str) -> str:
    return _fernet().encrypt(token.encode()).decode()


def decrypt_token(blob: str) -> str | None:
    try:
        return _fernet().decrypt(blob.encode()).decode()
    except InvalidToken:
        return None


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def set_cookie(response: Response, name: str, value: str, max_age: int) -> None:
    response.set_cookie(
        name,
        value,
        max_age=max_age,
        httponly=True,
        secure=get_settings().cookie_secure,
        samesite="lax",
        path="/",
    )


async def create_session(response: Response, user_id: str) -> None:
    token = secrets.token_urlsafe(32)
    now = datetime.now(timezone.utc)
    await get_db().sessions.insert_one(
        {
            "token_hash": hash_token(token),
            "user_id": user_id,
            "created_at": now,
            "expires_at": now + timedelta(days=SESSION_DAYS),
        }
    )
    set_cookie(response, SESSION_COOKIE, token, SESSION_DAYS * 86400)


async def end_session(response: Response, token: str | None) -> None:
    if token:
        await get_db().sessions.delete_one({"token_hash": hash_token(token)})
    response.delete_cookie(SESSION_COOKIE, path="/")


async def current_user(radar_session: str | None = Cookie(default=None)) -> dict:
    if not radar_session:
        raise HTTPException(status_code=401, detail="not signed in")
    db = get_db()
    session = await db.sessions.find_one({"token_hash": hash_token(radar_session)})
    if not session:
        raise HTTPException(status_code=401, detail="session expired")
    user = await db.users.find_one({"_id": session["user_id"]})
    if not user:
        raise HTTPException(status_code=401, detail="user not found")
    return user
