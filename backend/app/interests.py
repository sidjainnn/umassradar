"""What a student is interested in, learned from what they told us and what they do.

The profile is a weighted bag of terms ({"data science": 4.2, "kronos": 1.1, ...}). Stated interests
count most and never fade; behaviour (applying, saving, hiding jobs) counts less and fades over ~60 days.
"""

import math
import re
import uuid
from collections import defaultdict
from datetime import datetime

from app.db import get_db
from app.models import now_utc

HALF_LIFE_DAYS = 60
MAX_TERMS = 80

WEIGHTS = {
    "interest": 3.0, "skill": 1.5, "applied": 1.0, "interview": 1.5, "offer": 2.0,
    "saved": 0.8, "opened": 0.3, "hidden": -0.6, "not_interested": -1.0, "rejected": 0.0, "onboarding": 0.0,
}

STOP = set("""a an and are as at be by for from has have in into is it its of on or our the to was we will with you your
this that these those i me my us not no yes job jobs role position positions student students umass amherst
apply application applications applied opportunity opportunities hiring now new team spring summer fall winter
2025 2026 2027 2028 intern interns internship internships program programs part time full""".split())

SYNONYMS = {"ml": "machine learning", "ai": "artificial intelligence", "swe": "software engineering",
            "sde": "software engineering", "ux": "ux design", "ui": "ui design", "ds": "data science",
            "cs": "computer science", "pm": "product management", "qa": "quality assurance"}


def terms_from(text: str) -> list[str]:
    """Lowercase words and two-word phrases that carry meaning, e.g. 'Data Science Intern' -> data, science, data science."""
    words = [SYNONYMS.get(w, w) for w in re.findall(r"[a-z][a-z0-9+#.]*", (text or "").lower())]
    words = [w.strip(".") for w in words if w.strip(".") and w.strip(".") not in STOP and len(w.strip(".")) > 1]
    out = list(words)
    out += [f"{a} {b}" for a, b in zip(words, words[1:]) if " " not in a and " " not in b]
    return list(dict.fromkeys(out))


def decay(at: datetime, now: datetime) -> float:
    days = max(0.0, (now - at).total_seconds() / 86400)
    return math.pow(0.5, days / HALF_LIFE_DAYS)


def build_profile(prefs: dict | None, events: list[dict], now: datetime | None = None) -> dict[str, float]:
    now = now or now_utc()
    scores: dict[str, float] = defaultdict(float)
    prefs = prefs or {}
    for phrase in prefs.get("interests", []):
        for t in terms_from(phrase):
            scores[t] += WEIGHTS["interest"]
    for phrase in prefs.get("skills", []):
        for t in terms_from(phrase):
            scores[t] += WEIGHTS["skill"]
    for phrase in prefs.get("avoid", []):
        for t in terms_from(phrase):
            scores[t] -= WEIGHTS["interest"]
    for e in events:
        w = WEIGHTS.get(e["kind"], 0.0)
        if not w:
            continue
        at = e["at"] if e["at"].tzinfo else e["at"].replace(tzinfo=now.tzinfo)
        for t in e.get("terms", []):
            scores[t] += w * decay(at, now)
    top = sorted(((t, round(s, 3)) for t, s in scores.items() if abs(s) >= 0.05), key=lambda x: -abs(x[1]))
    return dict(top[:MAX_TERMS])


async def log_event(user_id: str, kind: str, *, title: str = "", company: str | None = None, source: str = "app",
                    item_id: str | None = None, terms: list[str] | None = None, rebuild: bool = True) -> dict:
    """Record something the student did or told us, then refresh their profile."""
    doc = {
        "_id": uuid.uuid4().hex, "user_id": user_id, "kind": kind, "title": title[:200], "company": company,
        "source": source, "item_id": item_id, "at": now_utc(),
        "terms": terms if terms is not None else terms_from(f"{title} {company or ''}")[:20],
    }
    await get_db().pref_events.insert_one(doc)
    if rebuild:
        await rebuild_profile(user_id)
    return doc


async def rebuild_profile(user_id: str) -> dict[str, float]:
    db = get_db()
    user = await db.users.find_one({"_id": user_id}, {"prefs": 1})
    events = await db.pref_events.find({"user_id": user_id}).to_list(2000)
    profile = build_profile((user or {}).get("prefs"), events)
    await db.users.update_one({"_id": user_id}, {"$set": {"interest_profile": profile, "profile_updated_at": now_utc()}})
    return profile
