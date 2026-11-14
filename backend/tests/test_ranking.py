from datetime import datetime, timedelta, timezone

from app.models import Item
from app.ranking import urgency

NOW = datetime(2026, 11, 14, 14, 0, tzinfo=timezone.utc)


def mk(**kw) -> Item:
    base = dict(category="deadline", title="x", action_required=True, sender_type="automated", confidence=1.0)
    base.update(kw)
    return Item(**base)


def test_sooner_deadline_ranks_higher():
    assert urgency(mk(due_at=NOW + timedelta(hours=5)), NOW) > urgency(mk(due_at=NOW + timedelta(days=6)), NOW)


def test_deadline_beats_course_info():
    assert urgency(mk(due_at=NOW + timedelta(days=2)), NOW) > urgency(mk(category="course_info", action_required=False), NOW)


def test_professor_beats_newsletter():
    prof = mk(category="reply_owed", sender_type="person", sender_email="mchen@cs.umass.edu", received_at=NOW)
    news = mk(category="reply_owed", sender_type="newsletter", received_at=NOW)
    assert urgency(prof, NOW) > urgency(news, NOW)


def test_noise_is_zero_and_old_items_sink():
    assert urgency(mk(category="noise"), NOW) == 0
    assert urgency(mk(due_at=NOW - timedelta(days=5)), NOW) < urgency(mk(due_at=NOW + timedelta(days=5)), NOW)
