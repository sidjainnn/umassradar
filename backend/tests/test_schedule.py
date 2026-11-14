from datetime import datetime
from pathlib import Path

from app.calendar_client import class_intervals
from app.models import EASTERN
from llm.schedule import ShotClass, ShotSchedule, clean_classes, course_code, from_screenshot_result, schedule_from_ics

ICS = (Path(__file__).parent / "fixtures" / "spire_schedule.ics").read_bytes()


def test_ics_export():
    term, classes = schedule_from_ics(ICS)
    assert term == "Fall 2026"
    by = {(c["course"], c["component"]): c for c in classes}
    lec = by[("COMPSCI 220", "LEC")]
    assert lec["days"] == [1, 3] and lec["start"] == "16:00" and lec["end"] == "17:15" and lec["location"] == "CMPLABE110"
    assert by[("STAT 315", "LEC")]["days"] == [0, 2, 4]
    assert by[("COMPSCI 220", "LAB")]["section"] == "01LL"


def test_screenshot_result_is_validated():
    result = ShotSchedule(term="Fall 2026", classes=[
        ShotClass(course="CS 311", title="Algorithms", section="01", component="lec", days=["Monday", "Wednesday"],
                  start="16:00", end="17:15", location="CSW 150", instructor="Parvini"),
        ShotClass(course="ANTHRO 104", title=None, section=None, component=None, days=["Friday"],
                  start="9:05", end="9:55", location=None, instructor=None),
        ShotClass(course="MATH 235", title=None, section=None, component=None, days=["Tuesday"],
                  start="14:00", end="13:00", location=None, instructor=None),  # end before start: dropped
    ])
    term, classes = from_screenshot_result(result)
    assert [c["course"] for c in classes] == ["COMPSCI 311", "ANTHRO 104"]
    assert classes[0]["component"] == "LEC" and classes[1]["start"] == "09:05"


def test_course_code_and_dedupe():
    assert course_code("STATISTC 315") == "STAT 315"
    assert course_code("ANTHRO104") == "ANTHRO 104"
    assert course_code("Lunch") is None
    dup = {"course": "MATH 235", "days": [0], "start": "09:00", "end": "09:50"}
    assert len(clean_classes([dup, dup])) == 1


def test_class_intervals_for_office_hours():
    schedule = {"classes": [{"course": "COMPSCI 220", "days": [1, 3], "start": "16:00", "end": "17:15"}]}
    start = datetime(2026, 11, 16, 0, 0, tzinfo=EASTERN)  # Monday
    end = datetime(2026, 11, 19, 23, 0, tzinfo=EASTERN)
    busy = class_intervals(schedule, start, end)
    assert [b[0].strftime("%a %H:%M") for b in busy] == ["Tue 16:00", "Thu 16:00"]
