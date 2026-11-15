import re

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.courses import latest_term, my_courses, overlaps, plan_sections, summary, upcoming_dates
from app.db import get_db
from app.fivecolleges import fetch_details
from app.security import current_user
from app.store import doc_to_item

router = APIRouter()


@router.get("/courses")
async def search_courses(q: str = "", user: dict = Depends(current_user)):
    mine, plan = await my_courses(user["_id"]), user.get("plan", {})
    if q.strip():
        rx = {"$regex": re.escape(q.strip()), "$options": "i"}
        query: dict = {"$or": [{"_id": rx}, {"search_text": rx}]}
        limit = 60
    else:  # no search: just the student's own courses and plan (the full catalog is thousands of courses)
        query, limit = {"_id": {"$in": sorted(mine | set(plan))}}, 100
    docs = await get_db().courses.find(query).limit(limit).to_list(limit)
    rows = [{**summary(d), "mine": d["_id"] in mine, "planned": d["_id"] in plan} for d in docs]
    # exact code matches first ("cs 220" -> COMPSCI 220), then yours, then alphabetical
    want = re.sub(r"\s+", "", q).upper()
    rows.sort(key=lambda r: (want not in r["code"].replace(" ", ""), not r["mine"], not r["planned"], r["code"]))
    return rows


@router.get("/textbooks")
async def textbooks(user: dict = Depends(current_user)):
    """What each of your courses' syllabi say you need to buy (or don't)."""
    mine = await my_courses(user["_id"])
    docs = await get_db().courses.find({"_id": {"$in": sorted(mine)}}).to_list(100)
    by_code = {d["_id"]: d for d in docs}
    out = []
    for code in sorted(mine):
        d = by_code.get(code, {"_id": code})
        shared = d.get("shared", {})
        out.append({**summary(d), "materials": shared.get("materials", []), "syllabus_term": shared.get("term"),
                    "source_url": shared.get("source_url"), "has_syllabus": bool(shared.get("syllabus_uploads"))})
    return out


@router.get("/courses-count")
async def courses_count(user: dict = Depends(current_user)):
    return {"courses": await get_db().courses.estimated_document_count()}


@router.get("/courses/{code}")
async def course_profile(code: str, term: str | None = None, user: dict = Depends(current_user)):
    course = await get_db().courses.find_one({"_id": code})
    if not course:
        raise HTTPException(404, "No profile for that course yet.")
    terms = course.get("terms", {})
    schedule = user.get("schedule") or {}
    taking_now = any(c["course"] == code for c in schedule.get("classes", []))
    if term not in terms:
        # a course you're taking opens on your schedule's term; anything else on the newest term
        term = schedule.get("term") if taking_now and schedule.get("term") in terms else latest_term(terms)
    info = terms.get(term, {}) if term else {}
    if term and info.get("source") == "fivecolleges" and not info.get("description"):
        try:  # first view of this course: pull its description from the Five College page
            await fetch_details(code, term)
            course = await get_db().courses.find_one({"_id": code})
            info = course["terms"][term]
        except Exception:
            pass
    plan = user.get("plan", {})

    # flag sections that clash with what's already in the student's plan
    others = await plan_sections(plan, term, exclude=code) if term else {}
    current = schedule.get("classes", []) if schedule.get("term") == term else []
    sections = []
    for s in info.get("sections", []):
        clashes = {c for c, secs in others.items() if any(overlaps(s, o) for o in secs)}
        clashes |= {c["course"] for c in current if c["course"] != code and overlaps(s, c)}
        yours = any(c["course"] == code and c["start"] == s.get("start") and set(c["days"]) == set(s.get("days", []))
                    for c in current)
        sections.append({**s, "conflicts_with": sorted(clashes), "chosen": s["class_number"] in plan.get(code, []),
                         "yours": yours})

    shared = course.get("shared", {})
    items = await get_db().items.find({"user_id": user["_id"], "course": code, "status": "open"}).to_list(50)
    from app.where import class_location
    your_where = [{"component": c.get("component"), "days": c.get("days", []), "start": c["start"], "end": c["end"],
                   **class_location(c.get("location"))} for c in schedule.get("classes", []) if c["course"] == code]
    return {
        **summary(course),
        "term": term,
        "terms": sorted(terms),
        "description": info.get("description"),
        "prerequisites": info.get("prerequisites"),
        "catalog_url": info.get("catalog_url") or info.get("detail_url"),
        "sections": sections,
        "your_section_where": your_where,
        "shared": {
            "syllabus_uploads": shared.get("syllabus_uploads", 0),
            "office_hours": shared.get("office_hours", []),
            "dates": upcoming_dates(shared.get("dates", [])),
            "grading": shared.get("grading"),
            "late_policy": shared.get("late_policy"),
            "materials": shared.get("materials", []),
            "updated_at": shared.get("updated_at"),
            "term": shared.get("term"),
            "source_url": shared.get("source_url"),
            "source": shared.get("source"),
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
