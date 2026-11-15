from datetime import datetime, timedelta, timezone

from app.interests import build_profile
from app.jobs import blocked, is_job, job_types, score
from app.models import Item

NOW = datetime(2026, 11, 14, 12, tzinfo=timezone.utc)


def job(title, sender="Handshake", days=10, **kw):
    return Item(category="opportunity", title=title, sender=sender, due_at=NOW + timedelta(days=days),
                received_at=NOW - timedelta(days=1), **kw)


def test_interests_drive_the_order():
    profile = build_profile({"interests": ["data science"]}, [], NOW)
    ds = job("Data Science Intern at Kronos")
    dining = job("Dining student worker", sender="UMass Dining")
    a, reasons = score(ds, profile, {}, NOW)
    b, _ = score(dining, profile, {}, NOW)
    assert a > b and any("data science" in r for r in reasons)


def test_types_and_places():
    assert {"internship"} <= job_types(job("Software Engineering Intern"))
    assert "on_campus" in job_types(job("Resident Assistant", sender="UMass Residential Life"))
    prefs = {"job_types": ["internship"]}
    assert blocked(job("Dining student worker", sender="UMass Dining"), prefs)
    assert blocked(job("Data Science Intern"), prefs) is None
    assert blocked(job("Sales Associate"), {"avoid": ["sales"]})


def test_applied_and_rejected_companies_drop():
    profile = build_profile({"interests": ["data science"]}, [], NOW)
    j = job("Data Science Intern", sender="Kronos")
    base, _ = score(j, profile, {}, NOW)
    applied, reasons = score(j, profile, {}, NOW, applied={"kronos"})
    rej, _ = score(j, profile, {}, NOW, rejected={"kronos"})
    assert applied < base and "you already applied" in reasons
    assert rej < base


def test_closing_soon_is_mentioned_and_past_deadlines_dont_boost():
    s1, r1 = score(job("Peer Mentor", days=3), {}, {}, NOW)
    s2, _ = score(job("Peer Mentor", days=-2), {}, {}, NOW)
    assert any(r.startswith("apply by") for r in r1) and s1 > s2


def test_only_jobs_count():
    assert is_job(job("Anything"))
    assert not is_job(Item(category="deadline", title="Lab 6", course="ECE 122"))
