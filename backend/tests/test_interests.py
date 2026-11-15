from datetime import datetime, timedelta, timezone

import pytest
from pydantic import ValidationError

from app.interests import build_profile, terms_from
from app.routes.preferences import Prefs

NOW = datetime(2026, 11, 14, tzinfo=timezone.utc)


def test_terms_keep_phrases_and_expand_synonyms():
    t = terms_from("Data Science Intern (ML) at Kronos")
    assert "data science" in t and "machine learning" in t and "kronos" in t
    assert "intern" not in t and "at" not in t


def test_stated_interests_outweigh_behaviour_and_avoid_subtracts():
    prefs = {"interests": ["data science"], "avoid": ["sales"]}
    events = [{"kind": "saved", "terms": ["marketing"], "at": NOW}]
    p = build_profile(prefs, events, NOW)
    assert p["data science"] > p["marketing"] > 0
    assert p["sales"] < 0


def test_behaviour_fades_with_time():
    fresh = build_profile({}, [{"kind": "applied", "terms": ["finance"], "at": NOW}], NOW)["finance"]
    old = build_profile({}, [{"kind": "applied", "terms": ["finance"], "at": NOW - timedelta(days=60)}], NOW)["finance"]
    assert old == pytest.approx(fresh / 2, rel=0.01)


def test_hiding_jobs_pushes_terms_down():
    p = build_profile({}, [{"kind": "hidden", "terms": ["night shift"], "at": NOW}], NOW)
    assert p["night shift"] < 0


def test_prefs_validation():
    p = Prefs(interests=[" Data  Science ", "data science", "UX"], job_types=["internship"], hours_per_week=12)
    assert p.interests == ["Data Science", "UX"]
    with pytest.raises(ValidationError):
        Prefs(job_types=["astronaut"])
    with pytest.raises(ValidationError):
        Prefs(hours_per_week=80)
