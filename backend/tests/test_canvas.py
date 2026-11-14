from parsers import canvas
from tests.helpers import load, local


def test_assignment_created():
    msg = load("canvas_assignment")
    assert canvas.matches(msg)
    [item] = canvas.parse(msg)
    assert item.category == "deadline"
    assert item.title == "Project 2"
    assert item.course == "COMPSCI 230"
    assert local(item.due_at) == (2026, 11, 24, 23, 59)


def test_due_date_changed():
    [item] = canvas.parse(load("canvas_changed"))
    assert item.category == "deadline"
    assert item.course == "ECE 122"
    assert local(item.due_at) == (2026, 11, 18, 17, 0)
    assert "changed" in item.title


def test_exam_announcement_is_event():
    [item] = canvas.parse(load("canvas_announcement"))
    assert item.category == "event"
    assert local(item.starts_at) == (2026, 11, 19, 19, 0)
    assert "Thompson 104" in item.evidence
