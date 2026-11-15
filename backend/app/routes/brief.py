"""The brief at the top of Home. Always answers instantly; the Gemini version is built in the background.

GET /brief returns the cached brief if it's current, otherwise the last brief (or the instant template)
with fresh=false while a new one is generated. Syncs and done/dismiss also trigger a refresh, so a
current brief is usually ready before anyone asks.
"""

import asyncio
import logging

from fastapi import APIRouter, Depends

from app.config import get_settings
from app.db import get_db
from app.models import now_utc
from app.modes import in_mode
from app.ranking import urgency
from app.security import current_user
from app.store import open_items
from llm.brief import cache_key, make_brief, template_brief

log = logging.getLogger("radar.brief")
router = APIRouter()

_running: set[str] = set()
_tasks: set[asyncio.Task] = set()  # keep references so background tasks aren't garbage-collected


async def _ranked_items(user_id: str, now, mode: str | None = None):
    """Open items worth mentioning, most urgent first, limited to the student's current mode."""
    if mode is None:
        user = await get_db().users.find_one({"_id": user_id}, {"mode": 1})
        mode = (user or {}).get("mode", "study")
    items = [i for i in await open_items(user_id) if in_mode(i, mode)]
    for item in items:
        item.urgency_score = urgency(item, now)
    return sorted((i for i in items if i.urgency_score > 0.25), key=lambda i: i.urgency_score, reverse=True)


async def refresh_brief(user_id: str) -> None:
    """Build and cache a new brief. At most one runs per user at a time."""
    if user_id in _running:
        return
    _running.add(user_id)
    try:
        now = now_utc()
        items = await _ranked_items(user_id, now)
        brief, how = await make_brief(items, now)
        payload = {**brief.model_dump(), "generated_by": how, "generated_at": now.isoformat()}
        await get_db().briefs.update_one(
            {"_id": user_id}, {"$set": {"key": cache_key(items, now), "brief": payload}}, upsert=True
        )
    except Exception:
        log.exception("brief refresh failed for %s", user_id)
    finally:
        _running.discard(user_id)


def schedule_refresh(user_id: str) -> None:
    """Fire-and-forget brief refresh (after a sync or a status change)."""
    try:
        task = asyncio.get_running_loop().create_task(refresh_brief(user_id))
        _tasks.add(task)
        task.add_done_callback(_tasks.discard)
    except RuntimeError:  # no event loop (e.g. a script): skip, the next GET will do it
        pass


@router.get("/brief")
async def get_brief(user: dict = Depends(current_user)):
    now = now_utc()
    items = await _ranked_items(user["_id"], now, user.get("mode", "study"))
    key = cache_key(items, now)
    cached = await get_db().briefs.find_one({"_id": user["_id"]})
    if cached and cached.get("key") == key:
        return {**cached["brief"], "fresh": True}

    if not get_settings().gemini_api_key:
        brief = template_brief(items, now)
        return {**brief.model_dump(), "generated_by": "template", "generated_at": now.isoformat(), "fresh": True}

    schedule_refresh(user["_id"])
    if cached:
        return {**cached["brief"], "fresh": False}
    brief = template_brief(items, now)
    return {**brief.model_dump(), "generated_by": "template", "generated_at": now.isoformat(), "fresh": False}
