"""Student tips for finding buildings and rooms (\"enter from N. Pleasant St, stairs on the left\")."""

import uuid

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app.db import get_db
from app.models import now_utc
from app.rooms import floor_guess, normalize_room
from app.security import current_user

router = APIRouter(prefix="/rooms")

REPORTS_TO_HIDE = 3


def _view(doc: dict, user_id: str) -> dict:
    return {"id": doc["_id"], "building": doc["building"], "room": doc.get("room"), "text": doc["text"],
            "created_at": doc["created_at"], "helpful": len(doc.get("helpful", [])),
            "marked_helpful": user_id in doc.get("helpful", []), "mine": doc["user_id"] == user_id}


@router.get("/{building}")
async def room_info(building: str, room: str = "", user: dict = Depends(current_user)):
    """Floor guess for the room plus tips for the room and the building, most helpful first."""
    code = normalize_room(room) if room else None
    query = {"building": building[:40], "hidden": {"$ne": True}}
    docs = await get_db().room_tips.find(query).to_list(200)
    room_tips = [d for d in docs if code and d.get("room") == code]
    building_tips = [d for d in docs if not d.get("room")]
    order = lambda ds: sorted(ds, key=lambda d: (-len(d.get("helpful", [])), d["created_at"]))  # noqa: E731
    return {
        "guess": floor_guess(code) if code else None,
        "room_tips": [_view(d, user["_id"]) for d in order(room_tips)],
        "building_tips": [_view(d, user["_id"]) for d in order(building_tips)][:12],
        "other_rooms": sorted({d["room"] for d in docs if d.get("room") and d.get("room") != code})[:30],
    }


class TipBody(BaseModel):
    building: str = Field(..., min_length=2, max_length=40)
    room: str | None = Field(None, max_length=12)
    text: str = Field(..., min_length=8, max_length=280)


@router.post("/tips")
async def add_tip(body: TipBody, user: dict = Depends(current_user)):
    if user.get("demo"):
        raise HTTPException(403, "Sign in with your UMass account to add tips.")
    db = get_db()
    if await db.room_tips.count_documents({"user_id": user["_id"], "created_at": {"$gt": now_utc().replace(hour=0, minute=0)}}) >= 20:
        raise HTTPException(429, "That's plenty of tips for today. Thanks!")
    doc = {"_id": uuid.uuid4().hex, "user_id": user["_id"], "building": body.building, "room": normalize_room(body.room) if body.room else None,
           "text": body.text.strip(), "created_at": now_utc(), "helpful": [], "reports": []}
    await db.room_tips.insert_one(doc)
    return _view(doc, user["_id"])


@router.post("/tips/{tip_id}/helpful")
async def helpful(tip_id: str, user: dict = Depends(current_user)):
    db = get_db()
    doc = await db.room_tips.find_one({"_id": tip_id}, {"helpful": 1})
    if not doc:
        raise HTTPException(404, "Tip not found.")
    op = "$pull" if user["_id"] in doc.get("helpful", []) else "$addToSet"
    await db.room_tips.update_one({"_id": tip_id}, {op: {"helpful": user["_id"]}})
    return {"ok": True}


class ReportBody(BaseModel):
    reason: str = Field(..., min_length=3, max_length=200)


@router.post("/tips/{tip_id}/report")
async def report(tip_id: str, body: ReportBody, user: dict = Depends(current_user)):
    db = get_db()
    doc = await db.room_tips.find_one({"_id": tip_id})
    if not doc:
        raise HTTPException(404, "Tip not found.")
    reports = doc.get("reports", [])
    if any(r["by"] == user["_id"] for r in reports):
        return {"ok": True}
    reports.append({"by": user["_id"], "reason": body.reason.strip(), "at": now_utc()})
    await db.room_tips.update_one({"_id": tip_id}, {"$set": {"reports": reports, "hidden": len(reports) >= REPORTS_TO_HIDE}})
    return {"ok": True}


@router.delete("/tips/{tip_id}")
async def delete_tip(tip_id: str, user: dict = Depends(current_user)):
    r = await get_db().room_tips.delete_one({"_id": tip_id, "user_id": user["_id"]})
    if not r.deleted_count:
        raise HTTPException(404, "Tip not found.")
    return {"ok": True}
