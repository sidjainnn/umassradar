"""Events you add yourself (from the Schedule command bar) and the combined week view."""

import uuid
from datetime import date, datetime, time, timedelta
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field, model_validator

from app.calendar_client import busy_intervals, can_make, class_intervals, events_between
from app.courses import shared_office_hours
from app.db import get_db
from app.models import EASTERN, Item, now_utc
from app.routes.brief import schedule_refresh
from app.security import current_user
from app.store import doc_to_item, item_to_doc
from app.week import build_week, week_bounds
from llm.extract import normalize_course
from llm.syllabus import upcoming_slots

router = APIRouter()

MAX_REPEATS = 26


class EventBody(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    starts_at: datetime
    ends_at: datetime | None = None
    location: str | None = Field(None, max_length=200)
    course: str | None = Field(None, max_length=40)
    kind: Literal["appointment", "event"] = "appointment"
    repeat_until: date | None = None

    @model_validator(mode="after")
    def _check(self):
        if self.starts_at.tzinfo is None:
            self.starts_at = self.starts_at.replace(tzinfo=EASTERN)
        if self.ends_at is not None:
            if self.ends_at.tzinfo is None:
                self.ends_at = self.ends_at.replace(tzinfo=EASTERN)
            if self.ends_at <= self.starts_at:
                raise ValueError("The event has to end after it starts.")
        return self


def occurrences(start: datetime, repeat_until: date | None) -> list[datetime]:
    """The start of each weekly occurrence, in Eastern local time (so 3 PM stays 3 PM across DST)."""
    local = start.astimezone(EASTERN)
    out = [local]
    if repeat_until:
        while len(out) < MAX_REPEATS:
            d = out[-1].date() + timedelta(days=7)
            if d > repeat_until:
                break
            out.append(datetime.combine(d, local.timetz().replace(tzinfo=None), tzinfo=EASTERN))
    return out


def make_items(body: EventBody, user_id: str) -> list[Item]:
    length = (body.ends_at - body.starts_at) if body.ends_at else timedelta(hours=1)
    series = uuid.uuid4().hex if body.repeat_until else None
    course = normalize_course(body.course) if body.course else None
    items = []
    for start in occurrences(body.starts_at, body.repeat_until):
        items.append(Item(
            user_id=user_id, category=body.kind, title=body.title.strip(), course=course, starts_at=start,
            ends_at=start + length, location=(body.location or "").strip() or None, source="manual",
            source_ref=f"manual:{series or uuid.uuid4().hex}", sender="You", sender_type="person",
            series_id=series, confidence=1.0,
        ))
    return items


@router.post("/events")
async def create_event(body: EventBody, user: dict = Depends(current_user)):
    items = make_items(body, user["_id"])
    await get_db().items.insert_many([item_to_doc(i) for i in items])
    schedule_refresh(user["_id"])
    return {"ok": True, "count": len(items), "ids": [i.id for i in items]}


class EventPatch(BaseModel):
    title: str | None = Field(None, min_length=1, max_length=200)
    starts_at: datetime | None = None
    ends_at: datetime | None = None
    location: str | None = Field(None, max_length=200)


@router.patch("/events/{item_id}")
async def edit_event(item_id: str, body: EventPatch, user: dict = Depends(current_user)):
    db = get_db()
    doc = await db.items.find_one({"_id": item_id, "user_id": user["_id"], "source": "manual"})
    if not doc:
        raise HTTPException(404, "Only events you added can be edited.")
    changes = {k: v for k, v in body.model_dump(exclude_unset=True).items()}
    for k in ("starts_at", "ends_at"):
        if changes.get(k) and changes[k].tzinfo is None:
            changes[k] = changes[k].replace(tzinfo=EASTERN)
    start = changes.get("starts_at", doc.get("starts_at"))
    stop = changes.get("ends_at", doc.get("ends_at"))
    if start and stop and _aware(stop) <= _aware(start):
        raise HTTPException(400, "The event has to end after it starts.")
    item = doc_to_item({**doc, **changes})
    await db.items.update_one({"_id": item_id}, {"$set": {**changes, "dedupe_key": item.dedupe_key(), "updated_at": now_utc()}})
    schedule_refresh(user["_id"])
    return {"ok": True}


def _aware(dt: datetime) -> datetime:
    return dt if dt.tzinfo else dt.replace(tzinfo=EASTERN)


@router.delete("/events/{item_id}")
async def delete_event(item_id: str, series: bool = False, user: dict = Depends(current_user)):
    db = get_db()
    doc = await db.items.find_one({"_id": item_id, "user_id": user["_id"], "source": "manual"})
    if not doc:
        raise HTTPException(404, "Only events you added can be deleted.")
    if series and doc.get("series_id"):
        r = await db.items.delete_many({"user_id": user["_id"], "source": "manual", "series_id": doc["series_id"]})
    else:
        r = await db.items.delete_one({"_id": item_id})
    schedule_refresh(user["_id"])
    return {"ok": True, "deleted": r.deleted_count}


@router.get("/schedule/week")
async def week(start: date | None = None, user: dict = Depends(current_user)):
    """Everything with a time in the 7 days from `start` (default: this week's Monday)."""
    if start is None:
        today = now_utc().astimezone(EASTERN).date()
        start = today - timedelta(days=today.weekday())
    return await week_data(user, start)


async def week_data(user: dict, start: date) -> dict:
    begin, end = week_bounds(start)
    db = get_db()
    docs = await db.items.find({
        "user_id": user["_id"], "status": "open", "category": {"$in": ["deadline", "appointment", "event"]},
        "$or": [{"due_at": {"$gte": begin, "$lt": end}}, {"starts_at": {"$gte": begin, "$lt": end}}],
    }).to_list(1000)
    items = [doc_to_item(d) for d in docs]

    oh_docs = await db.office_hours.find({"user_id": user["_id"]}, {"_id": 0}).to_list(500)
    oh_docs += await shared_office_hours(user)
    slots = upcoming_slots(oh_docs, now=begin, days=7)
    google = await events_between(user, begin, end)
    if slots:
        busy = (await busy_intervals(user, begin, end) or []) + class_intervals(user.get("schedule"), begin, end)
        known = google is not None or bool(user.get("schedule"))
        for s in slots:
            s["can_make"] = can_make(s["starts_at"], s["ends_at"], busy) if known else None
    return {
        "start": start.isoformat(),
        "calendar_connected": google is not None,
        "entries": build_week(start, user.get("schedule"), items, slots, google),
    }
