from datetime import datetime, timedelta

from app.agent import find_gap, study_suggestions, suggestions, work_suggestions
from app.models import EASTERN, Item

NOW = datetime(2026, 11, 16, 10, 0, tzinfo=EASTERN)  # Monday 10 AM


def at(days, h, m=0):
    d = NOW + timedelta(days=days)
    return d.replace(hour=h, minute=m)


def test_gap_skips_busy_time_and_nights():
    busy = [(at(0, 10), at(0, 12)), (at(0, 12, 15), at(0, 20, 30))]
    start, end = find_gap(busy, NOW, at(2, 0), 60)
    assert start == at(1, 9) and end == at(1, 10)  # Tuesday 9 AM: Monday is full until 8:30 PM
    assert find_gap([], at(0, 20, 30), at(0, 22), 60) is None


def test_quiet_application_gets_a_follow_up():
    apps = [{"_id": "a1", "company": "HubSpot", "role": "Product Design Intern", "stage": "applied",
             "first_at": NOW - timedelta(days=12), "last_at": NOW - timedelta(days=12)}]
    out = work_suggestions([], apps, [], [], NOW)
    assert out[0]["kind"] == "follow_up" and "12 days" in out[0]["why"]
    assert "Product Design Intern" in out[0]["action"]["text"]


def test_interview_gets_a_prep_block_in_a_free_gap():
    busy = [(at(0, 10), at(0, 16))]
    apps = [{"_id": "a2", "company": "Wayfair", "role": "Data Science Intern", "stage": "interview",
             "first_at": NOW - timedelta(days=5), "last_at": NOW - timedelta(days=1)}]
    (s,) = work_suggestions([], apps, [], busy, NOW)
    start = datetime.fromisoformat(s["action"]["starts_at"])
    assert s["kind"] == "interview_prep" and start >= at(0, 16)


def test_study_office_hours_before_a_deadline():
    lab = Item(id="lab6", category="deadline", title="Lab 6", course="ECE 122", due_at=at(2, 17))
    slots = [{"who": "Prof. Chen", "course": "ECE 122", "starts_at": at(1, 14), "ends_at": at(1, 15), "can_make": True}]
    out = study_suggestions([lab], slots, [], [], NOW)
    kinds = [s["kind"] for s in out]
    assert "office_hours" in kinds
    oh = next(s for s in out if s["kind"] == "office_hours")
    assert "Prof. Chen" in oh["title"] and oh["action"]["type"] == "block_time"


def test_modes_give_different_suggestions_and_dismissed_ones_stay_gone():
    lab = Item(id="lab6", category="deadline", title="Lab 6", course="ECE 122", due_at=at(1, 17))
    apps = [{"_id": "a1", "company": "HubSpot", "role": "", "stage": "applied",
             "first_at": NOW - timedelta(days=11), "last_at": NOW - timedelta(days=11)}]
    study = suggestions("study", [lab], apps, [], [], [], [], set(), NOW)
    work = suggestions("work", [lab], apps, [], [], [], [], set(), NOW)
    assert {s["kind"] for s in study} == {"start_work"}
    assert {s["kind"] for s in work} == {"follow_up"}
    assert suggestions("work", [lab], apps, [], [], [], [], {"follow_up:a1"}, NOW) == []


def test_suggested_blocks_never_overlap():
    lab = Item(id="lab6", category="deadline", title="Lab 6", course="ECE 122", due_at=at(1, 17))
    quiz = [{"course": "STAT 315", "title": "Quiz 6", "when": at(2, 10).isoformat(), "days": 2}]
    out = study_suggestions([lab], [], quiz, [], NOW)
    blocks = [(datetime.fromisoformat(s["action"]["starts_at"]), datetime.fromisoformat(s["action"]["ends_at"]))
              for s in out if s["action"]["type"] == "block_time"]
    assert len(blocks) == 2
    (a0, a1), (b0, b1) = sorted(blocks)
    assert a1 <= b0
