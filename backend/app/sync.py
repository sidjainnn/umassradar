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


def _fetch(refresh_token: str, history_id: str | None, days: int, limit: int):
    """Runs in a worker thread. Returns (message ids, new history id, was_full_sync)."""
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

    refresh_token = decrypt_token(user.get("refresh_token_enc", "")) if user.get("refresh_token_enc") else None
    if not refresh_token:
        await db.users.update_one({"_id": user_id}, {"$set": {"needs_reconnect": True}})
        return {"status": "reconnect", "message": "Reconnect Gmail to keep syncing."}

    if full:
        await db.processed_messages.delete_many({"user_id": user_id})
        await db.items.delete_many({"user_id": user_id, "source": "gmail", "status": "open"})

    history_id = None if full else user.get("history_id")
    try:
        service, ids, new_history, was_full = await asyncio.to_thread(
            _fetch, refresh_token, history_id, settings.initial_sync_days, settings.max_initial_messages
        )
        seen = await already_processed(user_id, ids) if ids else set()
        todo = [i for i in ids if i not in seen]
        raw = await asyncio.to_thread(gc.get_messages, service, todo)
    except gc.ReconnectRequired:
        log.info("refresh token rejected for %s", user_id)
        await db.users.update_one({"_id": user_id}, {"$set": {"needs_reconnect": True}})
        return {"status": "reconnect", "message": "Your Gmail connection expired. Reconnect Gmail to keep syncing."}
    except HttpError as e:
        log.warning("gmail error for %s: %s", user_id, e)
        return {"status": "error", "message": f"Gmail returned an error ({e.resp.status})."}

    msgs = [parse_gmail_message(m) for m in raw]
    items = await process_emails(msgs, user_id)
    await save_items(user_id, items)
    await mark_processed(user_id, [m.id for m in msgs])
    await db.users.update_one(
        {"_id": user_id},
        {"$set": {"history_id": new_history, "last_sync_at": now_utc(), "needs_reconnect": False}},
    )
    return {"status": "ok", "new_messages": len(msgs), "items": len(items), "full_sync": was_full}
