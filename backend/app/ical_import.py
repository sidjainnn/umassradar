"""Canvas calendar feed (.ics) -> items."""

import re
from datetime import date, datetime, time, timedelta
from urllib.parse import urlparse

import httpx
from icalendar import Calendar

from app.models import EASTERN, Item, now_utc
from parsers.common import find_course


class FeedError(ValueError):
    pass


def validate_feed_url(url: str) -> str:
    url = url.strip()
    parsed = urlparse(url)
    if parsed.scheme != "https" or not (parsed.hostname or "").endswith(".instructure.com"):
        raise FeedError("Paste the Canvas calendar feed link (https://….instructure.com/feeds/calendars/….ics).")
    return url


async def fetch_feed(url: str) -> bytes:
    async with httpx.AsyncClient(timeout=15, follow_redirects=False) as client:
        resp = await client.get(validate_feed_url(url))
    if resp.status_code != 200:
        raise FeedError(f"Canvas returned {resp.status_code} for that feed link.")
    return resp.content


def _to_dt(value) -> datetime:
    if isinstance(value, datetime):
        return value.astimezone(EASTERN) if value.tzinfo else value.replace(tzinfo=EASTERN)
    if isinstance(value, date):
        return datetime.combine(value, time(23, 59), tzinfo=EASTERN)
    raise TypeError(value)


def parse_feed(data: bytes, now: datetime | None = None, days_ahead: int = 60) -> list[Item]:
    now = now or now_utc()
    cal = Calendar.from_ical(data)
    items: list[Item] = []
    for event in cal.walk("VEVENT"):
        start = event.get("DTSTART")
        if not start:
            continue
        when = _to_dt(start.dt)
        if not (now - timedelta(days=2) <= when <= now + timedelta(days=days_ahead)):
            continue
        summary = str(event.get("SUMMARY", "")).strip()
        uid = str(event.get("UID", ""))
        bracket = re.search(r"\[([^\]]+)\]\s*$", summary)
        course = find_course(bracket.group(1)) if bracket else find_course(summary)
        title = summary[: bracket.start()].strip() if bracket else summary
        is_assignment = "assignment" in uid.lower()
        url = str(event.get("URL", "")) or None
        common = dict(
            title=title[:200] or "Canvas event",
            course=course or (bracket.group(1).strip() if bracket else None),
            source="canvas",
            source_ref=uid or url or title,
            evidence=summary[:300],
            confidence=0.95,
            extracted_by="rule",
            sender="Canvas",
            sender_type="automated",
            url=url,
            location=str(event.get("LOCATION", "")) or None,
        )
        if is_assignment:
            items.append(Item(category="deadline", due_at=when, action_required=True, **common))
        else:
            items.append(Item(category="event", starts_at=when, **common))
    return items
