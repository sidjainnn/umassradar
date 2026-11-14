from pathlib import Path

from llm.screenshot import ShotItem, ShotResult, image_type, to_items
from tests.helpers import local

PNG = (Path(__file__).parent / "fixtures" / "spire_screenshot.png").read_bytes()


def test_image_type_checks_magic_bytes():
    assert image_type(PNG) == "image/png"
    assert image_type(b"\xff\xd8\xff\xe0rest") == "image/jpeg"
    assert image_type(b"RIFF....WEBPVP8 ") == "image/webp"
    assert image_type(b"%PDF-1.4") is None
    assert image_type(b"RIFF....WAVEfmt ") is None


def test_to_items_marks_source_and_normalizes():
    result = ShotResult(items=[ShotItem(
        category="appointment", title="Spring 2027 enrollment appointment", course=None,
        due_at=None, starts_at="2026-11-20T08:00:00", location=None, action_required=True,
        evidence="Regular Academic Session 11/20/2026 8:00AM", confidence=1.0)])
    [item] = to_items(result, "u1", "screenshot:abc")
    assert item.source == "screenshot" and item.extracted_by == "llm"
    assert local(item.starts_at) == (2026, 11, 20, 8, 0)
    assert item.confidence < 1.0  # vision output is trusted a bit less
