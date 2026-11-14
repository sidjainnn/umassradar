from datetime import datetime
from pathlib import Path

import pytest

from app.models import EASTERN
from llm.syllabus import DatedItem, OfficeHour, SyllabusError, SyllabusResult, pdf_text, to_records, upcoming_slots
from tests.helpers import local

NOW = datetime(2026, 11, 14, 9, 0, tzinfo=EASTERN)  # Saturday
PDF = (Path(__file__).parent / "fixtures" / "syllabus_cs220.pdf").read_bytes()


def test_pdf_text_extracts_lines():
    text = pdf_text(PDF)
    assert "Office hours: Tuesday 2:30-4:00 PM" in text


def test_scanned_or_tiny_pdf_rejected():
    with pytest.raises(SyllabusError):
        pdf_text(b"%PDF-1.4 not really a pdf")


def result() -> SyllabusResult:
    return SyllabusResult(
        course="CS 220",
        office_hours=[
            OfficeHour(who="Prof. Minea", weekday="Tuesday", start="14:30", end="16:00", location="LGRT 222",
                       evidence="Office hours: Tuesday 2:30-4:00 PM"),
            OfficeHour(who="Sean Lin", weekday="Wednesday", start="16:00", end="15:00", location=None, evidence=""),
        ],
        dated=[
            DatedItem(category="event", title="Midterm 2", date="2026-11-19", time="19:00", location="Hasbrouck 20",
                      evidence="Midterm 2: Thursday, November 19, 2026, 7:00 PM, Hasbrouck 20"),
            DatedItem(category="deadline", title="Project 5", date="2026-11-23", time=None, location=None,
                      evidence="Project 5 due: Monday, November 23, 2026 at 11:30 PM"),
            DatedItem(category="event", title="Week 1 quiz", date="2026-09-05", time=None, location=None, evidence=""),
            DatedItem(category="event", title="Made up", date="2026-12-01", time=None, location=None,
                      evidence="this sentence is not in the syllabus"),
        ],
        grading="Projects 40%, Midterms 30%, Final 25%, Participation 5%",
        late_policy="Projects lose 10% per day, up to three days.",
    )


def test_records_validate_and_normalize():
    course, office_hours, items = to_records(result(), pdf_text(PDF), "u1", now=NOW)
    assert course == "COMPSCI 220"
    assert len(office_hours) == 1  # end before start dropped
    assert office_hours[0]["weekday"] == 1 and office_hours[0]["start"] == "14:30"
    titles = {i.title: i for i in items}
    assert "Week 1 quiz" not in titles  # past
    assert local(titles["Midterm 2"].starts_at) == (2026, 11, 19, 19, 0)
    assert local(titles["Project 5"].due_at) == (2026, 11, 23, 23, 59)
    assert titles["Midterm 2"].source == "syllabus"
    assert titles["Made up"].confidence <= 0.4  # evidence not in the document


def test_upcoming_slots_next_week():
    _, office_hours, _ = to_records(result(), pdf_text(PDF), "u1", now=NOW)
    slots = upcoming_slots(office_hours, now=NOW)
    assert len(slots) == 1
    assert local(slots[0]["starts_at"]) == (2026, 11, 17, 14, 30)  # next Tuesday


def test_library_keeps_only_recent_syllabi():
    from datetime import date

    from app.syllabus_library import is_recent

    today = date(2026, 11, 14)
    assert is_recent("Spring 2026", today)
    assert is_recent("Fall 2026", today)
    assert is_recent("Spring 2027", today)
    assert not is_recent("Fall 2025", today)  # started Sep 2025, more than 12 months ago
    assert not is_recent(None, today)
