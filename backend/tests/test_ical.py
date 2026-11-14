from datetime import datetime
from pathlib import Path

import pytest

from app.ical_import import FeedError, parse_feed, validate_feed_url
from app.models import EASTERN
from tests.helpers import local

NOW = datetime(2026, 11, 14, 9, 0, tzinfo=EASTERN)
FEED = (Path(__file__).parent / "fixtures" / "canvas_feed.ics").read_bytes()


def test_assignments_become_deadlines_events_become_events():
    items = {i.title: i for i in parse_feed(FEED, now=NOW)}
    assert set(items) == {"Project 2", "Midterm 2"}  # old homework filtered out
    p = items["Project 2"]
    assert p.category == "deadline" and p.source == "canvas" and p.course == "COMPSCI 230"
    assert local(p.due_at) == (2026, 11, 20, 23, 59)
    assert items["Midterm 2"].category == "event"
    assert items["Midterm 2"].course == "STAT 315"


def test_feed_url_must_be_canvas_https():
    assert validate_feed_url(" https://umamherst.instructure.com/feeds/calendars/user_abc.ics ")
    for bad in ("http://umamherst.instructure.com/x.ics", "https://evil.com/x.ics", "https://instructure.com.evil.io/x"):
        with pytest.raises(FeedError):
            validate_feed_url(bad)
