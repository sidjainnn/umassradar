import asyncio
import logging
import os
import secrets
from urllib.parse import urlencode

from fastapi import APIRouter, Cookie, Depends, HTTPException, Request, Response
from fastapi.responses import RedirectResponse
from pydantic import BaseModel, Field
from pymongo import ReturnDocument
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token
from google_auth_oauthlib.flow import Flow

from app.config import get_settings
from app.db import get_db
from app.gmail_client import CALENDAR_SCOPE, SCOPES
from app.models import now_utc
from app.security import (
    SESSION_COOKIE,
    create_session,
    current_user,
    encrypt_token,
    end_session,
    hash_token,
    new_session_token,
    set_cookie,
)

log = logging.getLogger("radar.auth")
router = APIRouter()

STATE_COOKIE = "radar_oauth_state"
KNOWN_COOKIE = "radar_known"  # set after a successful sign-in, so later sign-ins skip the consent screen

# Google may add scopes the user granted earlier; don't fail on that.
os.environ.setdefault("OAUTHLIB_RELAX_TOKEN_SCOPE", "1")

ERROR_MESSAGES = {
    "access_denied": "You didn't grant Gmail access, so UMass Radar can't read your inbox. The rest of the app still works.",
    "admin_policy_enforced": "Your school's Google admin blocks this app from reading Gmail. The rest of the app still works.",
    "org_internal": "This app is restricted to another organization's accounts.",
}


def _flow(state: str | None = None, code_verifier: str | None = None, scopes: list[str] | None = None) -> Flow:
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
    flow = Flow.from_client_config(config, scopes=scopes or SCOPES, state=state, code_verifier=code_verifier)
    flow.redirect_uri = s.oauth_redirect_uri
    return flow


def _frontend(path: str = "/", **params) -> str:
    query = f"?{urlencode(params)}" if params else ""
    return f"{get_settings().frontend_url}{path}{query}"


@router.get("/auth/login")
async def login(calendar: bool = False, consent: bool = False, mobile: bool = False,
                radar_known: str | None = Cookie(default=None)):
    """Google sign-in. Returning users just pick their account; Google only shows the consent screen the first
    time, when access needs renewing (?consent=1), or when adding Calendar (?calendar=1)."""
    if not get_settings().google_configured:
        raise HTTPException(503, "Google sign-in isn't configured: set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.")
    if os.environ.get("OAUTHLIB_INSECURE_TRANSPORT") is None and get_settings().oauth_redirect_uri.startswith("http://"):
        os.environ["OAUTHLIB_INSECURE_TRANSPORT"] = "1"  # local dev only
    state = secrets.token_urlsafe(24)
    scopes = SCOPES + [CALENDAR_SCOPE] if calendar else SCOPES
    flow = _flow(state=state, scopes=scopes)
    prompt = "consent" if (consent or calendar or not radar_known) else "select_account"
    url, _ = flow.authorization_url(access_type="offline", prompt=prompt, include_granted_scopes="true")
    await get_db().oauth_states.insert_one(
        {"_id": state, "code_verifier": flow.code_verifier, "scopes": scopes, "created_at": now_utc(), "mobile": mobile}
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

    flow = _flow(state=state, code_verifier=pending.get("code_verifier"), scopes=pending.get("scopes"))
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
        "updated_at": now_utc(),
    }
    if CALENDAR_SCOPE in granted:  # never switch Calendar off just because this sign-in didn't ask for it
        update["calendar_granted"] = True
    if creds.refresh_token:
        update["refresh_token_enc"] = encrypt_token(creds.refresh_token)
        update["needs_reconnect"] = False
    user = await get_db().users.find_one_and_update(
        {"_id": user_id}, {"$set": update, "$setOnInsert": {"created_at": now_utc(), "demo": False}},
        upsert=True, return_document=ReturnDocument.AFTER,
    )
    if not user.get("refresh_token_enc") or (user.get("needs_reconnect") and not creds.refresh_token):
        # no usable Gmail token (first time, or the old one expired): only the consent screen issues a new one
        return RedirectResponse(_frontend("/api/auth/login", consent="1", **({"mobile": "1"} if pending.get("mobile") else {})))

    if pending.get("mobile"):
        # hand the app a one-time code (not the session token itself) through its deep link
        code = secrets.token_urlsafe(24)
        await get_db().mobile_codes.insert_one({"_id": hash_token(code), "user_id": user_id, "created_at": now_utc()})
        response = RedirectResponse(f"umassradar://auth?code={code}")
        response.delete_cookie(STATE_COOKIE, path="/")
        return response

    response = RedirectResponse(_frontend("/", connected="1"))
    response.delete_cookie(STATE_COOKIE, path="/")
    set_cookie(response, KNOWN_COOKIE, "1", 365 * 86400)
    await create_session(response, user_id)
    return response


class MobileCode(BaseModel):
    code: str = Field(..., min_length=10, max_length=100)


@router.post("/auth/mobile/exchange")
async def mobile_exchange(body: MobileCode):
    """Swap the one-time code from the sign-in deep link for a session token (valid once, for 5 minutes)."""
    doc = await get_db().mobile_codes.find_one_and_delete({"_id": hash_token(body.code)})
    if not doc:
        raise HTTPException(400, "That sign-in link was already used or has expired. Sign in again.")
    created = doc["created_at"] if doc["created_at"].tzinfo else doc["created_at"].replace(tzinfo=now_utc().tzinfo)
    if (now_utc() - created).total_seconds() > 300:
        raise HTTPException(400, "That sign-in link expired. Sign in again.")
    return {"token": await new_session_token(doc["user_id"], kind="mobile")}


@router.get("/auth/mobile/start")
async def mobile_start(radar_known: str | None = Cookie(default=None)):
    """Google sign-in for the mobile app, opened in the phone's browser; ends at umassradar://auth?code=..."""
    return await login(mobile=True, radar_known=radar_known)


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
        "calendar_connected": user.get("calendar_granted", False),
        "last_sync_at": user.get("last_sync_at"),
        "canvas_feed_set": bool(user.get("canvas_feed_enc")),
        "profile": {
            "preferred_name": (user.get("profile") or {}).get("preferred_name", ""),
            "major": (user.get("profile") or {}).get("major", ""),
            "class_year": (user.get("profile") or {}).get("class_year"),
        },
        "followed_groups": user.get("followed_groups", []),
        "has_schedule": bool(user.get("schedule")),
        "mode": user.get("mode", "study"),
        "needs_onboarding": not user.get("onboarded_at") and not user.get("demo"),
        "member_since": user.get("created_at"),
    }


class ProfileUpdate(BaseModel):
    preferred_name: str = Field("", max_length=40)
    major: str = Field("", max_length=80)
    class_year: int | None = Field(None, ge=2020, le=2035)


@router.patch("/me/profile")
async def update_profile(body: ProfileUpdate, user: dict = Depends(current_user)):
    profile = {"preferred_name": body.preferred_name.strip(), "major": body.major.strip(), "class_year": body.class_year}
    await get_db().users.update_one({"_id": user["_id"]}, {"$set": {"profile": profile}})
    return {"ok": True, "profile": profile}


__all__ = ["router", "SESSION_COOKIE"]
