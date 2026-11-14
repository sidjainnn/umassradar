"""Turn a Gmail API message (format=full) into an in-memory EmailMsg."""

import base64
import html
import re
from datetime import datetime, timezone
from email.utils import parseaddr
from html.parser import HTMLParser

from app.models import EmailMsg


class _TextExtractor(HTMLParser):
    SKIP = {"script", "style", "head", "title"}
    BLOCK = {"p", "div", "br", "tr", "li", "h1", "h2", "h3", "h4", "table", "section"}

    def __init__(self) -> None:
        super().__init__()
        self.parts: list[str] = []
        self._skip = 0

    def handle_starttag(self, tag, attrs):
        if tag in self.SKIP:
            self._skip += 1
        elif tag in self.BLOCK:
            self.parts.append("\n")

    def handle_endtag(self, tag):
        if tag in self.SKIP and self._skip:
            self._skip -= 1
        elif tag in self.BLOCK:
            self.parts.append("\n")

    def handle_data(self, data):
        if not self._skip:
            self.parts.append(data)


def html_to_text(raw: str) -> str:
    parser = _TextExtractor()
    try:
        parser.feed(raw)
        text = "".join(parser.parts)
    except Exception:
        text = re.sub(r"<[^>]+>", " ", raw)
    return clean_text(html.unescape(text))


def clean_text(text: str) -> str:
    text = text.replace("\r\n", "\n").replace("\xa0", " ")
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n\s*\n+", "\n\n", text)
    return text.strip()


def _decode(data: str) -> str:
    if not data:
        return ""
    padded = data + "=" * (-len(data) % 4)
    return base64.urlsafe_b64decode(padded).decode("utf-8", errors="replace")


def _find_parts(payload: dict, mime: str) -> list[str]:
    found = []
    if payload.get("mimeType") == mime and payload.get("body", {}).get("data"):
        found.append(_decode(payload["body"]["data"]))
    for part in payload.get("parts", []) or []:
        found.extend(_find_parts(part, mime))
    return found


def extract_body(payload: dict) -> str:
    plain = _find_parts(payload, "text/plain")
    if plain:
        return clean_text("\n".join(plain))
    htmls = _find_parts(payload, "text/html")
    if htmls:
        return html_to_text("\n".join(htmls))
    return ""


def parse_gmail_message(msg: dict) -> EmailMsg:
    payload = msg.get("payload", {})
    headers = {h["name"].lower(): h["value"] for h in payload.get("headers", [])}
    name, addr = parseaddr(headers.get("from", ""))
    internal_ms = int(msg.get("internalDate", "0") or 0)
    date = datetime.fromtimestamp(internal_ms / 1000, tz=timezone.utc) if internal_ms else datetime.now(timezone.utc)
    return EmailMsg(
        id=msg["id"],
        thread_id=msg.get("threadId", ""),
        from_name=name,
        from_email=addr.lower(),
        subject=headers.get("subject", ""),
        date=date,
        list_unsubscribe=headers.get("list-unsubscribe", ""),
        label_ids=msg.get("labelIds", []) or [],
        body=extract_body(payload),
    )
