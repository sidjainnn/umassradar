"""Campuswire digests, e.g. "Email digest for Programming Methodology"."""

import re

from app.models import EmailMsg, Item
from parsers.common import date_near, find_course, make_item

NAME = "campuswire"


def matches(msg: EmailMsg) -> bool:
    return "campuswire" in msg.from_domain


def parse(msg: EmailMsg) -> list[Item]:
    m = re.search(r"digest for (.+)$", msg.subject, re.I)
    course = find_course(msg.subject, msg.body) or (m.group(1).strip() if m else None)
    items = []

    # Instructor announcements inside a digest often carry a due date.
    hit = date_near(msg.body, msg.date, ("due", "deadline", "exam", "quiz", "midterm"))
    if hit:
        when, evidence = hit
        items.append(
            make_item(msg, "deadline", evidence[:120], course=course, due_at=when, action_required=True,
                      evidence=evidence, confidence=0.6)
        )

    posts = re.search(r"(\d+)\s+new posts?", msg.body, re.I)
    title = f"{posts.group(1)} new Campuswire posts" if posts else (f"Campuswire digest: {course}" if course else msg.subject)
    items.append(make_item(msg, "course_info", title, course=course, confidence=0.9))
    return items
