import re
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.db import get_db
from app.models import now_utc
from app.security import current_user
from app.store import doc_to_item

router = APIRouter()


@router.get("/items")
async def list_items(
    status: Literal["open", "done", "dismissed", "all"] = "open",
    q: str = "",
    category: str = "",
    course: str = "",
    source: str = "",
    user: dict = Depends(current_user),
):
    query: dict = {"user_id": user["_id"]}
    if status != "all":
        query["status"] = status
    if category:
        query["category"] = {"$in": category.split(",")}
    if course:
        query["course"] = course
    if source:
        query["source"] = source
    if q:
        rx = {"$regex": re.escape(q), "$options": "i"}
        query["$or"] = [{"title": rx}, {"course": rx}, {"evidence": rx}, {"sender": rx}, {"location": rx}]
    docs = await get_db().items.find(query).sort("urgency_score", -1).to_list(1000)
    return [doc_to_item(d).model_dump(mode="json") for d in docs]


class StatusUpdate(BaseModel):
    status: Literal["open", "done", "dismissed"]


@router.patch("/items/{item_id}")
async def update_item(item_id: str, body: StatusUpdate, user: dict = Depends(current_user)):
    result = await get_db().items.update_one(
        {"_id": item_id, "user_id": user["_id"]}, {"$set": {"status": body.status, "updated_at": now_utc()}}
    )
    if not result.matched_count:
        raise HTTPException(404, "item not found")
    return {"ok": True}
