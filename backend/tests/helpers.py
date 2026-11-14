import json
from datetime import datetime
from pathlib import Path

from app.models import EASTERN, EmailMsg

FIXTURES = Path(__file__).parent / "fixtures"


def load(name: str) -> EmailMsg:
    """Load tests/fixtures/<name>.json as an EmailMsg. Dates are Eastern local time."""
    data = json.loads((FIXTURES / f"{name}.json").read_text())
    data["date"] = datetime.fromisoformat(data["date"]).replace(tzinfo=EASTERN)
    data.setdefault("id", name)
    return EmailMsg(**data)


def local(dt: datetime) -> tuple:
    """(year, month, day, hour, minute) in Eastern, for readable asserts."""
    d = dt.astimezone(EASTERN)
    return d.year, d.month, d.day, d.hour, d.minute
