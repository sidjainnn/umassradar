import asyncio
import logging
import os
import secrets
from urllib.parse import urlencode

from fastapi import APIRouter, Cookie, Depends, HTTPException, Request, Response
from fastapi.responses import RedirectResponse
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token
from google_auth_oauthlib.flow import Flow

from app.config import get_settings
from app.db import get_db
from app.gmail_client import SCOPES
from app.models import now_utc
from app.security import (
    SESSION_COOKIE,
    create_session,
    current_user,
    encrypt_token,
    end_session,
    set_cookie,
)

log = logging.getLogger("radar.auth")
router = APIRouter()

STATE_COOKIE = "radar_oauth_state"

# Google may add scopes the user granted earlier; don't fail on that.
os.environ.setdefault("OAUTHLIB_RELAX_TOKEN_SCOPE", "1")

ERROR_MESSAGES = {
    "access_denied": "You didn't grant Gmail access, so UMass Radar can't read your inbox. The rest of the app still works.",
    "admin_policy_enforced": "Your school's Google admin blocks this app from reading Gmail. The rest of the app still works.",
    "org_internal": "This app is restricted to another organization's accounts.",
}


def _flow(state: str | None = None, code_verifier: str | None = None) -> Flow:
    s = get_settings()
    config = {
        "web": {
            "client_id": s.google_client_id,
            "client_secret": s.google_client_secret,
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
            "redirect_uris": [s.oauth_redirect_uri],
        }
    }
    flow = Flow.from_client_config(config, scopes=SCOPES, state=state, code_verifier=code_verifier)
    flow.redirect_uri = s.oauth_redirect_uri
    return flow


def _frontend(path: str = "/", **params) -> str:
    query = f"?{urlencode(params)}" if params else ""
    return f"{get_settings().frontend_url}{path}{query}"


@router.get("/auth/login")
async def login():
    if not get_settings().google_configured:
        raise HTTPException(503, "Google sign-in isn't configured: set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.")
    if os.environ.get("OAUTHLIB_INSECURE_TRANSPORT") is None and get_settings().oauth_redirect_uri.startswith("http://"):
        os.environ["OAUTHLIB_INSECURE_TRANSPORT"] = "1"  # local dev only
    state = secrets.token_urlsafe(24)
    flow = _flow(state=state)
    url, _ = flow.authorization_url(access_type="offline", prompt="consent", include_granted_scopes="true")
    await get_db().oauth_states.insert_one(
        {"_id": state, "code_verifier": flow.code_verifier, "created_at": now_utc()}
    )
    response = RedirectResponse(url, status_code=302)
    set_cookie(response, STATE_COOKIE, state, 900)
    return response


@router.get("/auth/callback")
async def callback(request: Request, radar_oauth_state: str | None = Cookie(default=None)):
    params = request.query_params
    if params.get("error"):
        err = params["error"]
        return RedirectResponse(_frontend("/", error=err, message=ERROR_MESSAGES.get(err, err)))

    state = params.get("state")
    if not state or state != radar_oauth_state:
        return RedirectResponse(_frontend("/", error="state_mismatch", message="Sign-in expired. Please try again."))
    pending = await get_db().oauth_states.find_one_and_delete({"_id": state})
    if not pending:
        return RedirectResponse(_frontend("/", error="state_expired", message="Sign-in expired. Please try again."))

    flow = _flow(state=state, code_verifier=pending.get("code_verifier"))
    try:
        await asyncio.to_thread(flow.fetch_token, code=params.get("code"))
    except Exception as e:  # oauthlib raises several error types
        text = str(e)
        err = next((k for k in ERROR_MESSAGES if k in text), "token_exchange_failed")
        log.warning("token exchange failed: %s", text)
        return RedirectResponse(_frontend("/", error=err, message=ERROR_MESSAGES.get(err, "Google sign-in failed.")))

    creds = flow.credentials
    info = await asyncio.to_thread(
        id_token.verify_oauth2_token, creds.id_token, google_requests.Request(), get_settings().google_client_id
    )
    granted = set(creds.granted_scopes or SCOPES)
    user_id = info["sub"]
    update = {
        "email": info.get("email", ""),
        "name": info.get("name", ""),
        "gmail_granted": "https://www.googleapis.com/auth/gmail.readonly" in granted,
        "needs_reconnect": False,
        "updated_at": now_utc(),
    }
    if creds.refresh_token:
        update["refresh_token_enc"] = encrypt_token(creds.refresh_token)
    await get_db().users.update_one(
        {"_id": user_id}, {"$set": update, "$setOnInsert": {"created_at": now_utc(), "demo": False}}, upsert=True
    )

    response = RedirectResponse(_frontend("/", connected="1"))
    response.delete_cookie(STATE_COOKIE, path="/")
    await create_session(response, user_id)
    return response


@router.post("/auth/logout")
async def logout(response: Response, radar_session: str | None = Cookie(default=None)):
    await end_session(response, radar_session)
    return {"ok": True}


@router.get("/me")
async def me(user: dict = Depends(current_user)):
    return {
        "id": user["_id"],
        "email": user.get("email", ""),
        "name": user.get("name", ""),
        "demo": user.get("demo", False),
        "needs_reconnect": user.get("needs_reconnect", False),
        "gmail_granted": user.get("gmail_granted", False),
        "last_sync_at": user.get("last_sync_at"),
        "canvas_feed_set": bool(user.get("canvas_feed_enc")),
    }


__all__ = ["router", "SESSION_COOKIE"]
