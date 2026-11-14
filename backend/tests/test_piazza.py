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


def test_daily_digest_is_course_info():
    msg = load("piazza_note")
    msg.from_name = "Piazza Team"
    msg.subject = "11/12/26 Daily Digest for STAT 315 on Piazza"
    msg.body = "Quiz 5 is due Friday."
    [item] = piazza.parse(msg)
    assert item.category == "course_info"
    assert item.course == "STAT 315"


def test_ambiguous_date_post_goes_to_llm():
    msg = load("piazza_note")
    msg.subject = "[Instr Note] Quiz 5 postponed to next week"
    msg.body = "Quiz 5 will now open next Thursday instead."
    assert piazza.parse(msg) is None
