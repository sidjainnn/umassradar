from datetime import timedelta

from fastapi import APIRouter, Depends

from app.courses import my_courses
from app.db import get_db
from app.models import now_utc
from app.progress import LOOKBACK_WEEKS, progress
from app.security import current_user
from app.store import doc_to_item

router = APIRouter()


@router.get("/progress")
async def get_progress(user: dict = Depends(current_user)):
    now = now_utc()
    db = get_db()
    since = now - timedelta(weeks=LOOKBACK_WEEKS + 1)
    docs = await db.items.find({
        "user_id": user["_id"], "category": {"$in": ["deadline", "event", "appointment"]},
        "$or": [{"due_at": {"$gte": since}}, {"starts_at": {"$gte": now - timedelta(days=1)}}],
    }).to_list(3000)
    items = [doc_to_item(d) for d in docs]
    mine = await my_courses(user["_id"])
    course_dates = {c["_id"]: (c.get("shared") or {}).get("dates", [])
                    async for c in db.courses.find({"_id": {"$in": sorted(mine)}}, {"shared.dates": 1})}
    return progress(items, course_dates, now)
