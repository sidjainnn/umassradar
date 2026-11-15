"""Campus and club events from events.umass.edu's public API (Localist).

    python -m app.campus_events

robots.txt allows the API with a 1-second crawl delay, which we keep. Events are stored once and shared;
each event's organizers ("groups") are what students follow. A followed group's upcoming events are
copied into that student's items, so they show up on Home and Schedule like any other event.
"""

import asyncio
import re
import uuid
from datetime import datetime, timedelta

import httpx

from app.db import get_db
from app.models import EASTERN, Item, now_utc

API = "https://events.umass.edu/api/2/events"
USER_AGENT = "Mozilla/5.0 (compatible; OneMass campus events; student project)"
DAYS_AHEAD = 30


def _parse_time(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        dt = datetime.fromisoformat(value)
    except ValueError:
        return None
    return dt if dt.tzinfo else dt.replace(tzinfo=EASTERN)


def parse_events(payload: dict) -> list[dict]:
    """Localist API page -> flat event dicts (one per upcoming instance)."""
    out = []
    for wrapper in payload.get("events", []):
        e = wrapper.get("event", {})
        groups = [g.get("name", "").strip() for g in (e.get("groups") or []) if isinstance(g, dict) and g.get("name")]
        filters = e.get("filters") or {}
        for inst in e.get("event_instances", []):
            i = inst.get("event_instance", {})
            start = _parse_time(i.get("start"))
            if not start:
                continue
            out.append({
                "_id": f"{e.get('id')}-{i.get('id')}",
                "event_id": e.get("id"),
                "title": (e.get("title") or "").strip()[:200],
                "starts_at": start,
                "ends_at": _parse_time(i.get("end")),
                "all_day": bool(i.get("all_day")),
                "location": (e.get("location_name") or e.get("location") or "").strip()[:120] or None,
                "room": (e.get("room_number") or "").strip() or None,
                "url": e.get("localist_url") or e.get("url"),
                "groups": groups,
                "types": [f["name"] for f in filters.get("event_types", [])],
                "topics": [f["name"] for f in filters.get("event_topic", [])],
                "audience": [f["name"] for f in filters.get("event_audience", [])],
                "summary": re.sub(r"\s+", " ", e.get("description_text") or "").strip()[:400],
                "free": e.get("free"),
            })
    return out


async def refresh_events(days: int = DAYS_AHEAD, max_pages: int = 20) -> int:
    """Pull the next `days` days of events and replace the stored copy."""
    db = get_db()
    events: list[dict] = []
    async with httpx.AsyncClient(timeout=30, headers={"User-Agent": USER_AGENT}) as client:
        page = 1
        while page <= max_pages:
            resp = await client.get(API, params={"days": days, "pp": 100, "page": page})
            resp.raise_for_status()
            data = resp.json()
            events += parse_events(data)
            info = data.get("page") or {}
            if not info.get("next_page"):
                break
            page = info["next_page"]
            await asyncio.sleep(1)  # robots.txt: Crawl-Delay 1
    now = now_utc()
    for ev in events:
        await db.campus_events.update_one({"_id": ev["_id"]}, {"$set": {**ev, "fetched_at": now}}, upsert=True)
    await db.campus_events.delete_many({"starts_at": {"$lt": now - timedelta(days=1)}})
    return len(events)


async def upcoming(groups: list[str] | None = None, days: int = 14, limit: int = 300) -> list[dict]:
    now = now_utc()
    query: dict = {"starts_at": {"$gte": now - timedelta(hours=2), "$lte": now + timedelta(days=days)}}
    if groups is not None:
        query["groups"] = {"$in": groups}
    return await get_db().campus_events.find(query).sort("starts_at", 1).to_list(limit)


def event_to_item(ev: dict, user_id: str, group: str) -> Item:
    where = ", ".join(x for x in (ev.get("location"), ev.get("room")) if x) or None
    return Item(
        id=uuid.uuid4().hex, user_id=user_id, category="event", title=ev["title"], starts_at=ev["starts_at"],
        location=where, source="campus", source_ref=f"campus:{ev['_id']}", evidence=ev.get("summary") or ev["title"],
        confidence=0.95, extracted_by="rule", sender=group, sender_type="automated", url=ev.get("url"),
    )


async def share_followed_events(user_id: str) -> int:
    """Copy upcoming events of the groups a student follows into their items."""
    from app.pipeline import finalize
    from app.store import save_items

    user = await get_db().users.find_one({"_id": user_id}, {"followed_groups": 1})
    followed = (user or {}).get("followed_groups", [])
    if not followed:
        return 0
    events = await upcoming(followed, days=DAYS_AHEAD)
    items = [event_to_item(ev, user_id, next(g for g in ev["groups"] if g in followed)) for ev in events]
    await save_items(user_id, finalize(items, user_id))
    return len(items)


async def refresh_and_share() -> dict:
    n = await refresh_events()
    async for user in get_db().users.find({"followed_groups.0": {"$exists": True}}, {"_id": 1}):
        await share_followed_events(user["_id"])
    return {"events": n}


if __name__ == "__main__":
    print(asyncio.run(refresh_and_share()))
