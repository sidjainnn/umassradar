from datetime import datetime

from app.models import EASTERN
from app.watchers import PageItem, PageResult, main_text, to_items
from tests.helpers import local

NOW = datetime(2026, 11, 14, 9, 0, tzinfo=EASTERN)
PAGE = {"id": "reslife-employment", "name": "Residential Life", "url": "https://www.umass.edu/living/about/employment"}
HTML = """<html><nav>Housing Options Dining Get Involved</nav>
<main><h1>Employment</h1><p>Resident Assistant applications for 2027-28 are due December 4 at 5 PM.</p></main>
<footer>Contact us</footer></html>"""


def test_main_text_skips_navigation():
    text = main_text(HTML)
    assert "Resident Assistant applications" in text
    assert "Housing Options" not in text and "Contact us" not in text


def test_to_items_filters_past_and_checks_evidence():
    text = main_text(HTML)
    result = PageResult(items=[
        PageItem(category="opportunity", title="Resident Assistant 2027-28", due_at="2026-12-04T17:00:00", starts_at=None,
                 location=None, evidence="Resident Assistant applications for 2027-28 are due December 4 at 5 PM."),
        PageItem(category="event", title="Old info session", due_at=None, starts_at="2026-10-01T18:00:00",
                 location=None, evidence=""),
        PageItem(category="event", title="Invented event", due_at=None, starts_at="2026-12-01T18:00:00",
                 location=None, evidence="not on the page"),
    ])
    items = {i.title: i for i in to_items(result, PAGE, text, NOW)}
    assert set(items) == {"Resident Assistant 2027-28", "Invented event"}
    ra = items["Resident Assistant 2027-28"]
    assert ra.source == "web" and ra.url == PAGE["url"] and ra.action_required
    assert local(ra.due_at) == (2026, 12, 4, 17, 0)
    assert items["Invented event"].confidence <= 0.4


def test_job_titles_are_the_role_and_repeats_get_a_venue():
    page = {"id": "jobs-dining", "name": "UMass Dining", "url": "https://www.umassdining.com/student-jobs"}
    result = PageResult(items=[
        PageItem(category="opportunity", title="UMass Dining Student Job - Franklin Dining Common, Morrill, Post & Bean",
                 due_at=None, starts_at=None, location=None, evidence=""),
        PageItem(category="opportunity", title="Dining student worker", due_at=None, starts_at=None,
                 location="Worcester Dining Common, ISB Café", evidence=""),
        PageItem(category="opportunity", title="Dining student worker", due_at=None, starts_at=None,
                 location="Worcester Dining Common, ISB Café", evidence=""),  # duplicate: dropped
    ])
    titles = [i.title for i in to_items(result, page, "", NOW)]
    assert titles == ["UMass Dining Student Job", "Dining student worker"]  # long venue list moved out of the title

    same_role = PageResult(items=[
        PageItem(category="opportunity", title="Dining student worker", due_at=None, starts_at=None,
                 location="Franklin Dining Common, Morrill", evidence=""),
        PageItem(category="opportunity", title="Dining student worker", due_at=None, starts_at=None,
                 location="Hampshire Dining Common (Southwest), Roots Café", evidence=""),
    ])
    assert [i.title for i in to_items(same_role, page, "", NOW)] == [
        "Dining student worker, Franklin Dining Common", "Dining student worker, Hampshire Dining Common"]
