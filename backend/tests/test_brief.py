from datetime import datetime, timedelta

from app.models import EASTERN, Item
from llm.brief import brief_input, part_of_day, template_brief

NOW = datetime(2026, 11, 14, 15, 0, tzinfo=EASTERN)  # Saturday afternoon


def test_part_of_day():
    assert part_of_day(NOW) == "this afternoon"
    assert part_of_day(NOW.replace(hour=8)) == "this morning"
    assert part_of_day(NOW.replace(hour=21)) == "tonight"


def test_template_mentions_items_and_links_them():
    hw = Item(category="deadline", title="Homework 8", due_at=NOW.replace(hour=23, minute=59))
    appt = Item(category="appointment", title="Appointment with Jane Smith", starts_at=NOW + timedelta(days=1),
                location="Goodell 613")
    reply = Item(category="reply_owed", title="Send transcript", sender="Prof. Maria Chen", sender_type="person")
    brief = template_brief([hw, appt, reply], NOW)
    text = " ".join(s.text for s in brief.sentences)
    assert "Homework 8 (11:59 PM)" in text
    assert "tomorrow at 3 PM in Goodell 613" in text
    assert "Prof. Maria Chen" in text
    assert hw.id in brief.sentences[0].item_ids
    assert 1 <= len(brief.sentences) <= 5


def test_empty_brief_is_friendly():
    assert "caught up" in template_brief([], NOW).sentences[0].text


def test_brief_input_has_no_email_text():
    item = Item(category="deadline", title="HW", evidence="secret body sentence", due_at=NOW)
    assert "secret body sentence" not in str(brief_input([item], NOW))
