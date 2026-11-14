"""Render the demo inbox with dates relative to today, as EmailMsg objects."""

import csv
import json
import re
from datetime import datetime, timedelta
from pathlib import Path

from app.models import EASTERN, EmailMsg, now_utc

HERE = Path(__file__).parent
TOKEN = re.compile(r"\{(D|MD|NUM|WD)\+(\d+)\}")


def _fill(text: str, today: datetime) -> str:
    def repl(m: re.Match) -> str:
        d = today + timedelta(days=int(m.group(2)))
        return {
            "D": f"{d:%A}, {d:%B} {d.day}",
            "MD": f"{d:%b} {d.day}",
            "NUM": f"{d.month}/{d.day}",
            "WD": f"{d:%A}",
        }[m.group(1)]

    return TOKEN.sub(repl, text)


def load_demo_emails(now: datetime | None = None) -> list[EmailMsg]:
    now = (now or now_utc()).astimezone(EASTERN)
    stamp = now.strftime("%Y%m%d")
    msgs = []
    for raw in json.loads((HERE / "emails.json").read_text()):
        received = now - timedelta(hours=raw["hours_ago"])
        msgs.append(
            EmailMsg(
                id=f"demo-{raw['key']}-{stamp}",  # dated id: cached LLM output never goes stale
                from_name=raw["from_name"],
                from_email=raw["from_email"],
                subject=_fill(raw["subject"], now),
                body=_fill(raw["body"], now),
                date=received,
                list_unsubscribe=raw["list_unsubscribe"],
                label_ids=raw["label_ids"],
            )
        )
    return msgs


def demo_key(message_id: str) -> str:
    """"demo-prof-reply-20261114" -> "prof-reply"."""
    return message_id.removeprefix("demo-").rsplit("-", 1)[0]


def load_labels(path: Path | str = HERE / "labels.csv") -> dict[str, dict]:
    with open(path, newline="") as f:
        return {row["message_id"]: row for row in csv.DictReader(f)}
