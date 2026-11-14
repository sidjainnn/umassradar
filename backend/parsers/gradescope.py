"""Gradescope: new assignments, submission receipts, graded work."""

import re

from app.models import EmailMsg, Item
from parsers.common import date_near, find_course, first_line, make_item, sentence_with

NAME = "gradescope"


def matches(msg: EmailMsg) -> bool:
    return msg.from_domain.endswith("gradescope.com")


def _assignment(subject: str) -> str:
    for pattern in (
        r"submission (?:to|for) (.+?) (?:has been|was) ",
        r"submitted (?:to|for) (.+)$",
        r"(?:grades? (?:released|published) for|graded:?)\s+(.+)$",
        r"new assignment:?\s+(.+?)(?:\s+in\s+|$)",
        r"^(.+?) (?:has been graded|is now available|is due)",
    ):
        m = re.search(pattern, subject, re.I)
        if m:
            return m.group(1).strip(" .\"'")
    return subject


def parse(msg: EmailMsg) -> list[Item]:
    # Real subjects look like "[COMPSCI 220 on Gradescope] Successfully submitted to Homework 7b"
    prefix = re.match(r"\s*\[(.+?)\s+on Gradescope\]\s*", msg.subject, re.I)
    subject_text = msg.subject[prefix.end():] if prefix else msg.subject
    course = find_course(prefix.group(1) if prefix else "", subject_text, msg.body)
    name = _assignment(subject_text)
    subject = subject_text.lower()

    if "submitted" in subject or ("submission" in subject and ("received" in subject or "successfully" in msg.body.lower())):
        return [make_item(msg, "status_update", f"Submitted {name}", course=course,
                          evidence=sentence_with(msg.body, "submitted", "received") or msg.subject)]
    if re.search(r"\b(grades?|graded)\b", subject):
        return [make_item(msg, "status_update", f"{name} graded", course=course,
                          evidence=sentence_with(msg.body, "grade") or msg.subject)]

    hit = date_near(msg.body, msg.date, ("due", "deadline", "late due"))
    if hit:
        when, evidence = hit
        return [make_item(msg, "deadline", name, course=course, due_at=when, action_required=True, evidence=evidence)]
    return [make_item(msg, "course_info", name, course=course, evidence=first_line(msg.body) or msg.subject, confidence=0.7)]
