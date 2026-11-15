"""One week of everything with a time: classes, your events, deadlines, office hours, club events and
Google Calendar events, as a single list the Schedule page draws."""

from datetime import date, datetime, time, timedelta

from app.models import EASTERN, Item
from app.modes import classify

COMPONENT_NAMES = {"LEC": "Lecture", "DIS": "Discussion", "LAB": "Lab", "SEM": "Seminar"}


def week_bounds(start: date) -> tuple[datetime, datetime]:
    begin = datetime.combine(start, time(0), tzinfo=EASTERN)
    return begin, datetime.combine(start + timedelta(days=7), time(0), tzinfo=EASTERN)


def _iso(dt: datetime | None) -> str | None:
    return dt.astimezone(EASTERN).isoformat() if dt else None


def class_entries(schedule: dict | None, start: date) -> list[dict]:
    out = []
    for offset in range(7):
        day = start + timedelta(days=offset)
        for c in (schedule or {}).get("classes", []):
            if day.weekday() not in c.get("days", []):
                continue
            h1, m1 = map(int, c["start"].split(":"))
            h2, m2 = map(int, c["end"].split(":"))
            comp = c.get("component") or "LEC"
            out.append({
                "kind": "class" if comp == "LEC" else "section",
                "id": f"class:{c['course']}:{comp}:{day.isoformat()}:{c['start']}",
                "title": c["course"], "subtitle": COMPONENT_NAMES.get(comp, comp),
                "start": _iso(datetime.combine(day, time(h1, m1), tzinfo=EASTERN)),
                "end": _iso(datetime.combine(day, time(h2, m2), tzinfo=EASTERN)),
                "all_day": False, "location": c.get("location"), "course": c["course"],
                "href": f"/courses/{c['course']}", "editable": False, "mode": "study",
            })
    return out


def item_entries(items: list[Item], begin: datetime, end: datetime) -> list[dict]:
    out = []
    for i in items:
        when = i.when
        if not when or not (begin <= when < end) or i.category not in ("deadline", "appointment", "event"):
            continue
        if i.category == "deadline":
            kind = "deadline"
        elif i.source == "campus":
            kind = "club"
        else:
            kind = "appointment" if i.category == "appointment" else "event"
        stop = i.ends_at or (None if kind == "deadline" else when + timedelta(hours=1))
        local = when.astimezone(EASTERN)
        at_midnight = local.hour == 0 and local.minute == 0
        # a whole-day event, or a date with no time (stored at midnight): show it in the all-day row, not at 12 AM
        all_day = at_midnight and kind != "deadline" and (not i.ends_at or i.ends_at - when >= timedelta(hours=23))
        out.append({
            "kind": kind, "id": i.id, "title": i.title, "subtitle": i.sender if kind != "deadline" else "Due",
            "start": _iso(when), "end": _iso(stop), "all_day": all_day, "location": i.location, "course": i.course,
            "href": i.url, "editable": i.source == "manual", "series_id": i.series_id, "evidence": i.evidence,
            "mode": classify(i),
        })
    return out


def office_entries(slots: list[dict]) -> list[dict]:
    return [{
        "kind": "office_hours", "id": f"oh:{s['who']}:{s['starts_at'].isoformat()}",
        "title": f"Office hours: {s['who']}", "subtitle": s.get("course"), "start": _iso(s["starts_at"]),
        "end": _iso(s["ends_at"]), "all_day": False, "location": s.get("location"), "course": s.get("course"),
        "href": None, "editable": False, "can_make": s.get("can_make"), "mode": "study",
    } for s in slots]


def google_entries(events: list[dict] | None, taken: list[dict]) -> list[dict]:
    """Google Calendar events, minus ones that are just a copy of a class already on the grid."""
    busy = {(e["start"], e["end"]) for e in taken if e["kind"] in ("class", "section")}
    out = []
    for ev in events or []:
        if (_iso(ev["start"]), _iso(ev["end"])) in busy:
            continue
        out.append({
            "kind": "google", "id": f"g:{ev['id']}", "title": ev["title"], "subtitle": "Google Calendar",
            "start": _iso(ev["start"]), "end": _iso(ev["end"]), "all_day": ev["all_day"],
            "location": ev.get("location"), "course": None, "href": ev.get("url"), "editable": False, "mode": "both",
        })
    return out


import re as _re

_PRIORITY = {"class": 0, "section": 0, "office_hours": 1, "deadline": 1, "appointment": 2, "google": 3, "club": 4, "event": 5}


def _norm_title(t: str) -> str:
    return _re.sub(r"[^a-z0-9]+", " ", (t or "").lower()).strip()


def _same_thing(a: dict, b: dict) -> bool:
    """Two entries that are really one event: same day, starts within an hour, and one title contains the other
    (or they share most of their words). Emails and Google Calendar often describe the same meeting."""
    if a["all_day"] != b["all_day"] or (a["start"] or "")[:10] != (b["start"] or "")[:10]:
        return False
    if a["kind"] == "deadline" or b["kind"] == "deadline":
        return a["kind"] == b["kind"] and _norm_title(a["title"]) == _norm_title(b["title"])
    from datetime import datetime as _dt
    if not a["all_day"] and abs((_dt.fromisoformat(a["start"]) - _dt.fromisoformat(b["start"])).total_seconds()) > 3600:
        return False
    ta, tb = _norm_title(a["title"]), _norm_title(b["title"])
    if not ta or not tb:
        return False
    if ta in tb or tb in ta:
        return True
    close = a["all_day"] or abs((_dt.fromisoformat(a["start"]) - _dt.fromisoformat(b["start"])).total_seconds()) <= 1800
    sa, sb = _norm_title(a.get("subtitle") or ""), _norm_title(b.get("subtitle") or "")
    # the same sender (a person or office) announcing something at the same time is one event
    if close and sa and sa == sb and sa not in ("google calendar", "you"):
        return True
    wa, wb = set(ta.split()) - {"vs", "the", "a", "s", "of"}, set(tb.split()) - {"vs", "the", "a", "s", "of"}
    shared = len(wa & wb)
    return shared >= 2 and shared / max(1, min(len(wa), len(wb))) >= 0.5


def dedupe(entries: list[dict]) -> list[dict]:
    """Keep one entry per real event, preferring classes, then your own items, then Google, then email events."""
    kept: list[dict] = []
    for e in sorted(entries, key=lambda e: (_PRIORITY.get(e["kind"], 9), not e.get("editable"))):
        if any(_same_thing(e, k) for k in kept):
            continue
        kept.append(e)
    return kept


def build_week(start: date, schedule: dict | None, items: list[Item], slots: list[dict],
               google: list[dict] | None) -> list[dict]:
    begin, end = week_bounds(start)
    entries = class_entries(schedule, start) + item_entries(items, begin, end) + office_entries(slots)
    entries += google_entries(google, entries)
    entries = dedupe(entries)
    entries.sort(key=lambda e: (not e["all_day"], e["start"] or "", e["kind"]))
    return entries
