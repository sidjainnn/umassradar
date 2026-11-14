"""Course profiles for every UMass department, from the public Five College course schedule.

    python -m app.fivecolleges                  # Fall 2026 + Spring 2027
    python -m app.fivecolleges S 2027           # one term

fivecolleges.edu's robots.txt allows general crawlers with the content signal
`search=yes, ai-train=no, use=reference`. We read the schedule listing pages (50 sections per page)
politely, about one page per second, parse them deterministically (no LLM, no training), and link back
to the source. Course descriptions come from a section's detail page, fetched only when someone opens
that course's profile (see `fetch_details`).

Crawls are resumable: progress per term is stored in `catalog_crawl`.
"""

import asyncio
import re
import sys
from urllib.parse import urlencode

import httpx

from app.db import get_db
from app.email_parse import html_to_text
from app.models import now_utc
from parsers.common import DEPT_ALIASES

BASE = "https://www.fivecolleges.edu"
USER_AGENT = "Mozilla/5.0 (compatible; UMassRadar course schedule reader; student project)"
PAUSE = 1.0  # seconds between requests
TERMS = [("F", 2026), ("S", 2027)]
SEASON = {"F": "Fall", "S": "Spring"}
WEEKDAY = {"M": 0, "TU": 1, "W": 2, "TH": 3, "F": 4, "SA": 5, "SU": 6}


def term_label(sem: str, year: int) -> str:
    return f"{SEASON[sem]} {year}"


def listing_url(sem: str, year: int, page: int) -> str:
    query = urlencode({
        "field_course_semester_value": sem,
        "field_course_year_value": year,
        "field_course_institution_value[]": "U",
        "page": page,
    })
    return f"{BASE}/courses?{query}"


def course_code(subject: str, number: str) -> str:
    subject = subject.strip().upper()
    return f"{DEPT_ALIASES.get(subject, subject)} {number.strip().upper()}"


def parse_meeting(text: str) -> tuple[list[int], str | None, str | None]:
    """'M W F 9:05AM 9:55AM' -> ([0, 2, 4], '09:05', '09:55'). TBA/blank -> ([], None, None)."""
    tokens = re.findall(r"\b(TU|TH|SA|SU|M|W|F)\b", (text or "").upper())
    days = [WEEKDAY[t] for t in tokens]
    times = re.findall(r"(\d{1,2}):(\d{2})\s*([AP]M)", text.upper())
    if len(times) < 2:
        return days, None, None

    def hhmm(h, m, ap):
        return f"{int(h) % 12 + (12 if ap == 'PM' else 0):02d}:{m}"

    return days, hhmm(*times[0]), hhmm(*times[1])


def parse_listing(html: str) -> list[dict]:
    """Rows of the schedule table: subject, number, section, type, title, instructor, institution, meeting."""
    rows = []
    for tr in re.findall(r"<tr.*?</tr>", html, re.S):
        cells = [re.sub(r"\s+", " ", html_to_text(c)).strip() for c in re.findall(r"<td[^>]*>(.*?)</td>", tr, re.S)]
        if len(cells) < 8 or "UMass" not in cells[6]:
            continue
        link = re.search(r'href="(/courses/UM/[^"]+)"', tr)
        days, start, end = parse_meeting(cells[7])
        rows.append({
            "code": course_code(cells[0], cells[1]),
            "dept": DEPT_ALIASES.get(cells[0].upper(), cells[0].upper()),
            "section": f"{cells[3]}{cells[2]}".strip(),
            "component": cells[3],
            "title": cells[4],
            "instructor": cells[5] or None,
            "days": days,
            "start": start,
            "end": end,
            "url": f"{BASE}{link.group(1)}" if link else None,
        })
    return rows


def group_courses(rows: list[dict], label: str) -> dict[str, dict]:
    courses: dict[str, dict] = {}
    for r in rows:
        c = courses.setdefault(r["code"], {
            "dept": r["dept"], "number": r["code"].split()[-1], "title": r["title"], "instructors": [],
            "sections": [], "term": label, "source": "fivecolleges", "detail_url": r["url"],
        })
        if r["instructor"] and r["instructor"] not in c["instructors"]:
            c["instructors"].append(r["instructor"])
        c["sections"].append({
            "section": r["section"], "class_number": f"{r['code']}|{r['section']}", "days": r["days"],
            "start": r["start"], "end": r["end"], "location": None, "instructor": r["instructor"],
        })
    return courses


