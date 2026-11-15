"""Read-only Google Calendar: busy times, used to tell which office hours you can actually make."""

import asyncio
from datetime import datetime, time, timedelta

from googleapiclient.errors import HttpError

from app import gmail_client as gc
from app.models import EASTERN
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


def _events(refresh_token: str, start: datetime, end: datetime) -> list[dict]:
    service = gc.build_service(refresh_token, "calendar", "v3", gc.CALENDAR_SCOPE)
    req = service.events().list(
        calendarId="primary", timeMin=start.isoformat(), timeMax=end.isoformat(), singleEvents=True,
        orderBy="startTime", maxResults=250,
        fields="items(id,summary,location,start,end,status,htmlLink,transparency)",
    )
    out = []
    for ev in gc._call(req).get("items", []):
        if ev.get("status") == "cancelled":
            continue
        s, e = ev.get("start", {}), ev.get("end", {})
        all_day = "date" in s and "dateTime" not in s
        if all_day:
            st = datetime.combine(datetime.fromisoformat(s["date"]).date(), time(0), tzinfo=EASTERN)
            en = datetime.combine(datetime.fromisoformat(e.get("date", s["date"])).date(), time(0), tzinfo=EASTERN)
        else:
            st, en = datetime.fromisoformat(s["dateTime"]), datetime.fromisoformat(e.get("dateTime", s["dateTime"]))
        out.append({"id": ev["id"], "title": (ev.get("summary") or "Busy")[:200], "location": ev.get("location"),
                    "start": st, "end": en, "all_day": all_day, "url": ev.get("htmlLink")})
    return out


async def events_between(user: dict, start: datetime, end: datetime) -> list[dict] | None:
    """Events on the user's primary Google Calendar, read live and never stored. None if not connected."""
    if not user.get("calendar_granted") or not user.get("refresh_token_enc"):
        return None
    token = decrypt_token(user["refresh_token_enc"])
    if not token:
        return None
    try:
        return await asyncio.to_thread(_events, token, start, end)
    except (gc.ReconnectRequired, HttpError, OSError, KeyError, ValueError):
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


def class_intervals(schedule: dict | None, start: datetime, end: datetime) -> list[tuple[datetime, datetime]]:
    """Weekly class meetings from an uploaded schedule, as concrete busy intervals between start and end."""
    if not schedule:
        return []
    out = []
    day = start.astimezone(EASTERN).date()
    while day <= end.astimezone(EASTERN).date():
        for c in schedule.get("classes", []):
            if day.weekday() in c["days"]:
                h1, m1 = map(int, c["start"].split(":"))
                h2, m2 = map(int, c["end"].split(":"))
                out.append((datetime.combine(day, time(h1, m1), tzinfo=EASTERN),
                            datetime.combine(day, time(h2, m2), tzinfo=EASTERN)))
        day += timedelta(days=1)
    return out
