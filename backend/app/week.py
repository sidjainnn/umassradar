"""One week of everything with a time: classes, your events, deadlines, office hours, club events and
Google Calendar events, as a single list the Schedule page draws."""

from datetime import date, datetime, time, timedelta

from app.models import EASTERN, Item

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
                "href": f"/courses/{c['course']}", "editable": False,
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
        out.append({
            "kind": kind, "id": i.id, "title": i.title, "subtitle": i.sender if kind != "deadline" else "Due",
            "start": _iso(when), "end": _iso(stop), "all_day": False, "location": i.location, "course": i.course,
            "href": i.url, "editable": i.source == "manual", "series_id": i.series_id, "evidence": i.evidence,
        })
    return out


def office_entries(slots: list[dict]) -> list[dict]:
    return [{
        "kind": "office_hours", "id": f"oh:{s['who']}:{s['starts_at'].isoformat()}",
        "title": f"Office hours: {s['who']}", "subtitle": s.get("course"), "start": _iso(s["starts_at"]),
        "end": _iso(s["ends_at"]), "all_day": False, "location": s.get("location"), "course": s.get("course"),
        "href": None, "editable": False, "can_make": s.get("can_make"),
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
            "location": ev.get("location"), "course": None, "href": ev.get("url"), "editable": False,
        })
    return out


def build_week(start: date, schedule: dict | None, items: list[Item], slots: list[dict],
               google: list[dict] | None) -> list[dict]:
    begin, end = week_bounds(start)
    entries = class_entries(schedule, start) + item_entries(items, begin, end) + office_entries(slots)
    entries += google_entries(google, entries)
    entries.sort(key=lambda e: (not e["all_day"], e["start"] or "", e["kind"]))
    return entries
