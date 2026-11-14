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


def test_single_post_with_due_date_in_subject():
    msg = load("campuswire_plain")
    msg.subject = "Sean Lin: Homework #8 Released - Due 11/24 @ 11:59 P.M."
    msg.body = "Homework 8 is out on the course site."
    [item] = campuswire.parse(msg)
    assert item.category == "deadline"
    assert item.title == "Homework #8 Released - Due 11/24 @ 11:59 P.M."
    assert local(item.due_at) == (2026, 11, 24, 23, 59)


def test_single_post_with_vague_date_goes_to_llm():
    msg = load("campuswire_plain")
    msg.subject = "Marius Minea: Midterm 2 is graded"
    msg.body = "Regrade requests open Monday."
    assert campuswire.parse(msg) is None
