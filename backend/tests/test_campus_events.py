from app.campus_events import event_to_item, parse_events

PAGE = {"events": [{"event": {
    "id": 101, "title": "Hackers Club General Meeting", "location_name": "CS Building", "room_number": "150",
    "localist_url": "https://events.umass.edu/event/hackers-gbm", "description_text": "Pizza and projects.",
    "groups": [{"name": "Hackers Club "}, {"name": "Manning College of Information and Computer Sciences (CICS)"}],
    "filters": {"event_types": [{"name": "Meeting/Infosession"}], "event_audience": [{"name": "Students"}]},
    "event_instances": [{"event_instance": {"id": 7, "start": "2026-11-19T19:00:00-05:00", "end": "2026-11-19T20:00:00-05:00", "all_day": False}}],
}}], "page": {"next_page": None}}


def test_parse_events():
    [ev] = parse_events(PAGE)
    assert ev["_id"] == "101-7"
    assert ev["groups"] == ["Hackers Club", "Manning College of Information and Computer Sciences (CICS)"]
    assert ev["starts_at"].hour == 19 and ev["types"] == ["Meeting/Infosession"]


def test_followed_event_becomes_an_item():
    [ev] = parse_events(PAGE)
    item = event_to_item(ev, "u1", "Hackers Club")
    assert item.category == "event" and item.source == "campus" and item.sender == "Hackers Club"
    assert item.location == "CS Building, 150" and item.url.endswith("hackers-gbm")
