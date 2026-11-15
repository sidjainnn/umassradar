from app.models import Item
from app.modes import classify, in_mode


def test_job_items_are_work():
    assert classify(Item(category="opportunity", title="Undergrad RA position")) == "work"
    assert classify(Item(category="status_update", title="Thank you for applying",
                         sender="Kronos", sender_email="no-reply@myworkday.com")) == "work"
    assert classify(Item(category="appointment", title="Interview with Wayfair")) == "work"


def test_housing_is_work():
    assert classify(Item(category="deadline", title="Room selection opens", sender="Residential Life")) == "work"


def test_coursework_is_study():
    assert classify(Item(category="deadline", title="Lab 6", course="ECE 122")) == "study"
    assert classify(Item(category="deadline", title="Quiz", source="canvas")) == "study"
    assert classify(Item(category="course_info", title="Lecture moved")) == "study"


def test_general_notices_show_in_both():
    item = Item(category="status_update", title="Spring billing statement available", sender="Dean of Students")
    assert classify(item) == "both"
    assert in_mode(item, "study") and in_mode(item, "work")
    assert not in_mode(Item(category="opportunity", title="Job"), "study")


def test_times_are_not_peer_mentor_jobs():
    assert classify(Item(category="deadline", title="Lab 6 due 5 PM", course="ECE 122")) == "study"
    assert classify(Item(category="deadline", title="RA and PM applications due")) == "work"
