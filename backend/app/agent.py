"""The to-do agent: next steps for the student's current mode, with the reason for each.

Suggestions are built by rules over items, applications, office hours, the week's schedule and ranked jobs,
so they're fast and predictable. Each has a stable id, so a dismissed suggestion stays dismissed.
"""

import re
from datetime import datetime, time, timedelta

from app.models import EASTERN, Item
from app.modes import HOUSING_WORDS, classify

DAY_START, DAY_END = time(9, 0), time(21, 0)
INTERVIEW = re.compile(r"\binterview", re.I)


def find_gap(busy: list[tuple[datetime, datetime]], after: datetime, before: datetime, minutes: int) -> tuple[datetime, datetime] | None:
    """First free block of `minutes` between `after` and `before`, inside 9 AM-9 PM local, rounded to the quarter hour."""
    need = timedelta(minutes=minutes)
    busy = sorted(busy)
    t = after.astimezone(EASTERN)
    t = t + timedelta(minutes=(15 - t.minute % 15) % 15)
    t = t.replace(second=0, microsecond=0)
    while t + need <= before:
        day_start = t.replace(hour=DAY_START.hour, minute=0)
        day_end = t.replace(hour=DAY_END.hour, minute=0)
        if t < day_start:
            t = day_start
            continue
        if t + need > day_end:
            t = (t + timedelta(days=1)).replace(hour=DAY_START.hour, minute=0)
            continue
        clash = next((b for b in busy if b[0] < t + need and b[1] > t), None)
        if clash is None:
            return t, t + need
        t = clash[1].astimezone(EASTERN)
        t = t + timedelta(minutes=(15 - t.minute % 15) % 15)
    return None


def _when(dt: datetime) -> str:
    return dt.astimezone(EASTERN).strftime("%a %b %-d, %-I:%M %p").replace(":00 ", " ")


def _block(sid, kind, title, why, gap, item_ids=(), course=None):
    start, end = gap
    return {"id": sid, "kind": kind, "title": title, "why": why, "due": start.isoformat(), "item_ids": list(item_ids),
            "action": {"type": "block_time", "title": title, "starts_at": start.isoformat(), "ends_at": end.isoformat(),
                       "course": course, "label": f"Block {_when(start)}"}}


def work_suggestions(items: list[Item], apps: list[dict], jobs: list[dict], busy, now: datetime) -> list[dict]:
    out = []
    for a in apps:
        last = a["last_at"] if a["last_at"].tzinfo else a["last_at"].replace(tzinfo=now.tzinfo)
        quiet = (now - last).days
        role = a.get("role") or "the role"
        if a["stage"] == "applied" and quiet >= 10:
            out.append({"id": f"follow_up:{a['_id']}", "kind": "follow_up", "title": f"Follow up with {a['company']}",
                        "why": f"No reply about {role} in {quiet} days. A short, polite check-in is normal after ~2 weeks.",
                        "due": None, "item_ids": [],
                        "action": {"type": "copy_text", "label": "Copy a follow-up note",
                                   "text": f"Hi {a['company']} team, I applied for {role} on {a['first_at']:%B %-d} and wanted to "
                                           f"check on its status. I'm still very interested and happy to share anything else "
                                           f"that would help. Thank you!"}})
        if a["stage"] == "interview" and quiet <= 5:
            gap = find_gap(busy, now, now + timedelta(days=3), 60)
            if gap:
                out.append(_block(f"interview_prep:{a['_id']}", "interview_prep", f"Prep for your {a['company']} interview",
                                  f"{a['company']} moved you to interviews for {role}. An hour to review the role and "
                                  f"practice your stories helps.", gap))
    for i in items:
        when = i.starts_at
        if when and i.category == "appointment" and INTERVIEW.search(i.title) and now < when <= now + timedelta(days=3):
            gap = find_gap(busy, now, when - timedelta(hours=2), 60)
            if gap:
                out.append(_block(f"interview_prep:{i.id}", "interview_prep", f"Prep for {i.title}",
                                  f"It's {_when(when)}.", gap, [i.id]))
    for j in jobs[:3]:
        due = j.get("due_at")
        if due and "you already applied" not in j["reasons"]:
            d = datetime.fromisoformat(due)
            if now < d <= now + timedelta(days=7):
                out.append({"id": f"apply:{j['id']}", "kind": "apply", "title": f"Apply: {j['title']}",
                            "why": f"{j['match']}% match ({'; '.join(j['reasons'][:2])}). Closes {_when(d)}.",
                            "due": due, "item_ids": [j["id"]], "action": {"type": "open_job", "item_id": j["id"], "label": "Open the job"}})
    for i in items:
        if i.category == "reply_owed" and classify(i) == "work":
            out.append({"id": f"reply:{i.id}", "kind": "reply", "title": f"Reply to {i.sender or 'the recruiter'}",
                        "why": i.title, "due": None, "item_ids": [i.id], "action": {"type": "open_item", "item_id": i.id, "label": "Open"}})
        when = i.due_at or i.starts_at
        if when and HOUSING_WORDS.search(f"{i.title} {i.sender}") and now < when <= now + timedelta(days=14):
            out.append({"id": f"housing:{i.id}", "kind": "housing", "title": i.title,
                        "why": f"Housing date {_when(when)}. These fill up fast in Amherst.", "due": when.isoformat(),
                        "item_ids": [i.id], "action": {"type": "open_item", "item_id": i.id, "label": "Open"}})
    return out


