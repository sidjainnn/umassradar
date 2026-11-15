from datetime import datetime, timedelta

from app.models import EASTERN, Item
from app.progress import countdowns, progress, streak

NOW = datetime(2026, 11, 18, 12, 0, tzinfo=EASTERN)  # a Wednesday


def due(days: int, status: str = "done", title: str = "HW", course: str | None = None) -> Item:
    return Item(category="deadline", title=title, course=course, due_at=NOW + timedelta(days=days), status=status)


def test_streak_counts_good_weeks_and_skips_empty_ones():
    items = [
        due(-7), due(-7), due(-7), due(-7, "open"),       # last week 3/4 = 75%: breaks
    ]
    assert streak(items, NOW) == 0
    items = [
        due(-7), due(-7), due(-7), due(-7), due(-7, "open"),  # last week 80%
        # the week before: nothing due, doesn't break
        due(-21), due(-21),                                   # three weeks ago 100%
        due(-28, "open"),                                     # four weeks ago 0%: stops here
    ]
    assert streak(items, NOW) == 2


def test_this_week_counts_once_it_is_good():
    assert streak([due(-1), due(-7)], NOW) == 2
    assert streak([due(-1, "open"), due(-7)], NOW) == 1


def test_dismissed_items_dont_count():
    assert streak([due(-7), due(-7, "dismissed")], NOW) == 1


def test_countdowns_merge_items_and_syllabus_dates():
    items = [due(6, "open", "Midterm 2", "STAT 315"), due(2, "open", "Homework 7", "STAT 315")]
    dates = {"STAT 315": [{"title": "Midterm II", "when": (NOW + timedelta(days=6)).replace(tzinfo=None)}],
             "COMPSCI 220": [{"title": "Final exam", "when": NOW + timedelta(days=30)},
                             {"title": "Quiz 3", "when": NOW - timedelta(days=2)}]}
    out = countdowns(items, dates, NOW)
    assert [(c["course"], c["days"]) for c in out] == [("STAT 315", 6), ("COMPSCI 220", 30)]


def test_progress_summary():
    p = progress([due(-1), due(1, "open"), due(0, "open")], {}, NOW)
    assert (p["done"], p["total"]) == (1, 3)
    assert p["today_cleared"] is False


def test_today_cleared_needs_something_due_today():
    assert progress([due(3, "open")], {}, NOW)["today_cleared"] is False
    assert progress([due(0, "done")], {}, NOW)["today_cleared"] is True
