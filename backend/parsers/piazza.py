"""Piazza notification emails, e.g. "STAT 315 on Piazza" / "[Instr Note] Quiz 5 reminder".

Clear deadlines ("due Friday, Nov 20") are handled here. Posts that mention a date in a
less obvious way ("Quiz 5 postponed to next week") return None so the LLM reads them.
"""

import re

from app.models import EmailMsg, Item
from parsers.common import date_near, find_course, find_datetimes, make_item

NAME = "piazza"


def matches(msg: EmailMsg) -> bool:
    return msg.from_domain.endswith("piazza.com")


def _course(msg: EmailMsg) -> str | None:
    for text in (msg.from_name, msg.subject):
        m = re.search(r"(?:for\s+)?(.+?)\s+on Piazza", text, re.I)
        if m:
            name = re.sub(r"^.*digest for\s+", "", m.group(1), flags=re.I)
            return find_course(name) or name.strip()
    return find_course(msg.subject, msg.body)


def parse(msg: EmailMsg) -> list[Item] | None:
    course = _course(msg)
    if re.search(r"daily digest", msg.subject, re.I):
        return [make_item(msg, "course_info", f"Piazza digest: {course or 'your class'}", course=course, confidence=0.9)]

    title = re.sub(r"^\s*\[(instr note|instr answer|note|question|poll)\]\s*", "", msg.subject, flags=re.I).strip()
    is_instructor = bool(re.search(r"\[instr", msg.subject, re.I))
    text = f"{msg.subject}\n{msg.body}"

    hit = date_near(text, msg.date, ("due", "deadline", "closes"))
    if hit and re.search(r"\b(due|deadline|closes)\b", hit[1], re.I):
        when, evidence = hit
        return [make_item(msg, "deadline", title, course=course, due_at=when, action_required=True,
                          evidence=evidence, confidence=0.85 if is_instructor else 0.7)]
    if find_datetimes(text, msg.date):
        return None  # has a date but not a clear deadline: let the LLM decide
    return [make_item(msg, "course_info", title, course=course, confidence=0.8)]
