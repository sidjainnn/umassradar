from pymongo import UpdateOne

from app.db import get_db
from app.models import Item, now_utc


def item_to_doc(item: Item) -> dict:
    doc = item.model_dump()
    doc["_id"] = doc.pop("id")
    doc["dedupe_key"] = item.dedupe_key()
    return doc


def doc_to_item(doc: dict) -> Item:
    doc = dict(doc)
    doc["id"] = doc.pop("_id")
    doc.pop("dedupe_key", None)
    return Item.model_validate(doc)


async def save_items(user_id: str, items: list[Item]) -> int:
    """Upsert items, keeping the user's status (done/dismissed) on items we've seen before."""
    if not items:
        return 0
    ops = []
    for item in items:
        item.user_id = user_id
        doc = item_to_doc(item)
        status = doc.pop("status")
        _id = doc.pop("_id")
        created = doc.pop("created_at")
        ops.append(
            UpdateOne(
                {"user_id": user_id, "dedupe_key": doc["dedupe_key"]},
                {
                    "$set": {**doc, "updated_at": now_utc()},
                    "$setOnInsert": {"_id": _id, "status": status, "created_at": created},
                },
                upsert=True,
            )
        )
    result = await get_db().items.bulk_write(ops, ordered=False)
    return result.upserted_count + result.modified_count


async def mark_processed(user_id: str, message_ids: list[str]) -> None:
    if not message_ids:
        return
    ops = [
        UpdateOne(
            {"user_id": user_id, "message_id": mid},
            {"$setOnInsert": {"user_id": user_id, "message_id": mid, "processed_at": now_utc()}},
            upsert=True,
        )
        for mid in message_ids
    ]
    await get_db().processed_messages.bulk_write(ops, ordered=False)


async def already_processed(user_id: str, message_ids: list[str]) -> set[str]:
    cursor = get_db().processed_messages.find(
        {"user_id": user_id, "message_id": {"$in": message_ids}}, {"message_id": 1}
    )
    return {d["message_id"] async for d in cursor}


async def delete_user_data(user_id: str) -> None:
    db = get_db()
    for coll in ("items", "processed_messages", "llm_cache", "sessions"):
        await db[coll].delete_many({"user_id": user_id})
    await db.users.delete_one({"_id": user_id})
