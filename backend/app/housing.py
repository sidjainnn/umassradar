"""Housing board: sublets, on-campus room swaps and roommate matching, for signed-in UMass students only.

Rules that keep it safe:
- Contact details are never shown on a post. Someone asks to connect; only when the poster accepts do
  both see each other's UMass email.
- No fields about protected characteristics. Roommate matching uses practical things only: budget,
  dates, area, sleep schedule, tidiness, guests, smoking.
- Posts expire after 90 days, anyone can report one, and posts that mention common scam moves
  (wiring money, gift cards, paying before a viewing) carry a warning.
"""

import re
from datetime import date, datetime, timedelta
from typing import Literal

from pydantic import BaseModel, Field, field_validator

Kind = Literal["sublet_offer", "sublet_wanted", "swap", "roommate"]
Area = Literal["On campus", "Amherst", "Hadley", "Sunderland", "Northampton", "Belchertown", "South Hadley", "Other"]

POST_DAYS = 90
SCAM_PATTERNS = [
    r"\bwire (?:the )?(?:money|transfer|deposit)\b", r"\bwestern union\b", r"\bmoneygram\b", r"\bgift ?cards?\b",
    r"\bcrypto|bitcoin\b", r"\b(?:pay|send).{0,30}before (?:you )?(?:see|seeing|view|viewing|tour)\b",
    r"\bout of (?:the )?country\b.{0,60}\bkeys?\b", r"\bcashier'?s check\b", r"\bwhats ?app\b",
]


class HousingPost(BaseModel):
    kind: Kind
    title: str = Field(..., min_length=4, max_length=90)
    area: Area
    building: str | None = Field(None, max_length=80)  # dorm / street, no house number needed
    rent: int | None = Field(None, ge=0, le=10_000)  # monthly, per person (offers) or max budget (wanted, roommate)
    start: date | None = None
    end: date | None = None
    bedrooms: int | None = Field(None, ge=0, le=10)
    furnished: bool | None = None
    description: str = Field("", max_length=1200)
    # roommate preferences (all optional, all practical)
    sleep: Literal["early", "late", "flexible"] | None = None
    tidiness: Literal["very tidy", "average", "relaxed"] | None = None
    guests: Literal["rarely", "sometimes", "often"] | None = None
    smoking: Literal["no", "outside only", "yes"] | None = None
    # swaps: what you want in return
    wants: str | None = Field(None, max_length=120)

    @field_validator("end")
    @classmethod
    def end_after_start(cls, end, info):
        start = info.data.get("start")
        if end and start and end < start:
            raise ValueError("End date is before start date.")
        return end


def scam_flags(text: str) -> list[str]:
    hits = []
    for pattern in SCAM_PATTERNS:
        m = re.search(pattern, text, re.I)
        if m:
            hits.append(m.group(0))
    return hits


def public_view(doc: dict, viewer_id: str) -> dict:
    """A post as other students see it: no contact details, no poster id."""
    return {
        "id": doc["_id"], "kind": doc["kind"], "title": doc["title"], "area": doc["area"],
        "building": doc.get("building"), "rent": doc.get("rent"), "start": doc.get("start"), "end": doc.get("end"),
        "bedrooms": doc.get("bedrooms"), "furnished": doc.get("furnished"), "description": doc.get("description", ""),
        "sleep": doc.get("sleep"), "tidiness": doc.get("tidiness"), "guests": doc.get("guests"),
        "smoking": doc.get("smoking"), "wants": doc.get("wants"), "created_at": doc.get("created_at"),
        "expires_at": doc.get("expires_at"), "status": doc.get("status", "open"),
        "poster": doc.get("poster_label", "UMass student"), "mine": doc["user_id"] == viewer_id,
        "warnings": doc.get("warnings", []), "sample": doc.get("sample", False),
    }


# ---------- matching ----------

def _overlap_days(a_start, a_end, b_start, b_end) -> int | None:
    if not (a_start and b_start):
        return None
    a_end = a_end or a_start + timedelta(days=365)
    b_end = b_end or b_start + timedelta(days=365)
    return (min(a_end, b_end) - max(a_start, b_start)).days


def _as_date(v) -> date | None:
    if v is None or isinstance(v, date) and not isinstance(v, datetime):
        return v
    if isinstance(v, datetime):
        return v.date()
    return date.fromisoformat(str(v)[:10])


def match(me: dict, other: dict) -> tuple[int, list[str]]:
    """How well another post fits mine, 0-100, with the reasons a student would care about."""
    score, reasons = 50, []
    if me["kind"] == "roommate":
        if me["area"] == other["area"]:
            score += 15; reasons.append(f"Both looking in {me['area']}")
        if me.get("rent") and other.get("rent"):
            gap = abs(me["rent"] - other["rent"])
            if gap <= 100:
                score += 15; reasons.append("Similar budgets")
            elif gap > 400:
                score -= 15; reasons.append("Budgets far apart")
        for field, label in (("sleep", "sleep schedule"), ("tidiness", "tidiness"), ("guests", "guests"), ("smoking", "smoking")):
            a, b = me.get(field), other.get(field)
            if a and b:
                if a == b or "flexible" in (a, b):
                    score += 5; reasons.append(f"Same {label}" if a == b else f"Flexible on {label}")
                elif field == "smoking" and "yes" in (a, b) and "no" in (a, b):
                    score -= 20; reasons.append("Smoking doesn't match")
                elif field in ("sleep", "tidiness"):
                    score -= 5
    elif me["kind"] == "sublet_wanted" and other["kind"] == "sublet_offer":
        if me["area"] == other["area"]:
            score += 20; reasons.append(f"In {me['area']}")
        if me.get("rent") and other.get("rent") is not None:
            if other["rent"] <= me["rent"]:
                score += 20; reasons.append(f"${other['rent']}/mo is within your ${me['rent']} budget")
            else:
                score -= 25; reasons.append("Over your budget")
    elif me["kind"] == "swap" and other["kind"] == "swap":
        wants = (me.get("wants") or "").lower()
        if wants and any(w in f"{other.get('building', '')} {other['area']}".lower() for w in re.findall(r"[a-z]{4,}", wants)):
            score += 25; reasons.append(f"Has what you want ({other.get('building') or other['area']})")
        theirs = (other.get("wants") or "").lower()
        if theirs and any(w in f"{me.get('building', '')} {me['area']}".lower() for w in re.findall(r"[a-z]{4,}", theirs)):
            score += 25; reasons.append("Wants what you have")
    days = _overlap_days(_as_date(me.get("start")), _as_date(me.get("end")), _as_date(other.get("start")), _as_date(other.get("end")))
    if days is not None:
        if days >= 60:
            score += 10; reasons.append("Dates line up")
        elif days < 0:
            score -= 25; reasons.append("Dates don't overlap")
    return max(0, min(100, score)), reasons


MATCH_KINDS = {"roommate": ["roommate"], "sublet_wanted": ["sublet_offer"], "sublet_offer": ["sublet_wanted"], "swap": ["swap"]}
