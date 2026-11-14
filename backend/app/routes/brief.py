from fastapi import APIRouter, Depends

from app.db import get_db
from app.models import now_utc
from app.ranking import urgency
from app.security import current_user
from app.store import open_items
from llm.brief import cache_key, make_brief

router = APIRouter()


@router.get("/brief")
async def get_brief(user: dict = Depends(current_user)):
    now = now_utc()
    items = await open_items(user["_id"])
    for item in items:
        item.urgency_score = urgency(item, now)
    items = sorted((i for i in items if i.urgency_score > 0.25), key=lambda i: i.urgency_score, reverse=True)

    key = cache_key(items, now)
    db = get_db()
    cached = await db.briefs.find_one({"_id": user["_id"]})
    if cached and cached.get("key") == key:
        return cached["brief"]

    brief, how = await make_brief(items, now)
    payload = {**brief.model_dump(), "generated_by": how, "generated_at": now.isoformat()}
    await db.briefs.update_one({"_id": user["_id"]}, {"$set": {"key": key, "brief": payload}}, upsert=True)
    return payload
