from parsers import reslife
from tests.helpers import load, local


def test_ra_posting_is_opportunity_with_deadline():
    msg = load("reslife_ra")
    assert reslife.matches(msg)
    [item] = reslife.parse(msg)
    assert item.category == "opportunity"
    assert local(item.due_at) == (2026, 12, 4, 17, 0)
    assert item.action_required


def test_inspection_is_event():
    [item] = reslife.parse(load("reslife_inspection"))
    assert item.category == "event"
    assert local(item.starts_at) == (2026, 11, 16, 10, 0)
