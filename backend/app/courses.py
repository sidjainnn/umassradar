"""Course profiles: catalog facts + facts shared from students' syllabi, curated for the viewer."""

from datetime import datetime

from app.db import get_db
from app.models import EASTERN, Item, now_utc

TERM_ORDER = {"Spring": 0, "Summer": 1, "Fall": 2}


def latest_term(terms: dict) -> str | None:
    def key(label: str):
        season, year = label.split()
        return int(year), TERM_ORDER.get(season, 0)

    return max(terms, key=key) if terms else None


def overlaps(a: dict, b: dict) -> bool:
    """Do two sections meet at the same time on a shared day?"""
    if not (a.get("start") and b.get("start") and a.get("end") and b.get("end")):
        return False
    return bool(set(a["days"]) & set(b["days"])) and a["start"] < b["end"] and b["start"] < a["end"]


def chosen_sections(course: dict, term: str, class_numbers: list[str]) -> list[dict]:
    sections = course.get("terms", {}).get(term, {}).get("sections", [])
    if class_numbers:
        return [s for s in sections if s["class_number"] in class_numbers]
    lectures = [s for s in sections if "LEC" in s["section"]]
    return lectures[:1]  # nothing picked yet: assume the first lecture


async def plan_sections(plan: dict, term: str, exclude: str | None = None) -> dict[str, list[dict]]:
    """{course code: chosen sections} for the user's planned courses in a term."""
    codes = [c for c in plan if c != exclude]
    out = {}
    async for course in get_db().courses.find({"_id": {"$in": codes}}):
        out[course["_id"]] = chosen_sections(course, term, plan.get(course["_id"], []))
    return out


async def my_courses(user_id: str) -> set[str]:
    """Courses the student is taking: their uploaded schedule, plus courses inferred from their own items."""
    codes = await get_db().items.distinct(
        "course", {"user_id": user_id, "source": {"$in": ["gmail", "canvas", "syllabus", "screenshot", "demo"]}}
    )
    user = await get_db().users.find_one({"_id": user_id}, {"schedule.classes.course": 1})
    scheduled = {c["course"] for c in ((user or {}).get("schedule") or {}).get("classes", [])}
    return {c for c in codes if c} | scheduled


def summary(course: dict) -> dict:
    term = latest_term(course.get("terms", {}))
    t = course.get("terms", {}).get(term, {}) if term else {}
    shared = course.get("shared", {})
    return {
        "code": course["_id"],
        "title": t.get("title") or shared.get("title") or course["_id"],
        "term": term,
        "credits": t.get("credits"),
        "instructors": t.get("instructors", []),
        "has_syllabus": bool(shared.get("syllabus_uploads")),
    }


TERM_START = {"Spring": (1, 20), "Summer": (6, 1), "Fall": (9, 2)}


def term_start(term: str | None):
    """Rough first day of a term like "Spring 2026", or None if it can't be read."""
    import re
    from datetime import date

    m = re.search(r"(Spring|Summer|Fall)\s+(20\d\d)", term or "", re.I)
    if not m:
        return None
    month, day = TERM_START[m.group(1).title()]
    return date(int(m.group(2)), month, day)


async def add_syllabus_facts(code: str, office_hours: list[dict], items: list[Item], grading: str | None,
                             late_policy: str | None, term: str | None = None, source_url: str | None = None,
                             from_student: bool = True) -> bool:
    """Share what a syllabus says about a course with everyone. No uploader info, no file.

    An older syllabus never replaces facts from a newer one. Returns True if the profile was updated.
    """
    current = await get_db().courses.find_one({"_id": code}, {"shared.term": 1})
    have, new = term_start(((current or {}).get("shared") or {}).get("term")), term_start(term)
    if have and new and new < have:
        return False
    exams = [
        {"title": i.title, "category": i.category, "when": (i.due_at or i.starts_at), "location": i.location}
        for i in items if i.confidence >= 0.6
    ]
    hours = [{k: oh[k] for k in ("who", "weekday", "start", "end", "location")} for oh in office_hours]
    shared = {"shared.office_hours": hours, "shared.dates": exams, "shared.updated_at": now_utc(),
              "shared.term": term, "shared.source_url": source_url,
              "shared.source": "student" if from_student else "public"}
    if grading:
        shared["shared.grading"] = grading[:300]
    if late_policy:
        shared["shared.late_policy"] = late_policy[:300]
    await get_db().courses.update_one(
        {"_id": code},
        {"$set": shared, "$inc": {"shared.syllabus_uploads": 1}, "$setOnInsert": {"created_at": now_utc()}},
        upsert=True,
    )
    return True


def upcoming_dates(dates: list[dict], now: datetime | None = None) -> list[dict]:
    now = now or now_utc()
    out = []
    for d in dates:
        when = d.get("when")
        if when and when.tzinfo is None:
            when = when.replace(tzinfo=EASTERN)
        if when and when >= now:
            out.append({**d, "when": when})
    return sorted(out, key=lambda d: d["when"])
