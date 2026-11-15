"""Jobs ranked for one student: filtered by what they asked for, sorted by how well each fits them."""

import math
import re
from datetime import datetime

from app.interests import terms_from
from app.models import Item
from app.modes import JOB_WORDS, classify

TYPE_RULES = [
    ("work_study", re.compile(r"work[- ]study", re.I)),
    ("internship", re.compile(r"\bintern(ship)?s?\b", re.I)),
    ("co_op", re.compile(r"\bco-?op\b", re.I)),
    ("research", re.compile(r"\b(research|lab assistant|REU|undergraduate research)\b", re.I)),
    ("full_time", re.compile(r"\b(full[- ]time|new grad|entry[- ]level)\b", re.I)),
    ("part_time", re.compile(r"\bpart[- ]time\b", re.I)),
]
ON_CAMPUS = re.compile(r"(umass\.edu|residential life|res ?life|dining|recwell|campus recreation|library|"
                       r"\bRA\b|peer mentor|student employment|on[- ]campus|ta position|tutor)", re.I)
REMOTE = re.compile(r"\bremote\b", re.I)


def text_of(i: Item) -> str:
    return f"{i.title} {i.sender} {i.sender_email} {i.location or ''} {i.evidence}"


def job_types(i: Item) -> set[str]:
    t = text_of(i)
    types = {name for name, rx in TYPE_RULES if rx.search(t)}
    if ON_CAMPUS.search(t):
        types.add("on_campus")
    return types


def place_of(i: Item) -> str | None:
    t = text_of(i)
    if REMOTE.search(t):
        return "remote"
    if ON_CAMPUS.search(t):
        return "on_campus"
    return None


def is_job(i: Item) -> bool:
    return i.category == "opportunity" or (classify(i) == "work" and bool(JOB_WORDS.search(i.title)))


def blocked(i: Item, prefs: dict) -> str | None:
    """Why the student asked not to see this job, or None."""
    t = text_of(i).lower()
    for phrase in prefs.get("avoid", []):
        if phrase and phrase.lower() in t:
            return f"you asked not to see “{phrase}”"
    wanted = set(prefs.get("job_types", []))
    types = job_types(i)
    if wanted and types and not (wanted & types) and not ({"part_time", "on_campus"} & wanted and "on_campus" in types):
        return "not a kind of job you're looking for"
    places = set(prefs.get("places", []))
    where = place_of(i)
    if places and "anywhere" not in places and where and where not in places and not (where == "on_campus" and "amherst_area" in places):
        return "not somewhere you said you can work"
    return None


def score(i: Item, profile: dict[str, float], prefs: dict, now: datetime,
          applied: set[str] = frozenset(), rejected: set[str] = frozenset()) -> tuple[int, list[str]]:
    """0-100 and the reasons, in plain words."""
    reasons: list[str] = []
    terms = terms_from(text_of(i))
    hits = sorted(((t, profile[t]) for t in terms if profile.get(t, 0) > 0), key=lambda x: (-x[1], -len(x[0])))
    pos = sum(w for _, w in hits)
    neg = -sum(profile[t] for t in terms if profile.get(t, 0) < 0)
    match = max(0.0, (1 - math.exp(-pos / 4)) - min(0.6, neg / 6))
    if hits:
        shown: list[str] = []
        for t, _ in hits:  # prefer phrases: "data science" rather than "data" and "science"
            if not any(t in s.split() or t == s for s in shown) and not any(t in s for s in shown):
                shown.append(t)
        shown = [t for t in shown if not any(t != o and t in o.split() for o in shown)]
        reasons.append("matches " + ", ".join(f"“{t}”" for t in shown[:2]) + " from your interests")

    when = i.due_at or i.starts_at
    if when:
        days = (when - now).total_seconds() / 86400
        urgency = 0.0 if days < 0 else max(0.0, 1 - days / 21)
        if 0 <= days <= 7:
            reasons.append(f"apply by {when:%b %-d}")
    else:
        urgency = 0.3

    wanted, types = set(prefs.get("job_types", [])), job_types(i)
    if wanted and types & wanted:
        fit = 1.0
        nice = {"on_campus": "on campus", "work_study": "work-study", "co_op": "co-op", "part_time": "part-time",
                "full_time": "full-time"}
        reasons.append(f"{nice.get(sorted(types & wanted)[0], sorted(types & wanted)[0])}, like you asked")
    else:
        fit = 0.5 if not types or not wanted else 0.2
    if prefs.get("work_study") and "work_study" in types:
        fit = 1.0

    got = i.received_at or i.created_at
    newness = max(0.0, 1 - (now - got).total_seconds() / (14 * 86400)) if got else 0.5

    total = 55 * match + 20 * urgency + 15 * fit + 10 * newness
    company = (i.sender or "").lower()
    if any(c and c in company for c in rejected):
        total -= 15
    if any(c and (c in company or c in i.title.lower()) for c in applied):
        total -= 10
        reasons.append("you already applied")
    return max(0, min(100, round(total))), reasons
