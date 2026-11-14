import pytest

from llm.jobboard import Job, JobPage, JobPageError, check_source, to_items


def test_only_job_board_pages_are_accepted():
    text = "Office Assistant - Whitmore - $16/hr\n" * 5
    assert check_source("https://yes.umass.edu/portal/jobsearch", text)
    assert check_source("https://umass.joinhandshake.com/stu/postings", text)
    with pytest.raises(JobPageError):
        check_source("https://evil.example.com/yes.umass.edu", text)
    with pytest.raises(JobPageError):
        check_source("https://yes.umass.edu/portal/jobsearch", "Search")  # nothing on the page yet


def test_jobs_become_opportunities():
    page = JobPage(jobs=[
        Job(job_id="12345", title="Office Assistant", employer="Student Affairs", location="Whitmore", campus="on",
            work_study="either", pay="$16.50/hr", hours="10 hrs/week", apply_by="2026-12-01T17:00:00",
            summary="Answer phones and greet visitors."),
        Job(job_id=None, title="Barista", employer="Amherst Coffee", location="Amherst center", campus="off",
            work_study="no", pay=None, hours=None, apply_by=None, summary="Make coffee."),
    ])
    a, b = to_items(page, "u1", "https://yes.umass.edu/portal/jobsearch")
    assert a.title == "Office Assistant at Student Affairs ($16.50/hr, 10 hrs/week)"
    assert a.location == "On campus, Whitmore" and a.source_ref == "jobs-board:12345"
    assert a.due_at.month == 12 and a.sender == "Student Employment Office"
    assert "Work-study: either" in a.evidence
    assert b.location == "Off campus, Amherst center" and b.source_ref.startswith("jobs-board:")
