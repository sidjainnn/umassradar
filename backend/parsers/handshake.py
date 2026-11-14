"""Handshake (joinhandshake.com): job recommendations, application updates, events."""

import re

from app.models import EmailMsg, Item
from parsers.common import date_near, first_datetime, make_item, sentence_with

NAME = "handshake"


def matches(msg: EmailMsg) -> bool:
    return msg.from_domain.endswith("joinhandshake.com")


def parse(msg: EmailMsg) -> list[Item]:
    subject, body = msg.subject, msg.body
    low = subject.lower()

    m = re.search(r"(?:your )?application (?:to|for) (.+?) (?:was|has been) (\w+)", subject, re.I)
    if m:
        return [make_item(msg, "status_update", f"Application {m.group(2).lower()}: {m.group(1)}",
                          evidence=sentence_with(body, "application") or subject)]
    if re.search(r"\b(you applied|application submitted|thanks for applying)\b", low):
        role = re.sub(r"^.*?(?:applied (?:to|for)|applying (?:to|for))\s*", "", subject, flags=re.I)
        return [make_item(msg, "status_update", f"Applied: {role}", evidence=sentence_with(body, "appl") or subject)]

    if re.search(r"\b(event|info session|career fair|workshop|rsvp)\b", low):
        when = first_datetime(body, msg.date)
        location = None
        loc = re.search(r"(?:location|where):\s*(.+)", body, re.I)
        if loc:
            location = loc.group(1).strip()[:120]
        return [make_item(msg, "event", subject, starts_at=when, location=location,
                          evidence=sentence_with(body, "event", "session", "fair", "join") or subject)]

    hit = date_near(body, msg.date, ("apply by", "deadline", "applications close", "due"))
    title = re.sub(r"^(new job:|recommended:)\s*", "", subject, flags=re.I)
    return [
        make_item(
            msg,
            "opportunity",
            title,
            due_at=hit[0] if hit else None,
            action_required=bool(hit),
            evidence=hit[1] if hit else (sentence_with(body, "hiring", "role", "position", "intern") or subject),
            confidence=0.85,
        )
    ]
