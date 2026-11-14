from datetime import datetime, timedelta

from app.calendar_client import can_make
from app.models import EASTERN

T = datetime(2026, 11, 17, 14, 30, tzinfo=EASTERN)  # office hours 2:30-4:00
END = T + timedelta(minutes=90)


def test_free_slot():
    assert can_make(T, END, [])


def test_class_covering_the_whole_slot():
    assert not can_make(T, END, [(T - timedelta(hours=1), END + timedelta(minutes=5))])


def test_partial_overlap_still_leaves_time():
    # class until 3:15 + 10 min walk -> free 3:25-4:00 (35 min)
    assert can_make(T, END, [(T - timedelta(hours=1), T + timedelta(minutes=45))])


def test_only_a_sliver_left_is_not_enough():
    # busy 2:20-3:35 -> with buffers free 3:45-4:00 (15 min)
    assert not can_make(T, END, [(T - timedelta(minutes=10), T + timedelta(minutes=65))])
