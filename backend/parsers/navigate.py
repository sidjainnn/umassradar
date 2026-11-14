"""EAB Navigate appointment emails (advising, tutoring)."""

import re
from datetime import time

from app.models import EmailMsg, Item
from parsers.common import find_datetimes, make_item, sentence_around, sentence_with

NAME = "navigate"


def matches(msg: EmailMsg) -> bool:
    return msg.from_domain.endswith("eab.com") or "navigate" in msg.from_name.lower()


def parse(msg: EmailMsg) -> list[Item]:
    subject, body = msg.subject, msg.body
    low = f"{subject} {body}".lower()
    with_whom = re.search(r"\bwith ([A-Z][a-z]+(?: [A-Z][a-z'-]+)+)", body)
    loc = re.search(r"(?:location|where):\s*(.+)", body, re.I)
    location = loc.group(1).strip()[:120] if loc else None

    dates = find_datetimes(body, msg.date, default_time=time(9, 0))
    when, evidence = (dates[0][0], sentence_around(body, dates[0][1])) if dates else (None, "")

    who = with_whom.group(1) if with_whom else "advisor"
    if re.search(r"\b(cancel+ed|cancellation)\b", low):
        return [make_item(msg, "status_update", f"Appointment with {who} cancelled", starts_at=when,
                          evidence=sentence_with(body, "cancel") or subject)]
    if re.search(r"\b(appointment|meeting)\b", low):
        return [make_item(msg, "appointment", f"Appointment with {who}", starts_at=when, location=location,
                          evidence=evidence or subject, confidence=0.9 if when else 0.6)]
    return [make_item(msg, "course_info", subject, confidence=0.5)]
