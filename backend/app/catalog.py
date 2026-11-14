"""Seed course profiles from the public CICS course descriptions and schedule pages.

    python -m app.catalog                 # import the default terms
    python -m app.catalog spring-2027     # one term

Parsing is deterministic (no LLM). Profiles are shared by all students; syllabus uploads add to them.
"""

import asyncio
import re
import sys
from datetime import time

import httpx

from app.db import get_db
from app.email_parse import html_to_text
from app.models import now_utc

DEFAULT_TERMS = ["spring-2027", "fall-2026"]
USER_AGENT = "Mozilla/5.0 (compatible; UMassRadar catalog import; student project)"
DEPTS = ("COMPSCI", "CICS", "INFO")

COURSE_HEAD = re.compile(rf"^\s*({'|'.join(DEPTS)})\s+(\d{{3}}[A-Z]?)\s*:\s*(.+?)\s*$", re.M)
DAY_CODES = {"Mon": 0, "Tue": 1, "Wed": 2, "Thu": 3, "Fri": 4, "Sat": 5, "Sun": 6, "M": 0, "Tu": 1, "W": 2,
             "Th": 3, "F": 4, "Sa": 5, "Su": 6}


def term_label(term: str) -> str:
    season, year = term.split("-")
    return f"{season.title()} {year}"


# ---------- descriptions ----------

def parse_descriptions(html: str, term: str) -> dict[str, dict]:
    """{"COMPSCI 220": {...}} from the course descriptions page."""
    text = html_to_text(html)
    heads = list(COURSE_HEAD.finditer(text))
    courses: dict[str, dict] = {}
    for n, head in enumerate(heads):
        body = text[head.end(): heads[n + 1].start() if n + 1 < len(heads) else len(text)].strip()
        code = f"{head.group(1)} {head.group(2)}"
        instr = re.search(r"Instructor\(s\):\s*(.+)", body)
        instructors = [i.strip() for i in re.split(r",| and ", instr.group(1)) if i.strip()] if instr else []
        if instr:
            body = body.replace(instr.group(0), "")
        credits = re.search(r"(\d+(?:-\d+)?) credits?\.?", body)
        prereq = re.search(r"(Prerequisites?:.+?)(?:\d+(?:-\d+)? credits?\.|$)", body, re.S)
        description = body
        if prereq:
            description = description[: prereq.start()]
        elif credits:
            description = description[: credits.start()]
        description = re.sub(r"\s+", " ", description).strip()
        # stop at the page footer if this is the last course
        description = re.split(r"\b(Skip to main content|Footer|Copyright ©)", description)[0].strip()
        courses[code] = {
            "_id": code,
            "dept": head.group(1),
            "number": head.group(2),
            "title": head.group(3).strip(),
            "instructors": instructors,
            "description": description[:2000],
            "prerequisites": re.sub(r"\s+", " ", prereq.group(1)).strip()[:500] if prereq else None,
            "credits": credits.group(1) if credits else None,
            "term": term_label(term),
        }
    return courses


# ---------- schedule ----------

def _cells(row: str) -> list[str]:
    cells = re.findall(r"<t[hd][^>]*>(.*?)</t[hd]>", row, re.S)
    return [re.sub(r"\s+", " ", html_to_text(c)).strip() for c in cells]


def parse_time_range(text: str) -> tuple[str, str] | None:
    m = re.match(r"(\d{1,2}):(\d{2})\s*([AP]M)\s*-\s*(\d{1,2}):(\d{2})\s*([AP]M)", text, re.I)
    if not m:
        return None

    def t(h, mnt, ap):
        h = int(h) % 12 + (12 if ap.upper() == "PM" else 0)
        return time(h, int(mnt)).strftime("%H:%M")

    return t(m.group(1), m.group(2), m.group(3)), t(m.group(4), m.group(5), m.group(6))


def parse_days(text: str) -> list[int]:
    return [DAY_CODES[d] for d in re.findall(r"Mon|Tue|Wed|Thu|Fri|Sat|Sun|Tu|Th|Sa|Su|M|W|F", text)]


def parse_schedule(html: str) -> dict[str, list[dict]]:
    """{"COMPSCI 220": [{"section": "LEC01", "days": [0, 2], "start": "10:10", ...}]}"""
    sections: dict[str, list[dict]] = {}
    dept, code = None, None
    for row in re.findall(r"<tr.*?</tr>", html, re.S):
        cells = _cells(row)
        if not cells:
            continue
        if len(cells) >= 2 and cells[1].upper().startswith("CLASS#"):
            dept = cells[0].upper() if cells[0].upper() in DEPTS else dept
            continue
        if dept and len(cells) == 2 and re.fullmatch(r"\d{3}[A-Z]?", cells[0]):
            code = f"{dept} {cells[0]}"
            sections.setdefault(code, [])
            continue
        if code and len(cells) >= 6 and cells[1].startswith("#"):
            times = parse_time_range(cells[3])
            sections[code].append({
                "section": cells[0],
                "class_number": cells[1].lstrip("#"),
                "days": parse_days(cells[2]),
                "start": times[0] if times else None,
                "end": times[1] if times else None,
                "location": cells[4] or None,
                "instructor": cells[5] or None,
            })
    return sections


# ---------- import ----------

async def fetch(url: str) -> str:
    async with httpx.AsyncClient(timeout=30, follow_redirects=True, headers={"User-Agent": USER_AGENT}) as c:
        r = await c.get(url)
        r.raise_for_status()
        return r.text


INDEX_URL = "https://www.cics.umass.edu/academics/courses"


async def term_urls(term: str) -> tuple[str, str]:
    """The term's descriptions and schedule links, read from the CICS courses page (their slugs vary)."""
    html = await fetch(INDEX_URL)
    links = set(re.findall(r'href="(https://content\.cs\.umass\.edu/content/[^"]+)"', html))
    desc = next((u for u in links if re.search(rf"/{term}-course-descriptions?$", u)), None)
    sched = next((u for u in links if u.endswith(f"/{term}-course-schedule")), None)
    if not desc or not sched:
        raise ValueError(f"No course pages listed for {term} on {INDEX_URL}")
    return desc, sched


async def import_term(term: str) -> int:
    desc_url, sched_url = await term_urls(term)
    courses = parse_descriptions(await fetch(desc_url), term)
    schedule = parse_schedule(await fetch(sched_url))
    db = get_db()
    label = term_label(term)
    for code, course in courses.items():
        fields = {k: v for k, v in course.items() if k != "_id"}
        fields["sections"] = schedule.get(code, [])
        fields["catalog_url"] = desc_url
        await db.courses.update_one(
            {"_id": code},
            # newest term wins for the catalog fields; syllabus facts live under "shared" and are kept
            {"$set": {f"terms.{label}": fields, "updated_at": now_utc()},
             "$setOnInsert": {"created_at": now_utc()}},
            upsert=True,
        )
    return len(courses)


async def main(terms: list[str]) -> None:
    for term in terms:
        n = await import_term(term)
        print(f"{term}: {n} courses")


if __name__ == "__main__":
    asyncio.run(main(sys.argv[1:] or DEFAULT_TERMS))
