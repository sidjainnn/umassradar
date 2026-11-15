"""The to-do list for the current mode, plus the agent's suggested next steps."""

from datetime import datetime, timedelta
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.agent import suggestions
from app.courses import my_courses
from app.db import get_db
from app.interests import log_event
from app.models import EASTERN, now_utc
from app.modes import classify, in_mode
from app.progress import countdowns
from app.ranking import urgency
from app.routes.events import EventBody, make_items, week_data
from app.routes.jobs import ranked_jobs
from app.security import current_user
from app.store import doc_to_item, item_to_doc

router = APIRouter(prefix="/todo")

ACTIONABLE = {"deadline", "appointment", "reply_owed", "event", "opportunity"}


async def _context(user: dict, mode: str):
    db, now = get_db(), now_utc()
    items = [doc_to_item(d) for d in await db.items.find({"user_id": user["_id"], "status": "open",
                                                           "category": {"$ne": "noise"}}).to_list(2000)]
    today = now.astimezone(EASTERN).date()
    monday = today - timedelta(days=today.weekday())
    weeks = [await week_data(user, monday), await week_data(user, monday + timedelta(days=7))]
    entries = [e for w in weeks for e in w["entries"]]
    busy = [(datetime.fromisoformat(e["start"]), datetime.fromisoformat(e["end"])) for e in entries
            if e["end"] and not e["all_day"] and e["kind"] not in ("deadline", "office_hours")]
    slots = [{**e, "who": e["title"].replace("Office hours: ", ""), "starts_at": datetime.fromisoformat(e["start"]),
              "ends_at": datetime.fromisoformat(e["end"])} for e in entries if e["kind"] == "office_hours"]
    apps = await db.applications.find({"user_id": user["_id"]}).to_list(500)
    jobs = (await ranked_jobs(user))["jobs"] if mode == "work" else []
    mine = await my_courses(user["_id"])
    course_dates = {c["_id"]: (c.get("shared") or {}).get("dates", [])
                    async for c in db.courses.find({"_id": {"$in": sorted(mine)}}, {"shared.dates": 1})}
    dismissed = {d["sid"] async for d in db.dismissed_suggestions.find({"user_id": user["_id"]}, {"sid": 1})}
    return now, items, apps, jobs, slots, countdowns(items, course_dates, now), busy, dismissed


@router.get("")
async def todo(mode: Literal["study", "work", ""] = "", user: dict = Depends(current_user)):
    mode = mode or user.get("mode", "study")
    now, items, apps, jobs, slots, cds, busy, dismissed = await _context(user, mode)
    tasks = [i for i in items if i.category in ACTIONABLE and in_mode(i, mode)]
    for i in tasks:
        i.urgency_score = urgency(i, now)
    tasks.sort(key=lambda i: -i.urgency_score)
    return {
        "mode": mode,
        "tasks": [{**i.model_dump(mode="json"), "mode": classify(i)} for i in tasks],
        "suggestions": suggestions(mode, items, apps, jobs, slots, cds, busy, dismissed, now),
    }


class Decision(BaseModel):
    decision: Literal["accept", "dismiss"]


@router.post("/suggestions/{sid:path}")
async def decide(sid: str, body: Decision, user: dict = Depends(current_user)):
    db = get_db()
    if body.decision == "dismiss":
        await db.dismissed_suggestions.update_one({"user_id": user["_id"], "sid": sid},
                                                  {"$set": {"at": now_utc()}}, upsert=True)
        if sid.startswith("apply:"):
            await log_event(user["_id"], "not_interested", item_id=sid.split(":", 1)[1], source="you",
                            title="Skipped a suggested job")
        return {"ok": True}
    mode = "work" if sid.split(":")[0] in ("follow_up", "interview_prep", "apply", "housing") else "study"
    found = next((s for s in (await todo(mode, user))["suggestions"] if s["id"] == sid), None)
    if not found:
        raise HTTPException(404, "That suggestion is no longer there.")
    action = found["action"]
    result: dict = {"ok": True, "action": action["type"]}
    if action["type"] == "block_time":
        event = EventBody(title=action["title"], starts_at=datetime.fromisoformat(action["starts_at"]),
                          ends_at=datetime.fromisoformat(action["ends_at"]), course=action.get("course"))
        made = make_items(event, user["_id"])
        await db.items.insert_many([item_to_doc(i) for i in made])
        result["event_ids"] = [i.id for i in made]
    elif action["type"] == "open_job":
        await log_event(user["_id"], "opened", item_id=action["item_id"], source="you", title=found["title"])
    await db.dismissed_suggestions.update_one({"user_id": user["_id"], "sid": sid},
                                              {"$set": {"at": now_utc(), "accepted": True}}, upsert=True)
    return result
