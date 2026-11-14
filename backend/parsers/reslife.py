"""UMass Residential Life / Housing emails: RA/PM postings, room selection, inspections."""

import re
from datetime import time

from app.models import EmailMsg, Item
from parsers.common import date_near, find_datetimes, make_item, sentence_around, sentence_with

NAME = "reslife"


def matches(msg: EmailMsg) -> bool:
    text = f"{msg.from_email} {msg.from_name}".lower()
    return msg.from_domain.endswith("umass.edu") and any(
        k in text for k in ("reslife", "residential life", "housing", "living.umass")
    )


def parse(msg: EmailMsg) -> list[Item]:
    subject, body = msg.subject, msg.body
    low = f"{subject} {body}".lower()

    if re.search(r"\b(resident assistant|peer mentor|\bra\b|\bpm\b|student staff)\b.*\b(appl|position|hiring)", low) or \
            re.search(r"\b(appl\w+)\b.*\b(resident assistant|peer mentor|ra/pm)\b", low):
        hit = date_near(body, msg.date, ("due", "deadline", "close", "closes", "by", "submit"))
        return [make_item(msg, "opportunity", subject, due_at=hit[0] if hit else None, action_required=True,
                          evidence=hit[1] if hit else sentence_with(body, "appl"), confidence=0.9)]

    if re.search(r"\b(appointment|selection time|time slot|room selection)\b", low):
        dates = find_datetimes(body, msg.date, default_time=time(9, 0))
        if dates:
            return [make_item(msg, "appointment", subject, starts_at=dates[0][0], action_required=True,
                              evidence=sentence_around(body, dates[0][1]), confidence=0.85)]

    hit = date_near(body, msg.date, ("due", "deadline", "by", "before"))
    if hit and re.search(r"\b(must|required|complete|submit|sign)\b", low):
        return [make_item(msg, "deadline", subject, due_at=hit[0], action_required=True, evidence=hit[1])]

    dates = find_datetimes(body, msg.date, default_time=time(10, 0))
    if dates and re.search(r"\b(inspections?|meetings?|events?|floor|hall)\b", low):
        return [make_item(msg, "event", subject, starts_at=dates[0][0], evidence=sentence_around(body, dates[0][1]),
                          confidence=0.7)]
    return [make_item(msg, "course_info", subject, evidence=sentence_with(body, subject.split()[0]) or subject,
                      confidence=0.6)]
