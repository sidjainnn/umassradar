from datetime import datetime, time

from app.models import EASTERN
from parsers.common import find_course, find_datetimes, first_datetime, parse_time
from tests.helpers import local

REF = datetime(2026, 11, 14, 9, 0, tzinfo=EASTERN)  # a Saturday


def test_month_day_with_time():
    assert local(first_datetime("due Friday, Nov 20 at 11:59 PM", REF)) == (2026, 11, 20, 23, 59)


def test_month_day_defaults_to_end_of_day():
    assert local(first_datetime("Project due December 4", REF)) == (2026, 12, 4, 23, 59)


def test_year_rolls_over():
    assert local(first_datetime("Spring add/drop ends Jan 30", REF))[:3] == (2027, 1, 30)


def test_numeric_date():
    assert local(first_datetime("Submit by 11/18 5pm", REF)) == (2026, 11, 18, 17, 0)


def test_weekday_with_time_is_next_occurrence():
    assert local(first_datetime("Coming up Fri 10:45 PM", REF)) == (2026, 11, 20, 22, 45)


def test_tomorrow():
    assert local(first_datetime("Reply tomorrow by noon", REF)) == (2026, 11, 15, 12, 0)


def test_weekday_inside_full_date_not_double_counted():
    assert len(find_datetimes("Tuesday, November 17, 2026 at 2:00 PM", REF)) == 1


def test_bare_abbreviation_ignored():
    assert find_datetimes("I sat in the back of the room", REF) == []


def test_default_time_override():
    assert local(first_datetime("Nov 17", REF, default_time=time(9, 0))) == (2026, 11, 17, 9, 0)


def test_parse_time_variants():
    assert parse_time("5pm") == time(17, 0)
    assert parse_time("11:59 p.m.") == time(23, 59)
    assert parse_time("12:30 AM") == time(0, 30)


def test_find_course():
    assert find_course("Assignment for CS 230 SEC 01") == "COMPSCI 230"
    assert find_course("STAT315 quiz") == "STAT 315"
    assert find_course("no course here") is None
