import re

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.courses import latest_term, my_courses, overlaps, plan_sections, summary, upcoming_dates
from app.db import get_db
from app.security import current_user
from app.store import doc_to_item

router = APIRouter()


@router.get("/courses")
async def search_courses(q: str = "", user: dict = Depends(current_user)):
    query: dict = {}
    if q.strip():
        rx = {"$regex": re.escape(q.strip()), "$options": "i"}
        query = {"$or": [{"_id": rx}, {"search_text": rx}]}
    docs = await get_db().courses.find(query).to_list(400)
    mine, plan = await my_courses(user["_id"]), user.get("plan", {})
    rows = [{**summary(d), "mine": d["_id"] in mine, "planned": d["_id"] in plan} for d in docs]
    rows.sort(key=lambda r: (not r["mine"], not r["planned"], r["code"]))
    return rows


@router.get("/courses/{code}")
async def course_profile(code: str, term: str | None = None, user: dict = Depends(current_user)):
    course = await get_db().courses.find_one({"_id": code})
    if not course:
        raise HTTPException(404, "No profile for that course yet.")
    terms = course.get("terms", {})
    term = term if term in terms else latest_term(terms)
    info = terms.get(term, {}) if term else {}
    plan = user.get("plan", {})

    # flag sections that clash with what's already in the student's plan
    others = await plan_sections(plan, term, exclude=code) if term else {}
    sections = []
    for s in info.get("sections", []):
        clashes = sorted({c for c, secs in others.items() if any(overlaps(s, o) for o in secs)})
        sections.append({**s, "conflicts_with": clashes, "chosen": s["class_number"] in plan.get(code, [])})

    shared = course.get("shared", {})
    items = await get_db().items.find({"user_id": user["_id"], "course": code, "status": "open"}).to_list(50)
    return {
        **summary(course),
        "term": term,
        "terms": sorted(terms),
        "description": info.get("description"),
        "prerequisites": info.get("prerequisites"),
        "catalog_url": info.get("catalog_url"),
        "sections": sections,
        "shared": {
            "syllabus_uploads": shared.get("syllabus_uploads", 0),
            "office_hours": shared.get("office_hours", []),
            "dates": upcoming_dates(shared.get("dates", [])),
            "grading": shared.get("grading"),
            "late_policy": shared.get("late_policy"),
            "updated_at": shared.get("updated_at"),
        },
        "mine": code in await my_courses(user["_id"]),
        "planned": code in plan,
        "your_items": [doc_to_item(d).model_dump(mode="json") for d in items],
    }


class PlanChoice(BaseModel):
    class_numbers: list[str] = []


@router.put("/plan/{code}")
async def add_to_plan(code: str, body: PlanChoice, user: dict = Depends(current_user)):
    if not await get_db().courses.find_one({"_id": code}, {"_id": 1}):
        raise HTTPException(404, "Unknown course.")
    await get_db().users.update_one({"_id": user["_id"]}, {"$set": {f"plan.{code}": body.class_numbers[:10]}})
    return {"ok": True}


@router.delete("/plan/{code}")
async def remove_from_plan(code: str, user: dict = Depends(current_user)):
    await get_db().users.update_one({"_id": user["_id"]}, {"$unset": {f"plan.{code}": ""}})
    return {"ok": True}
