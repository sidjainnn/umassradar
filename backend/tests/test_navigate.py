from parsers import navigate
from tests.helpers import load, local


def test_confirmation_is_appointment():
    msg = load("navigate_appt")
    assert navigate.matches(msg)
    [item] = navigate.parse(msg)
    assert item.category == "appointment"
    assert item.title == "Appointment with Jane Smith"
    assert local(item.starts_at) == (2026, 11, 17, 14, 0)
    assert item.location == "Goodell 613"


def test_cancellation_is_status_update():
    [item] = navigate.parse(load("navigate_cancel"))
    assert item.category == "status_update"
    assert "cancelled" in item.title
