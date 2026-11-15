"""Where a class meets: building, floor, side, the door to use and the walk there, in words students understand."""

from datetime import time

from app.buildings import best_entrances, meters, resolve
from app.indoor import route as indoor_route
from app.models import EASTERN, now_utc
from app.rooms import floor_guess

DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
FLOOR_WORDS = {0: "lower level", 1: "1st floor", 2: "2nd floor", 3: "3rd floor"}


def floor_word(n: int | None) -> str | None:
    if n is None:
        return None
    return FLOOR_WORDS.get(n, f"{n}th floor")


def class_location(location: str | None) -> dict:
    """Everything a student needs to find a room, or found=False with the raw text if we can't tell."""
    if not location or location.strip().lower() in ("on-line", "online", "dept", "tba", "rlearn"):
        return {"found": False, "raw": location, "reason": "online or to be announced"}
    b, room = resolve(location)
    if not b:
        return {"found": False, "raw": location, "reason": "unknown building"}
    g = floor_guess(room) if room else None
    r = indoor_route(location) if room else None
    floor = r["floor"] if r and r.get("found") else (g or {}).get("floor")
    door = (best_entrances(b, (g or {}).get("wing"), floor) or [None])[0]
    side = (g or {}).get("wing")
    summary = ", ".join(x for x in [b["name"], f"room {room}" if room else None, floor_word(floor),
                                    f"{side} side" if side else None] if x)
    return {
        "found": True, "raw": location, "building": b["name"], "building_id": b["id"], "center": b["center"],
        "room": room, "floor": floor, "floor_label": floor_word(floor), "side": side, "summary": summary,
        "door": door, "steps": (r or {}).get("steps") if r and r.get("reachable") else None,
        "indoor": bool(r and r.get("reachable")), "layout": (r or {}).get("source"),
        "navigate": {"to": f"{location}", "label": f"Take me to {room or b['name']}"},
    }


def _minutes(hhmm: str) -> int:
    h, m = map(int, hhmm.split(":"))
    return h * 60 + m


def schedule_where(schedule: dict | None, now=None) -> list[dict]:
    """Every class with where it is, today's first, with the walk from the class before it that day."""
    now = (now or now_utc()).astimezone(EASTERN)
    today = now.weekday()
    classes = (schedule or {}).get("classes", [])
    out = []
    for c in classes:
        loc = class_location(c.get("location"))
        out.append({"course": c["course"], "component": c.get("component"), "section": c.get("section"),
                    "days": c.get("days", []), "day_names": [DAYS[d] for d in c.get("days", [])],
                    "start": c["start"], "end": c["end"], "today": today in c.get("days", []),
                    "location": loc, "walk_from_previous": None})
    # walking time from the previous class on the same day (using today's order, else the first day it meets)
    for day in range(7):
        todays = sorted((x for x in out if day in x["days"]), key=lambda x: _minutes(x["start"]))
        for prev, cur in zip(todays, todays[1:]):
            a, b = prev["location"], cur["location"]
            if a.get("found") and b.get("found") and cur["walk_from_previous"] is None:
                d = meters(a["center"], b["center"]) * 1.3
                gap = _minutes(cur["start"]) - _minutes(prev["end"])
                cur["walk_from_previous"] = {"from": prev["course"], "day": DAYS[day], "minutes": max(1, round(d / 80)),
                                             "gap_minutes": gap, "tight": gap < round(d / 80) + 3,
                                             "same_building": a["building"] == b["building"]}
    out.sort(key=lambda x: (not x["today"], min(x["days"] or [9]), _minutes(x["start"])))
    return out
