from parsers import handshake
from tests.helpers import load, local


def test_job_is_opportunity_with_apply_by():
    msg = load("handshake_job")
    assert handshake.matches(msg)
    [item] = handshake.parse(msg)
    assert item.category == "opportunity"
    assert local(item.due_at)[:3] == (2026, 12, 1)


def test_application_viewed_is_status_update():
    [item] = handshake.parse(load("handshake_applied"))
    assert item.category == "status_update"
    assert "Liberty Mutual" in item.title


def test_info_session_is_event():
    [item] = handshake.parse(load("handshake_event"))
    assert item.category == "event"
    assert local(item.starts_at) == (2026, 11, 17, 18, 0)
    assert item.location == "CICS 150/151"
