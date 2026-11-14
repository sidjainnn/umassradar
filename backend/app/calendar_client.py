"""Read-only Google Calendar: busy times, used to tell which office hours you can actually make."""

import asyncio
from datetime import datetime, timedelta

from googleapiclient.errors import HttpError

from app import gmail_client as gc
from app.security import decrypt_token

BUFFER = timedelta(minutes=10)  # time to walk across campus


def _busy(refresh_token: str, start: datetime, end: datetime) -> list[tuple[datetime, datetime]]:
    service = gc.build_service(refresh_token, "calendar", "v3", gc.CALENDAR_SCOPE)
    body = {"timeMin": start.isoformat(), "timeMax": end.isoformat(), "items": [{"id": "primary"}]}
    resp = gc._call(service.freebusy().query(body=body))
    out = []
    for b in resp.get("calendars", {}).get("primary", {}).get("busy", []):
        out.append((datetime.fromisoformat(b["start"]), datetime.fromisoformat(b["end"])))
    return out


async def busy_intervals(user: dict, start: datetime, end: datetime) -> list[tuple[datetime, datetime]] | None:
    """Busy intervals from the user's primary calendar, or None if Calendar isn't connected or fails."""
    if not user.get("calendar_granted") or not user.get("refresh_token_enc"):
        return None
    token = decrypt_token(user["refresh_token_enc"])
    if not token:
        return None
    try:
        return await asyncio.to_thread(_busy, token, start, end)
    except (gc.ReconnectRequired, HttpError, OSError):
        return None


def can_make(slot_start: datetime, slot_end: datetime, busy: list[tuple[datetime, datetime]]) -> bool:
    """True if at least 20 minutes of the slot are free (with a walking buffer around other events)."""
    free = [(slot_start, slot_end)]
    for b_start, b_end in busy:
        b_start, b_end = b_start - BUFFER, b_end + BUFFER
        nxt = []
        for f_start, f_end in free:
            if b_end <= f_start or b_start >= f_end:
                nxt.append((f_start, f_end))
                continue
            if b_start > f_start:
                nxt.append((f_start, b_start))
            if b_end < f_end:
                nxt.append((b_end, f_end))
        free = nxt
    return any(e - s >= timedelta(minutes=20) for s, e in free)
