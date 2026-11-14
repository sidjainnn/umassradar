"""Clubs and organizations: browse campus events, follow the groups that run them."""

import re
from collections import Counter

from fastapi import APIRouter, Depends, HTTPException

from app.campus_events import share_followed_events, upcoming
from app.db import get_db
from app.security import current_user

router = APIRouter()


def _event_json(ev: dict, followed: set[str]) -> dict:
    return {
        "id": ev["_id"], "title": ev["title"], "starts_at": ev["starts_at"], "ends_at": ev.get("ends_at"),
        "all_day": ev.get("all_day", False), "location": ev.get("location"), "url": ev.get("url"),
        "groups": ev.get("groups", []), "types": ev.get("types", []), "summary": ev.get("summary", ""),
        "following": any(g in followed for g in ev.get("groups", [])),
    }


@router.get("/campus-events")
async def campus_events(q: str = "", days: int = 14, user: dict = Depends(current_user)):
    followed = set(user.get("followed_groups", []))
    events = await upcoming(days=min(days, 30))
    if q.strip():
        rx = re.compile(re.escape(q.strip()), re.I)
        events = [e for e in events if rx.search(e["title"]) or any(rx.search(g) for g in e.get("groups", []))]
    return [_event_json(e, followed) for e in events]


@router.get("/groups")
async def groups(user: dict = Depends(current_user)):
    """Organizations with upcoming events, followed ones first."""
    followed = set(user.get("followed_groups", []))
    counts = Counter(g for e in await upcoming(days=30, limit=1000) for g in e.get("groups", []))
    names = set(counts) | followed
    rows = [{"name": n, "upcoming": counts.get(n, 0), "following": n in followed} for n in names]
    rows.sort(key=lambda r: (not r["following"], -r["upcoming"], r["name"]))
    return rows


@router.post("/groups/follow")
async def follow(name: str, user: dict = Depends(current_user)):
    name = name.strip()[:120]
    if not name:
        raise HTTPException(400, "Missing group name.")
    await get_db().users.update_one({"_id": user["_id"]}, {"$addToSet": {"followed_groups": name}})
    added = await share_followed_events(user["_id"])
    return {"ok": True, "events_added": added}


@router.delete("/groups/follow")
async def unfollow(name: str, user: dict = Depends(current_user)):
    db = get_db()
    await db.users.update_one({"_id": user["_id"]}, {"$pull": {"followed_groups": name}})
    await db.items.delete_many({"user_id": user["_id"], "source": "campus", "sender": name, "status": "open"})
    return {"ok": True}
