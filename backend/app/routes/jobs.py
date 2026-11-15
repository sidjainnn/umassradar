"""Jobs for you: filtered by your preferences, ranked by fit, and tuned by what you save or hide."""

from typing import Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app.db import get_db
from app.interests import log_event
from app.jobs import blocked, is_job, job_types, place_of, score
from app.models import now_utc
from app.security import current_user
from app.store import doc_to_item

router = APIRouter(prefix="/jobs")


@router.get("")
async def jobs(sort: Literal["match", "deadline"] = "match", include_hidden: bool = False, user: dict = Depends(current_user)):
    return await ranked_jobs(user, sort, include_hidden)


async def ranked_jobs(user: dict, sort: str = "match", include_hidden: bool = False) -> dict:
    db, now = get_db(), now_utc()
    prefs = user.get("prefs") or {}
    profile = user.get("interest_profile") or {}
    docs = await db.items.find({"user_id": user["_id"], "status": "open", "category": {"$ne": "noise"}}).to_list(2000)
    events = await db.pref_events.find({"user_id": user["_id"], "item_id": {"$ne": None}}, {"item_id": 1, "kind": 1}).to_list(2000)
    hidden = {e["item_id"] for e in events if e["kind"] in ("hidden", "not_interested")}
    saved = {e["item_id"] for e in events if e["kind"] == "saved"}
    apps = await db.applications.find({"user_id": user["_id"]}, {"company_norm": 1, "stage": 1}).to_list(500)
    applied = {a["company_norm"] for a in apps if a["stage"] != "rejected"}
    rejected = {a["company_norm"] for a in apps if a["stage"] == "rejected"}

    out, filtered_out, hidden_n = [], [], 0
    for item in (doc_to_item(d) for d in docs):
        if not is_job(item):
            continue
        if item.id in hidden and not include_hidden:
            hidden_n += 1
            continue
        why_not = blocked(item, prefs)
        if why_not:
            filtered_out.append({"id": item.id, "title": item.title, "reason": why_not})
            continue
        s, reasons = score(item, profile, prefs, now, applied, rejected)
        out.append({**item.model_dump(mode="json"), "match": s, "reasons": reasons, "types": sorted(job_types(item)),
                    "place": place_of(item), "saved": item.id in saved, "hidden": item.id in hidden})
    if sort == "deadline":
        out.sort(key=lambda j: (j["due_at"] is None, j["due_at"] or "", -j["match"]))
    else:
        out.sort(key=lambda j: (-j["saved"], -j["match"]))
    return {"jobs": out, "filtered_out": filtered_out, "hidden": hidden_n,
            "personalized": bool(profile), "needs_onboarding": not user.get("onboarded_at")}


class Feedback(BaseModel):
    action: Literal["saved", "hidden", "opened", "applied", "not_interested", "unsave", "unhide"]
    reason: str | None = Field(None, max_length=200)


@router.post("/{item_id}/feedback")
async def feedback(item_id: str, body: Feedback, user: dict = Depends(current_user)):
    db = get_db()
    doc = await db.items.find_one({"_id": item_id, "user_id": user["_id"]})
    if not doc:
        raise HTTPException(404, "Job not found.")
    item = doc_to_item(doc)
    if body.action in ("unsave", "unhide"):
        kinds = ["saved"] if body.action == "unsave" else ["hidden", "not_interested"]
        await db.pref_events.delete_many({"user_id": user["_id"], "item_id": item_id, "kind": {"$in": kinds}})
        from app.interests import rebuild_profile
        await rebuild_profile(user["_id"])
        return {"ok": True}
    title = item.title + (f" ({body.reason})" if body.reason else "")
    await log_event(user["_id"], body.action, title=title, company=item.sender or None, item_id=item_id, source="you")
    if body.action == "applied":
        from app.applications import AppSignal, record
        await record(user["_id"], AppSignal(company=item.sender or "Unknown", role=item.title[:80], stage="applied",
                                            at=now_utc(), subject="Marked applied in OneMass"))
    return {"ok": True}
