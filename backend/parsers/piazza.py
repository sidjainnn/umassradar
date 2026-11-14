"""Piazza notification emails, e.g. "STAT 315 on Piazza" / "[Instr Note] Quiz 5 reminder"."""

import re

from app.models import EmailMsg, Item
from parsers.common import date_near, find_course, make_item

NAME = "piazza"
DEADLINE_WORDS = ("due", "deadline", "quiz", "exam", "midterm", "final", "homework", "hw", "project", "submit", "closes")


def matches(msg: EmailMsg) -> bool:
    return msg.from_domain.endswith("piazza.com")


def _course(msg: EmailMsg) -> str | None:
    m = re.match(r"(.+?)\s+on Piazza", msg.from_name, re.I)
    if m:
        return find_course(m.group(1)) or m.group(1).strip()
    return find_course(msg.subject, msg.body)


def parse(msg: EmailMsg) -> list[Item]:
    course = _course(msg)
    title = re.sub(r"^\s*\[(instr note|instr answer|note|question|poll)\]\s*", "", msg.subject, flags=re.I).strip()
    is_instructor = bool(re.search(r"\[instr", msg.subject, re.I))

    hit = date_near(msg.body, msg.date, DEADLINE_WORDS)
    if hit:
        when, evidence = hit
        return [
            make_item(
                msg,
                "deadline",
                title,
                course=course,
                due_at=when,
                action_required=True,
                evidence=evidence,
                confidence=0.85 if is_instructor else 0.7,
            )
        ]
    return [make_item(msg, "course_info", title, course=course, confidence=0.8)]
