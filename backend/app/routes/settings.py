from fastapi import APIRouter, Depends, HTTPException
from typing import Literal

from pydantic import BaseModel

from app.db import get_db
from app.ical_import import FeedError, validate_feed_url
from app.security import current_user, encrypt_token
from app.sync import sync_canvas

router = APIRouter()


class CanvasFeed(BaseModel):
    url: str


@router.put("/settings/canvas")
async def set_canvas_feed(body: CanvasFeed, user: dict = Depends(current_user)):
    try:
        url = validate_feed_url(body.url)
    except FeedError as e:
        raise HTTPException(400, str(e))
    # The feed link works without a password, so treat it like a token.
    await get_db().users.update_one({"_id": user["_id"]}, {"$set": {"canvas_feed_enc": encrypt_token(url)}})
    result = await sync_canvas(user["_id"])
    if result["status"] != "ok":
        raise HTTPException(400, result["message"])
    return result


@router.delete("/settings/canvas")
async def remove_canvas_feed(user: dict = Depends(current_user)):
    await get_db().users.update_one({"_id": user["_id"]}, {"$unset": {"canvas_feed_enc": ""}})
    await get_db().items.delete_many({"user_id": user["_id"], "source": "canvas", "status": "open"})
    return {"ok": True}


class Mode(BaseModel):
    mode: Literal["study", "work"]


@router.put("/settings/mode")
async def set_mode(body: Mode, user: dict = Depends(current_user)):
    """Study mode puts classes first; work mode puts jobs, shifts and applications first."""
    await get_db().users.update_one({"_id": user["_id"]}, {"$set": {"mode": body.mode}})
    return {"mode": body.mode}
