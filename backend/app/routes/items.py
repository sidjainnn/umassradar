import re
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.db import get_db
from app.models import now_utc
from app.modes import classify, in_mode
from app.ranking import urgency
from app.security import current_user
from app.routes.brief import schedule_refresh
from app.store import doc_to_item

router = APIRouter()


@router.get("/items")
async def list_items(
    status: Literal["open", "done", "dismissed", "all"] = "open",
    q: str = "",
    category: str = "",
    course: str = "",
    source: str = "",
    mode: Literal["study", "work", ""] = "",
    user: dict = Depends(current_user),
):
    query: dict = {"user_id": user["_id"]}
    if status != "all":
        query["status"] = status
    if category:
        query["category"] = {"$in": category.split(",")}
    else:
        query["category"] = {"$ne": "noise"}
    if course:
        query["course"] = course
    if source:
        query["source"] = source
    if q:
        rx = {"$regex": re.escape(q), "$options": "i"}
        query["$or"] = [{"title": rx}, {"course": rx}, {"evidence": rx}, {"sender": rx}, {"location": rx}]
    docs = await get_db().items.find(query).to_list(2000)
    items = [i for i in (doc_to_item(d) for d in docs) if in_mode(i, mode)]
    now = now_utc()
    for item in items:  # urgency depends on the current time, so compute it on read
        item.urgency_score = urgency(item, now)
    items.sort(key=lambda i: i.urgency_score, reverse=True)
    return [{**i.model_dump(mode="json"), "mode": classify(i)} for i in items]


@router.get("/items/counts")
async def item_counts(user: dict = Depends(current_user)):
    pipeline = [
        {"$match": {"user_id": user["_id"], "status": "open"}},
        {"$group": {"_id": "$category", "n": {"$sum": 1}}},
    ]
    return {d["_id"]: d["n"] async for d in get_db().items.aggregate(pipeline)}


class StatusUpdate(BaseModel):
    status: Literal["open", "done", "dismissed"]


@router.patch("/items/{item_id}")
async def update_item(item_id: str, body: StatusUpdate, user: dict = Depends(current_user)):
    result = await get_db().items.update_one(
        {"_id": item_id, "user_id": user["_id"]}, {"$set": {"status": body.status, "updated_at": now_utc(), "done_at": now_utc() if body.status == "done" else None}}
    )
    if not result.matched_count:
        raise HTTPException(404, "item not found")
    schedule_refresh(user["_id"])  # the brief shouldn't mention things you just finished
    return {"ok": True}
