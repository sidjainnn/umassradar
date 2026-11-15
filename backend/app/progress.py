"""Weekly progress, a streak of good weeks, and countdowns to exams."""

import re
from datetime import date, datetime, time, timedelta

from app.models import EASTERN, Item

EXAM = re.compile(r"\b(exam|midterm|mid-term|final|quiz|test|prelim)s?\b", re.I)
GOOD_WEEK = 0.8
LOOKBACK_WEEKS = 16


def monday(d: date) -> date:
    return d - timedelta(days=d.weekday())


def _week_of(dt: datetime) -> date:
    return monday(dt.astimezone(EASTERN).date())


def week_stats(items: list[Item], week: date) -> tuple[int, int]:
    """(done, total) for deadlines due that week. Dismissed ones don't count either way."""
    due = [i for i in items if i.category == "deadline" and i.due_at and _week_of(i.due_at) == week and i.status != "dismissed"]
    return sum(1 for i in due if i.status == "done"), len(due)


def streak(items: list[Item], now: datetime) -> int:
    """Weeks in a row (ending last week, plus this week once it's already good) where you finished at least 80%
    of what was due. Weeks with nothing due don't break the streak."""
    this = _week_of(now)
    count = 0
    done, total = week_stats(items, this)
    if total and done / total >= GOOD_WEEK:
        count += 1
    week = this - timedelta(days=7)
    for _ in range(LOOKBACK_WEEKS):
        done, total = week_stats(items, week)
        if total:
            if done / total < GOOD_WEEK:
                break
            count += 1
        week -= timedelta(days=7)
    return count


def countdowns(items: list[Item], course_dates: dict[str, list[dict]], now: datetime, days: int = 45) -> list[dict]:
    """Upcoming exams and quizzes from your items and your courses' syllabi, soonest first, one per exam."""
    horizon = now + timedelta(days=days)
    found: dict[tuple, dict] = {}

    def add(course, title, when, source):
        if not when or not (now <= when <= horizon) or not EXAM.search(title or ""):
            return
        key = (course or "", when.astimezone(EASTERN).date())
        if key in found:
            return
        local = when.astimezone(EASTERN)
        found[key] = {"course": course, "title": title, "when": when.isoformat(),
                      "days": (local.date() - now.astimezone(EASTERN).date()).days, "source": source}

    for i in items:
        if i.status == "open" and i.category in ("deadline", "event", "appointment"):
            add(i.course, i.title, i.when, "item")
    for course, dates in course_dates.items():
        for d in dates:
            when = d.get("when")
            if isinstance(when, datetime) and when.tzinfo is None:
                when = when.replace(tzinfo=EASTERN)
            add(course, d.get("title"), when, "syllabus")
    return sorted(found.values(), key=lambda c: c["when"])[:8]


def progress(items: list[Item], course_dates: dict[str, list[dict]], now: datetime) -> dict:
    this = _week_of(now)
    done, total = week_stats(items, this)
    today = [i for i in items if i.category == "deadline" and i.due_at and i.status != "dismissed"
             and i.due_at.astimezone(EASTERN).date() == now.astimezone(EASTERN).date()]
    return {
        "week_start": this.isoformat(),
        "done": done, "total": total,
        "streak": streak(items, now),
        "countdowns": countdowns(items, course_dates, now),
        "today_cleared": bool(today) and all(i.status == "done" for i in today),
    }


def week_start_dt(d: date) -> datetime:
    return datetime.combine(d, time(0), tzinfo=EASTERN)
