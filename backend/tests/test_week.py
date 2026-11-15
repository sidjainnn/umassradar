from datetime import date, datetime, timedelta

import pytest

from app.models import EASTERN, Item
from app.routes.events import EventBody, make_items, occurrences
from app.week import build_week

MON = date(2026, 11, 16)
SCHEDULE = {"classes": [
    {"course": "STAT 315", "component": "LEC", "days": [0, 2], "start": "11:15", "end": "12:05", "location": "HAS 20"},
    {"course": "COMPSCI 220", "component": "LAB", "days": [2], "start": "13:25", "end": "14:15", "location": "ENG 305"},
]}


def at(d: date, h: int, m: int = 0) -> datetime:
    return datetime(d.year, d.month, d.day, h, m, tzinfo=EASTERN)


def test_week_merges_classes_items_office_hours_and_google():
    items = [
        Item(category="deadline", title="Quiz 6", course="STAT 315", due_at=at(MON, 23, 59)),
        Item(category="appointment", title="Advising", starts_at=at(MON + timedelta(days=1), 14)),
        Item(category="event", title="Hackers Club", source="campus", starts_at=at(MON + timedelta(days=3), 19)),
        Item(category="deadline", title="Next week thing", due_at=at(MON + timedelta(days=9), 9)),
        Item(category="reply_owed", title="Reply to Alex", due_at=at(MON, 10)),
    ]
    slots = [{"who": "Prof. Minea", "course": "COMPSCI 220", "location": "CS 310", "evidence": "",
              "starts_at": at(MON, 11, 30), "ends_at": at(MON, 12, 30), "can_make": False}]
    google = [
        {"id": "a", "title": "Dentist", "start": at(MON, 8), "end": at(MON, 9), "all_day": False},
        # a copy of a class someone keeps in Google Calendar: dropped
        {"id": "b", "title": "STAT 315", "start": at(MON, 11, 15), "end": at(MON, 12, 5), "all_day": False},
    ]
    out = build_week(MON, SCHEDULE, items, slots, google)
    kinds = [e["kind"] for e in out]
    assert kinds.count("class") == 2 and kinds.count("section") == 1
    assert {"deadline", "appointment", "club", "office_hours", "google"} <= set(kinds)
    assert not any(e["title"] in ("Next week thing", "Reply to Alex") for e in out)
    assert sum(1 for e in out if e["kind"] == "google") == 1
    oh = next(e for e in out if e["kind"] == "office_hours")
    assert oh["can_make"] is False
    starts = [e["start"] for e in out]
    assert starts == sorted(starts)


def test_week_without_google_or_schedule():
    out = build_week(MON, None, [], [], None)
    assert out == []


def test_weekly_repeat_keeps_local_time_across_dst():
    # Oct 26 2026 is EDT, Nov 2 onward is EST: 3 PM stays 3 PM
    start = datetime(2026, 10, 26, 15, 0, tzinfo=EASTERN)
    times = occurrences(start, date(2026, 11, 16))
    assert len(times) == 4
    assert all(t.hour == 15 and t.minute == 0 for t in times)


def test_make_items_series_and_default_length():
    body = EventBody(title="Study group", starts_at=at(MON, 19), repeat_until=MON + timedelta(days=14),
                     course="stat315", location=" Du Bois ")
    items = make_items(body, "u1")
    assert len(items) == 3
    assert len({i.series_id for i in items}) == 1 and items[0].series_id
    assert all(i.source == "manual" and i.ends_at - i.starts_at == timedelta(hours=1) for i in items)
    assert items[0].course == "STAT 315" and items[0].location == "Du Bois"
    assert len({i.dedupe_key() for i in items}) == 3


def test_event_must_end_after_start():
    with pytest.raises(ValueError):
        EventBody(title="x", starts_at=at(MON, 10), ends_at=at(MON, 9))


def test_midnight_to_midnight_event_is_all_day():
    item = Item(category="event", title="Career fair", source="manual", starts_at=at(MON, 0),
                ends_at=at(MON + timedelta(days=1), 0))
    (entry,) = build_week(MON, None, [item], [], None)
    assert entry["all_day"] is True
