from app.courses import chosen_sections, latest_term, overlaps

LEC = {"section": "U1 LEC01", "class_number": "1", "days": [1, 3], "start": "16:00", "end": "17:15"}


def test_overlap_needs_shared_day_and_time():
    assert overlaps(LEC, {"days": [3], "start": "17:00", "end": "17:50"})
    assert not overlaps(LEC, {"days": [3], "start": "17:15", "end": "18:00"})  # back to back is fine
    assert not overlaps(LEC, {"days": [0, 2], "start": "16:00", "end": "17:15"})
    assert not overlaps(LEC, {"days": [1], "start": None, "end": None})


def test_latest_term():
    assert latest_term({"Fall 2026": {}, "Spring 2027": {}}) == "Spring 2027"
    assert latest_term({"Spring 2026": {}, "Fall 2026": {}}) == "Fall 2026"


def test_chosen_sections_defaults_to_first_lecture():
    course = {"terms": {"Spring 2027": {"sections": [{**LEC, "section": "U1 LAB01", "class_number": "9"}, LEC]}}}
    assert chosen_sections(course, "Spring 2027", []) == [LEC]
    assert chosen_sections(course, "Spring 2027", ["9"])[0]["class_number"] == "9"


def test_current_term():
    from datetime import date

    from app.courses import current_term
    assert current_term(date(2026, 11, 14)) == "Fall 2026"
    assert current_term(date(2027, 2, 1)) == "Spring 2027"
    assert current_term(date(2026, 7, 4)) == "Summer 2026"
