from datetime import datetime, timedelta

from app.merge import find_duplicate, is_duplicate, merge_items, similar_titles
from app.models import EASTERN, Item

T = datetime(2026, 11, 20, 23, 59, tzinfo=EASTERN)


def item(**kw) -> Item:
    base = dict(category="deadline", title="Homework 6", course="COMPSCI 311", due_at=T, source_ref="m1", confidence=0.8)
    base.update(kw)
    return Item(**base)


def test_similar_titles():
    assert similar_titles("Homework 6", "HW reminder: Homework 6 due")
    assert similar_titles("Project 2", "Project 2 (due date changed)")
    assert not similar_titles("Homework 6", "Homework 7")


def test_same_assignment_from_two_sources_merges():
    a = item(source="gmail", source_ref="m1", confidence=0.9)
    b = item(source="canvas", source_ref="event-assignment-1", due_at=T + timedelta(hours=3), confidence=0.95)
    assert is_duplicate(a, b)
    [kept] = merge_items([a, b])
    assert kept.source == "canvas"


def test_different_course_or_far_dates_not_merged():
    assert not is_duplicate(item(), item(course="MATH 235", source_ref="m2"))
    assert not is_duplicate(item(), item(due_at=T + timedelta(days=3), source_ref="m2"))


def test_noise_never_merges():
    assert not is_duplicate(item(category="noise"), item(category="noise"))


def test_find_duplicate_skips_identical_key():
    a = item()
    assert find_duplicate(a, [a]) is None
    assert find_duplicate(a, [item(source="canvas", source_ref="x")]) is not None
