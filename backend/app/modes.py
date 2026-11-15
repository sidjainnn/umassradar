"""Study mode and work mode: which items belong to which.

Study: classes, coursework, schedule. Work: jobs, internships, applications, housing.
Anything that is neither (e.g. a Dean of Students notice) shows in both.
"""

import re
from typing import Literal

from app.models import Item

Mode = Literal["study", "work"]
ItemMode = Literal["study", "work", "both"]

HOUSING_WORDS = re.compile(
    r"\b(housing|room selection|room assignment|residence hall|res ?life|lease|sublet|move[- ]in|move[- ]out|"
    r"rent|landlord|roommate|dorm|apartment|security deposit)\b", re.I)

JOB_WORDS = re.compile(
    r"\b(job|jobs|shift|shifts|interview\w*|hiring|hire|handshake|application|applied|apply|offer letter|"
    r"recruit\w*|intern|internship\w*|co-?op|resume|career\w*|employ\w*|payroll|timesheet|work[- ]study|"
    r"position|onboarding|background check)\b", re.I)
# "RA" and "PM" only as capitalized words (so "5 pm" stays a time)
STAFF_ROLES = re.compile(r"\b(RA|PM|RAs|PMs)\b(?!\s*\d)")

JOB_SENDERS = re.compile(
    r"(greenhouse|lever\.co|myworkday|workday|icims|ashbyhq|smartrecruiters|handshake|joinhandshake|linkedin|"
    r"indeed|careers?@|recruit|talent|hr@|human resources|student employment|career center)", re.I)

STUDY_SOURCES = {"canvas", "syllabus"}
STUDY_SENDERS = re.compile(r"(canvas|instructure|gradescope|piazza|campuswire|moodle|professor|\bta\b|"
                           r"course|registrar|advis)", re.I)


def classify(item: Item) -> ItemMode:
    """Which mode an item belongs to."""
    text = f"{item.title} {item.sender} {item.sender_email} {item.evidence}"
    if item.category == "opportunity" or JOB_SENDERS.search(f"{item.sender} {item.sender_email}") or JOB_WORDS.search(item.title) \
            or (STAFF_ROLES.search(item.title) and not re.search(r"\d\s*PM\b", item.title)):
        return "work"
    if HOUSING_WORDS.search(text) or "residential life" in item.sender.lower():
        return "work"
    if item.course or item.category == "course_info" or item.source in STUDY_SOURCES or STUDY_SENDERS.search(text):
        return "study"
    return "both"


def in_mode(item: Item, mode: str | None) -> bool:
    if mode not in ("study", "work"):
        return True
    m = classify(item)
    return m == "both" or m == mode
