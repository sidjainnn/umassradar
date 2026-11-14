"""Urgency score: how much an item deserves attention right now."""

from datetime import datetime

from app.models import Item, now_utc

CATEGORY_WEIGHT = {
    "deadline": 1.0,
    "appointment": 0.95,
    "reply_owed": 0.9,
    "opportunity": 0.7,
    "event": 0.6,
    "status_update": 0.4,
    "course_info": 0.3,
    "noise": 0.0,
}


def time_factor(item: Item, now: datetime) -> float:
    when = item.when
    if when is None:
        # undated: replies owed get more urgent the longer they sit
        if item.category == "reply_owed" and item.received_at:
            days = (now - item.received_at).total_seconds() / 86400
            return min(1.0, 0.5 + days * 0.1)
        return 0.3
    hours = (when - now).total_seconds() / 3600
    if hours < -24:
        return 0.05  # well in the past
    if hours <= 0:
        return 1.0 if item.category in ("deadline", "appointment", "event") else 0.5
    return 1.0 / (1.0 + hours / 24.0)  # 1.0 now, 0.5 in a day, ~0.13 in a week


def sender_bonus(item: Item) -> float:
    if item.sender_type == "person":
        # professors, advisors and other UMass staff outrank random people
        return 0.25 if item.sender_email.endswith("umass.edu") else 0.15
    if item.sender_type == "newsletter":
        return -0.1
    return 0.0


def urgency(item: Item, now: datetime | None = None) -> float:
    now = now or now_utc()
    weight = CATEGORY_WEIGHT.get(item.category, 0.3)
    if weight == 0:
        return 0.0
    score = weight * (0.4 + 0.6 * time_factor(item, now))
    if item.action_required:
        score += 0.2
    score += sender_bonus(item)
    score *= 0.6 + 0.4 * item.confidence
    return round(max(score, 0.0), 4)
