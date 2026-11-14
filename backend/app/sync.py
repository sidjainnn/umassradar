import asyncio
import logging

from googleapiclient.errors import HttpError

from app import gmail_client as gc
from app.config import get_settings
from app.db import get_db
from app.email_parse import parse_gmail_message
from app.models import now_utc
from app.pipeline import process_emails
from app.security import decrypt_token
from app.store import already_processed, mark_processed, save_items

log = logging.getLogger("radar.sync")

CHUNK = 25  # fetch + process + save this many emails at a time, so progress survives errors


def _list(refresh_token: str, history_id: str | None, days: int, limit: int):
    """Runs in a worker thread. Returns (service, message ids, new history id, was_full_sync)."""
    service = gc.build_service(refresh_token)
    new_history = gc.current_history_id(service)
    ids = gc.list_ids_since(service, history_id) if history_id else None
    full = ids is None
    if full:
        ids = gc.list_recent_ids(service, days, limit)
    return service, ids, new_history, full


async def sync_user(user_id: str, full: bool = False) -> dict:
    db = get_db()
    settings = get_settings()
    user = await db.users.find_one({"_id": user_id})
    if not user:
        return {"status": "error", "message": "user not found"}

    refresh_token = decrypt_token(user["refresh_token_enc"]) if user.get("refresh_token_enc") else None
    if not refresh_token:
        await db.users.update_one({"_id": user_id}, {"$set": {"needs_reconnect": True}})
        return {"status": "reconnect", "message": "Reconnect Gmail to keep syncing."}

    if full:
        await db.processed_messages.delete_many({"user_id": user_id})
        await db.items.delete_many({"user_id": user_id, "source": "gmail", "status": "open"})
        # Forget the history pointer so an interrupted re-scan resumes with a full listing.
        await db.users.update_one({"_id": user_id}, {"$unset": {"history_id": ""}})

    history_id = None if full else user.get("history_id")
    done = 0
    items_saved = 0
    try:
        service, ids, new_history, was_full = await asyncio.to_thread(
            _list, refresh_token, history_id, settings.initial_sync_days, settings.max_initial_messages
        )
        # emails whose LLM step failed last time get another try
        candidates = list(dict.fromkeys([*ids, *user.get("pending_llm", [])]))
        seen = await already_processed(user_id, candidates) if candidates else set()
        todo = [i for i in candidates if i not in seen]
        pending: list[str] = []

        for start in range(0, len(todo), CHUNK):
            raw = await asyncio.to_thread(gc.get_messages, service, todo[start: start + CHUNK])
            msgs = [parse_gmail_message(m) for m in raw]
            failed: list = []
            items = await process_emails(msgs, user_id, failed=failed)
            await save_items(user_id, items)
            failed_ids = {m.id for m in failed}
            await mark_processed(user_id, [m.id for m in msgs if m.id not in failed_ids])
            pending.extend(failed_ids)
            await db.users.update_one({"_id": user_id}, {"$set": {"pending_llm": pending}})
            done += len(msgs)
            items_saved += len(items)
    except gc.ReconnectRequired:
        log.info("refresh token rejected for %s", user_id)
        await db.users.update_one({"_id": user_id}, {"$set": {"needs_reconnect": True}})
        return {"status": "reconnect", "message": "Your Gmail connection expired. Reconnect Gmail to keep syncing."}
    except HttpError as e:
        log.warning("gmail error for %s after %d messages: %s", user_id, done, e)
        await db.users.update_one({"_id": user_id}, {"$set": {"last_sync_at": now_utc()}})
        if gc.is_rate_limited(e):
            msg = f"Gmail asked us to slow down. Synced {done} emails so far; try Refresh again in a minute."
        else:
            msg = f"Gmail returned an error ({e.resp.status}). Synced {done} emails so far."
        return {"status": "partial", "message": msg, "new_messages": done, "items": items_saved}

    await db.users.update_one({"_id": user_id}, {"$set": {"pending_llm": pending}})
    canvas = await sync_canvas(user_id)

    # Only move the history pointer after a complete pass, so nothing is skipped.
    await db.users.update_one(
        {"_id": user_id},
        {"$set": {"history_id": new_history, "last_sync_at": now_utc(), "needs_reconnect": False}},
    )
    return {"status": "ok", "new_messages": done, "items": items_saved, "full_sync": was_full,
            "canvas_items": canvas.get("items", 0), "pending_llm": len(pending)}


async def sync_canvas(user_id: str) -> dict:
    """Pull the user's Canvas calendar feed, if they've set one."""
    from app.ical_import import FeedError, fetch_feed, parse_feed
    from app.pipeline import finalize

    user = await get_db().users.find_one({"_id": user_id})
    blob = (user or {}).get("canvas_feed_enc")
    url = decrypt_token(blob) if blob else None
    if not url:
        return {"status": "skipped", "items": 0}
    try:
        items = parse_feed(await fetch_feed(url))
    except FeedError as e:
        return {"status": "error", "message": str(e)}
    except Exception as e:  # network errors, malformed ics
        log.warning("canvas feed failed for %s: %s", user_id, e)
        return {"status": "error", "message": "Couldn't read that Canvas feed."}
    items = finalize(items, user_id)
    await save_items(user_id, items)
    return {"status": "ok", "items": len(items)}
