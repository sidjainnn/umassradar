import base64

from app.email_parse import extract_body, html_to_text, parse_gmail_message


def b64(s: str) -> str:
    return base64.urlsafe_b64encode(s.encode()).decode().rstrip("=")


def test_prefers_plain_text_part():
    payload = {
        "mimeType": "multipart/alternative",
        "parts": [
            {"mimeType": "text/plain", "body": {"data": b64("Quiz 5 is due Friday.")}},
            {"mimeType": "text/html", "body": {"data": b64("<p>Quiz 5 is <b>due</b> Friday.</p>")}},
        ],
    }
    assert extract_body(payload) == "Quiz 5 is due Friday."


def test_falls_back_to_stripped_html():
    payload = {"mimeType": "text/html", "body": {"data": b64("<style>.x{}</style><p>Hello&nbsp;there</p><p>Bye</p>")}}
    assert extract_body(payload) == "Hello there\n\nBye"


def test_html_to_text_drops_scripts():
    assert html_to_text("<script>alert(1)</script><div>Office hours moved</div>") == "Office hours moved"


def test_parse_gmail_message_headers():
    msg = {
        "id": "abc123",
        "threadId": "t1",
        "internalDate": "1794636000000",
        "labelIds": ["INBOX", "CATEGORY_UPDATES"],
        "payload": {
            "mimeType": "text/plain",
            "headers": [
                {"name": "From", "value": "STAT 315 on Piazza <no-reply@piazza.com>"},
                {"name": "Subject", "value": "[Instr Note] Quiz 5 reminder"},
                {"name": "List-Unsubscribe", "value": "<https://piazza.com/unsub>"},
            ],
            "body": {"data": b64("Quiz 5 opens Thursday.")},
        },
    }
    m = parse_gmail_message(msg)
    assert m.from_name == "STAT 315 on Piazza"
    assert m.from_email == "no-reply@piazza.com"
    assert m.from_domain == "piazza.com"
    assert m.subject == "[Instr Note] Quiz 5 reminder"
    assert m.list_unsubscribe
    assert "CATEGORY_UPDATES" in m.label_ids
    assert m.body == "Quiz 5 opens Thursday."
    assert m.date.year == 2026