async def save_courses(courses: dict[str, dict], label: str) -> int:
    """Upsert parsed courses. Course-terms that came from the richer CICS catalog are left alone."""
    db = get_db()
    saved = 0
    for code, course in courses.items():
        existing = await db.courses.find_one({"_id": code}, {f"terms.{label}.source": 1, f"terms.{label}.catalog_url": 1,
                                                             f"terms.{label}.description": 1})
        prev = (existing or {}).get("terms", {}).get(label, {})
        if prev.get("catalog_url"):  # CICS data for this term is better; keep it
            continue
        if prev.get("description"):  # keep a description fetched earlier
            course["description"] = prev["description"]
        await db.courses.update_one(
            {"_id": code},
            {"$set": {f"terms.{label}": course, "updated_at": now_utc(),
                      "search_text": " ".join([code, course["title"], *course["instructors"]])},
             "$setOnInsert": {"created_at": now_utc()}},
            upsert=True,
        )
        saved += 1
    return saved


async def crawl_term(sem: str, year: int, client: httpx.AsyncClient, max_pages: int = 400) -> int:
    label = term_label(sem, year)
    db = get_db()
    state = await db.catalog_crawl.find_one({"_id": label}) or {}
    page = 0 if state.get("done") else state.get("next_page", 0)
    rows: list[dict] = []
    while page < max_pages:
        resp = await client.get(listing_url(sem, year, page))
        resp.raise_for_status()
        page_rows = parse_listing(resp.text)
        if not page_rows:
            break
        rows.extend(page_rows)
        page += 1
        if page % 10 == 0:  # save as we go, so an interrupted crawl resumes here
            await save_courses(group_courses(rows, label), label)
            rows = []
            await db.catalog_crawl.update_one({"_id": label}, {"$set": {"next_page": page, "done": False}}, upsert=True)
            print(f"{label}: {page} pages", flush=True)
        await asyncio.sleep(PAUSE)
    await save_courses(group_courses(rows, label), label)
    await db.catalog_crawl.update_one(
        {"_id": label}, {"$set": {"next_page": 0, "done": True, "finished_at": now_utc(), "pages": page}}, upsert=True
    )
    return page


def parse_detail(html: str) -> dict:
    text = html_to_text(html)

    def field(name: str) -> str | None:
        m = re.search(rf"{name}:\s*\n?\s*(.+)", text)
        return m.group(1).strip() if m else None

    desc = re.search(r"Description:\s*(.+?)(?:\n\s*Linked Course|\n\s*Instructor Permission:|\n\s*Link to Campus|\Z)", text, re.S)
    return {
        "credits": (field("Credits") or "").replace(".00", "") or None,
        "location": field("Location"),
        "description": re.sub(r"\s+", " ", desc.group(1)).strip()[:2000] if desc else None,
    }


async def fetch_details(code: str, label: str) -> None:
    """Fill in a course's description/credits from one section's detail page (on first profile view)."""
    db = get_db()
    course = await db.courses.find_one({"_id": code})
    term = (course or {}).get("terms", {}).get(label, {})
    if not term.get("detail_url") or term.get("description"):
        return
    async with httpx.AsyncClient(timeout=10, follow_redirects=True, headers={"User-Agent": USER_AGENT}) as client:
        resp = await client.get(term["detail_url"])
    if resp.status_code != 200:
        return
    detail = parse_detail(resp.text)
    update = {f"terms.{label}.{k}": v for k, v in detail.items() if v and k != "location"}
    if update:
        await db.courses.update_one({"_id": code}, {"$set": update})


async def main(terms: list[tuple[str, int]]) -> None:
    async with httpx.AsyncClient(timeout=30, follow_redirects=True, headers={"User-Agent": USER_AGENT}) as client:
        for sem, year in terms:
            pages = await crawl_term(sem, year, client)
            print(f"{term_label(sem, year)}: done, {pages} pages", flush=True)


if __name__ == "__main__":
    args = sys.argv[1:]
    asyncio.run(main([(args[0], int(args[1]))] if len(args) == 2 else TERMS))