def study_suggestions(items: list[Item], slots: list[dict], countdowns: list[dict], busy, now: datetime) -> list[dict]:
    out = []
    deadlines = [i for i in items if i.category == "deadline" and i.due_at and now < i.due_at and classify(i) != "work"]
    for d in deadlines:
        if not d.course:
            continue
        slot = next((s for s in slots if s.get("course") == d.course and s.get("can_make") is not False
                     and now < s["starts_at"] < d.due_at), None)
        if slot:
            out.append({"id": f"office_hours:{d.id}", "kind": "office_hours",
                        "title": f"Office hours with {slot['who']} before {d.title}",
                        "why": f"{d.title} is due {_when(d.due_at)}; {slot['who']} is free {_when(slot['starts_at'])}"
                               f"{' and you are too' if slot.get('can_make') else ''}.",
                        "due": slot["starts_at"].isoformat(), "item_ids": [d.id],
                        "action": {"type": "block_time", "title": f"Office hours: {slot['who']} ({d.course})",
                                   "starts_at": slot["starts_at"].isoformat(), "ends_at": slot["ends_at"].isoformat(),
                                   "course": d.course, "label": "Add to my schedule"}})
    for d in deadlines:
        if d.due_at <= now + timedelta(hours=48):
            gap = find_gap(busy, now, d.due_at - timedelta(minutes=30), 90)
            if gap:
                out.append(_block(f"start:{d.id}", "start_work", f"Work on {d.title}",
                                  f"Due {_when(d.due_at)}. You have a free 90 minutes before then.", gap, [d.id], d.course))
    for c in countdowns:
        if 1 <= c["days"] <= 7:
            exam = datetime.fromisoformat(c["when"])
            gap = find_gap(busy, now, exam - timedelta(hours=12), 120)
            if gap:
                name = f"{c['course']} {c['title']}" if c.get("course") else c["title"]
                out.append(_block(f"study:{c['course']}:{c['when']}", "study_block", f"Study for {name}",
                                  f"It's in {c['days']} day{'s' if c['days'] != 1 else ''}.", gap, (), c.get("course")))
    for i in items:
        if i.category == "reply_owed" and classify(i) != "work":
            out.append({"id": f"reply:{i.id}", "kind": "reply", "title": f"Reply to {i.sender or 'them'}", "why": i.title,
                        "due": None, "item_ids": [i.id], "action": {"type": "open_item", "item_id": i.id, "label": "Open"}})
    return out


def suggestions(mode: str, items, apps, jobs, slots, countdowns, busy, dismissed: set[str], now: datetime) -> list[dict]:
    out = work_suggestions(items, apps, jobs, busy, now) if mode == "work" else study_suggestions(items, slots, countdowns, busy, now)
    seen, result = set(), []
    for s in out:
        if s["id"] in dismissed or s["id"] in seen:
            continue
        seen.add(s["id"])
        result.append(s)
    result.sort(key=lambda s: (s["due"] is None, s["due"] or ""))
    return result[:8]
