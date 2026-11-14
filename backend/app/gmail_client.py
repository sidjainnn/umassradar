"""Thin synchronous wrapper around the Gmail API. Call it via asyncio.to_thread."""

from datetime import datetime, timezone

from google.auth.exceptions import RefreshError
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

from app.config import get_settings

GMAIL_SCOPE = "https://www.googleapis.com/auth/gmail.readonly"
SCOPES = ["openid", "https://www.googleapis.com/auth/userinfo.email", GMAIL_SCOPE]


class ReconnectRequired(Exception):
    """The stored refresh token no longer works (expired, revoked, or invalid_grant)."""


def build_service(refresh_token: str):
    s = get_settings()
    creds = Credentials(
        None,
        refresh_token=refresh_token,
        token_uri="https://oauth2.googleapis.com/token",
        client_id=s.google_client_id,
        client_secret=s.google_client_secret,
        scopes=[GMAIL_SCOPE],
    )
    return build("gmail", "v1", credentials=creds, cache_discovery=False)


def _call(request):
    try:
        # num_retries backs off on 429/5xx and 403 rateLimitExceeded
        return request.execute(num_retries=5)
    except RefreshError as e:
        raise ReconnectRequired(str(e)) from e


def current_history_id(service) -> str:
    return _call(service.users().getProfile(userId="me"))["historyId"]


def list_recent_ids(service, days: int, limit: int) -> list[str]:
    ids: list[str] = []
    page = None
    while len(ids) < limit:
        resp = _call(
            service.users().messages().list(
                userId="me", q=f"newer_than:{days}d", maxResults=min(100, limit - len(ids)), pageToken=page
            )
        )
        ids.extend(m["id"] for m in resp.get("messages", []))
        page = resp.get("nextPageToken")
        if not page:
            break
    return ids


def list_ids_since(service, history_id: str) -> list[str] | None:
    """New message ids since history_id. None means the history id is too old: do a full sync."""
    ids: list[str] = []
    page = None
    while True:
        try:
            resp = _call(
                service.users().history().list(
                    userId="me", startHistoryId=history_id, historyTypes=["messageAdded"], pageToken=page
                )
            )
        except HttpError as e:
            if e.resp.status == 404:
                return None
            raise
        for h in resp.get("history", []):
            for added in h.get("messagesAdded", []):
                mid = added["message"]["id"]
                if mid not in ids:
                    ids.append(mid)
        page = resp.get("nextPageToken")
        if not page:
            return ids


def is_rate_limited(error: HttpError) -> bool:
    return error.resp.status in (403, 429) and "ratelimitexceeded" in str(error).lower().replace(" ", "")


def get_messages(service, ids: list[str]) -> list[dict]:
    out = []
    for mid in ids:
        try:
            out.append(_call(service.users().messages().get(userId="me", id=mid, format="full")))
        except HttpError as e:
            if e.resp.status == 404:  # deleted between list and get
                continue
            raise
    return out


def gmail_link(message_id: str) -> str:
    return f"https://mail.google.com/mail/u/0/#all/{message_id}"


def now() -> datetime:
    return datetime.now(timezone.utc)
