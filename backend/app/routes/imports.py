"""Imports that don't come from email: syllabus PDFs and screenshots."""

import hashlib

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile

from app.calendar_client import busy_intervals, can_make
from app.courses import add_syllabus_facts
from app.config import get_settings
from app.db import get_db
from app.pipeline import finalize
from app.security import current_user
from app.store import save_items
from app.calendar_client import class_intervals
from app.models import now_utc
from llm.schedule import schedule_from_ics, schedule_from_image, snap_to_catalog
from llm.screenshot import extract_screenshot, image_type, to_items
from llm.syllabus import SyllabusError, extract_syllabus, pdf_text, to_records, upcoming_slots

router = APIRouter()

MAX_PDF_BYTES = 10 * 1024 * 1024
MAX_IMAGE_BYTES = 5 * 1024 * 1024


async def read_upload(file: UploadFile, max_bytes: int) -> bytes:
    data = await file.read(max_bytes + 1)
    if len(data) > max_bytes:
        raise HTTPException(413, f"File is too large (max {max_bytes // (1024 * 1024)} MB).")
    return data


def require_gemini() -> None:
    if not get_settings().gemini_api_key:
        raise HTTPException(503, "Imports need GEMINI_API_KEY on the server.")


@router.post("/import/syllabus")
async def import_syllabus(file: UploadFile = File(...), expected_course: str | None = None,
                          user: dict = Depends(current_user)):
    require_gemini()
    data = await read_upload(file, MAX_PDF_BYTES)
    if not data.startswith(b"%PDF"):
        raise HTTPException(400, "Upload a PDF syllabus.")
    try:
        text = pdf_text(data)  # the PDF itself is never stored
    except SyllabusError as e:
        raise HTTPException(400, str(e))
    try:
        result = await extract_syllabus(text)
    except Exception:
        raise HTTPException(502, "Couldn't read the syllabus right now. Try again in a minute.")

    course, office_hours, items = to_records(result, text, user["_id"])
    db = get_db()
    await db.office_hours.delete_many({"user_id": user["_id"], "course": course})
    if office_hours:
        await db.office_hours.insert_many(office_hours)
    await save_items(user["_id"], finalize(items, user["_id"]))
    if course and not user.get("demo"):
        # share the course facts (not the file, not who uploaded it) on the course's profile
        await add_syllabus_facts(course, office_hours, items, result.grading, result.late_policy, term=result.term)
    warning = None
    if expected_course and course and course.replace(" ", "") != expected_course.replace(" ", ""):
        warning = f"That syllabus looks like {course}, not {expected_course}. It was added to {course}."
    return {"course": course, "office_hours": len(office_hours), "items": len(items), "term": result.term,
            "warning": warning}


@router.get("/office-hours")
async def office_hours(user: dict = Depends(current_user)):
    """Office-hour sessions in the next 7 days. Each says whether you're free, checked against your class
    schedule (if uploaded) and Google Calendar (if connected)."""
    docs = await get_db().office_hours.find({"user_id": user["_id"]}, {"_id": 0}).to_list(500)
    slots = upcoming_slots(docs)
    if slots:
        start, end = slots[0]["starts_at"], max(s["ends_at"] for s in slots)
        calendar = await busy_intervals(user, start, end)
        classes = class_intervals(user.get("schedule"), start, end)
        known = calendar is not None or bool(user.get("schedule"))
        busy = (calendar or []) + classes
        for slot in slots:
            slot["can_make"] = can_make(slot["starts_at"], slot["ends_at"], busy) if known else None
    return slots


MAX_SCHEDULE_BYTES = 5 * 1024 * 1024


@router.post("/import/schedule")
async def import_schedule(file: UploadFile = File(...), user: dict = Depends(current_user)):
    """Your class schedule from a SPIRE screenshot or SPIRE's calendar export (.ics). The file isn't kept."""
    data = await read_upload(file, MAX_SCHEDULE_BYTES)
    if data.lstrip().startswith(b"BEGIN:VCALENDAR"):
        try:
            term, classes = schedule_from_ics(data)
        except Exception:
            raise HTTPException(400, "That calendar file couldn't be read. Export it again from SPIRE.")
    else:
        mime = image_type(data)
        if not mime:
            raise HTTPException(400, "Upload a screenshot (PNG or JPEG) or SPIRE's calendar export (.ics).")
        require_gemini()
        try:
            term, classes = await schedule_from_image(data, mime)
        except Exception:
            raise HTTPException(502, "Couldn't read the screenshot right now. Try again in a minute.")
        classes = await snap_to_catalog(term, classes)  # exact times and sections from the course catalog
    if not classes:
        raise HTTPException(400, "No classes with meeting times were found. Try a clearer screenshot of the weekly schedule.")
    await get_db().users.update_one(
        {"_id": user["_id"]}, {"$set": {"schedule": {"term": term, "classes": classes, "uploaded_at": now_utc()}}}
    )
    return {"term": term, "classes": len(classes), "courses": sorted({c["course"] for c in classes})}


@router.get("/schedule")
async def get_schedule(user: dict = Depends(current_user)):
    return user.get("schedule")


@router.delete("/schedule")
async def delete_schedule(user: dict = Depends(current_user)):
    await get_db().users.update_one({"_id": user["_id"]}, {"$unset": {"schedule": ""}})
    return {"ok": True}


@router.post("/import/screenshot")
async def import_screenshot(file: UploadFile = File(...), kind: str = "portal", user: dict = Depends(current_user)):
    """A portal screenshot, or (kind=flyer) a club flyer or Instagram post. The image isn't kept."""
    require_gemini()
    data = await read_upload(file, MAX_IMAGE_BYTES)
    mime = image_type(data)
    if not mime:
        raise HTTPException(400, "Upload a PNG, JPEG or WebP screenshot.")
    try:
        result = await extract_screenshot(data, mime, flyer=kind == "flyer")  # the image itself is never stored
    except Exception:
        raise HTTPException(502, "Couldn't read the screenshot right now. Try again in a minute.")
    ref = "screenshot:" + hashlib.sha256(data).hexdigest()[:12]
    items = finalize(to_items(result, user["_id"], ref), user["_id"])
    await save_items(user["_id"], items)
    return {"items": len(items), "titles": [i.title for i in items]}
