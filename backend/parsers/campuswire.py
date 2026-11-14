"""Campuswire: course digests ("Email digest for Programming Methodology") and single posts
("Sean Lin: Homework #8 Released - Due 11/24 @ 11:59 P.M.")."""

import re

from app.models import EmailMsg, Item
from parsers.common import date_near, find_course, find_datetimes, make_item

NAME = "campuswire"


def matches(msg: EmailMsg) -> bool:
    return "campuswire" in msg.from_domain


def _digest(msg: EmailMsg, course_name: str) -> list[Item]:
    course = find_course(msg.subject, msg.body) or course_name
    posts = re.search(r"(\d+)\s+new posts?", msg.body, re.I)
    title = f"{posts.group(1)} new Campuswire posts" if posts else f"Campuswire digest: {course_name}"
    items = [make_item(msg, "course_info", title, course=course, confidence=0.9)]

    # Pinned instructor posts in a digest often carry a due date.
    hit = date_near(msg.body, msg.date, ("due", "deadline"))
    if hit:
        when, evidence = hit
        post_title = re.sub(r"^\[pinned\]\s*", "", evidence, flags=re.I).strip("* ")
        post_title = re.split(r"\s+is due|\s+due\b", post_title, maxsplit=1, flags=re.I)[0][:120]
        items.insert(0, make_item(msg, "deadline", post_title, course=course, due_at=when, action_required=True,
                                  evidence=evidence.strip("* "), confidence=0.7))
    return items


def parse(msg: EmailMsg) -> list[Item] | None:
    digest = re.search(r"digest for (.+)$", msg.subject, re.I)
    if digest:
        return _digest(msg, digest.group(1).strip())

    # single post: "Author: Post title"
    title = re.sub(r"^[^:]{2,40}:\s*", "", msg.subject).strip() or msg.subject
    course = find_course(msg.subject, msg.body)
    text = f"{title}\n{msg.body}"
    hit = date_near(text, msg.date, ("due", "deadline"))
    if hit and re.search(r"\b(due|deadline)\b", hit[1], re.I):
        return [make_item(msg, "deadline", title, course=course, due_at=hit[0], action_required=True,
                          evidence=hit[1].strip("* "), confidence=0.8)]
    if find_datetimes(text, msg.date):
        return None
    return [make_item(msg, "course_info", title, course=course, confidence=0.75)]
