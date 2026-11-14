from parsers import campuswire
from tests.helpers import load, local


def test_digest_with_pinned_deadline():
    msg = load("campuswire_digest")
    assert campuswire.matches(msg)
    items = campuswire.parse(msg)
    deadline = next(i for i in items if i.category == "deadline")
    assert deadline.course == "COMPSCI 220"
    assert local(deadline.due_at) == (2026, 11, 23, 23, 30)
    info = next(i for i in items if i.category == "course_info")
    assert info.title == "12 new Campuswire posts"


def test_plain_digest_uses_subject_course():
    [item] = campuswire.parse(load("campuswire_plain"))
    assert item.category == "course_info"
    assert item.course == "Intro to Algorithms"
