"""Shared helpers for the deterministic sender parsers."""

import re
from datetime import datetime, time, timedelta

from app.gmail_client import gmail_link
from app.models import EASTERN, EmailMsg, Item

MONTHS = {
    "jan": 1, "feb": 2, "mar": 3, "apr": 4, "may": 5, "jun": 6,
    "jul": 7, "aug": 8, "sep": 9, "sept": 9, "oct": 10, "nov": 11, "dec": 12,
}
WEEKDAYS = {"mon": 0, "tue": 1, "wed": 2, "thu": 3, "fri": 4, "sat": 5, "sun": 6}

TIME_RE = r"(\d{1,2}(?::\d{2})?\s*(?:[ap]\.?\s?m\.?)|noon|midnight)"
MONTH_RE = re.compile(
    r"(?:\b(?:mon|tue|wed|thu|fri|sat|sun)[a-z]*\.?,?\s+)?"
    r"\b(jan|feb|mar|apr|may|jun|jul|aug|sept?|oct|nov|dec)[a-z]*\.?\s+(\d{1,2})(?:st|nd|rd|th)?\b"
    r"(?:,?\s+(\d{4}))?"
    rf"(?:,?\s*(?:starting at|beginning at|from|at|@|by|,|-)?\s*{TIME_RE})?",
    re.I,
)
NUMERIC_RE = re.compile(
    r"\b(\d{1,2})/(\d{1,2})(?:/(\d{2,4}))?\b" rf"(?:,?\s*(?:at|@|by)?\s*{TIME_RE})?",
    re.I,
)
WEEKDAY_RE = re.compile(
    r"\b(?:(this|next)\s+)?(mon|tue|wed|thu|fri|sat|sun)(?:day|s|sday|nesday|rsday|urday)?\b"
    rf"(?:,?\s*(?:at|@|by)?\s*{TIME_RE})?",
    re.I,
)
RELATIVE_RE = re.compile(rf"\b(today|tonight|tomorrow)\b(?:\s*(?:at|@|by)?\s*{TIME_RE})?", re.I)

COURSE_RE = re.compile(
    r"\b(COMPSCI|CICS|CS|MATH|STAT|STATISTC|INFO|ECE|E&C-ENG|PHYSICS|CHEM|BIOLOGY|BIO|ECON|ENGLWRIT|PSYCH|"
    r"SPANISH|HISTORY|PHIL|SOCIOL|POLISCI|ACCOUNTG|FINANCE|MANAGMNT|MARKETNG|OIM|SCH-MGMT|RES-ECON)"
    r"\s?-?\s?(\d{3}[A-Z]?)\b",
    re.I,
)


def parse_time(text: str | None) -> time | None:
    if not text:
        return None
    t = text.lower().replace(".", "").replace(" ", "")
    if t == "noon":
        return time(12, 0)
    if t == "midnight":
        return time(23, 59)
    m = re.match(r"(\d{1,2})(?::(\d{2}))?([ap])m", t)
    if not m:
        return None
    hour, minute = int(m.group(1)) % 12, int(m.group(2) or 0)
    if m.group(3) == "p":
        hour += 12
    return time(hour, minute)


def _combine(day, t: time | None, default: time) -> datetime:
    return datetime.combine(day, t or default, tzinfo=EASTERN)


