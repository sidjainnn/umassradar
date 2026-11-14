from parsers import gradescope
from tests.helpers import load, local


def test_new_assignment_due_date():
    msg = load("gradescope_due")
    assert gradescope.matches(msg)
    [item] = gradescope.parse(msg)
    assert item.category == "deadline"
    assert item.title == "Homework 6"
    assert item.course == "COMPSCI 311"
    assert local(item.due_at) == (2026, 11, 19, 22, 0)


def test_submission_receipt():
    [item] = gradescope.parse(load("gradescope_submitted"))
    assert item.category == "status_update"
    assert item.title == "Submitted Homework 5"


def test_grades_released():
    [item] = gradescope.parse(load("gradescope_graded"))
    assert item.category == "status_update"
    assert item.course == "MATH 235"
    assert "Midterm 1" in item.title


def test_real_subject_format_with_course_prefix():
    from tests.helpers import load
    msg = load("gradescope_submitted")
    msg.subject = "[COMPSCI 220 on Gradescope] Successfully submitted to Homework 7b"
    [item] = gradescope.parse(msg)
    assert item.category == "status_update"
    assert item.title == "Submitted Homework 7b"
    assert item.course == "COMPSCI 220"
