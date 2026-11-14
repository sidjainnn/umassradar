from parsers import piazza
from tests.helpers import load, local


def test_quiz_reminder_becomes_deadline():
    msg = load("piazza_quiz")
    assert piazza.matches(msg)
    [item] = piazza.parse(msg)
    assert item.category == "deadline"
    assert item.course == "STAT 315"
    assert item.title == "Quiz 5 reminder"
    assert local(item.due_at) == (2026, 11, 20, 23, 59)
    assert "due Friday, Nov 20" in item.evidence
    assert item.action_required


def test_note_without_date_is_course_info():
    [item] = piazza.parse(load("piazza_note"))
    assert item.category == "course_info"
    assert item.course == "COMPSCI 220"
