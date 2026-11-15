"""Onboarding questions, the student's job preferences, and the log of what OneMass learned."""

from typing import Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field, field_validator

from app.db import get_db
from app.interests import log_event, rebuild_profile
from app.models import now_utc
from app.security import current_user

router = APIRouter(prefix="/preferences")

JobType = Literal["on_campus", "work_study", "internship", "co_op", "research", "part_time", "full_time"]
Place = Literal["on_campus", "amherst_area", "remote", "anywhere"]

QUESTIONS = [
    {"id": "interests", "type": "tags", "label": "What kinds of work interest you?",
     "hint": "Roles, fields or industries, e.g. data science, UX design, finance, lab research",
     "suggestions": ["Software engineering", "Data science", "Machine learning", "UX design", "Product management",
                     "Finance", "Consulting", "Marketing", "Lab research", "Teaching and tutoring", "Healthcare",
                     "Sustainability", "Dining and hospitality", "Recreation and fitness"], "max": 20},
    {"id": "job_types", "type": "multi", "label": "What are you looking for?",
     "options": [{"value": "on_campus", "label": "On-campus job"}, {"value": "work_study", "label": "Work-study"},
                 {"value": "internship", "label": "Internship"}, {"value": "co_op", "label": "Co-op"},
                 {"value": "research", "label": "Research position"}, {"value": "part_time", "label": "Part-time off campus"},
                 {"value": "full_time", "label": "Full-time after graduation"}]},
    {"id": "hours_per_week", "type": "number", "label": "How many hours a week can you work during the semester?", "min": 0, "max": 40},
    {"id": "min_pay", "type": "number", "label": "Lowest hourly pay you'd take (optional)", "min": 0, "max": 200, "unit": "$/hour"},
    {"id": "places", "type": "multi", "label": "Where can you work?",
     "options": [{"value": "on_campus", "label": "On campus"}, {"value": "amherst_area", "label": "Amherst area"},
                 {"value": "remote", "label": "Remote"}, {"value": "anywhere", "label": "Anywhere (I can relocate)"}]},
    {"id": "work_study", "type": "boolean", "label": "Do you have a Federal Work-Study award?"},
    {"id": "grad_term", "type": "text", "label": "When do you graduate?", "hint": "e.g. Spring 2028"},
    {"id": "skills", "type": "tags", "label": "Skills you'd like to use", "hint": "e.g. Python, Excel, customer service", "max": 20},
    {"id": "avoid", "type": "tags", "label": "Anything you don't want to see?", "hint": "e.g. sales, night shifts", "max": 20},
    {"id": "learn_from_email", "type": "boolean", "default": True,
     "label": "Learn from my email",
     "hint": "Applications, interviews and offers in your inbox fine-tune your matches. Only the company, role and stage are kept."},
]


def _clean_tags(v: list[str]) -> list[str]:
    out = []
    for t in v:
        t = " ".join(str(t).split())[:60]
        if t and t.lower() not in {x.lower() for x in out}:
            out.append(t)
    return out[:20]


class Prefs(BaseModel):
    interests: list[str] = []
    job_types: list[JobType] = []
    hours_per_week: int | None = Field(None, ge=0, le=40)
    min_pay: float | None = Field(None, ge=0, le=200)
    places: list[Place] = []
    work_study: bool | None = None
    grad_term: str | None = Field(None, max_length=20)
    skills: list[str] = []
    avoid: list[str] = []
    learn_from_email: bool = True

    _tags = field_validator("interests", "skills", "avoid")(classmethod(lambda cls, v: _clean_tags(v)))


@router.get("/questions")
async def questions():
    return QUESTIONS


@router.get("")
async def get_prefs(user: dict = Depends(current_user)):
    profile = user.get("interest_profile", {})
    return {
        "prefs": user.get("prefs") or Prefs().model_dump(),
        "onboarded_at": user.get("onboarded_at"),
        "needs_onboarding": not user.get("onboarded_at"),
        "top_interests": [t for t, s in profile.items() if s > 0][:15],
    }


@router.put("")
async def put_prefs(body: Prefs, user: dict = Depends(current_user)):
    db = get_db()
    prefs = body.model_dump()
    first = not user.get("onboarded_at")
    update = {"prefs": prefs}
    if first:
        update["onboarded_at"] = now_utc()
    await db.users.update_one({"_id": user["_id"]}, {"$set": update})
    await log_event(user["_id"], "onboarding", title="Answered the onboarding questions" if first else "Updated preferences",
                    source="you", terms=[], rebuild=False)
    profile = await rebuild_profile(user["_id"])
    return {"prefs": prefs, "top_interests": [t for t, s in profile.items() if s > 0][:15]}


LABEL = {"onboarding": "Preferences", "applied": "Applied", "interview": "Interview", "offer": "Offer",
         "rejected": "Not selected", "saved": "Saved", "hidden": "Hid", "opened": "Opened",
         "not_interested": "Not interested"}


@router.get("/log")
async def get_log(user: dict = Depends(current_user)):
    """Everything OneMass has learned about your interests, newest first, and where it came from."""
    docs = await get_db().pref_events.find({"user_id": user["_id"]}).sort("at", -1).to_list(300)
    return [{"id": d["_id"], "kind": d["kind"], "label": LABEL.get(d["kind"], d["kind"]), "title": d.get("title", ""),
             "company": d.get("company"), "source": d.get("source"), "at": d["at"], "terms": d.get("terms", [])[:8]}
            for d in docs]


@router.delete("/log/{event_id}")
async def forget(event_id: str, user: dict = Depends(current_user)):
    r = await get_db().pref_events.delete_one({"_id": event_id, "user_id": user["_id"]})
    if not r.deleted_count:
        raise HTTPException(404, "Not found.")
    await rebuild_profile(user["_id"])
    return {"ok": True}
