"""Canvas (instructure.com) notifications.

Subjects look like "Assignment Created - Project 2, COMPSCI 230 SEC 01 Fall 2026",
"Assignment Due Date Changed: Lab 4, ...", "Announcement: Exam room change: ...", "Submission Graded: ...".
"""

import re

from app.models import EmailMsg, Item
from parsers.common import date_near, find_course, first_line, make_item, sentence_with

NAME = "canvas"


def matches(msg: EmailMsg) -> bool:
    return msg.from_domain.endswith("instructure.com")


def _split(subject: str) -> tuple[str, str, str]:
    """(kind, name, course_text) from a Canvas subject."""
    m = re.match(r"\s*([A-Za-z ]+?)\s*[-:]\s*(.+)$", subject)
    if not m:
        return "", subject, ""
    kind, rest = m.group(1).lower(), m.group(2)
    if "," in rest:
        name, course_text = rest.rsplit(",", 1)
        return kind, name.strip(), course_text.strip()
    return kind, rest.strip(), ""


def parse(msg: EmailMsg) -> list[Item] | None:
    if "recent canvas notifications" in msg.subject.lower():
        return None  # a bundle of several notifications: the LLM splits it into items
    kind, name, course_text = _split(msg.subject)
    course = find_course(course_text, msg.subject, msg.body) or (course_text or None)

    if "graded" in kind or "submission" in kind:
        return [make_item(msg, "status_update", f"{name} graded", course=course,
                          evidence=sentence_with(msg.body, "grade", "score") or msg.subject)]

    if "assignment" in kind:
        hit = date_near(msg.body, msg.date, ("due",))
        if hit:
            when, evidence = hit
            title = f"{name} (due date changed)" if "changed" in kind else name
            return [make_item(msg, "deadline", title, course=course, due_at=when, action_required=True,
                              evidence=evidence, confidence=0.95)]

    if "announcement" in kind:
        hit = date_near(msg.body, msg.date, ("exam", "midterm", "quiz", "due", "deadline"))
        if hit:
            when, evidence = hit
            category = "deadline" if re.search(r"\b(due|deadline|submit)\b", evidence, re.I) else "event"
            field = "due_at" if category == "deadline" else "starts_at"
            return [make_item(msg, category, name, course=course, action_required=category == "deadline",
                              evidence=evidence, confidence=0.75, **{field: when})]
        return [make_item(msg, "course_info", name, course=course, evidence=first_line(msg.body) or msg.subject)]

    return [make_item(msg, "course_info", name, course=course, confidence=0.6)]