def find_datetimes(text: str, ref: datetime, default_time: time = time(23, 59)) -> list[tuple[datetime, int, str]]:
    """All date mentions in text as (datetime in Eastern, position, matched text).

    Dates without a year resolve to the next occurrence on/after ~2 weeks before ref,
    so "Nov 20" in a November email is this year and "Jan 5" in a December email is next year.
    """
    ref_local = ref.astimezone(EASTERN)
    found: list[tuple[datetime, int, str]] = []

    for m in MONTH_RE.finditer(text):
        month, day = MONTHS[m.group(1).lower()[:3]], int(m.group(2))
        year = int(m.group(3)) if m.group(3) else ref_local.year
        try:
            d = datetime(year, month, day).date()
        except ValueError:
            continue
        if not m.group(3) and d < ref_local.date() - timedelta(days=14):
            d = d.replace(year=year + 1)
        found.append((_combine(d, parse_time(m.group(4)), default_time), m.start(), m.group(0)))

    for m in NUMERIC_RE.finditer(text):
        month, day = int(m.group(1)), int(m.group(2))
        if not (1 <= month <= 12 and 1 <= day <= 31):
            continue
        year = int(m.group(3)) if m.group(3) else ref_local.year
        if year < 100:
            year += 2000
        try:
            d = datetime(year, month, day).date()
        except ValueError:
            continue
        if not m.group(3) and d < ref_local.date() - timedelta(days=14):
            d = d.replace(year=year + 1)
        found.append((_combine(d, parse_time(m.group(4)), default_time), m.start(), m.group(0)))

    for m in RELATIVE_RE.finditer(text):
        word = m.group(1).lower()
        d = ref_local.date() + timedelta(days=1 if word == "tomorrow" else 0)
        t = parse_time(m.group(2)) or (time(21, 0) if word == "tonight" else None)
        found.append((_combine(d, t, default_time), m.start(), m.group(0)))

    covered = [(pos, pos + len(s)) for _, pos, s in found]
    for m in WEEKDAY_RE.finditer(text):
        if any(a <= m.start() < b for a, b in covered):
            continue  # weekday already part of a full date like "Friday, Nov 20"
        day_word = m.group(0).split()[-1].lower()
        if not m.group(3) and len(day_word) <= 4:
            continue  # bare "Sat"/"Mon" without a time is too ambiguous
        wd = WEEKDAYS[m.group(2).lower()[:3]]
        delta = (wd - ref_local.weekday()) % 7
        if (m.group(1) or "").lower() == "next" and delta < 7:
            delta += 7 if delta == 0 else 0
        d = ref_local.date() + timedelta(days=delta)
        found.append((_combine(d, parse_time(m.group(3)), default_time), m.start(), m.group(0)))

    found.sort(key=lambda x: x[1])
    return found


def first_datetime(text: str, ref: datetime, default_time: time = time(23, 59)) -> datetime | None:
    found = find_datetimes(text, ref, default_time)
    return found[0][0] if found else None


def find_course(*texts: str) -> str | None:
    for text in texts:
        if not text:
            continue
        m = COURSE_RE.search(text)
        if m:
            dept = m.group(1).upper()
            dept = "COMPSCI" if dept == "CS" else dept
            return f"{dept} {m.group(2).upper()}"
    return None


def sentence_with(text: str, *needles: str) -> str:
    """The first sentence/line of text containing any needle (case-insensitive), trimmed."""
    chunks = re.split(r"(?<=[.!?])\s+|\n+", text)
    for chunk in chunks:
        low = chunk.lower()
        if any(n.lower() in low for n in needles if n):
            return chunk.strip()[:300]
    return ""


def sentence_around(text: str, pos: int) -> str:
    """The sentence (or line) of text that contains character position pos."""
    start = max(text.rfind("\n", 0, pos), *(text.rfind(p, 0, pos) for p in (". ", "! ", "? "))) + 1
    ends = [i for i in (text.find("\n", pos), *(text.find(p, pos) for p in (". ", "! ", "? "))) if i != -1]
    end = min(ends) + 1 if ends else len(text)
    return text[start:end].strip()[:300]


STRONG_DEADLINE_WORDS = ("due", "deadline", "closes", "apply by", "submit by", "due by", "late due")


def date_near(text: str, ref: datetime, words: tuple[str, ...], default_time: time = time(23, 59)):
    """First date in text with one of `words` shortly before it. Returns (datetime, evidence) or None."""
    found = find_datetimes(text, ref, default_time)
    # Prefer a date right after the keyword ("due Friday, Nov 20"), then any date nearby.
    strong = tuple(w for w in words if w in STRONG_DEADLINE_WORDS)
    for keys, before, after in ((strong, 30, 0), (words, 120, 40)):
        for when, pos, _ in found:
            window = text[max(0, pos - before): pos + after].lower()
            if any(re.search(rf"\b{re.escape(w)}\b", window) for w in keys):
                return when, sentence_around(text, pos)
    return None


def first_line(text: str) -> str:
    for line in text.splitlines():
        if line.strip():
            return line.strip()[:300]
    return ""


def sender_type(msg: EmailMsg) -> str:
    local = msg.from_email.split("@")[0]
    if any(k in local for k in ("noreply", "no-reply", "donotreply", "do-not-reply", "notification", "notify", "mailer")):
        return "automated"
    if msg.list_unsubscribe:
        return "newsletter"
    return "person"


def make_item(msg: EmailMsg, category: str, title: str, *, evidence: str = "", **fields) -> Item:
    return Item(
        category=category,
        title=title.strip()[:200],
        source="gmail",
        source_ref=msg.id,
        evidence=(evidence or msg.subject)[:300],
        extracted_by="rule",
        confidence=fields.pop("confidence", 0.9),
        sender=msg.from_name or msg.from_email,
        sender_email=msg.from_email,
        sender_type=fields.pop("sender_type", sender_type(msg)),
        received_at=msg.date,
        url=gmail_link(msg.id),
        **fields,
    )
