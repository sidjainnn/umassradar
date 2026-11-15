import json
from datetime import datetime
from pathlib import Path

from app.models import EASTERN
from app.where import class_location, schedule_where
from llm.ask import build_context

DEMO = json.loads((Path(__file__).resolve().parents[1] / "demo" / "schedule.json").read_text())
MON_9AM = datetime(2026, 11, 16, 9, 0, tzinfo=EASTERN)


def test_every_demo_class_is_found_or_flagged():
    out = schedule_where(DEMO, MON_9AM)
    assert len(out) == len(DEMO["classes"])
    for c in out:
        loc = c["location"]
        assert loc["found"] or loc["reason"]
    found = [c for c in out if c["location"]["found"]]
    assert len(found) >= 6
    assert out[0]["today"] is True  # Monday's classes come first


def test_location_words():
    w = class_location("ILC S220")
    assert w["building"] == "Integrative Learning Center" and w["floor"] == 2 and w["floor_label"] == "2nd floor"
    assert w["indoor"] and w["steps"] and "S220" in w["summary"]
    assert class_location("On-Line")["found"] is False
    assert class_location("Nowhere 999")["found"] is False


def test_walks_between_back_to_back_classes():
    sched = {"classes": [
        {"course": "A 1", "days": [0], "start": "10:00", "end": "10:50", "location": "ILC S220"},
        {"course": "B 2", "days": [0], "start": "11:00", "end": "11:50", "location": "LGRT 1234"}]}
    out = schedule_where(sched, MON_9AM)
    walk = next(c for c in out if c["course"] == "B 2")["walk_from_previous"]
    assert walk["from"] == "A 1" and walk["minutes"] >= 1 and walk["gap_minutes"] == 10


def test_ask_sam_context_has_floors():
    ctx = json.loads(build_context([], {"classes": [{"course": "X 1", "days": [0], "start": "10:00", "end": "11:00",
                                                     "location": "ILC S220"}]}, {}, [], MON_9AM))
    assert ctx["classes"][0]["where"]["floor_label"] == "2nd floor"
