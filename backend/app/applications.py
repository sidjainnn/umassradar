"""Job and internship applications found in email: applied, interview, offer, not selected.

Runs on the in-memory email (sender, subject, the first part of the body) during sync. Only the derived
record (company, role, stage, date) is kept; the email itself is never stored.
"""

import re
from dataclasses import dataclass
from datetime import datetime

from app.db import get_db
from app.interests import log_event
from app.models import EmailMsg, now_utc

ATS = re.compile(r"(greenhouse|lever\.co|myworkday|workday|icims|ashbyhq|smartrecruiters|jobvite|taleo|successfactors|"
                 r"handshake|joinhandshake|bamboohr|workable|recruitee|jazzhr|breezy|eightfold|avature|phenom)", re.I)
RECRUITING_NAME = re.compile(r"\b(recruit\w*|talent|careers?|hiring|human resources|hr|university relations|campus)\b", re.I)

STAGES = ["applied", "interview", "offer"]  # in order; "rejected" ends it
PATTERNS = [
    ("offer", re.compile(r"\b(offer letter|pleased to (offer|extend)|job offer|offer of employment|congratulations.{0,40}offer)\b", re.I)),
    ("rejected", re.compile(r"(unfortunately|regret to inform|not (be )?moving forward|decided to (move|proceed) forward with other|"
                            r"will not be moving|position has been filled|not been selected|other candidates)", re.I)),
    ("interview", re.compile(r"\b(interview|phone screen|next steps?|schedule a (time|call)|availability for|"
                             r"online assessment|coding challenge|hirevue|codesignal|hackerrank)\b", re.I)),
    ("applied", re.compile(r"(thank(s| you) for (your )?(applying|application|interest)|application (received|submitted|confirmation)|"
                           r"we('ve| have) received your application|your application (to|for|has been))", re.I)),
]

END = r"(?=[!.,:|]|$| for | - | was | has | is | have | will )"
COMPANY_IN_SUBJECT = [
    re.compile(r"\bat ([A-Z][\w&.' -]{1,40}?)" + END),
    re.compile(r"(?:applying|application|interest) (?:to|at|with) ([A-Z][\w&.,' -]{1,50}?)" + END, re.I),
    re.compile(r"^([A-Z][\w&.' -]{1,40}?) (?:application|careers|recruiting|interview)", re.I),
]
ROLE_IN_TEXT = [
    re.compile(r"(?:for|to) (?:the|our) (.{3,80}?) (?:position|role|opening|internship|job)\b", re.I),
    re.compile(r"(?:application|applying) (?:for|to) (?:the )?(.{3,80}?)(?: at | with | position| role|[.!,|]|$)", re.I),
    re.compile(r"\b((?:summer |fall |spring )?(?:20\d\d )?[\w/&+ -]{2,40}? (?:intern|internship|co-op|engineer|analyst|developer|"
               r"assistant|associate|researcher|designer|scientist|manager|tutor|mentor))\b", re.I),
]
PLATFORM_NAMES = {"workday", "greenhouse", "lever", "icims", "handshake", "ashby", "smartrecruiters", "jobvite", "taleo"}


@dataclass
class AppSignal:
    company: str
    role: str
    stage: str
    at: datetime
    subject: str


def _clean(s: str) -> str:
    return re.sub(r"\s+", " ", s or "").strip(" -:|,.!").strip()


def _company(msg: EmailMsg) -> str | None:
    for rx in COMPANY_IN_SUBJECT:
        m = rx.search(msg.subject)
        if m and _clean(m.group(1)).lower() not in PLATFORM_NAMES:
            return _clean(m.group(1))[:60]
    name = re.sub(RECRUITING_NAME, "", msg.from_name or "")
    name = _clean(re.sub(r"\b(team|no-?reply|notifications?|@.*)\b", "", name, flags=re.I))
    if name and name.lower() not in PLATFORM_NAMES and len(name) > 1:
        return name[:60]
    domain = (msg.from_email.split("@")[-1] if "@" in msg.from_email else "").split(".")
    core = [d for d in domain if d not in ("com", "org", "io", "co", "net", "edu", "mail", "email", "careers", "jobs", "hire")]
    if core and core[-1].lower() not in PLATFORM_NAMES and not ATS.search(core[-1]):
        return core[-1].capitalize()
    return None


def _role(msg: EmailMsg) -> str:
    text = f"{msg.subject}. {msg.body[:600]}"
    for rx in ROLE_IN_TEXT:
        m = rx.search(text)
        if m:
            role = _clean(m.group(1))
            if 2 < len(role) <= 80 and not re.match(r"^(your|our|this|the|a|an)$", role, re.I):
                return role
    return ""


def detect(msg: EmailMsg) -> AppSignal | None:
    """An application update in this email, or None. Only looks at mail from recruiters or job platforms."""
    sender = f"{msg.from_name} {msg.from_email}"
    if not (ATS.search(sender) or RECRUITING_NAME.search(msg.from_name or "") or
            re.search(r"(careers?|recruit|talent|jobs)@", msg.from_email or "", re.I)):
        return None
    text = f"{msg.subject}\n{msg.body[:1500]}"
    stage = next((s for s, rx in PATTERNS if rx.search(text)), None)
    if not stage:
        return None
    company = _company(msg)
    if not company:
        return None
    return AppSignal(company=company, role=_role(msg), stage=stage, at=msg.date, subject=msg.subject[:160])


def _key(user_id: str, company: str, role: str) -> str:
    norm = lambda s: re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")  # noqa: E731
    return f"{user_id}:{norm(company)}:{norm(role) or 'any'}"


def next_stage(current: str | None, new: str) -> str:
    """Stages only move forward (applied -> interview -> offer); a rejection ends it; nothing reopens it."""
    if current is None:
        return new
    if current in ("rejected", "offer") and new != "offer":
        return current
    if new == "rejected":
        return "rejected"
    if new in STAGES and current in STAGES and STAGES.index(new) < STAGES.index(current):
        return current
    return new


async def record(user_id: str, sig: AppSignal) -> bool:
    """Save the update. Returns True if the stage changed (and a preference event was logged)."""
    db = get_db()
    # an update without a role ("next steps with Kronos") joins the company's latest application
    doc = None
    if not sig.role:
        doc = await db.applications.find_one({"user_id": user_id, "company_norm": sig.company.lower()}, sort=[("last_at", -1)])
    key = doc["_id"] if doc else _key(user_id, sig.company, sig.role)
    doc = doc or await db.applications.find_one({"_id": key})
    stage = next_stage(doc["stage"] if doc else None, sig.stage)
    changed = not doc or stage != doc["stage"]
    await db.applications.update_one(
        {"_id": key},
        {"$set": {"stage": stage, "last_at": max(sig.at, doc["last_at"]) if doc else sig.at, "updated_at": now_utc()},
         "$setOnInsert": {"user_id": user_id, "company": sig.company, "company_norm": sig.company.lower(),
                          "role": sig.role, "first_at": sig.at},
         "$push": {"history": {"stage": sig.stage, "at": sig.at, "subject": sig.subject}}},
        upsert=True,
    )
    if changed:
        await log_event(user_id, stage, title=f"{sig.role or 'Application'} at {sig.company}", company=sig.company, source="email")
    return changed


async def learn_from_emails(user_id: str, msgs: list[EmailMsg]) -> int:
    user = await get_db().users.find_one({"_id": user_id}, {"prefs": 1})
    if ((user or {}).get("prefs") or {}).get("learn_from_email") is False:
        return 0
    n = 0
    for msg in msgs:
        sig = detect(msg)
        if sig and await record(user_id, sig):
            n += 1
    return n
